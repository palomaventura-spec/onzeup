import Link from "next/link";
import ClubDocumentReview from "@/components/ClubDocumentReview";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";
import { replyClubDocumentConversation } from "./actions";

export const dynamic = "force-dynamic";

export default async function ClubDocumentInbox({ searchParams }: { searchParams: Promise<{ recipient?: string; view?: string }> }) {
  const user = await requireClubPermission("COMMUNICATION_MANAGE");
  const query = await searchParams;
  const recipients = await prisma.clubCommunicationRecipient.findMany({
    where: {
      communication: { organizationId: user.organizationId },
      athlete: { organizationId: user.organizationId, active: true },
      OR: [ { documentRequests: { some: {} } }, { messages: { some: {} } } ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true, createdAt: true,
      athlete: { select: { id: true, name: true } },
      communication: { select: { title: true, sentAt: true } },
      documentRequests: { select: { id: true, documentName: true, notificationKind: true }, orderBy: { createdAt: "desc" } },
      messages: { select: { id: true, senderType: true, body: true, createdAt: true, attachments: { select: { documentRequestId: true, athleteDocument: { select: { status: true, deletedAt: true } } } } }, orderBy: { createdAt: "desc" } },
    },
  });
  // A conversa encerra apenas quando todos os requisitos solicitados possuem
  // um anexo aprovado, sem excluir mensagens ou alterar o histórico.
  const isFinalized = (recipient: typeof recipients[number]) =>
    recipient.documentRequests.length > 0 && recipient.documentRequests.every(request => {
      const last = recipient.messages.flatMap(message => message.attachments)
        .find(attachment => attachment.documentRequestId === request.id && !attachment.athleteDocument.deletedAt);
      return last?.athleteDocument.status === "APPROVED";
    });
  const finalizedCount = recipients.filter(isFinalized).length;
  const view = query.view === "finalizadas" ? "finalizadas" : "abertas";
  const visibleRecipients = recipients.filter(recipient => view === "finalizadas" ? isFinalized(recipient) : !isFinalized(recipient));
  const chosen = visibleRecipients.find(r => r.id === query.recipient) ?? visibleRecipients[0];
  const conversation = chosen ? await prisma.clubCommunicationRecipient.findFirst({
    where: { id: chosen.id, communication: { organizationId: user.organizationId }, athlete: { organizationId: user.organizationId, active: true } },
    select: {
      id: true,
      athlete: { select: { id: true, name: true } },
      communication: { select: { title: true, body: true } },
      documentRequests: { orderBy: { createdAt: "asc" }, select: { id: true, documentName: true, notificationKind: true } },
      messages: { orderBy: { createdAt: "asc" }, select: {
        id: true, senderType: true, body: true, createdAt: true,
        attachments: { select: { id: true, documentRequestId: true, athleteDocument: { select: { id: true, title: true, originalFileName: true, status: true, createdAt: true, deletedAt: true, expiresAt: true, issuedAt: true } } } },
      } },
    },
  }) : null;
  const panel = { padding: 20, border: "1px solid #d3dae3", borderRadius: 14 };
  return <main style={{ maxWidth: 1150, margin: "0 auto", padding: 24 }}>
    <p><Link href="/comunicacao">← Voltar à Comunicação</Link></p>
    <h1>Central de Documentos</h1>
    <nav aria-label="Situação das conversas documentais" style={{ display: "flex", gap: 16, marginBottom: 16 }}>
      <Link href="/comunicacao/documentos?view=abertas" aria-current={view === "abertas" ? "page" : undefined}>Em andamento ({recipients.length - finalizedCount})</Link>
      <Link href="/comunicacao/documentos?view=finalizadas" aria-current={view === "finalizadas" ? "page" : undefined}>Finalizadas ({finalizedCount})</Link>
    </nav>
    <p>Histórico de solicitações, mensagens e arquivos enviados pelos responsáveis. Analise os anexos recebidos nesta conversa ou acesse a ficha completa do atleta.</p>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2fr)", gap: 18 }}>
      <aside style={panel}><h2>{view === "finalizadas" ? "Finalizadas" : "Em andamento"} ({visibleRecipients.length})</h2>
        {visibleRecipients.length === 0 && <p>Nenhuma conversa nesta situação.</p>}
        {visibleRecipients.map(r => <p key={r.id} style={{ padding: "10px 0", borderBottom: "1px solid #ddd" }}>
          <Link href={`/comunicacao/documentos?view=${view}&recipient=${encodeURIComponent(r.id)}`}><strong>{r.athlete.name}</strong></Link><br />
          <small>{r.communication.title}</small><br />
          <small>{r.messages[0] ? `${r.messages[0].senderType === "PLAYER" ? "Responsável" : "Clube"}: ${r.messages[0].body.slice(0, 80)}` : r.documentRequests.length + " solicitações"}</small>
        </p>)}
      </aside>
      <section style={panel}>
        {!conversation ? <p>Selecione uma conversa.</p> : <>
          <h2>{conversation.athlete.name}</h2>
          {view === "finalizadas" && <p role="status" style={{ color: "#207245", fontWeight: 700 }}>✓ Solicitação documental finalizada — todos os documentos foram aprovados. Histórico preservado.</p>}<p><strong>{conversation.communication.title}</strong></p>
          <p>{conversation.communication.body}</p>
          <h3>Documentos solicitados</h3>
          {conversation.documentRequests.length === 0 && <p>Nenhum requisito documental vinculado.</p>}
          <ul>{conversation.documentRequests.map(r => {
            const uploaded = conversation.messages.flatMap(m => m.attachments)
              .filter(a => a.documentRequestId === r.id && !a.athleteDocument.deletedAt);
            const last = uploaded[uploaded.length - 1]?.athleteDocument;
            const status = last?.status === "PENDING" ? "Em análise"
              : last?.status === "APPROVED" ? "Aprovado"
              : last?.status === "REJECTED" ? "Rejeitado"
              : ({ MISSING: "Não enviado", EXPIRED: "Vencido", REJECTED: "Rejeitado", EXPIRING: "A vencer", REVIEW: "Em análise" } as Record<string,string>)[r.notificationKind] ?? "Conferir";
            return <li key={r.id}>{r.documentName} — {status}</li>;
          })}</ul>
          <h3>Histórico da conversa</h3>
          {conversation.messages.length === 0 && <p>Sem respostas até o momento.</p>}
          {conversation.messages.map(m => <article key={m.id} style={{ padding: 12, marginBottom: 12, border: "1px solid #ddd", borderRadius: 10 }}>
            <strong>{m.senderType === "CLUB" ? "Clube" : "Responsável"}</strong> <small>{m.createdAt.toLocaleString("pt-BR")}</small>
            <p style={{ whiteSpace: "pre-wrap" }}>{m.body}</p>
            {m.attachments.map(a => <div key={a.id}>
              <strong>Arquivo:</strong> {a.athleteDocument.title} — {({ PENDING: "Em análise", APPROVED: "Aprovado", REJECTED: "Rejeitado", EXPIRED: "Vencido" } as Record<string,string>)[a.athleteDocument.status] ?? a.athleteDocument.status}<br />
              {a.athleteDocument.deletedAt ? <small>Documento removido.</small> : <>
                <a href={`/api/athlete-documents/${encodeURIComponent(a.athleteDocument.id)}`} target="_blank" rel="noopener noreferrer">Abrir {a.athleteDocument.originalFileName}</a>
                <ClubDocumentReview documentId={a.athleteDocument.id} status={a.athleteDocument.status} issuedAt={a.athleteDocument.issuedAt?.toISOString().slice(0,10) ?? ""} expiresAt={a.athleteDocument.expiresAt?.toISOString().slice(0,10) ?? ""} />
              </>}
            </div>)}
          </article>)}
          {view === "abertas" && <form action={replyClubDocumentConversation} style={{ display: "grid", gap: 8 }}>
            <input type="hidden" name="recipientId" value={conversation.id}/>
            <label htmlFor="club-reply">Responder ao responsável</label>
            <textarea id="club-reply" name="body" required maxLength={3000} rows={4} style={{ padding: 10, width: "100%" }}/>
            <button type="submit" style={{ padding: 12, cursor: "pointer" }}>Enviar resposta</button>
          </form>}
          <p><Link href={`/atletas/${encodeURIComponent(conversation.athlete.id)}`}>Abrir ficha do atleta para analisar documentos →</Link></p>
        </>}
      </section>
    </div>
  </main>;
}
