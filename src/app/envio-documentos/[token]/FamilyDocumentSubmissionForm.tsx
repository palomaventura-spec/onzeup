"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type RequestedDocument = { key: string; label: string; received: boolean };

export default function FamilyDocumentSubmissionForm({
  token,
  requestedDocuments,
}: {
  token: string;
  requestedDocuments: RequestedDocument[];
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const complete = requestedDocuments.length > 0 && requestedDocuments.every((item) => item.received);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/athlete-registration-requests/${token}/upload`, {
        method: "POST",
        body: new FormData(formElement),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o arquivo.");
      formElement.reset();
      setMessage("Arquivo recebido com segurança.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar o arquivo.");
    } finally {
      setSending(false);
    }
  }

  async function finish() {
    setFinishing(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/athlete-registration-requests/${token}/upload`, { method: "PATCH" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Não foi possível finalizar.");
      setMessage("Documentos enviados ao clube para conferência.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível finalizar.");
    } finally {
      setFinishing(false);
    }
  }

  return (
    <>
      <section className="card" style={{ marginTop: 18 }}>
        <span className="page-eyebrow">DOCUMENTOS SOLICITADOS</span>
        <h2>Lista de envio</h2>
        <div className="stack" style={{ marginTop: 14 }}>
          {requestedDocuments.map((item) => (
            <div
              key={item.key}
              style={{
                border: "1px solid var(--line)",
                borderRadius: 10,
                padding: 13,
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) 112px",
                alignItems: "center",
                gap: 12,
              }}
            >
              <strong style={{ minWidth: 0 }}>{item.label}</strong>
              <span
                className="badge"
                style={{
                  width: 112,
                  minWidth: 112,
                  justifyContent: "center",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                {item.received ? "Recebido" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="page-eyebrow">ENVIO PROTEGIDO</span>
        <h2>Anexar documento</h2>
        <p className="muted">Envie um arquivo por vez. São aceitos PDF, JPG e PNG com até 4 MB.</p>
        <form onSubmit={upload} className="form" style={{ width: "100%", maxWidth: "none", marginTop: 16 }}>
          <div className="form-grid-2">
            <label>
              Tipo de documento
              <select name="requestItemKey" required defaultValue="">
                <option value="" disabled>Selecione</option>
                {requestedDocuments.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}
              </select>
            </label>
            <label>Título<input name="title" required placeholder="Ex.: Atestado médico setembro/2026" /></label>
            <label>Data de emissão<input type="date" name="issuedAt" /></label>
            <label>Data de validade<input type="date" name="expiresAt" /></label>
            <label style={{ gridColumn: "1 / -1" }}>
              Arquivo
              <input type="file" name="file" required accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" />
            </label>
          </div>
          <button type="submit" disabled={sending}>{sending ? "Enviando..." : "Enviar arquivo"}</button>
        </form>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Finalizar envio</h2>
        <p className="muted">Após finalizar, o link será encerrado e os arquivos seguirão para conferência do clube.</p>
        {message ? <p className="form-success" role="status">{message}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <button type="button" onClick={finish} disabled={!complete || finishing} style={{ marginTop: 12 }}>
          {finishing ? "Finalizando..." : complete ? "Finalizar e enviar ao clube" : "Envie todos os documentos para finalizar"}
        </button>
      </section>
    </>
  );
}
