"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GuardianOption = { id: string; name: string };
type RequirementOption = {
  id: string;
  label: string;
  documentCategory: string;
  subject: "ATHLETE" | "GUARDIAN";
  requiresExpiry: boolean;
  instructions: string | null;
  status: string;
};

type UploadStatus = "READY" | "UPLOADING" | "SUCCESS" | "ERROR";
type BatchDocument = {
  id: number;
  file: File;
  title: string;
  requirementId: string;
  category: string;
  guardianId: string;
  issuedAt: string;
  expiresAt: string;
  status: UploadStatus;
  error: string;
};

const MAX_FILES = 10;
const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const CATEGORY_OPTIONS = [
  { value: "IDENTITY", label: "Documento de identificação" },
  { value: "MEDICAL_EXAM", label: "Exame médico" },
  { value: "MEDICAL_CLEARANCE", label: "Atestado / liberação médica" },
  { value: "ELECTROCARDIOGRAM", label: "Eletrocardiograma" },
  { value: "ECHOCARDIOGRAM", label: "Ecocardiograma" },
  { value: "AUTHORIZATION", label: "Autorização" },
  { value: "SPORTS_REGISTRATION", label: "Registro esportivo" },
  { value: "SCHOOL", label: "Documento escolar" },
  { value: "SCHOOL_DECLARATION", label: "Declaração escolar" },
  { value: "OTHER", label: "Outro" },
];
const CATEGORIES_REQUIRE_EXPIRY = new Set([
  "MEDICAL_CLEARANCE",
  "ELECTROCARDIOGRAM",
  "ECHOCARDIOGRAM",
  "SCHOOL_DECLARATION",
]);

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2).replace(".", ",")} MB`;
}

function defaultTitle(fileName: string) {
  return fileName.replace(/\.(pdf|jpe?g|png)$/i, "").replace(/[_-]+/g, " ").trim().slice(0, 150) || "Documento";
}

function statusLabel(status: string) {
  if (status === "APPROVED") return "já aprovado";
  if (status === "EXPIRED") return "vencido";
  if (status === "PENDING") return "pendente";
  return "faltando";
}

export default function AthleteDocumentBatchUpload({
  athleteId,
  athleteName,
  guardians,
  documentRequirements,
}: {
  athleteId: string;
  athleteName: string;
  guardians: GuardianOption[];
  documentRequirements: RequirementOption[];
}) {
  const router = useRouter();
  const nextId = useRef(1);
  const [items, setItems] = useState<BatchDocument[]>([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [selectionError, setSelectionError] = useState("");
  const [progress, setProgress] = useState("");

  const successful = items.filter((item) => item.status === "SUCCESS").length;
  const remaining = items.filter((item) => item.status !== "SUCCESS").length;

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    if (sending) return;
    const selected = Array.from(event.currentTarget.files || []);
    event.currentTarget.value = "";
    if (!selected.length) return;
    if (items.length + selected.length > MAX_FILES) {
      setSelectionError(`Escolha no máximo ${MAX_FILES} arquivos por lote. Remova ou limpe os enviados antes de adicionar outros.`);
      return;
    }

    const added = selected.map((file): BatchDocument => ({
      id: nextId.current++,
      file,
      title: defaultTitle(file.name),
      requirementId: "",
      category: "OTHER",
      guardianId: "",
      issuedAt: "",
      expiresAt: "",
      status: "READY",
      error: "",
    }));

    setItems((current) => [...current, ...added]);
    setSelectionError("");
    setMessage("");
  }

  function updateItem(id: number, changes: Partial<BatchDocument>) {
    if (sending) return;
    setItems((current) => current.map((item) =>
      item.id === id && item.status !== "SUCCESS"
        ? { ...item, ...changes, status: "READY", error: "" }
        : item
    ));
  }

  function changeRequirement(item: BatchDocument, requirementId: string) {
    const requirement = documentRequirements.find((entry) => entry.id === requirementId);
    updateItem(item.id, {
      requirementId,
      category: requirement?.documentCategory || "OTHER",
      title: requirement ? requirement.label : item.title,
      guardianId: requirement?.subject === "ATHLETE" ? "" : item.guardianId,
    });
  }

  function validationError(item: BatchDocument): string | null {
    if (!item.file.size || item.file.size > MAX_FILE_SIZE) {
      return "O arquivo deve ter mais de 0 bytes e no máximo 4 MB.";
    }
    if (!ACCEPTED_MIME_TYPES.includes(item.file.type)) {
      return "Formato inválido. Selecione um arquivo PDF, JPG ou PNG.";
    }
    if (!item.title.trim()) return "Informe o título do documento.";
    const requirement = documentRequirements.find((entry) => entry.id === item.requirementId);
    if (item.requirementId && !requirement) return "Documento obrigatório inválido.";
    if (requirement?.subject === "GUARDIAN" && !item.guardianId) {
      return "Selecione o responsável deste documento.";
    }
    if (item.guardianId && !guardians.some((entry) => entry.id === item.guardianId)) {
      return "Responsável inválido.";
    }
    const effectiveCategory = requirement?.documentCategory || item.category;
    if ((requirement?.requiresExpiry || CATEGORIES_REQUIRE_EXPIRY.has(effectiveCategory)) && !item.expiresAt) {
      return "Informe a data de validade deste documento.";
    }
    if (item.issuedAt && item.expiresAt && item.expiresAt < item.issuedAt) {
      return "A validade não pode ser anterior à emissão.";
    }
    return null;
  }

  async function uploadAll() {
    if (sending) return;
    const candidates = items.filter((item) => item.status !== "SUCCESS");
    if (!candidates.length) return;
    setSending(true);
    setMessage("");
    setSelectionError("");
    let sent = 0;
    let failed = 0;

    // Um arquivo por requisição preserva integralmente as verificações
    // de permissão, requisito, quota e auditoria da API existente.
    // Envio sequencial evita disputas pela quota do armazenamento privado.
    for (let index = 0; index < candidates.length; index += 1) {
      const item = candidates[index];
      setProgress(`Processando ${index + 1} de ${candidates.length}: ${item.file.name}`);
      const invalid = validationError(item);
      if (invalid) {
        failed += 1;
        setItems((current) => current.map((entry) => entry.id === item.id
          ? { ...entry, status: "ERROR", error: invalid }
          : entry));
        continue;
      }

      setItems((current) => current.map((entry) => entry.id === item.id
        ? { ...entry, status: "UPLOADING", error: "" }
        : entry));

      const data = new FormData();
      data.append("athleteId", athleteId);
      data.append("file", item.file);
      data.append("title", item.title.trim());
      data.append("requirementId", item.requirementId);
      const requirement = documentRequirements.find((entry) => entry.id === item.requirementId);
      data.append("category", requirement?.documentCategory || item.category);
      data.append("guardianId", requirement?.subject === "ATHLETE" ? "" : item.guardianId);
      data.append("issuedAt", item.issuedAt);
      data.append("expiresAt", item.expiresAt);

      try {
        const response = await fetch("/api/athlete-documents/upload", {
          method: "POST",
          body: data,
        });
        const contentType = response.headers.get("content-type") || "";
        const result: { error?: string } = contentType.includes("application/json")
          ? await response.json()
          : {};
        if (!response.ok) {
          throw new Error(result.error || (response.status === 413
            ? "Arquivo excedeu o limite da requisição."
            : "Não foi possível enviar este documento."));
        }
        sent += 1;
        setItems((current) => current.map((entry) => entry.id === item.id
          ? { ...entry, status: "SUCCESS", error: "" }
          : entry));
      } catch (error) {
        failed += 1;
        setItems((current) => current.map((entry) => entry.id === item.id
          ? { ...entry, status: "ERROR", error: error instanceof Error ? error.message : "Erro no envio." }
          : entry));
      }
    }

    setProgress("");
    setMessage(`${sent} arquivo(s) enviado(s) com sucesso${failed ? `; ${failed} não enviado(s). Confira os motivos abaixo e tente novamente.` : ". Os documentos aguardam a conferência do gestor."}`);
    setSending(false);
    if (sent) router.refresh();
  }

  return (
    <details className="card" style={{ marginTop: 18, padding: 18, border: "1px solid #d9e2e7", borderRadius: 14 }}>
      <summary style={{ cursor: "pointer", fontWeight: 900, color: "#07131d", fontSize: 15 }}>
        + Enviar documentos em lote (mesmo atleta)
      </summary>
      <p className="muted" style={{ marginTop: 14 }}>
        Selecione até {MAX_FILES} arquivos de {athleteName} de uma vez. Associe cada arquivo ao documento correspondente antes de enviar. PDF, JPG ou PNG, até 4 MB por arquivo.
      </p>

      <div className="form" style={{ marginTop: 12 }}>
        <label style={{ display: "grid", gap: 7, color: "#394a56", fontWeight: 800, fontSize: 13 }}>
          Selecionar vários arquivos
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
            multiple
            disabled={sending || items.length >= MAX_FILES}
            onChange={addFiles}
          />
        </label>

        {selectionError ? <p role="alert" className="form-error">{selectionError}</p> : null}

        {items.map((item, index) => {
          const requirement = documentRequirements.find((entry) => entry.id === item.requirementId);
          const expiresRequired = Boolean(requirement?.requiresExpiry || CATEGORIES_REQUIRE_EXPIRY.has(requirement?.documentCategory || item.category));
          const locked = sending || item.status === "SUCCESS";
          return (
            <div key={item.id} style={{ background: "#fff", border: "1px solid #dbe5e9", borderRadius: 12, padding: 14, marginTop: 12, minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                  <strong style={{ color: "#07131d" }}>{index + 1}. {item.file.name}</strong>
                  <small style={{ display: "block", color: "#64748b" }}>{formatSize(item.file.size)} · {item.status === "SUCCESS" ? "Enviado — aguardando conferência" : item.status === "UPLOADING" ? "Enviando…" : item.status === "ERROR" ? "Não enviado" : "Pronto para configurar"}</small>
                </div>
                <button type="button" className="btn-secondary" disabled={sending} onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))}>
                  {item.status === "SUCCESS" ? "Limpar da lista" : "Remover"}
                </button>
              </div>
              <div className="form-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 225px), 1fr))", gap: 12 }}>
                <label>
                  Documento exigido
                  <select value={item.requirementId} disabled={locked} onChange={(event: ChangeEvent<HTMLSelectElement>) => changeRequirement(item, event.target.value)}>
                    <option value="">Outro / sem requisito específico</option>
                    {documentRequirements.map((entry) => (
                      <option key={entry.id} value={entry.id}>{entry.label} — {statusLabel(entry.status)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Título do documento
                  <input value={item.title} disabled={locked} onChange={(event: ChangeEvent<HTMLInputElement>) => updateItem(item.id, { title: event.target.value })} maxLength={200} required />
                </label>
                <label>
                  Categoria
                  <select value={requirement?.documentCategory || item.category} disabled={locked || Boolean(requirement)} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateItem(item.id, { category: event.target.value })}>
                    {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  Documento referente a
                  <select value={requirement?.subject === "ATHLETE" ? "" : item.guardianId} disabled={locked || requirement?.subject === "ATHLETE"} onChange={(event: ChangeEvent<HTMLSelectElement>) => updateItem(item.id, { guardianId: event.target.value })}>
                    <option value="">Atleta: {athleteName}</option>
                    {guardians.map((guardian) => <option key={guardian.id} value={guardian.id}>Responsável: {guardian.name}</option>)}
                  </select>
                </label>
                <label>
                  Data de emissão
                  <input type="date" value={item.issuedAt} disabled={locked} onChange={(event: ChangeEvent<HTMLInputElement>) => updateItem(item.id, { issuedAt: event.target.value })} />
                </label>
                <label>
                  Data de validade {expiresRequired ? "*" : ""}
                  <input type="date" value={item.expiresAt} disabled={locked} required={expiresRequired} onChange={(event: ChangeEvent<HTMLInputElement>) => updateItem(item.id, { expiresAt: event.target.value })} />
                </label>
              </div>
              {requirement?.instructions ? <p className="muted" style={{ marginTop: 10 }}>Orientação: {requirement.instructions}</p> : null}
              {item.error ? <p role="alert" className="form-error" style={{ marginTop: 12 }}>{item.error}</p> : null}
            </div>
          );
        })}

        {items.length > 0 ? (
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 16 }}>
            <span style={{ color: "#334155", fontSize: 13 }}>{successful} enviado(s) · {remaining} aguardando ou com erro</span>
            <button type="button" disabled={sending || remaining === 0} onClick={uploadAll}>
              {sending ? "Enviando documentos…" : remaining === items.length ? `Enviar ${remaining} documento(s)` : `Enviar/repetir ${remaining} documento(s)`}
            </button>
          </div>
        ) : null}
        {progress ? <p role="status" style={{ color: "#334155" }}>{progress}</p> : null}
        {message ? <p role="status" className="form-success">{message}</p> : null}
      </div>
    </details>
  );
}
