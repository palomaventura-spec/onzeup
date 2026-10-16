import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatSupportDate, SUPPORT_STATUS_LABEL } from "@/lib/support-status";
import s from "../../suporte/SupportCenter.module.css";

export default async function AdminTickets({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSuperAdmin();
  const query = await searchParams;
  const valid = ["OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"] as const;
  const selected = valid.find((value) => value === query.status);
  const tickets = await prisma.supportTicket.findMany({
    where: selected ? { status: selected } : undefined,
    include: { requester: { select: { name: true, email: true } }, _count: { select: { messages: true } } },
    orderBy: { updatedAt: "desc" },
    take: 150,
  });
  const pending = await prisma.supportTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } });
  return (
    <main className={s.page}>
      <div className={s.hero}><div><span className={s.eyebrow}>SUPER ADMIN · SUPORTE</span><h1 className={s.heading}>Central de chamados</h1>
        <p className={s.note}>{pending} chamado(s) aberto(s) ou em atendimento. Os chamados do Player e do Club ficam nesta fila.</p></div>
        <Link href="/admin/support" className={s.back}>Histórico de acessos de suporte ↗</Link>
      </div>
      <div className={s.flex}>
        <Link href="/admin/chamados" className={s.back}>Todos</Link>
        {valid.map((status) => <Link key={status} href={`/admin/chamados?status=${status}`} className={s.back}>{SUPPORT_STATUS_LABEL[status]}</Link>)}
      </div>
      <div className={s.list}>
        {tickets.length ? tickets.map((ticket) => (
          <Link href={`/admin/chamados/${ticket.id}`} className={s.ticket} key={ticket.id}>
            <div className={s.ticketHead}><span className={s.ticketTitle}>{ticket.subject}</span><span className={s.pill}>{SUPPORT_STATUS_LABEL[ticket.status]}</span></div>
            <div className={s.meta}>{ticket.area === "PLAYER" ? "Player" : "Club"} · {ticket.requester.name} · {ticket.requester.email} {ticket.organizationName ? `· ${ticket.organizationName}` : ""} · {ticket._count.messages} mensagem(ns) · {formatSupportDate(ticket.updatedAt)}</div>
          </Link>
        )) : <p className={s.empty}>Nenhum chamado com esse filtro.</p>}
      </div>
    </main>
  );
}
