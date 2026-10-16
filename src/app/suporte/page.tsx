import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUPPORT_STATUS_LABEL, formatSupportDate } from "@/lib/support-status";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { openSupportTicket } from "./actions";
import s from "./SupportCenter.module.css";

export default async function SupportHome({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const user = await requireUser();
  if (user.role === "SUPER_ADMIN") redirect("/admin/chamados");
  const query = await searchParams;
  const tickets = await prisma.supportTicket.findMany({
    where: { requesterId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const error = query.erro === "anexo" ? "Envie apenas PNG, JPG ou WebP, até 300 KB." : query.erro === "limite" ? "Limite temporário de solicitações. Consulte seus chamados anteriores ou tente novamente mais tarde." : query.erro ? "Confira o assunto e a mensagem." : "";
  return (
    <main className={s.page}>
      <div className={s.hero}>
        <div>
          <span className={s.eyebrow}>SUPORTE 11UP</span>
          <h1 className={s.heading}>Como podemos ajudar?</h1>
          <p className={s.note}>Envie sua dúvida diretamente à equipe 11UP e acompanhe as respostas nesta página. Suporte técnico é diferente dos comunicados do clube.</p>
        </div>
        <Link href={user.role === "GUARDIAN" ? "/responsavel" : user.role === "COACH" ? "/coach/dashboard" : "/dashboard"} className={s.back}>← Voltar</Link>
      </div>
      {error ? <p className={s.error} role="alert">{error}</p> : null}
      <div className={s.layout}>
        <section className={s.panel}>
          <h2>Novo chamado</h2>
          <form action={openSupportTicket}>
            <label className={s.field}>Assunto
              <input name="subject" className={s.input} placeholder="Ex.: Não encontro o vínculo do atleta" minLength={4} maxLength={110} required />
            </label>
            <label className={s.field}>Como podemos ajudar?
              <textarea name="body" className={s.textarea} placeholder="Descreva sua dúvida ou problema..." minLength={8} maxLength={4000} required />
            </label>
            <label className={s.field}>Captura de tela (opcional)
              <input type="file" name="attachment" accept="image/png,image/jpeg,image/webp" className={s.input} />
            </label>
            <p className={s.subtle}>Somente imagens PNG, JPG ou WebP, até 300 KB. Evite enviar documentos pessoais, dados médicos ou senhas.</p>
            <PendingSubmitButton pendingText="Enviando..." className={s.submit}>Enviar chamado</PendingSubmitButton>
          </form>
        </section>
        <section className={s.panel}>
          <h2>Meus chamados</h2>
          <p className={s.note}>Veja o andamento e as respostas da equipe.</p>
          <div className={s.list}>
            {tickets.length ? tickets.map((ticket) => (
              <Link href={`/suporte/${ticket.id}`} className={s.ticket} key={ticket.id}>
                <div className={s.ticketHead}>
                  <span className={s.ticketTitle}>{ticket.subject}</span>
                  <span className={s.pill}>{SUPPORT_STATUS_LABEL[ticket.status]}</span>
                </div>
                <div className={s.meta}>{formatSupportDate(ticket.updatedAt)}</div>
              </Link>
            )) : <p className={s.empty}>Você ainda não abriu nenhum chamado.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
