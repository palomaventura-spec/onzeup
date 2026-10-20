"use client";

import { useId, useRef, useState, type FormEvent } from "react";

type Props = { scheduleId: string; playerId: string };

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
// A interface e o servidor têm travas independentes. Ambas devem ser habilitadas
// apenas após migration, revisão das permissões e testes em homologação.
const submissionsEnabled = process.env.NEXT_PUBLIC_TRAINING_ABSENCE_SUBMISSIONS_ENABLED === "true";

export default function JustificarFaltaForm({ scheduleId, playerId }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("DOENCA");
  const [details, setDetails] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const formId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submissionsEnabled || sending || success) return;
    setError("");
    if (reason === "OUTRO" && !details.trim()) {
      setError("Explique o motivo da ausência.");
      return;
    }
    if (file && (file.size > MAX_FILE_SIZE || !ALLOWED_TYPES.has(file.type))) {
      setError("O comprovante deve ser PDF, JPG ou PNG com até 4 MB.");
      return;
    }
    setSending(true);
    try {
      const data = new FormData();
      data.set("scheduleId", scheduleId);
      data.set("playerId", playerId);
      data.set("reason", reason);
      data.set("details", details.trim());
      if (file) data.set("file", file);
      const response = await fetch("/api/player/training-absence-requests", {
        method: "POST",
        body: data,
        credentials: "same-origin",
        cache: "no-store",
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
          ? result.error : "Não foi possível enviar a justificativa. Tente novamente.";
        setError(message);
        return;
      }
      setSuccess(true);
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  const fieldStyle = { borderRadius: 8, padding: 10, background: "#0b1821", color: "#fff", border: "1px solid #42535e" };
  return (
    <section style={{ marginTop: 14, borderTop: "1px solid #30434e", paddingTop: 12 }} aria-label="Justificativa de ausência">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls={formId}
        style={{ background: "transparent", border: "1px solid #9ed92b", color: "#caef82", borderRadius: 9, padding: "9px 12px", fontWeight: 700, cursor: "pointer" }}>
        {open ? "Fechar justificativa" : "Justificar falta"}
      </button>
      {open ? (
        <form id={formId} onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 14 }}>
          {!submissionsEnabled ? (
            <p style={{ margin: 0, color: "#d9e5ea" }}>Formulário em preparação — ainda não é possível enviar solicitações.</p>
          ) : null}
          {success ? (
            <p role="status" style={{ margin: 0, color: "#caef82" }}>Justificativa enviada! Aguarde a análise do clube.</p>
          ) : (
            <>
              <label htmlFor={`${formId}-reason`} style={{ fontSize: 13, fontWeight: 700 }}>Motivo da ausência</label>
              <select id={`${formId}-reason`} value={reason} onChange={(event) => setReason(event.target.value)} disabled={sending || !submissionsEnabled} style={fieldStyle}>
                <option value="DOENCA">Saúde / consulta médica</option>
                <option value="ESCOLAR">Compromisso escolar</option>
                <option value="FAMILIAR">Compromisso familiar</option>
                <option value="OUTRO">Outro motivo</option>
              </select>
              <label htmlFor={`${formId}-details`} style={{ fontSize: 13, fontWeight: 700 }}>Observações</label>
              <textarea id={`${formId}-details`} value={details} onChange={(event) => setDetails(event.target.value)} maxLength={1000} rows={3}
                disabled={sending || !submissionsEnabled} style={{ ...fieldStyle, resize: "vertical" }} placeholder="Informe os detalhes da ausência" />
              <label htmlFor={`${formId}-file`} style={{ fontSize: 13, fontWeight: 700 }}>Comprovante opcional (PDF, JPG ou PNG, até 4 MB)</label>
              <input ref={fileRef} id={`${formId}-file`} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                disabled={sending || !submissionsEnabled} aria-describedby={`${formId}-help`}
                onChange={(event) => { setError(""); setFile(event.target.files?.[0] ?? null); }} />
              <p id={`${formId}-help`} style={{ fontSize: 12, color: "#b4c6cf", margin: 0 }}>
                {submissionsEnabled ? "O comprovante será enviado de forma privada ao clube." : "O anexo e o envio serão habilitados após os testes e a ativação do serviço."}
              </p>
              {error ? <p role="alert" style={{ color: "#ffb4b4", margin: 0 }}>{error}</p> : null}
              <button type="submit" disabled={sending || !submissionsEnabled}
                style={{ borderRadius: 8, padding: 10, border: 0, background: submissionsEnabled ? "#9ed92b" : "#486528", color: submissionsEnabled ? "#112016" : "#e1e8da", cursor: sending || !submissionsEnabled ? "not-allowed" : "pointer", fontWeight: 700 }}>
                {sending ? "Enviando..." : submissionsEnabled ? "Enviar justificativa" : "Enviar justificativa (em desenvolvimento)"}
              </button>
            </>
          )}
        </form>
      ) : null}
    </section>
  );
}
