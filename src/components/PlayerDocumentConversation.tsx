import PlayerDocumentUpload from "@/components/PlayerDocumentUpload";

type RequestItem = { id: string; documentName: string; notificationKind: string; description: string | null; requirementId?: string | null };
type MessageItem = { id: string; senderType: "CLUB" | "PLAYER"; body: string; createdAt: Date; attachments?: Array<{ id: string; athleteDocumentId: string; documentRequestId: string | null; athleteDocument: { status: string; originalFileName: string } }> };
const statuses: Record<string, string> = { MISSING: "Não enviado", EXPIRED: "Vencido", REJECTED: "Rejeitado", EXPIRING: "Próximo do vencimento", REVIEW: "Em análise" };
export default function PlayerDocumentConversation({ recipientId, requests, messages }: {
  recipientId: string; requests: RequestItem[]; messages: MessageItem[];
}) {
  if (!requests.length && !messages.length) return null;
  const allApproved = requests.length > 0 && requests.every(request =>
    messages.some(message => (message.attachments ?? []).some(attachment =>
      attachment.documentRequestId === request.id && attachment.athleteDocument.status === "APPROVED"
    ))
  );
  return <section style={{ display: "grid", gap: 12, marginTop: 16, borderTop: "1px solid #7774", paddingTop: 16 }}>
    {allApproved && <p role="status" style={{ color: "#70c99d", fontWeight: 700 }}>✓ Solicitação documental finalizada. Todos os documentos foram aprovados pelo clube.</p>}
    {requests.length > 0 && <div><h3>Documentos solicitados</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {requests.map(r => {
          const all = messages.flatMap(m => (m.attachments ?? []).filter(a => a.documentRequestId === r.id).map(a => a.athleteDocument));
          const latest = all[all.length - 1];
          const state = latest?.status === "PENDING" ? "Em análise" : latest?.status === "APPROVED" ? "Aprovado" : latest?.status === "REJECTED" ? "Rejeitado" : latest?.status ? latest.status : statuses[r.notificationKind] ?? "Conferir";
          const canSend = Boolean(r.requirementId) && (!["PENDING", "APPROVED"].includes(latest?.status ?? "")) && ["MISSING", "EXPIRED", "REJECTED", "EXPIRING"].includes(r.notificationKind);
          return <div key={r.id} style={{ padding: 12, border: "1px solid #7774", borderRadius: 8 }}>
            <strong>{r.documentName}</strong> <small>— {state}</small>
            {r.description && latest?.status !== "APPROVED" && <p>{r.description}</p>}
            {canSend ? <PlayerDocumentUpload recipientId={recipientId} documentRequestId={r.id} /> : <small>{latest?.status === "PENDING" ? "Documento recebido. Aguarde a análise do clube." : latest?.status === "APPROVED" ? "Documento aprovado pelo clube." : "Consulte o clube para regularizar esta solicitação."}</small>}
          </div>;
        })}
      </div>
    </div>}
    <div><h3>Histórico da conversa</h3>
      {messages.length === 0 ? <p className="muted">Nenhuma resposta registrada.</p> : messages.map(m => <article key={m.id} style={{ padding: 12, border: "1px solid #7774", borderRadius: 8, marginBottom: 8 }}>
        <small>{m.senderType === "CLUB" ? "Clube" : "Responsável"} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(m.createdAt)}</small>
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{m.body}</p>
        {m.attachments?.map(a => <p key={a.id}><small>{a.athleteDocument.originalFileName} — {a.athleteDocument.status === "PENDING" ? "Aguardando análise" : (({ APPROVED: "Aprovado", REJECTED: "Rejeitado", EXPIRED: "Vencido" } as Record<string, string>)[a.athleteDocument.status] ?? a.athleteDocument.status)}</small></p>)}
      </article>)}
    </div>
  </section>;
}
