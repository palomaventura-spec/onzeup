import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { formatSupportDate, SUPPORT_STATUS_LABEL } from "@/lib/support-status";
import { changeSupportTicketStatus, replySupportTicket } from "@/app/suporte/actions";
import s from "../../../suporte/SupportCenter.module.css";

export default async function AdminTicketDetails({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const query = await searchParams;
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      requester: { select: { name: true, email: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, role: true } } } },
    },
  });
  if (!ticket) notFound();
  return (
    <main className={s.page}>
      <div className={s.hero}>
        <div><span className={s.eyebrow}>SUPER ADMIN · CHAMADO</span><h1 className={s.heading}>{ticket.subject}</h1>
          <p className={s.note}>{ticket.requester.name} · {ticket.requester.email} · {ticket.area === "PLAYER" ? "11UP Player" : "11UP Club"} {ticket.organizationName ? `· ${ticket.organizationName}` : ""}</p>
        </div>
        <Link href="/admin/chamados" className={s.back}>← Todos os chamados</Link>
      </div>
      {query.erro ? <p className={s.error} role="alert">{query.erro === "anexo" ? "Anexo inválido ou maior que 300 KB." : "Confira sua mensagem."}</p> : null}
      <section className={s.panel}>
        <h2>Situação do chamado</h2>
        <div className={s.flex}>
          <span className={s.pill}>{SUPPORT_STATUS_LABEL[ticket.status]}</span>
          <form action={changeSupportTicketStatus} className={s.flex}>
            <input type="hidden" name="ticketId" value={ticket.id}/>
            <label htmlFor="ticket-status">Atualizar status</label>
            <select name="status" id="ticket-status" defaultValue={ticket.status} className={s.select}>
              {(["OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"] as const).map((status) => (
                <option value={status} key={status}>{SUPPORT_STATUS_LABEL[status]}</option>
              ))}
            </select>
            <PendingSubmitButton pendingText="Atualizando..." className={s.submit}>Atualizar</PendingSubmitButton>
          </form>
        </div>
      </section>
      <section className={s.messages} aria-label="Histórico do atendimento">
        {ticket.messages.map((message) => (
          <article className={`${s.message} ${message.author?.role === "SUPER_ADMIN" ? s.staff : ""}`} key={message.id}>
            <div className={s.messageHeader}><strong>{message.author?.role === "SUPER_ADMIN" ? "Suporte 11UP" : message.author?.name || "Usuário"}</strong><time>{formatSupportDate(message.createdAt)}</time></div>
            <div className={s.body}>{message.body}</div>
            {message.attachmentData ? <a className={s.attachment} href={`/api/suporte/anexo/${message.id}`}>📎 Ver imagem anexada</a> : null}
          </article>
        ))}
      </section>
      <section className={s.panel}>
        <h2>Responder ao usuário</h2>
        <form action={replySupportTicket}>
          <input type="hidden" name="ticketId" value={ticket.id}/>
          <label className={s.field}>Resposta<textarea name="body" minLength={2} maxLength={4000} className={s.textarea} required/></label>
          <label className={s.field}>Captura de tela (opcional)<input type="file" name="attachment" accept="image/png,image/jpeg,image/webp" className={s.input}/></label>
          <p className={s.subtle}>Ao responder, o chamado muda automaticamente para Respondido.</p>
          <PendingSubmitButton pendingText="Enviando..." className={s.submit}>Enviar resposta</PendingSubmitButton>
        </form>
      </section>
    </main>
  );
}
