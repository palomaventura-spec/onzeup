"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function PlayerDocumentUpload({ recipientId, documentRequestId }: { recipientId: string; documentRequestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  return <form encType="multipart/form-data" onSubmit={async event => {
    event.preventDefault();
    if (pending) return;
    setPending(true); setNotice("");
    try {
      const payload = new FormData(event.currentTarget);
      const res = await fetch("/api/player/document-communications/upload", { method: "POST", body: payload });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || "Falha no envio.");
      setNotice("Documento recebido e encaminhado para análise do clube.");
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } catch (error) { setNotice(error instanceof Error ? error.message : "Falha no envio."); }
    finally { setPending(false); }
  }} style={{ display: "grid", gap: 8, marginTop: 12 }}>
    <input name="recipientId" type="hidden" value={recipientId}/>
    <input name="documentRequestId" type="hidden" value={documentRequestId}/>
    <label>Arquivo (PDF, JPG ou PNG, até 4 MB)<input name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required disabled={pending} /></label>
    <label>Data de emissão (se houver)<input name="issuedAt" type="date" disabled={pending}/></label>
    <label>Validade (quando exigida pelo clube)<input name="expiresAt" type="date" disabled={pending}/></label>
    <button type="submit" className="btn-secondary btn-small" disabled={pending}>{pending ? "Enviando…" : "Enviar documento"}</button>
    {notice && <small role="status">{notice}</small>}
  </form>;
}
