import Link from "next/link";
import { redirect } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AREA_LABELS = {
  PHYSICAL: "Física",
  TECHNICAL: "Técnica",
  TACTICAL: "Tática",
  COGNITIVE: "Cognitiva",
  EMOTIONAL: "Emocional",
} as const;

function time(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone }).format(value);
}

function dateLabel(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", timeZone,
  }).format(value);
}

function shortDate(value: Date, timeZone: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone }).format(value);
}

function radarPoint(index: number, percentage: number) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 5;
  const radius = 74 * Math.max(0, Math.min(100, percentage)) / 100;
  return `${100 + Math.cos(angle) * radius},${100 + Math.sin(angle) * radius}`;
}

export default async function Dashboard() {
  const user = await requireOrganizationUser();
  if (!user.organization?.onboardingCompleted) redirect("/onboarding-clube");

  const orgId = user.organizationId;
  const org = user.organization;
  const timeZone = org.timezone || "America/Sao_Paulo";
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(todayStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const monthAgo = new Date(todayStart); monthAgo.setDate(monthAgo.getDate() - 30);
  const expiryLimit = new Date(todayStart); expiryLimit.setDate(expiryLimit.getDate() + 30);

  const [athletes, todaySessions, recurringTrainings, upcomingMatches, pendingDocuments,
    expiringDocuments, overdueCharges, pendingCallUps, attendances, latestEvaluation] = await Promise.all([
    prisma.athlete.count({ where: { organizationId: orgId, active: true } }),
    prisma.trainingSession.findMany({
      where: { organizationId: orgId, startsAt: { gte: todayStart, lt: tomorrow }, status: "SCHEDULED" },
      include: { category: true }, orderBy: { startsAt: "asc" }, take: 6,
    }),
    prisma.trainingSchedule.findMany({
      where: { organizationId: orgId, weekday: now.getDay() }, include: { category: true },
      orderBy: { startTime: "asc" }, take: 6,
    }),
    prisma.match.findMany({
      where: { organizationId: orgId, startsAt: { gte: now, lt: weekEnd }, status: "SCHEDULED" },
      include: { category: true, callUps: true }, orderBy: { startsAt: "asc" }, take: 5,
    }),
    prisma.athleteDocument.count({ where: { organizationId: orgId, status: { in: ["PENDING", "REJECTED"] }, deletedAt: null } }),
    prisma.athleteDocument.count({
      where: { organizationId: orgId, status: "APPROVED", deletedAt: null, expiresAt: { gte: todayStart, lte: expiryLimit } },
    }),
    prisma.charge.count({
      where: { organizationId: orgId, OR: [{ status: "OVERDUE" }, { status: "PENDING", dueDate: { lt: todayStart } }] },
    }),
    prisma.callUp.count({ where: { organizationId: orgId, status: "PENDING" } }),
    prisma.trainingAttendance.findMany({
      where: { organizationId: orgId, createdAt: { gte: monthAgo }, status: { not: "PENDING" } }, select: { status: true },
    }),
    prisma.athleteEvaluation.findFirst({
      where: { organizationId: orgId, status: "FINALIZED" }, include: { scores: true }, orderBy: { evaluatedAt: "desc" },
    }),
  ]);

  const presentStatuses = new Set(["PRESENT", "LATE", "PARTIAL"]);
  const presence = attendances.length
    ? Math.round(attendances.filter((item) => presentStatuses.has(item.status)).length / attendances.length * 100)
    : null;

  const areas = Object.entries(AREA_LABELS).map(([key, label]) => {
    const scores = latestEvaluation?.scores.filter((score) => score.area === key) ?? [];
    const average = scores.length ? scores.reduce((sum, score) => sum + score.score, 0) / scores.length : 0;
    return { key, label, percentage: Math.round(average / 4 * 100) };
  });
  const evaluatedAreas = areas.filter((area) => area.percentage > 0);
  const performance = evaluatedAreas.length
    ? Math.round(evaluatedAreas.reduce((sum, area) => sum + area.percentage, 0) / evaluatedAreas.length)
    : null;
  const polygon = areas.map((area, index) => radarPoint(index, area.percentage)).join(" ");

  const agenda = [
    ...todaySessions.map((item) => ({
      id: `session-${item.id}`, sort: item.startsAt.getTime(), hour: time(item.startsAt, timeZone),
      title: `Treino ${item.category.name}`, detail: item.location || "Local a definir", type: "Treino", href: `/treinos/${item.id}`,
    })),
    ...(todaySessions.length ? [] : recurringTrainings.map((item) => ({
      id: `schedule-${item.id}`, sort: Number(item.startTime.replace(":", "")), hour: item.startTime,
      title: `Treino ${item.category.name}`, detail: item.location || "Local a definir", type: "Treino", href: "/treinos",
    }))),
    ...upcomingMatches.filter((item) => item.startsAt < tomorrow).map((item) => ({
      id: `match-${item.id}`, sort: item.startsAt.getTime(), hour: time(item.startsAt, timeZone),
      title: `${item.category.name} × ${item.opponent}`, detail: item.location || "Local a definir", type: "Jogo", href: `/jogos/${item.id}`,
    })),
  ].sort((a, b) => a.sort - b.sort).slice(0, 5);

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">ONZEUP CLUB · {org.publicName || org.name}</span>
          <h1>Bem-vindo ao ONZEUP</h1>
          <p className="od-date">{dateLabel(now, timeZone)}</p>
        </div>
        <form className="od-search" action="/atletas">
          <span>⌕</span><input name="q" aria-label="Buscar atleta" placeholder="Buscar atleta por nome" />
        </form>
      </header>

      <nav className="od-quick-actions" aria-label="Ações rápidas">
        <Link className="od-action-primary" href="/treinos">＋ Novo treino</Link>
        <Link href="/jogos">＋ Novo jogo</Link>
        <Link href="/convocacoes">Convocação</Link>
        <Link href="/comunicacao">Comunicado</Link>
      </nav>

      <section className="od-kpis" aria-label="Indicadores">
        <Link href="/atletas"><span className="od-kpi-icon">◎</span><small>ATLETAS ATIVOS</small><strong>{athletes}</strong><em>Ver elenco →</em></Link>
        <Link href="/treinos"><span className="od-kpi-icon">△</span><small>TREINOS HOJE</small><strong>{todaySessions.length || recurringTrainings.length}</strong><em>Ver programação →</em></Link>
        <Link href="/jogos"><span className="od-kpi-icon">●</span><small>JOGOS DA SEMANA</small><strong>{upcomingMatches.length}</strong><em>Ver partidas →</em></Link>
        <Link href="/agenda"><span className="od-kpi-icon">◉</span><small>PRESENÇA MÉDIA</small><strong>{presence === null ? "—" : `${presence}%`}</strong><em>Últimos 30 dias</em></Link>
      </section>

      <section className="od-main-grid">
        <article className="card od-panel od-agenda">
          <div className="od-panel-head"><div><span className="od-eyebrow">ROTINA</span><h2>Agenda de hoje</h2></div><Link href="/agenda">Ver agenda →</Link></div>
          {agenda.length ? <div className="od-timeline">{agenda.map((item) => (
            <Link href={item.href} key={item.id}>
              <time>{item.hour}</time><i /><div><strong>{item.title}</strong><span>{item.detail}</span></div><b>{item.type}</b>
            </Link>
          ))}</div> : <div className="od-empty"><strong>Dia livre na programação</strong><span>Nenhum treino ou jogo agendado para hoje.</span><Link href="/agenda">Abrir agenda</Link></div>}
        </article>

        <article className="card od-panel od-alerts">
          <div className="od-panel-head"><div><span className="od-eyebrow">PRIORIDADES</span><h2>Atenção necessária</h2></div></div>
          <Link href="/atletas"><i className="red">!</i><div><strong>{pendingDocuments} documentos pendentes</strong><span>Aguardando análise ou novo envio</span></div><b>{pendingDocuments}</b></Link>
          <Link href="/atletas"><i className="amber">⌁</i><div><strong>{expiringDocuments} exames vencem em 30 dias</strong><span>Acompanhamento médico</span></div><b>{expiringDocuments}</b></Link>
          <Link href="/financeiro"><i className="red">$</i><div><strong>{overdueCharges} cobranças em atraso</strong><span>Mensalidades e taxas</span></div><b>{overdueCharges}</b></Link>
          <Link href="/convocacoes"><i className="blue">✓</i><div><strong>{pendingCallUps} confirmações pendentes</strong><span>Convocações enviadas</span></div><b>{pendingCallUps}</b></Link>
        </article>

        <article className="card od-panel od-performance">
          <div className="od-panel-head"><div><span className="od-eyebrow">PERFORMANCE</span><h2>Mapa do elenco</h2></div><Link href="/performance">Detalhes →</Link></div>
          {latestEvaluation ? <div className="od-performance-body">
            <svg viewBox="0 0 200 200" role="img" aria-label="Mapa das cinco valências">
              {[25, 50, 75, 100].map((level) => <polygon key={level} points={areas.map((_, index) => radarPoint(index, level)).join(" ")} className="od-radar-grid" />)}
              {areas.map((_, index) => <line key={index} x1="100" y1="100" x2={radarPoint(index, 100).split(",")[0]} y2={radarPoint(index, 100).split(",")[1]} />)}
              <polygon points={polygon} className="od-radar-value" />
            </svg>
            <div className="od-performance-score"><small>ÍNDICE GERAL</small><strong>{performance}%</strong><span>Última avaliação finalizada</span></div>
          </div> : <div className="od-empty"><strong>Performance ainda sem dados</strong><span>Finalize a primeira avaliação para gerar o mapa.</span><Link href="/performance">Abrir Performance</Link></div>}
          {latestEvaluation ? <div className="od-area-list">{areas.map((area) => <span key={area.key}><i />{area.label} <b>{area.percentage}%</b></span>)}</div> : null}
        </article>
      </section>

      <section className="od-bottom-grid">
        <article className="card od-panel od-games">
          <div className="od-panel-head"><div><span className="od-eyebrow">COMPETIÇÕES</span><h2>Próximos jogos</h2></div><Link href="/jogos">Ver todos →</Link></div>
          {upcomingMatches.length ? upcomingMatches.slice(0, 3).map((match) => {
            const confirmed = match.callUps.filter((callUp) => callUp.status === "CONFIRMED").length;
            return <Link href={`/jogos/${match.id}`} key={match.id} className="od-game-row">
              <time><b>{shortDate(match.startsAt, timeZone)}</b><span>{time(match.startsAt, timeZone)}</span></time>
              <div><strong>{match.category.name} × {match.opponent}</strong><span>{match.location || "Local a definir"}</span></div>
              <em>{confirmed}/{match.callUps.length} confirmados</em>
              <b className={match.matchSheetStatus === "FINALIZED" ? "done" : "pending"}>{match.matchSheetStatus === "FINALIZED" ? "Súmula finalizada" : "Súmula pendente"}</b>
            </Link>;
          }) : <div className="od-empty"><strong>Nenhum jogo nos próximos sete dias</strong><span>Cadastre a próxima partida do clube.</span><Link href="/jogos">Cadastrar jogo</Link></div>}
        </article>

        <article className="card od-panel od-communication">
          <div className="od-panel-head"><div><span className="od-eyebrow">CENTRAL</span><h2>Comunicação</h2></div><Link href="/comunicacao">Ver central →</Link></div>
          <Link href="/convocacoes"><i className="green" /><div><strong>Convocações</strong><span>{pendingCallUps ? `${pendingCallUps} respostas aguardando confirmação.` : "Nenhuma confirmação pendente."}</span></div></Link>
          <Link href="/atletas"><i className="amber" /><div><strong>Documentos e exames</strong><span>{pendingDocuments + expiringDocuments ? `${pendingDocuments + expiringDocuments} itens precisam de atenção.` : "Documentação em dia."}</span></div></Link>
          <Link href="/qtr"><i className="blue" /><div><strong>QTS</strong><span>Relatórios técnicos e socioemocionais do elenco.</span></div></Link>
        </article>
      </section>

      <footer className="od-footer"><span>ONZEUP CLUB</span><small>Operação esportiva em um só lugar.</small></footer>
    </div>
  );
}
