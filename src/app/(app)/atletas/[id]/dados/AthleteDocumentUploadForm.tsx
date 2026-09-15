"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GuardianOption = {
  id: string;
  name: string;
};

export default function AthleteDocumentUploadForm({
  athleteId,
  guardians,
}: {
  athleteId: string;
  guardians: GuardianOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/athlete-documents/upload", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || "Não foi possível anexar o arquivo.");
      }

      formRef.current?.reset();
      setMessage("Documento anexado com segurança.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível anexar o arquivo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="form"
      style={{ width: "100%", maxWidth: "none", marginTop: 18 }}
    >
      <input type="hidden" name="athleteId" value={athleteId} />

      <div className="form-grid-2">
        <label>
          Título do documento
          <input name="title" required placeholder="Ex.: Atestado médico 2026" />
        </label>

        <label>
          Categoria
          <select name="category" required defaultValue="">
            <option value="" disabled>Selecione</option>
            <option value="IDENTITY">Documento de identificação</option>
            <option value="MEDICAL_EXAM">Exame médico</option>
            <option value="MEDICAL_CLEARANCE">Atestado / liberação médica</option>
            <option value="AUTHORIZATION">Autorização</option>
            <option value="SPORTS_REGISTRATION">Registro esportivo</option>
            <option value="SCHOOL">Documento escolar</option>
            <option value="OTHER">Outro</option>
          </select>
        </label>

        <label>
          Documento referente a
          <select name="guardianId" defaultValue="">
            <option value="">Atleta</option>
            {guardians.map((guardian) => (
              <option key={guardian.id} value={guardian.id}>
                Responsável: {guardian.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Arquivo privado
          <input
            type="file"
            name="file"
            required
            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
          />
          <span className="help">PDF, JPG ou PNG, com até 4 MB.</span>
        </label>

        <label>
          Data de emissão
          <input type="date" name="issuedAt" />
        </label>

        <label>
          Data de validade
          <input type="date" name="expiresAt" />
        </label>
      </div>

      {message ? <p className="form-success" role="status">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <button type="submit" disabled={sending}>
        {sending ? "Enviando arquivo..." : "Anexar documento privado"}
      </button>
    </form>
  );
}
