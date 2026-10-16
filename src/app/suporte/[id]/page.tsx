import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { SUPPORT_STATUS_LABEL, formatSupportDate } from "@/lib/support-status";
import { replySupportTicket } from "../actions";
import s from "../SupportCenter.module.css";

export default async function SupportTicketDetails({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "SUPER_ADMIN") redirect("/admin/chamados");
  const { id } = await params;
  const query = await searchParams;
  const ticket = await prisma.supportTicket.findFirst({
    where: { id, requesterId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, role: true } } } } },
  });
  if (!ticket) notFound();
  return (
    <main className={s.page}>
      <div className={s.hero}>
        <div><span className={s.eyebrow}>MEU CHAMADO</span><h1 className={s.heading}>{ticket.subject}</h1>
          <div className={s.flex}><span className={s.pill}>{SUPPORT_STATUS_LABEL[ticket.status]}</span><span className={s.meta}>Aberto em {formatSupportDate(ticket.createdAt)}</span></div>
        </div>
        <Link href="/suporte" className={s.back}>← Meus chamados</Link>
      </div>
      {query.erro ? <p className={s.error} role="alert">{query.erro === "anexo" ? "Anexo inválido ou maior que 300 KB." : query.erro === "limite" ? "Muitas mensagens em pouco tempo. Tente mais tarde." : "Confira sua mensagem."}</p> : null}
      <section className={s.messages} aria-label="Histórico do atendimento">
        {ticket.messages.map((message) => (
          <article className={`${s.message} ${message.author?.role === "SUPER_ADMIN" ? s.staff : ""}`} key={message.id}>
            <div className={s.messageHeader}><strong>{message.author?.role === "SUPER_ADMIN" ? "Suporte 11UP" : "Você"}</strong><time>{formatSupportDate(message.createdAt)}</time></div>
            <div className={s.body}>{message.body}</div>
            {message.attachmentData ? <a className={s.attachment} href={`/api/suporte/anexo/${message.id}`}>📎 Ver imagem anexada</a> : null}
          </article>
        ))}
      </section>
      <section className={s.panel}>
        <h2>Enviar outra mensagem</h2>
        <p className={s.subtle}>Ao enviar uma nova mensagem, um chamado concluído será reaberto.</p>
        <form action={replySupportTicket}>
          <input type="hidden" name="ticketId" value={ticket.id} />
          <label className={s.field}>Mensagem<textarea name="body" minLength={2} maxLength={4000} className={s.textarea} required /></label>
          <label className={s.field}>Captura de tela (opcional)<input type="file" name="attachment" accept="image/png,image/jpeg,image/webp" className={s.input}/></label>
          <PendingSubmitButton pendingText="Enviando..." className={s.submit}>Enviar mensagem</PendingSubmitButton>
        </form>
      </section>
    </main>
  );
}
