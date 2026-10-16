"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Requirement = {
  id: string;
  label: string;
  documentCategory: string;
  subject: "ATHLETE" | "GUARDIAN";
  requiresExpiry: boolean;
  instructions: string | null;
};
type Athlete = {
  id: string;
  name: string;
  status: string;
  guardians: { id: string; name: string }[];
  categories: { id: string; name: string; requirements: Requirement[] }[];
};
type Row = {
  id: number;
  file: File;
  athleteId: string;
  requirementId: string;
  category: string;
  title: string;
  guardianId: string;
  issuedAt: string;
  expiresAt: string;
  status: "READY" | "SENDING" | "SUCCESS" | "ERROR";
  message: string;
};
const types: Record<string, string> = {
  IDENTITY: "Identificação", MEDICAL_EXAM: "Exame médico", MEDICAL_CLEARANCE: "Atestado médico",
  ELECTROCARDIOGRAM: "Eletrocardiograma", ECHOCARDIOGRAM: "Ecocardiograma",
  AUTHORIZATION: "Autorização", SPORTS_REGISTRATION: "Registro esportivo",
  SCHOOL: "Documento escolar", SCHOOL_DECLARATION: "Declaração escolar", OTHER: "Outro",
};
const limit = 4 * 1024 * 1024;

export default function DocumentBatchCenter({ athletes }: { athletes: Athlete[] }) {
  const [tab, setTab] = useState<"INDIVIDUAL" | "BATCH">("BATCH");
  const [singleId, setSingleId] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState("");
  const nextId = useRef(1);
  const lock = useRef(false);
  const update = (id: number, changes: Partial<Row>) => setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));

  function addFiles(files: FileList | null) {
    if (!files || lock.current) return;
    const incoming = Array.from(files).map((file) => ({
      id: nextId.current++, file, athleteId: "", requirementId: "", category: "", title: file.name.replace(/\.[^.]+$/, ""),
      guardianId: "", issuedAt: "", expiresAt: "", status: "READY" as const, message: "",
    }));
    setRows((current) => [...current, ...incoming]);
    setNotice("");
  }

  function requirementsFor(athlete?: Athlete) {
    if (!athlete) return [];
    return Array.from(new Map(athlete.categories.flatMap((c) => c.requirements).map((r) => [r.id, r])).values());
  }

  function errorFor(row: Row): string | null {
    if (!row.athleteId) return "Selecione o atleta";
    if (!row.title.trim()) return "Informe o título";
    if (!row.file.size || row.file.size > limit) return "Arquivo acima de 4 MB ou vazio";
    if (!["application/pdf", "image/jpeg", "image/png"].includes(row.file.type)) return "Formato não aceito";
    const athlete = athletes.find((a) => a.id === row.athleteId);
    const requirement = requirementsFor(athlete).find((r) => r.id === row.requirementId);
    if (row.requirementId && !requirement) return "Requisito inválido para este atleta";
    if (!requirement && !row.category) return "Selecione o tipo do documento";
    if (requirement?.subject === "GUARDIAN" && !row.guardianId) return "Selecione o responsável";
    if (requirement?.requiresExpiry && !row.expiresAt) return "Informe a validade";
    if (!requirement && ["MEDICAL_CLEARANCE", "ELECTROCARDIOGRAM", "ECHOCARDIOGRAM", "SCHOOL_DECLARATION"].includes(row.category) && !row.expiresAt) return "Informe a validade";
    if (row.issuedAt && row.expiresAt && row.expiresAt < row.issuedAt) return "Validade anterior à emissão";
    return null;
  }

  async function send() {
    if (lock.current) return;
    const pending = rows.filter((row) => row.status !== "SUCCESS");
    if (!pending.length) return;
    const invalid = pending.filter((row) => errorFor(row));
    if (invalid.length) {
      setNotice(`Revise ${invalid.length} arquivo(s) antes de enviar. Nenhum novo documento foi enviado.`);
      return;
    }
    if (!window.confirm(`Enviar ${pending.length} documento(s) para as fichas selecionadas? Todos ficarão pendentes de análise.`)) return;
    lock.current = true;
    setRunning(true);
    setNotice("");
    let success = 0;
    let failed = 0;
    try {
      for (const row of pending) {
        update(row.id, { status: "SENDING", message: "Enviando..." });
        try {
          const requirement = requirementsFor(athletes.find((a) => a.id === row.athleteId))
            .find((r) => r.id === row.requirementId);
          const form = new FormData();
          form.set("file", row.file);
          form.set("athleteId", row.athleteId);
          form.set("title", row.title.trim());
          if (requirement) form.set("requirementId", requirement.id);
          form.set("category", requirement?.documentCategory ?? row.category);
          if (requirement?.subject === "GUARDIAN" || (!requirement && row.guardianId)) {
            form.set("guardianId", row.guardianId);
          }
          if (row.issuedAt) form.set("issuedAt", row.issuedAt);
          if (row.expiresAt) form.set("expiresAt", row.expiresAt);
          const response = await fetch("/api/athlete-documents/upload", { method: "POST", body: form });
          const result = await response.json().catch(() => ({})) as { error?: string };
          if (!response.ok) throw new Error(result.error || `Erro HTTP ${response.status}`);
          update(row.id, { status: "SUCCESS", message: "Anexado — pendente de análise" });
          success++;
        } catch (err) {
          update(row.id, { status: "ERROR", message: err instanceof Error ? err.message : "Falha ao enviar" });
          failed++;
        }
      }
    } finally {
      lock.current = false;
      setRunning(false);
      setNotice(`${success} enviado(s); ${failed} falharam. Arquivos enviados permanecem registrados na ficha.`);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20, marginTop: 22 }}>
      <div className="actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" className={tab === "INDIVIDUAL" ? "btn" : "btn btn-secondary"} onClick={() => setTab("INDIVIDUAL")}>Individual</button>
        <button type="button" className={tab === "BATCH" ? "btn" : "btn btn-secondary"} onClick={() => setTab("BATCH")}>Em lote</button>
      </div>
      {tab === "INDIVIDUAL" ? (
        <section className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
          <h2>Documentos individuais</h2>
          <p className="muted">Selecione o atleta para utilizar a ficha documental existente, com aprovação, histórico e pendências.</p>
          <label>Atleta
            <select value={singleId} onChange={(e) => setSingleId(e.currentTarget.value)}>
              <option value="">Selecione um atleta</option>
              {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          {singleId && <Link className="btn" href={`/atletas/${singleId}/dados#documentos`}>Abrir documentos do atleta →</Link>}
        </section>
      ) : (
        <section className="card" style={{ padding: 20, display: "grid", gap: 16 }}>
          <h2>Envio de documentos em lote</h2>
          <p className="muted">Escolha vários arquivos. Para cada um, selecione o atleta e o requisito obrigatório correspondente. Nenhuma associação será feita automaticamente pelo nome do arquivo.</p>
          <label>Adicionar documentos (PDF, JPG, PNG — máximo 4 MB cada)
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple disabled={running}
              onChange={(e) => { addFiles(e.currentTarget.files); e.currentTarget.value = ""; }} />
          </label>
          {rows.map((row) => {
            const athlete = athletes.find((a) => a.id === row.athleteId);
            const requirements = requirementsFor(athlete);
            const requirement = requirements.find((r) => r.id === row.requirementId);
            const err = row.status === "SUCCESS" ? null : errorFor(row);
            return (
              <article key={row.id} style={{ border: "1px solid #dfe6ea", borderRadius: 12, padding: 15, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
                  <strong style={{ overflowWrap: "anywhere" }}>{row.file.name} · {(row.file.size / (1024 * 1024)).toFixed(2)} MB</strong>
                  <span>{row.status === "SUCCESS" ? "✓ Enviado" : row.status === "ERROR" ? "Falhou" : row.status === "SENDING" ? "Enviando" : "A preparar"}</span>
                </div>
                <div className="form-grid-2">
                  <label>Atleta
                    <select value={row.athleteId} disabled={running || row.status === "SUCCESS"} onChange={(e) => update(row.id, { athleteId: e.currentTarget.value, requirementId: "", guardianId: "", category: "", status: "READY" })}>
                      <option value="">Selecione o atleta</option>
                      {athletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </label>
                  <label>Documento exigido
                    <select value={row.requirementId} disabled={running || row.status === "SUCCESS" || !athlete} onChange={(e) => update(row.id, { requirementId: e.currentTarget.value, guardianId: "", status: "READY" })}>
                      <option value="">Outro documento / sem requisito</option>
                      {requirements.map((r) => <option key={r.id} value={r.id}>{r.label}{r.subject === "GUARDIAN" ? " (responsável)" : ""}</option>)}
                    </select>
                  </label>
                  <label>Título
                    <input value={row.title} disabled={running || row.status === "SUCCESS"} onChange={(e) => update(row.id, { title: e.currentTarget.value, status: "READY" })} />
                  </label>
                  <label>Tipo de documento
                    <select value={requirement?.documentCategory ?? row.category} disabled={running || row.status === "SUCCESS" || Boolean(requirement)} onChange={(e) => update(row.id, { category: e.currentTarget.value, status: "READY" })}>
                      <option value="">Selecione</option>
                      {Object.entries(types).map(([key, value]) => <option key={key} value={key}>{value}</option>)}
                    </select>
                  </label>
                  <label>Documento referente a
                    <select value={row.guardianId} disabled={running || row.status === "SUCCESS" || !athlete || requirement?.subject === "ATHLETE"}
                      onChange={(e) => update(row.id, { guardianId: e.currentTarget.value, status: "READY" })}>
                      <option value="">Atleta: {athlete?.name ?? "selecione atleta"}</option>
                      {athlete?.guardians.map((g) => <option key={g.id} value={g.id}>Responsável: {g.name}</option>)}
                    </select>
                  </label>
                  <label>Data de emissão
                    <input type="date" value={row.issuedAt} disabled={running || row.status === "SUCCESS"} onChange={(e) => update(row.id, { issuedAt: e.currentTarget.value, status: "READY" })} />
                  </label>
                  <label>Validade {requirement?.requiresExpiry ? "(obrigatória)" : ""}
                    <input type="date" value={row.expiresAt} disabled={running || row.status === "SUCCESS"} onChange={(e) => update(row.id, { expiresAt: e.currentTarget.value, status: "READY" })} />
                  </label>
                </div>
                {requirement?.instructions && <p className="muted">{requirement.instructions}</p>}
                {err && <p className="form-error">Pendente: {err}</p>}
                {row.message && <p role="status" className={row.status === "ERROR" ? "form-error" : "muted"}>{row.message}</p>}
                {row.status !== "SUCCESS" && <div><button type="button" className="btn btn-secondary" disabled={running} onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}>Remover da fila</button></div>}
              </article>
            );
          })}
          {notice && <p role="status" className="muted">{notice}</p>}
          {rows.length > 0 && <div className="actions" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" disabled={running || !rows.some((r) => r.status !== "SUCCESS")} onClick={send}>
              {running ? "Enviando, aguarde..." : `Conferir e enviar ${rows.filter((r) => r.status !== "SUCCESS").length} arquivo(s)`}
            </button>
            <button className="btn btn-secondary" type="button" disabled={running} onClick={() => { setRows((current) => current.filter((r) => r.status !== "SUCCESS")); setNotice(""); }}>Limpar enviados da lista</button>
          </div>}
          <small className="muted">Cada arquivo usa o endpoint privado existente e fica com status PENDENTE. O envio não substitui nem aprova documentos antigos.</small>
        </section>
      )}
    </div>
  );
}
