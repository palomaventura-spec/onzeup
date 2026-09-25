"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DocumentItem = {
  id: string;
  title: string;
  originalFileName: string;
  categoryLabel: string;
  subjectLabel: string;
  status: string;
  sizeLabel: string;
  createdAtLabel: string;
  issuedAt: string;
  expiresAt: string;
  rejectionReason: string | null;
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  EXPIRED: "Vencido",
  ARCHIVED: "Arquivado",
};

export default function AthleteDocumentManager({ documents }: { documents: DocumentItem[] }) {
  const router = useRouter();
  const [dates, setDates] = useState<Record<string, { issuedAt: string; expiresAt: string }>>(
    Object.fromEntries(documents.map((item) => [item.id, { issuedAt: item.issuedAt, expiresAt: item.expiresAt }]))
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function update(documentId: string, action: string, rejectionReason?: string) {
    setBusy(documentId);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/athlete-documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...dates[documentId], rejectionReason }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível atualizar.");

      const successMessages: Record<string, string> = {
        UPDATE_DATES: "Datas do documento atualizadas com sucesso.",
        APPROVE: "Documento aprovado com sucesso.",
        REJECT: "Documento rejeitado. O motivo foi registrado.",
        ARCHIVE: "Documento arquivado com sucesso.",
      };

      setMessage(
        successMessages[action] ||
          "Documento atualizado com sucesso.",
      );

      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível atualizar.");
    } finally {
      setBusy(null);
    }
  }

  async function reject(documentId: string) {
    const reason = window.prompt("Informe o motivo da rejeição:")?.trim();
    if (reason) await update(documentId, "REJECT", reason);
  }

  async function remove(documentId: string) {
    if (!window.confirm("Excluir definitivamente este arquivo privado? Esta ação não poderá ser desfeita.")) return;
    setBusy(documentId);
    setError("");
    try {
      const response = await fetch(`/api/athlete-documents/${documentId}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível excluir.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível excluir.");
    } finally {
      setBusy(null);
    }
  }

  if (!documents.length) return <p className="muted" style={{ marginTop: 18 }}>Nenhum documento ou exame anexado.</p>;

  return (
    <div className="stack" style={{ marginTop: 22 }}>
      {message ? (
        <div
          className="form-success"
          role="status"
          style={{ padding: 14, borderRadius: 10, fontWeight: 700 }}
        >
          ✓ {message}
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {documents.map((document) => (
        <article key={document.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, flexWrap: "wrap" }}>
            <div>
              <strong style={{ display: "block", fontSize: 17 }}>{document.title}</strong>
              <span className="help">{document.originalFileName} • {document.sizeLabel}</span>
              <span className="help" style={{ display: "block", marginTop: 4 }}>
                {document.subjectLabel} • {document.categoryLabel} • Enviado em {document.createdAtLabel}
              </span>
            </div>
            <span className="badge" style={{ minWidth: 100, justifyContent: "center" }}>{statusLabels[document.status] || document.status}</span>
          </div>

          {document.rejectionReason ? <p className="form-error">Motivo: {document.rejectionReason}</p> : null}

          <div className="form-grid-2" style={{ marginTop: 14 }}>
            <label>Data de emissão<input type="date" value={dates[document.id]?.issuedAt || ""} onChange={(event) => setDates((current) => ({ ...current, [document.id]: { ...current[document.id], issuedAt: event.target.value } }))} /></label>
            <label>Data de validade<input type="date" value={dates[document.id]?.expiresAt || ""} onChange={(event) => setDates((current) => ({ ...current, [document.id]: { ...current[document.id], expiresAt: event.target.value } }))} /></label>
          </div>

          <div className="actions" style={{ marginTop: 14, flexWrap: "wrap" }}>
            <a className="btn btn-secondary" href={`/api/athlete-documents/${document.id}`} target="_blank" rel="noreferrer">Abrir arquivo</a>
            <button type="button" className="btn btn-secondary" disabled={busy === document.id} onClick={() => update(document.id, "UPDATE_DATES")}>Salvar datas</button>
            <button type="button" disabled={busy === document.id} onClick={() => update(document.id, "APPROVE")}>Aprovar</button>
            <button type="button" className="btn btn-secondary" disabled={busy === document.id} onClick={() => reject(document.id)}>Rejeitar</button>
            <button type="button" className="btn btn-secondary" disabled={busy === document.id} onClick={() => update(document.id, "ARCHIVE")}>Arquivar</button>
            <button type="button" className="btn btn-secondary" disabled={busy === document.id} onClick={() => remove(document.id)}>Excluir</button>
          </div>
        </article>
      ))}
    </div>
  );
}
