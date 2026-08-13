import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GettingStartedChecklist from "@/components/help/GettingStartedChecklist";
import ModuleTour from "@/components/help/ModuleTour";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function dateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Dashboard() {
  const user = await getCurrentUser();
  const orgId = user?.organizationId;

  if (!orgId) {
    return (
      <>
        <div className="page-head">
          <div><h1>Dashboard</h1></div>
          <ModuleTour module="dashboard" />
        </div>
        <p className="muted">Acesso administrativo.</p>
      </>
    );
  }

  const now = new Date();

  const [
    categories,
    athletes,
    staff,
    trainings,
    upcomingMatches,
    pendingCallUps,
    pendingCharges,
    paidCharges,
    nextMatches,
    trainingSchedules,
  ] = await Promise.all([
    prisma.category.count({ where: { organizationId: orgId } }),
    prisma.athlete.count({ where: { organizationId: orgId, active: true } }),
    prisma.staffMember.count({ where: { organizationId: orgId } }),
    prisma.trainingSchedule.count({ where: { organizationId: orgId } }),
    prisma.match.count({
      where: { organizationId: orgId, status: "SCHEDULED", startsAt: { gte: now } },
    }),
    prisma.callUp.count({
      where: { organizationId: orgId, status: "PENDING" },
    }),
    prisma.charge.aggregate({
      where: { organizationId: orgId, status: "PENDING" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.charge.aggregate({
      where: { organizationId: orgId, status: "PAID" },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.match.findMany({
      where: { organizationId: orgId, status: "SCHEDULED", startsAt: { gte: now } },
      include: { category: true, callUps: true },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
    prisma.trainingSchedule.findMany({
      where: { organizationId: orgId },
      include: { category: true },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const today = now.getDay();
  const todayTrainings = trainingSchedules.filter((training) => training.weekday === today);
  const urgentCount = pendingCallUps + pendingCharges._count;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">CENTRAL OPERACIONAL</span>
          <h1>Hoje na {user.organization?.publicName || user.organization?.name}</h1>
          <p className="muted">O que precisa da sua atenção e o que acontece a seguir.</p>
        </div>
        <div className="page-primary-actions">
          <Link className="top-action top-action-secondary" href="/agenda">
            <span className="top-action-icon">▦</span>
            <span>
              <small>PROGRAMAÇÃO</small>
              <strong>Ver agenda</strong>
            </span>
          </Link>
          <Link className="top-action top-action-primary" href="/jogos">
            <span className="top-action-icon">＋</span>
            <span>
              <small>CADASTRO</small>
              <strong>Novo jogo</strong>
            </span>
          </Link>
        </div>
      </div>

      <div className="ops-kpi-grid">
        <Link href="/jogos" className="ops-kpi">
          <span>Próximos jogos</span>
          <strong>{upcomingMatches}</strong>
          <small>Ver programação →</small>
        </Link>
        <Link href="/convocacoes" className="ops-kpi">
          <span>Confirmações pendentes</span>
          <strong>{pendingCallUps}</strong>
          <small>Gerenciar convocações →</small>
        </Link>
        <Link href="/financeiro" className="ops-kpi">
          <span>A receber</span>
          <strong>{money(pendingCharges._sum.amountCents ?? 0)}</strong>
          <small>{pendingCharges._count} cobrança(s) →</small>
        </Link>
        <Link href="/notificacoes" className={`ops-kpi ${urgentCount ? "attention" : ""}`}>
          <span>Pendências</span>
          <strong>{urgentCount}</strong>
          <small>Central de notificações →</small>
        </Link>
      </div>

      <div className="ops-layout">
        <section className="card ops-panel">
          <div className="section-title-row">
            <div>
              <span className="page-eyebrow">HOJE • {WEEKDAYS[today]}</span>
              <h2>Treinos de hoje</h2>
            </div>
            <Link href="/treinos">Ver treinos</Link>
          </div>

          {todayTrainings.length ? (
            <div className="ops-list">
              {todayTrainings.map((training) => (
                <article key={training.id}>
                  <div className="ops-time">{training.startTime}</div>
                  <div>
                    <strong>{training.category.name}</strong>
                    <span>{training.startTime} – {training.endTime}</span>
                    <small>{training.location || "Local a definir"}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty compact-empty">Nenhum treino programado para hoje.</div>
          )}
        </section>

        <section className="card ops-panel">
          <div className="section-title-row">
            <div>
              <span className="page-eyebrow">PRÓXIMOS</span>
              <h2>Jogos</h2>
            </div>
            <Link href="/jogos">Todos</Link>
          </div>

          {nextMatches.length ? (
            <div className="ops-list">
              {nextMatches.map((match) => (
                <Link href={`/jogos/${match.id}`} key={match.id} className="ops-match">
                  <div className="ops-date-box">
                    <strong>{dateTime(match.startsAt).split(",")[0]}</strong>
                    <span>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(match.startsAt)}</span>
                  </div>
                  <div>
                    <small>{match.category.name} • {match.competition || "Jogo"}</small>
                    <strong>× {match.opponent}</strong>
                    <span>{dateTime(match.startsAt)} • {match.location || "Local a definir"}</span>
                  </div>
                  <b>{match.callUps.length} conv.</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty compact-empty">Nenhum próximo jogo cadastrado.</div>
          )}
        </section>
      </div>

      <section className="quick-actions card">
        <div>
          <span className="page-eyebrow">ATALHOS</span>
          <h2>Ações rápidas</h2>
        </div>
        <div className="quick-action-grid">
          <Link href="/atletas">+ Atleta</Link>
          <Link href="/jogos">+ Jogo</Link>
          <Link href="/qtr">Gerar QTR</Link>
          <Link href="/comunicacao">Enviar mensagem</Link>
          <Link href="/financeiro">Nova cobrança</Link>
          <Link href={`/o/${user.organization?.slug}`} target="_blank">Abrir site</Link>
        </div>
      </section>

      <GettingStartedChecklist
        items={[
          { id: "org", label: "Configurar organização e site", href: "/organizacao", serverDone: Boolean(user.organization?.onboardingCompleted) },
          { id: "categories", label: "Criar categorias", href: "/categorias", serverDone: categories > 0 },
          { id: "staff", label: "Cadastrar comissão", href: "/comissao", serverDone: staff > 0 },
          { id: "athletes", label: "Cadastrar atletas", href: "/atletas", serverDone: athletes > 0 },
          { id: "trainings", label: "Cadastrar horários de treino", href: "/treinos", serverDone: trainings > 0 },
          { id: "matches", label: "Cadastrar primeiro jogo", href: "/jogos", serverDone: upcomingMatches > 0 },
        ]}
      />

      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card"><h2>{categories}</h2><span className="muted">Categorias</span></div>
        <div className="card"><h2>{athletes}</h2><span className="muted">Atletas ativos</span></div>
        <div className="card"><h2>{staff}</h2><span className="muted">Comissão</span></div>
        <div className="card"><h2>{money(paidCharges._sum.amountCents ?? 0)}</h2><span className="muted">Recebido</span></div>
      </div>
    </>
  );
}
