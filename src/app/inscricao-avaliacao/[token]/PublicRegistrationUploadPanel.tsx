"use client";

import { useState, type FormEvent } from "react";

type Requirement = {
  id: string;
  label: string;
  owner: "ATHLETE" | "FATHER" | "MOTHER" | "GUARDIAN";
  required: boolean;
  expires: boolean;
};

type Props = {
  token: string;
  submissionId: string;
  uploadCredential: string;
  uploadCredentialExpiresAt: string;
  requirements: Requirement[];
};

const ownerLabels: Record<Requirement["owner"], string> = {
  ATHLETE: "Atleta",
  FATHER: "Pai",
  MOTHER: "Mãe",
  GUARDIAN: "Responsável",
};

type Uploaded = Record<string, boolean>;

export default function PublicRegistrationUploadPanel({
  token, submissionId, uploadCredential, uploadCredentialExpiresAt, requirements,
}: Props) {
  const [uploaded, setUploaded] = useState<Uploaded>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoDone, setPhotoDone] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [expires, setExpires] = useState<Record<string, string>>({});
  const [serviceUnavailable, setServiceUnavailable] = useState(false);

  const expired = new Date(uploadCredentialExpiresAt).getTime() <= Date.now();
  const missingCount = requirements.filter(r => r.required && !uploaded[r.id]).length;

  async function upload(event: FormEvent, kind: "PHOTO" | "DOCUMENT", requirement?: Requirement) {
    event.preventDefault();
    const key = requirement?.id || "photo";
    const file = kind === "PHOTO" ? photoFile : files[key];
    if (!file || busy || finalized) return;
    if (file.size < 1 || file.size > 4 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, [key]: "Selecione um arquivo de até 4 MB." }));
      return;
    }
    setBusy(key);
    setErrors(prev => ({ ...prev, [key]: "" }));
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      form.set("submissionId", submissionId);
      form.set("uploadCredential", uploadCredential);
      if (requirement) {
        form.set("requirementId", requirement.id);
        if (requirement.expires) form.set("expiresAt", expires[key] || "");
      }
      const response = await fetch(`/api/club-public-registration/${encodeURIComponent(token)}/upload`, {
        method: "POST",
        body: form,
        cache: "no-store",
      });
      const result = await response.json() as { error?: string };
      if (response.status === 503) setServiceUnavailable(true);
      if (!response.ok) throw new Error(result.error || "Não foi possível enviar o arquivo.");
      if (kind === "PHOTO") setPhotoDone(true);
      else setUploaded(prev => ({ ...prev, [key]: true }));
    } catch (error) {
      setErrors(prev => ({ ...prev, [key]: error instanceof Error ? error.message : "Falha no envio." }));
    } finally {
      setBusy(null);
    }
  }

  async function finishRegistration() {
    if (busy || finishing || expired) return;
    setFinishing(true);
    setFinishError("");
    try {
      const response = await fetch(`/api/club-public-registration/${encodeURIComponent(token)}/finish`, {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
        body: JSON.stringify({ submissionId, uploadCredential }),
      });
      const result = await response.json() as { error?: string };
      if (response.status === 503) setServiceUnavailable(true);
      if (!response.ok) throw new Error(result.error || "NÃ£o foi possÃ­vel finalizar.");
      setFinalized(true);
    } catch (error) {
      setFinishError(error instanceof Error ? error.message : "Falha ao finalizar.");
    } finally { setFinishing(false); }
  }
  return (
    <section className="card" style={{ marginTop: 18 }}>
      <h2>Foto e documentos da inscrição</h2>
      <p className="muted">Sua ficha foi recebida. Os arquivos serão analisados pelo clube e não significam aprovação esportiva.</p>
      {serviceUnavailable && <p role="status" className="form-error">O envio de arquivos ainda não foi habilitado pelo 11UP. Você pode finalizar a ficha agora e entregar a documentação posteriormente ao clube.</p>}
      {expired && <p role="status" className="form-error">O prazo de envio de arquivos terminou. Não compartilhe sua credencial; solicite uma nova orientação ao clube.</p>}
      <form onSubmit={e => upload(e, "PHOTO")} style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 16 }}>
        <h3>Foto do atleta (opcional)</h3>
        <label>JPG, PNG ou WEBP, até 4 MB
          <input aria-label="Selecionar foto do atleta" type="file" accept="image/jpeg,image/png,image/webp" disabled={photoDone || busy !== null || expired || serviceUnavailable} onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
        </label>
        {errors.photo && <p role="alert" className="form-error">{errors.photo}</p>}
        {photoDone ? <p role="status" className="form-success">Foto enviada para análise.</p> : <button type="submit" disabled={!photoFile || busy !== null || expired || serviceUnavailable}>{busy === "photo" ? "Enviando..." : "Enviar foto"}</button>}
      </form>
      {requirements.map(requirement => (
        <form key={requirement.id} onSubmit={e => upload(e, "DOCUMENT", requirement)} style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 16 }}>
          <h3>{requirement.label}</h3>
          <p className="muted">{ownerLabels[requirement.owner]} · {requirement.required ? "Obrigatório" : "Opcional"}{requirement.expires ? " · Exige validade" : ""}</p>
          <label>Selecionar documento (PDF, JPG ou PNG, até 4 MB)
            <input type="file" accept="application/pdf,image/jpeg,image/png" disabled={!!uploaded[requirement.id] || busy !== null || expired || serviceUnavailable} onChange={e => setFiles(prev => ({ ...prev, [requirement.id]: e.target.files?.[0] || null }))} />
          </label>
          {requirement.expires && <label>Validade do documento
            <input type="date" required value={expires[requirement.id] || ""} onChange={e => setExpires(prev => ({ ...prev, [requirement.id]: e.target.value }))} disabled={!!uploaded[requirement.id] || busy !== null || expired || serviceUnavailable} />
          </label>}
          {errors[requirement.id] && <p role="alert" className="form-error">{errors[requirement.id]}</p>}
          {uploaded[requirement.id] ? <p role="status" className="form-success">Documento recebido, aguardando análise.</p> : <button type="submit" disabled={!files[requirement.id] || busy !== null || expired || serviceUnavailable}>{busy === requirement.id ? "Enviando..." : "Enviar documento"}</button>}
        </form>
      ))}
      <p style={{ marginTop: 20 }} role="status">{missingCount === 0 ? "Documentos solicitados enviados, sujeitos à conferência do clube." : `${missingCount} documento(s) obrigatório(s) ainda não enviado(s). Eles permanecerão pendentes e não impedem o envio da inscrição.`}</p>
      {finalized ? <p className="form-success" role="status">InscriÃ§Ã£o completa e enviada para anÃ¡lise do clube.</p> : (
        <div style={{ marginTop: 16 }}>
          <button type="button" onClick={finishRegistration} disabled={busy !== null || finishing || expired}>
            {finishing ? "Finalizando..." : "Enviar ficha e registrar pendências"}
          </button>
          {finishError && <p className="form-error" role="alert">{finishError}</p>}
        </div>
      )}      <small className="muted">Esta tela não oferece acesso posterior por link público. Não compartilhe o endereço nem a credencial de envio. A liberação do upload depende da validação do 11UP.</small>
    </section>
  );
}
