import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { birthdayInfo } from "@/lib/athlete-birthdays";

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
    expiringDocuments, overdueCharges, pendingCallUps, attendances, latestEvaluation, birthdayAthletes] = await Promise.all([
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
    prisma.athlete.findMany({
      where: {
        organizationId: orgId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        privateData: {
          select: {
            birthDate: true,
          },
        },
      },
    }),
  ]);

  const upcomingBirthdays = birthdayAthletes
    .flatMap((athlete) => {
      const birthDate = athlete.privateData?.birthDate;
      if (!birthDate) return [];

      const info = birthdayInfo(birthDate, now, timeZone);

      if (info.days < 0 || info.days > 7) return [];

      return [{
        id: athlete.id,
        name: athlete.name,
        nickname: athlete.nickname,
        ...info,
      }];
    })
    .sort(
      (a, b) =>
        a.days - b.days ||
        a.name.localeCompare(b.name, "pt-BR"),
    );

  const birthdaysToday = upcomingBirthdays.filter(
    (athlete) => athlete.days === 0,
  );
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

  const attentionTotal =
    pendingDocuments +
    expiringDocuments +
    overdueCharges +
    pendingCallUps +
    upcomingBirthdays.length;

  const trainingsToday =
    todaySessions.length || recurringTrainings.length;

  const firstName =
    user.name.trim().split(/\s+/)[0] || "Gestor";

  return (
    <div className="club-dashboard-v3 dashboard-v3-reference">

      <section className="dashboard-v3-mobile-home" aria-label="Resumo do clube">
        <div className="dashboard-v3-mobile-welcome">
          <span>{org.publicName || org.name}</span>
          <h1>Olá, {firstName}</h1>
          <p>O que você precisa fazer agora?</p>
        </div>

        <nav className="dashboard-v3-mobile-shortcuts" aria-label="Acessos rápidos">
          <Link href="/atletas">
            <i aria-hidden="true">◎</i>
            <span>Atletas</span>
          </Link>

          <Link href="/treinos">
            <i aria-hidden="true">△</i>
            <span>Treinos</span>
          </Link>

          <Link href="/jogos">
            <i aria-hidden="true">●</i>
            <span>Jogos</span>
          </Link>

          <Link href="/convocacoes">
            <i aria-hidden="true">✓</i>
            <span>Convocar</span>
          </Link>

          <Link href="/performance">
            <i aria-hidden="true">◉</i>
            <span>Performance</span>
          </Link>
        </nav>

        <div className="dashboard-v3-mobile-today">
          <span>HOJE</span>
          <strong>{dateLabel(now, timeZone)}</strong>
          <small>
            {athletes} atletas ativos · {trainingsToday} treino(s) hoje
          </small>
        </div>
      </section>

      <section className="dashboard-v3-hero dashboard-v3-hero-reference dashboard-v3-desktop-only">
        <div className="dashboard-v3-reference-top">
          <form className="dashboard-v3-reference-search" action="/atletas">
            <span aria-hidden="true">⌕</span>
            <input
              name="q"
              aria-label="Buscar atleta"
              placeholder="Buscar atleta por nome"
            />
          </form>

          <details className="dashboard-v3-reference-create">
            <summary>＋ Criar</summary>

            <div>
              <Link href="/treinos">Novo treino</Link>
              <Link href="/jogos">Novo jogo</Link>
              <Link href="/convocacoes">Nova convocação</Link>
              <Link href="/comunicacao">Novo comunicado</Link>
              <Link href="/atletas">Novo atleta</Link>
            </div>
          </details>
        </div>

        <div className="dashboard-v3-reference-body">
          <div className="dashboard-v3-reference-copy">
            <span className="dashboard-v3-reference-kicker">
              {org.publicName || org.name}
            </span>

            <h1>Olá, {firstName}</h1>

            <p>
              Aqui está o panorama do seu clube hoje.
            </p>
          </div>

          <div
            className="dashboard-v3-reference-artwork-space"
            aria-hidden="true"
          />

          <div className="dashboard-v3-reference-aside">
            <blockquote>
              “GESTÃO HOJE,
              <strong> GRANDES HISTÓRIAS AMANHÃ.”</strong>
            </blockquote>

            <i aria-hidden="true" />

            <div className="dashboard-v3-reference-today">
              <small>HOJE</small>
              <strong>{dateLabel(now, timeZone)}</strong>
              <span>
                {athletes} atletas ativos · {trainingsToday} treino(s) hoje
              </span>
            </div>
          </div>
        </div>

        <nav
          className="dashboard-v3-reference-nav"
          aria-label="Acessos da visão geral"
        >
          <Link className="active" href="/dashboard">Visão geral</Link>
          <Link href="/performance">Performance</Link>
          <Link href="/categorias">Categorias</Link>
          <Link href="/jogos">Jogos</Link>
          <Link href="/treinos">Treinos</Link>
          <Link href="/agenda">Agenda</Link>
        </nav>
      </section>

      <section
        className="dashboard-v3-kpis"
        aria-label="Indicadores principais"
      >
        <Link href="/atletas">
          <span className="dashboard-v3-kpi-icon">◎</span>
          <small>ATLETAS ATIVOS</small>
          <strong>{athletes}</strong>
          <em>Ver elenco →</em>
        </Link>

        <Link href="/treinos">
          <span className="dashboard-v3-kpi-icon">△</span>
          <small>TREINOS HOJE</small>
          <strong>{trainingsToday}</strong>
          <em>Ver programação →</em>
        </Link>

        <Link href="/jogos">
          <span className="dashboard-v3-kpi-icon">●</span>
          <small>JOGOS DA SEMANA</small>
          <strong>{upcomingMatches.length}</strong>
          <em>Ver partidas →</em>
        </Link>

        <Link href="/performance">
          <span className="dashboard-v3-kpi-icon">◉</span>
          <small>PRESENÇA MÉDIA</small>
          <strong>
            {presence === null ? "—" : `${presence}%`}
          </strong>
          <em>Últimos 30 dias</em>
        </Link>

        <Link
          href="/notificacoes"
          className={attentionTotal ? "attention" : ""}
        >
          <span className="dashboard-v3-kpi-icon">!</span>
          <small>ATENÇÃO NECESSÁRIA</small>
          <strong>{attentionTotal}</strong>
          <em>
            {attentionTotal
              ? "Itens para revisar →"
              : "Tudo em dia"}
          </em>
        </Link>
      </section>

      <section className="dashboard-v3-main-grid">
        <article className="dashboard-v3-card dashboard-v3-commitments">
          <div className="dashboard-v3-card-head">
            <div>
              <span>ROTINA</span>
              <h2>Próximos compromissos</h2>
            </div>
            <Link href="/agenda">Ver agenda →</Link>
          </div>

          {agenda.length ? (
            <div className="dashboard-v3-timeline">
              {agenda.map((item) => (
                <Link href={item.href} key={item.id}>
                  <time>{item.hour}</time>
                  <i />
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                  <b>{item.type}</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className="dashboard-v3-empty">
              <strong>Dia livre na programação</strong>
              <span>
                Nenhum treino ou jogo agendado para hoje.
              </span>
              <Link href="/agenda">Abrir agenda</Link>
            </div>
          )}
        </article>

        <article className="dashboard-v3-card dashboard-v3-games">
          <div className="dashboard-v3-card-head">
            <div>
              <span>JOGOS</span>
              <h2>Próximos jogos</h2>
            </div>
            <Link href="/jogos">Ver todos →</Link>
          </div>

          {upcomingMatches.length ? (
            <div className="dashboard-v3-game-list">
              {upcomingMatches.slice(0, 4).map((match) => {
                const confirmed = match.callUps.filter(
                  (callUp) => callUp.status === "CONFIRMED",
                ).length;

                return (
                  <Link
                    href={`/jogos/${match.id}`}
                    key={match.id}
                    className="dashboard-v3-game-row"
                  >
                    <time>
                      <b>{shortDate(match.startsAt, timeZone)}</b>
                      <span>{time(match.startsAt, timeZone)}</span>
                    </time>

                    <div>
                      <small>{match.category.name}</small>
                      <strong>
                        {match.category.name} × {match.opponent}
                      </strong>
                      <span>
                        {match.location || "Local a definir"}
                      </span>
                    </div>

                    <em>
                      {confirmed}/{match.callUps.length} confirmados
                    </em>

                    <b
                      className={
                        match.matchSheetStatus === "FINALIZED"
                          ? "done"
                          : "pending"
                      }
                    >
                      {match.matchSheetStatus === "FINALIZED"
                        ? "Súmula finalizada"
                        : "Súmula pendente"}
                    </b>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-v3-empty">
              <strong>
                Nenhum jogo nos próximos sete dias
              </strong>
              <span>
                Cadastre a próxima partida do clube.
              </span>
              <Link href="/jogos">Cadastrar jogo</Link>
            </div>
          )}
        </article>

        <article className="dashboard-v3-card dashboard-v3-priorities">
          <div className="dashboard-v3-card-head">
            <div>
              <span>PRIORIDADES</span>
              <h2>Atenção necessária</h2>
            </div>
          </div>

          {attentionTotal ? (
            <div className="dashboard-v3-priority-list">
              {pendingDocuments ? (
                <Link href="/atletas">
                  <i className="danger">!</i>
                  <div>
                    <strong>
                      {pendingDocuments} documento(s) pendente(s)
                    </strong>
                    <span>
                      Aguardando análise ou novo envio
                    </span>
                  </div>
                  <b>{pendingDocuments}</b>
                </Link>
              ) : null}

              {expiringDocuments ? (
                <Link href="/atletas">
                  <i className="warning">⌁</i>
                  <div>
                    <strong>
                      {expiringDocuments} exame(s) vencem em 30 dias
                    </strong>
                    <span>Acompanhamento médico</span>
                  </div>
                  <b>{expiringDocuments}</b>
                </Link>
              ) : null}

              {overdueCharges ? (
                <Link href="/financeiro">
                  <i className="danger">$</i>
                  <div>
                    <strong>
                      {overdueCharges} cobrança(s) em atraso
                    </strong>
                    <span>Mensalidades e taxas</span>
                  </div>
                  <b>{overdueCharges}</b>
                </Link>
              ) : null}

              {pendingCallUps ? (
                <Link href="/convocacoes">
                  <i className="info">✓</i>
                  <div>
                    <strong>
                      {pendingCallUps} confirmação(ões) pendente(s)
                    </strong>
                    <span>Convocações enviadas</span>
                  </div>
                  <b>{pendingCallUps}</b>
                </Link>
              ) : null}

              {upcomingBirthdays.length ? (
                <Link href="/notificacoes">
                  <i className="info">🎂</i>
                  <div>
                    <strong>
                      {upcomingBirthdays.length} aniversário(s) nos próximos 7 dias
                    </strong>
                    <span>
                      {birthdaysToday.length
                        ? `${birthdaysToday.length} aniversário(s) hoje`
                        : "Próximos aniversários do elenco"}
                    </span>
                  </div>
                  <b>{upcomingBirthdays.length}</b>
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="dashboard-v3-success-state">
              <span>✓</span>
              <div>
                <strong>Nenhuma pendência crítica hoje</strong>
                <small>
                  Documentação, financeiro e confirmações estão em dia.
                </small>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="dashboard-v3-performance-grid">
        <article className="dashboard-v3-card dashboard-v3-performance">
          <div className="dashboard-v3-card-head">
            <div>
              <span>PERFORMANCE</span>
              <h2>Mapa do elenco</h2>
            </div>
            <Link href="/performance">Detalhes →</Link>
          </div>

          {latestEvaluation ? (
            <>
              <div className="dashboard-v3-performance-body">
                <svg
                  viewBox="0 0 200 200"
                  role="img"
                  aria-label="Mapa das cinco valências"
                >
                  {[25, 50, 75, 100].map((level) => (
                    <polygon
                      key={level}
                      points={areas
                        .map((_, index) =>
                          radarPoint(index, level),
                        )
                        .join(" ")}
                      className="dashboard-v3-radar-grid"
                    />
                  ))}

                  {areas.map((_, index) => (
                    <line
                      key={index}
                      x1="100"
                      y1="100"
                      x2={
                        radarPoint(index, 100).split(",")[0]
                      }
                      y2={
                        radarPoint(index, 100).split(",")[1]
                      }
                    />
                  ))}

                  <polygon
                    points={polygon}
                    className="dashboard-v3-radar-value"
                  />
                </svg>

                <div className="dashboard-v3-performance-score">
                  <small>ÚLTIMA AVALIAÇÃO</small>
                  <strong>{performance}%</strong>
                  <span>
                    Média das áreas avaliadas
                  </span>
                </div>
              </div>

              <div className="dashboard-v3-area-list">
                {areas.map((area) => (
                  <span key={area.key}>
                    <i />
                    {area.label}
                    <b>{area.percentage}%</b>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="dashboard-v3-empty">
              <strong>Performance ainda sem dados</strong>
              <span>
                Finalize a primeira avaliação para gerar o mapa.
              </span>
              <Link href="/performance">
                Abrir Performance
              </Link>
            </div>
          )}
        </article>

        <article className="dashboard-v3-performance-callout">
          <span>11UP PERFORMANCE</span>
          <h2>Dados que ajudam a transformar desenvolvimento em decisão.</h2>
          <p>
            Acompanhe presença, avaliações, relatórios e,
            progressivamente, dados de GPS em uma única visão.
          </p>

          <div>
            <span>
              <small>PRESENÇA</small>
              <strong>
                {presence === null ? "—" : `${presence}%`}
              </strong>
            </span>

            <span>
              <small>AVALIAÇÃO</small>
              <strong>
                {performance === null ? "—" : `${performance}%`}
              </strong>
            </span>
          </div>

          <Link href="/performance">
            Acessar 11UP Performance →
          </Link>
        </article>
      </section>

      <section className="dashboard-v3-bottom-grid">
        <article className="dashboard-v3-card dashboard-v3-communication">
          <div className="dashboard-v3-card-head">
            <div>
              <span>CENTRAL</span>
              <h2>Comunicação e acompanhamento</h2>
            </div>
            <Link href="/comunicacao">Ver central →</Link>
          </div>

          <Link href="/convocacoes">
            <i className="green" />
            <div>
              <strong>Convocações</strong>
              <span>
                {pendingCallUps
                  ? `${pendingCallUps} resposta(s) aguardando confirmação.`
                  : "Nenhuma confirmação pendente."}
              </span>
            </div>
          </Link>

          <Link href="/atletas">
            <i className="amber" />
            <div>
              <strong>Documentos e exames</strong>
              <span>
                {pendingDocuments + expiringDocuments
                  ? `${pendingDocuments + expiringDocuments} item(ns) precisam de atenção.`
                  : "Documentação em dia."}
              </span>
            </div>
          </Link>

          <Link href="/qtr">
            <i className="blue" />
            <div>
              <strong>QTS</strong>
              <span>
                Relatórios técnicos e socioemocionais do elenco.
              </span>
            </div>
          </Link>
        </article>

        <article className="dashboard-v3-card dashboard-v3-club-status">
          <div className="dashboard-v3-card-head">
            <div>
              <span>CLUBE</span>
              <h2>{org.publicName || org.name}</h2>
            </div>
          </div>

          <p>
            Gestão esportiva, performance e relacionamento em
            um único ambiente.
          </p>

          <div className="dashboard-v3-club-links">
            <Link href="/categorias">Categorias</Link>
            <Link href="/comissao">Comissão técnica</Link>
            <Link href="/financeiro">Financeiro</Link>
            <Link href="/organizacao">Configurações</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
