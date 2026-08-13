import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default async function NotificationsPage() {
  const user = await requireOrganizationUser();
  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const [pendingCallUps, pendingCharges, upcomingMatches] = await Promise.all([
    prisma.callUp.findMany({
      where: { organizationId: user.organizationId, status: "PENDING" },
      include: { athlete: true, match: { include: { category: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.charge.findMany({
      where: {
        organizationId: user.organizationId,
        status: "PENDING",
      },
      include: { athlete: true },
      orderBy: { dueDate: "asc" },
      take: 30,
    }),
    prisma.match.findMany({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
        startsAt: { gte: now, lte: inSevenDays },
      },
      include: { category: true, callUps: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const overdue = pendingCharges.filter((charge) => charge.dueDate < now);
  const total = pendingCallUps.length + overdue.length + upcomingMatches.length;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">CENTRAL DE ATENÇÃO</span>
          <h1>Notificações</h1>
          <p className="muted">Pendências geradas automaticamente pelos dados da organização.</p>
        </div>
        <span className="badge">{total} item(ns)</span>
      </div>

      <div className="notification-sections">
        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">CONVOCAÇÕES</span><h2>Aguardando resposta</h2></div>
            <Link href="/convocacoes">Abrir módulo</Link>
          </div>
          <div className="notification-list">
            {pendingCallUps.slice(0, 10).map((callUp) => (
              <Link href={`/convocacoes/${callUp.matchId}`} key={callUp.id}>
                <span className="notification-dot warning" />
                <div>
                  <strong>{callUp.athlete.nickname || callUp.athlete.name}</strong>
                  <p>{callUp.match.category.name} × {callUp.match.opponent}</p>
                </div>
                <b>Confirmar →</b>
              </Link>
            ))}
            {!pendingCallUps.length ? <div className="empty compact-empty">Tudo confirmado por aqui.</div> : null}
          </div>
        </section>

        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">FINANCEIRO</span><h2>Cobranças vencidas</h2></div>
            <Link href="/financeiro">Abrir financeiro</Link>
          </div>
          <div className="notification-list">
            {overdue.slice(0, 10).map((charge) => (
              <Link href="/financeiro" key={charge.id}>
                <span className="notification-dot danger" />
                <div>
                  <strong>{charge.athlete.name}</strong>
                  <p>{charge.title} • {money(charge.amountCents)}</p>
                </div>
                <b>Vencida →</b>
              </Link>
            ))}
            {!overdue.length ? <div className="empty compact-empty">Nenhuma cobrança vencida.</div> : null}
          </div>
        </section>

        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">PRÓXIMOS 7 DIAS</span><h2>Jogos que merecem atenção</h2></div>
            <Link href="/agenda">Ver agenda</Link>
          </div>
          <div className="notification-list">
            {upcomingMatches.map((match) => (
              <Link href={`/convocacoes/${match.id}`} key={match.id}>
                <span className="notification-dot info" />
                <div>
                  <strong>{match.category.name} × {match.opponent}</strong>
                  <p>{match.callUps.length} atleta(s) convocado(s)</p>
                </div>
                <b>Revisar →</b>
              </Link>
            ))}
            {!upcomingMatches.length ? <div className="empty compact-empty">Nenhum jogo nos próximos 7 dias.</div> : null}
          </div>
        </section>
      </div>
    </>
  );
}
