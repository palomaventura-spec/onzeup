"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = { documentId: string; status: string; issuedAt: string; expiresAt: string };
export default function ClubDocumentReview({ documentId, status, issuedAt: initialIssuedAt, expiresAt: initialExpiresAt }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [issuedAt, setIssuedAt] = useState(initialIssuedAt);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt);
  const [reason, setReason] = useState("");
  if (status !== "PENDING") return <p><small>{status === "APPROVED" ? "Aprovado" : status === "REJECTED" ? "Rejeitado" : status}</small></p>;
  async function decide(action: "APPROVE" | "REJECT") {
    if (busy) return;
    if (action === "REJECT" && !reason.trim()) { setError("Informe o motivo da rejeição."); return; }
    if (!window.confirm(action === "APPROVE" ? "Confirmar aprovação deste documento?" : "Confirmar rejeição deste documento?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/athlete-documents/${encodeURIComponent(documentId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, issuedAt: issuedAt || null, expiresAt: expiresAt || null, rejectionReason: reason.trim() }) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível analisar o documento.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha na análise do documento."); }
    finally { setBusy(false); }
  }
  return <div style={{ display: "grid", gap: 8, marginTop: 10, padding: 12, border: "1px solid #7774", borderRadius: 8 }}>
    <strong>Aguardando análise</strong>
    <label>Emissão (se houver) <input type="date" value={issuedAt} onChange={e=>setIssuedAt(e.target.value)} disabled={busy} /></label>
    <label>Validade (quando exigida) <input type="date" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} disabled={busy} /></label>
    <button type="button" disabled={busy} onClick={()=>void decide("APPROVE")}>Aprovar documento</button>
    <label>Motivo da rejeição <textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={500} rows={2} disabled={busy} /></label>
    <button type="button" disabled={busy || !reason.trim()} onClick={()=>void decide("REJECT")}>Rejeitar documento</button>
    {error && <p role="alert" style={{ color: "#de5858" }}>{error}</p>}
  </div>;
}
