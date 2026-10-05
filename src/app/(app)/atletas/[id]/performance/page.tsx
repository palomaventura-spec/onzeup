import Link from "next/link";
import { notFound } from "next/navigation";

import { getClubGrowthCategoryAccess, requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import ModuleTabs from "@/components/ModuleTabs";
import SafeAvatar from "@/components/SafeAvatar";

import { prisma } from "@/lib/prisma";

const AREA_LABELS: Record<string, string> = {
  PHYSICAL: "Física",
  TECHNICAL: "Técnica",
  TACTICAL: "Tática",
  COGNITIVE: "Cognitiva",
  EMOTIONAL: "Emocional",
};

const ATTENDANCE_PRESENT = new Set(["PRESENT", "LATE", "PARTIAL"]);
const ATTENDANCE_COUNTED = new Set([
  "PRESENT",
  "LATE",
  "PARTIAL",
  "ABSENT",
  "JUSTIFIED_ABSENCE",
  "INJURED",
  "EXCUSED",
]);

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

function decimalNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scorePercent(score: number) {
  return Math.round((score / 4) * 100);
}


type PerformanceKpiIcon =
  | "attendance"
  | "matches"
  | "goals"
  | "assists"
  | "evaluations";

function PerformanceIcon({
  name,
  size = 20,
}: {
  name: PerformanceKpiIcon;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "attendance") {
    return (
      <svg {...common}>
        <path d="M7 3v3M17 3v3M4 9h16" />
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="m8 14 2.2 2.2L16 11" />
      </svg>
    );
  }

  if (name === "matches") {
    return (
      <svg {...common}>
        <path d="M4 5h16v14H4z" />
        <path d="M12 5v14" />
        <circle cx="12" cy="12" r="2.1" />
        <path d="M4 9H2v6h2M20 9h2v6h-2" />
      </svg>
    );
  }

  if (name === "goals") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m12 8 3 2.2-1.1 3.5h-3.8L9 10.2 12 8Z" />
        <path d="m5.8 9.7 3.2.5M15 10.2l3.2-.5M10.1 13.7 8.2 17M13.9 13.7l1.9 3.3" />
      </svg>
    );
  }

  if (name === "assists") {
    return (
      <svg {...common}>
        <path d="M4 12h11" />
        <path d="m12 8 4 4-4 4" />
        <circle cx="19" cy="12" r="2" />
        <path d="M5 7V5M5 19v-2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M6 3h12v18H6z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
      <path d="m14 16 1.3 1.3L18 14.5" />
    </svg>
  );
}

export default async function AthletePerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { id } = await params;

  const [athlete, subscription, organization] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        category: true,
        evaluations: {
          orderBy: { evaluatedAt: "desc" },
          take: 20,
          include: { scores: true, evaluator: { select: { name: true } } },
        },
        performanceGoals: {
          where: { status: { in: ["NOT_STARTED", "IN_PROGRESS", "REVIEW"] } },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
        trainingAttendances: {
          orderBy: { session: { startsAt: "desc" } },
          take: 30,
          include: { session: true },
        },
        matchStats: {
          orderBy: { match: { startsAt: "desc" } },
          take: 30,
          include: { match: true },
        },
        bodyMeasurements: { orderBy: { measuredAt: "desc" }, take: 1 },
        wellbeingEntries: { orderBy: { recordedAt: "desc" }, take: 1 },
        externalTrainings: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    }),
    prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { accessStatus: true, complimentaryUntil: true },
    }),
  ]);

  if (!athlete) notFound();

  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  });

  if (!elite) {
    return (
      <>
        <div className="page-head">
          <div>
            <span className="page-eyebrow">11UP PERFORMANCE</span>
            <h1>{athlete.nickname || athlete.name}</h1>
            <p className="muted">Análise individual de desempenho do atleta.</p>
          </div>
          <Link className="btn btn-secondary" href={`/atletas/${athlete.id}`}>
            Voltar ao atleta
          </Link>
        </div>

        <section className="card" style={{ textAlign: "center", padding: 36 }}>
          <span className="page-eyebrow">RECURSO EXCLUSIVO</span>
          <h2>Performance está disponível no Club Elite</h2>
          <p className="muted">
            Avaliações, evolução, presença, súmulas, medições e acompanhamento
            individual ficam reunidos no plano Elite.
          </p>
          <Link className="btn" href="/planos">
            Conhecer o Club Elite
          </Link>
        </section>
      </>
    );
  }

  const finalizedEvaluations = athlete.evaluations.filter(
    (evaluation) => evaluation.status === "FINALIZED",
  );
  const latestEvaluation = finalizedEvaluations[0];
  const comparableEvaluations = latestEvaluation
    ? finalizedEvaluations.filter(
        (evaluation) => evaluation.athleteRole === latestEvaluation.athleteRole,
      )
    : [];
  const firstComparableEvaluation =
    comparableEvaluations.length > 1
      ? comparableEvaluations[comparableEvaluations.length - 1]
      : null;

  const averageForArea = (
    evaluation: (typeof athlete.evaluations)[number] | null | undefined,
    area: string,
  ) => {
    const scores =
      evaluation?.scores.filter((score) => score.area === area) || [];
    return scores.length
      ? scores.reduce((total, item) => total + item.score, 0) / scores.length
      : null;
  };

  const averageForEvaluation = (
    evaluation: (typeof athlete.evaluations)[number] | null | undefined,
  ) => {
    const scores =
      evaluation?.scores.filter((score) => score.area in AREA_LABELS) || [];
    return scores.length
      ? scores.reduce((total, item) => total + item.score, 0) / scores.length
      : null;
  };

  const currentOverallAverage = averageForEvaluation(latestEvaluation);
  const initialOverallAverage = averageForEvaluation(firstComparableEvaluation);
  const overallDelta =
    currentOverallAverage !== null && initialOverallAverage !== null
      ? currentOverallAverage - initialOverallAverage
      : null;

  const areaAverages = Object.keys(AREA_LABELS).map((area) => {
    const current = averageForArea(latestEvaluation, area);
    const initial = averageForArea(firstComparableEvaluation, area);
    return {
      area,
      average: current,
      initial,
      delta: current !== null && initial !== null ? current - initial : null,
    };
  });

  const countedAttendances = athlete.trainingAttendances.filter((item) =>
    ATTENDANCE_COUNTED.has(item.status),
  );
  const presentAttendances = countedAttendances.filter((item) =>
    ATTENDANCE_PRESENT.has(item.status),
  );
  const attendanceRate = countedAttendances.length
    ? Math.round((presentAttendances.length / countedAttendances.length) * 100)
    : null;

  const matchTotals = athlete.matchStats.reduce(
    (total, item) => ({
      matches:
        total.matches +
        (item.minutesPlayed || item.goals || item.assists ? 1 : 0),
      goals: total.goals + item.goals,
      assists: total.assists + item.assists,
      yellowCards: total.yellowCards + item.yellowCards,
      redCards: total.redCards + item.redCards,
    }),
    { matches: 0, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
  );

  const growthAccess = await getClubGrowthCategoryAccess(user, athlete.categoryId, "BOTH");

  const measurement = athlete.bodyMeasurements[0];
  const wellbeing = athlete.wellbeingEntries[0];
  const height = decimalNumber(measurement?.heightCm);
  const weight = decimalNumber(measurement?.weightKg);
  const bmi = decimalNumber(measurement?.bmi);

  return (
    <main className="athlete-performance-page athlete-performance-v4 athlete-performance-v5">
      <section className="athlete-performance-hero">
        <div className="athlete-performance-hero-main">
          <div className="athlete-performance-hero-avatar">
            <SafeAvatar
              src={athlete.photoUrl}
              name={athlete.nickname || athlete.name}
              alt={athlete.name}
            />
          </div>

          <div className="athlete-performance-hero-copy">
            <span className="athlete-performance-hero-kicker">
              11UP PERFORMANCE · CLUB ELITE
            </span>

            <h1>{athlete.nickname || athlete.name}</h1>

            <p className="athlete-performance-hero-meta">
              <span>{athlete.name}</span>
              <span>{athlete.category?.name || "Sem categoria"}</span>
              <span>{athlete.position || "Posição não informada"}</span>
            </p>

            <p className="athlete-performance-hero-description">
              Treino, jogo, GPS, avaliações e evolução em uma visão individual do atleta.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <span
            className={`athlete-performance-v5-status ${
              athlete.active ? "active" : ""
            }`}
          >
            {athlete.active ? "Ativo" : "Inativo"}
          </span>

          <Link
            className="athlete-performance-hero-primary"
            href={`/atletas/${athlete.id}/performance/avaliacoes/nova`}
          >
            + Nova avaliação
          </Link>
        </div>
      </section>

      <nav
        className="athlete-performance-v5-athlete-tabs"
        aria-label="Navegação do atleta"
      >
        <Link href={`/atletas/${athlete.id}`}>
          Ficha
        </Link>

        <Link href={`/atletas/${athlete.id}/dados#documentos`}>
          Documentos
        </Link>

        <Link
          className="active"
          href={`/atletas/${athlete.id}/performance`}
        >
          Performance
        </Link>

        <Link
          className="athlete-performance-v5-back"
          href="/atletas"
        >
          ← Voltar aos atletas
        </Link>
      </nav>

      <ModuleTabs
        className="performance-module-tabs athlete-performance-tabs"
        ariaLabel="Navegação da performance do atleta"
        items={[
          {
            label: "Visão geral",
            href: `/atletas/${athlete.id}/performance`,
            active: true,
          },
          {
            label: "Treino",
            href: `/atletas/${athlete.id}/performance/treino`,
          },
          {
            label: "Jogo",
            href: `/atletas/${athlete.id}/performance/jogo`,
          },
          {
            label: "GPS",
            href: `/atletas/${athlete.id}/performance/gps`,
          },
          {
            label: "Avaliações",
            href: `/atletas/${athlete.id}/performance/avaliacoes`,
          },
          ...(growthAccess.canViewGrowth
            ? [{ label: "Crescimento", href: `/atletas/${athlete.id}/performance/crescimento` }]
            : []),
          {
            label: "Relatórios",
            href: `/atletas/${athlete.id}/performance/relatorios`,
          },
        ]}
      />

      <section className="athlete-performance-v4-heading">
        <div>
          <span className="page-eyebrow">VISÃO GERAL</span>
          <h2>Panorama individual</h2>
          <p className="muted">
            Indicadores essenciais de treino, jogo, avaliação e acompanhamento físico.
          </p>
        </div>

        {finalizedEvaluations.length > 0 ? (
          <Link
            className="btn btn-secondary"
            href={`/performance-evolution-pdf/${athlete.id}`}
          >
            Relatório de evolução
          </Link>
        ) : null}
      </section>

      <section className="athlete-performance-v4-kpis">
        <article>
          <span className="athlete-performance-v5-kpi-icon">
            <PerformanceIcon name="attendance" />
          </span>
          <div className="athlete-performance-v5-kpi-copy">
            <small>PRESENÇA</small>
            <strong>{attendanceRate === null ? "—" : `${attendanceRate}%`}</strong>
            <span>últimos registros de treino</span>
          </div>
        </article>

        <article>
          <span className="athlete-performance-v5-kpi-icon">
            <PerformanceIcon name="matches" />
          </span>
          <div className="athlete-performance-v5-kpi-copy">
            <small>JOGOS</small>
            <strong>{matchTotals.matches || "—"}</strong>
            <span>participações registradas</span>
          </div>
        </article>

        <article>
          <span className="athlete-performance-v5-kpi-icon">
            <PerformanceIcon name="goals" />
          </span>
          <div className="athlete-performance-v5-kpi-copy">
            <small>GOLS</small>
            <strong>{matchTotals.goals}</strong>
            <span>em súmulas cadastradas</span>
          </div>
        </article>

        <article>
          <span className="athlete-performance-v5-kpi-icon">
            <PerformanceIcon name="assists" />
          </span>
          <div className="athlete-performance-v5-kpi-copy">
            <small>ASSISTÊNCIAS</small>
            <strong>{matchTotals.assists}</strong>
            <span>em súmulas cadastradas</span>
          </div>
        </article>

        <article>
          <span className="athlete-performance-v5-kpi-icon">
            <PerformanceIcon name="evaluations" />
          </span>
          <div className="athlete-performance-v5-kpi-copy">
            <small>AVALIAÇÕES</small>
            <strong>{finalizedEvaluations.length || "—"}</strong>
            <span>finalizadas</span>
          </div>
        </article>
      </section>

      <section className="athlete-performance-v4-main-grid">
        <article className="athlete-performance-v4-feature athlete-performance-v4-evaluation">
          <div className="athlete-performance-v4-card-head">
            <div>
              <span className="page-eyebrow">PERFORMANCE</span>
              <h2>Última avaliação</h2>
              <p className="muted">
                {latestEvaluation
                  ? `${latestEvaluation.title || "Avaliação"} · ${formatDate(latestEvaluation.evaluatedAt)}`
                  : "Nenhuma avaliação finalizada."}
              </p>
            </div>

            {currentOverallAverage !== null ? (
              <div className="athlete-performance-v4-score">
                <strong>{scorePercent(currentOverallAverage)}%</strong>
                <span>resultado geral</span>
              </div>
            ) : null}
          </div>

          <div className="athlete-performance-v4-bars">
            {areaAverages.map(({ area, average }) => (
              <div className="athlete-performance-v4-bar-row" key={area}>
                <div>
                  <strong>{AREA_LABELS[area]}</strong>
                  <span>
                    {average !== null
                      ? `${average.toFixed(1)} / 4`
                      : "Sem dados"}
                  </span>
                </div>

                <div className="athlete-performance-v4-bar">
                  <span
                    style={{
                      width: `${((average || 0) / 4) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <aside className="athlete-performance-v4-summary">
          <article>
            <span className="page-eyebrow">TREINO</span>
            <h3>Presença e rotina</h3>
            <strong className="athlete-performance-v4-big-number">
              {attendanceRate === null ? "—" : `${attendanceRate}%`}
            </strong>
            <p>
              {countedAttendances.length
                ? `${presentAttendances.length} presença(s) em ${countedAttendances.length} registro(s).`
                : "Nenhum registro de frequência disponível."}
            </p>
            <Link href={`/atletas/${athlete.id}/performance/treino`}>
              Abrir treino →
            </Link>
          </article>

          <article>
            <span className="page-eyebrow">JOGO</span>
            <h3>Participação competitiva</h3>
            <div className="athlete-performance-v4-mini-stats">
              <span>
                <strong>{matchTotals.matches}</strong>
                <small>Jogos</small>
              </span>
              <span>
                <strong>{matchTotals.goals}</strong>
                <small>Gols</small>
              </span>
              <span>
                <strong>{matchTotals.assists}</strong>
                <small>Assist.</small>
              </span>
            </div>
            <Link href={`/atletas/${athlete.id}/performance/jogo`}>
              Abrir jogos →
            </Link>
          </article>

          <article className="athlete-performance-v4-gps-card">
            <span className="page-eyebrow">GPS</span>
            <h3>Carga física</h3>
            <p>
              Área preparada para dados de GPS de treino e jogo vinculados ao atleta.
            </p>
            <Link href={`/atletas/${athlete.id}/performance/gps`}>
              Abrir GPS →
            </Link>
          </article>
        </aside>
      </section>

      <section className="athlete-performance-v4-secondary-grid">
        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">DADOS FÍSICOS</span>
          <div className="section-title-row" style={{ alignItems: "center" }}>
            <h2>Última medição</h2>
            {growthAccess.canViewGrowth ? (
              <Link className="btn btn-small btn-secondary" href={`/atletas/${athlete.id}/performance/crescimento`}>
                Abrir crescimento →
              </Link>
            ) : null}
          </div>

          <div className="athlete-performance-v4-detail-grid">
            <div>
              <small>ALTURA</small>
              <strong>{height ? `${height} cm` : "—"}</strong>
            </div>
            <div>
              <small>PESO</small>
              <strong>{weight ? `${weight} kg` : "—"}</strong>
            </div>
            <div>
              <small>IMC</small>
              <strong>{bmi?.toFixed(1) || "—"}</strong>
            </div>
            <div>
              <small>MEDIÇÃO</small>
              <strong>{formatDate(measurement?.measuredAt)}</strong>
            </div>
          </div>
        </article>

        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">BEM-ESTAR</span>
          <h2>Registro mais recente</h2>

          <div className="athlete-performance-v4-detail-grid">
            <div>
              <small>SONO</small>
              <strong>{decimalNumber(wellbeing?.sleepHours) ?? "—"} h</strong>
            </div>
            <div>
              <small>QUALIDADE</small>
              <strong>{wellbeing?.sleepQuality ?? "—"}</strong>
            </div>
            <div>
              <small>ENERGIA</small>
              <strong>{wellbeing?.energyLevel ?? "—"}</strong>
            </div>
            <div>
              <small>DOR</small>
              <strong>
                {wellbeing?.hasPain ? wellbeing.painLocation || "Sim" : "Não"}
              </strong>
            </div>
          </div>
        </article>

        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">METAS</span>
          <h2>Em andamento</h2>

          {athlete.performanceGoals.length ? (
            <div className="athlete-performance-v4-list">
              {athlete.performanceGoals.slice(0, 3).map((goal) => (
                <div key={goal.id}>
                  <strong>{goal.title}</strong>
                  <span>
                    {AREA_LABELS[goal.area] || goal.area} · até{" "}
                    {formatDate(goal.targetDate)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhuma meta ativa cadastrada.</p>
          )}
        </article>

        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">ROTINA COMPLEMENTAR</span>
          <h2>Treinos externos</h2>

          {athlete.externalTrainings.length ? (
            <div className="athlete-performance-v4-list">
              {athlete.externalTrainings.slice(0, 3).map((training) => (
                <div key={training.id}>
                  <strong>{training.activity}</strong>
                  <span>
                    {training.providerName ||
                      training.modality ||
                      "Atividade externa"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum treino complementar ativo.</p>
          )}
        </article>
      </section>

      <section className="card athlete-performance-v4-comparison">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">EVOLUÇÃO</span>
            <h2>Primeira avaliação × avaliação atual</h2>
          </div>

          {overallDelta !== null ? (
            <span
              className={`athlete-performance-v4-delta ${
                overallDelta > 0
                  ? "positive"
                  : overallDelta < 0
                    ? "negative"
                    : ""
              }`}
            >
              {overallDelta > 0 ? "+" : ""}
              {Math.round((overallDelta / 4) * 100)} p.p.
            </span>
          ) : null}
        </div>

        {latestEvaluation && firstComparableEvaluation ? (
          <>
            <p className="muted">
              {formatDate(firstComparableEvaluation.evaluatedAt)} →{" "}
              {formatDate(latestEvaluation.evaluatedAt)} ·{" "}
              {latestEvaluation.athleteRole === "GOALKEEPER"
                ? "Goleiro"
                : "Jogador de linha"}
            </p>

            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Valência</th>
                    <th>Inicial</th>
                    <th>Atual</th>
                    <th>Evolução</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="athlete-performance-v4-total-row">
                    <td>
                      <strong>Resultado geral</strong>
                    </td>
                    <td>
                      {initialOverallAverage !== null
                        ? `${initialOverallAverage.toFixed(2)} (${scorePercent(initialOverallAverage)}%)`
                        : "—"}
                    </td>
                    <td>
                      {currentOverallAverage !== null
                        ? `${currentOverallAverage.toFixed(2)} (${scorePercent(currentOverallAverage)}%)`
                        : "—"}
                    </td>
                    <td>
                      <strong>
                        {overallDelta === null
                          ? "—"
                          : `${overallDelta > 0 ? "+" : ""}${overallDelta.toFixed(2)}`}
                      </strong>
                    </td>
                  </tr>

                  {areaAverages.map(({ area, initial, average, delta }) => (
                    <tr key={area}>
                      <td>
                        <strong>{AREA_LABELS[area]}</strong>
                      </td>
                      <td>
                        {initial !== null
                          ? `${initial.toFixed(1)} (${scorePercent(initial)}%)`
                          : "—"}
                      </td>
                      <td>
                        {average !== null
                          ? `${average.toFixed(1)} (${scorePercent(average)}%)`
                          : "—"}
                      </td>
                      <td>
                        <strong>
                          {delta === null
                            ? "—"
                            : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="muted">
            Finalize pelo menos duas avaliações do mesmo tipo para visualizar o comparativo.
          </p>
        )}
      </section>

      <section className="card athlete-performance-v4-history">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">HISTÓRICO</span>
            <h2>Avaliações do atleta</h2>
          </div>

          <span className="badge">
            {athlete.evaluations.length} registro(s)
          </span>
        </div>

        {athlete.evaluations.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Avaliação</th>
                  <th>Tipo</th>
                  <th>Data</th>
                  <th>Avaliador</th>
                  <th>Preenchimento</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {athlete.evaluations.map((evaluation) => (
                  <tr key={evaluation.id}>
                    <td>
                      <strong>{evaluation.title || "Avaliação"}</strong>
                    </td>
                    <td>
                      {evaluation.athleteRole === "GOALKEEPER"
                        ? "Goleiro"
                        : "Jogador de linha"}
                    </td>
                    <td>{formatDate(evaluation.evaluatedAt)}</td>
                    <td>{evaluation.evaluator?.name || "—"}</td>
                    <td>{evaluation.scores.length}/25</td>
                    <td>
                      <span className="badge">
                        {evaluation.status === "FINALIZED"
                          ? "Finalizada"
                          : evaluation.status === "DRAFT"
                            ? "Rascunho"
                            : "Arquivada"}
                      </span>
                    </td>
                    <td>
                      {evaluation.status === "FINALIZED" ? (
                        <Link
                          className="btn btn-small"
                          href={`/atletas/${athlete.id}/performance/avaliacoes/${evaluation.id}`}
                        >
                          Ver avaliação
                        </Link>
                      ) : (
                        <span className="help">Rascunho</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Nenhuma avaliação cadastrada.</p>
        )}
      </section>

      <style>{`
        .athlete-performance-v5 {
          --athlete-performance-ink: #07131d;
          --athlete-performance-muted: #70808b;
          --athlete-performance-line: #dfe6ea;
          --athlete-performance-lime: #99e600;
          --athlete-performance-lime-soft: #eff9d8;
          display: grid;
          gap: 18px;
          padding: 28px 34px 44px;
          background:
            radial-gradient(circle at 92% 2%, rgba(153, 230, 0, .075), transparent 25rem),
            #f4f7f8;
        }

        .athlete-performance-v5 * {
          box-sizing: border-box;
        }

        .athlete-performance-v5 .athlete-performance-hero {
          min-height: 194px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          position: relative;
          overflow: hidden;
          margin: 0;
          padding: 28px 34px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 26px;
          color: #fff;
          background:
            linear-gradient(
              104deg,
              rgba(5, 20, 31, .99) 0%,
              rgba(6, 29, 37, .98) 58%,
              rgba(20, 76, 30, .97) 100%
            );
          box-shadow: 0 20px 45px rgba(7,19,29,.12);
        }

        .athlete-performance-v5 .athlete-performance-hero::after {
          content: "";
          width: 360px;
          height: 360px;
          position: absolute;
          right: -105px;
          top: -175px;
          border: 1px solid rgba(153,230,0,.18);
          border-radius: 999px;
          box-shadow:
            0 0 0 42px rgba(153,230,0,.025),
            0 0 0 84px rgba(153,230,0,.018);
          pointer-events: none;
        }

        .athlete-performance-v5 .athlete-performance-hero-main,
        .athlete-performance-v5 .athlete-performance-hero-actions {
          position: relative;
          z-index: 1;
        }

        .athlete-performance-v5 .athlete-performance-hero-avatar {
          width: 94px;
          height: 94px;
          flex: 0 0 94px;
          overflow: hidden;
          border: 3px solid var(--athlete-performance-lime);
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 12px 26px rgba(0,0,0,.18);
        }

        .athlete-performance-v5 .athlete-performance-hero-avatar img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .athlete-performance-v5 .athlete-performance-hero-kicker {
          color: var(--athlete-performance-lime);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .16em;
        }

        .athlete-performance-v5 .athlete-performance-hero h1 {
          margin: 6px 0 0;
          color: #fff !important;
          font-size: clamp(34px, 4vw, 54px);
          line-height: 1;
          letter-spacing: -.045em;
        }

        .athlete-performance-v5 .athlete-performance-hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-top: 10px;
        }

        .athlete-performance-v5 .athlete-performance-hero-meta span {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 999px;
          color: rgba(255,255,255,.86);
          background: rgba(255,255,255,.04);
          font-size: 10px;
          font-weight: 800;
        }

        .athlete-performance-v5 .athlete-performance-hero-description {
          margin-top: 12px;
          color: rgba(255,255,255,.78);
          font-size: 13px;
        }

        .athlete-performance-v5 .athlete-performance-hero-actions {
          min-width: 225px;
          display: grid;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(4,24,35,.66);
          backdrop-filter: blur(8px);
        }

        .athlete-performance-v5-status {
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 14px;
          border-radius: 999px;
          color: #c8d0d5;
          background: rgba(255,255,255,.08);
          font-size: 10px;
          font-weight: 900;
        }

        .athlete-performance-v5-status.active {
          color: #10200a;
          background: var(--athlete-performance-lime);
        }

        .athlete-performance-v5 .athlete-performance-hero-primary {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: #07120a;
          background: var(--athlete-performance-lime);
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          box-shadow: 0 10px 25px rgba(153,230,0,.14);
        }

        .athlete-performance-v5-athlete-tabs {
          min-height: 64px;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px;
          border: 1px solid var(--athlete-performance-line);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 8px 28px rgba(8,26,38,.035);
        }

        .athlete-performance-v5-athlete-tabs > a {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border-radius: 11px;
          color: #5e6f7a;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }

        .athlete-performance-v5-athlete-tabs > a:hover {
          color: var(--athlete-performance-ink);
          background: #f4f7f8;
        }

        .athlete-performance-v5-athlete-tabs > a.active {
          color: #0b1806;
          background: var(--athlete-performance-lime);
          box-shadow: 0 7px 18px rgba(153,230,0,.16);
        }

        .athlete-performance-v5-athlete-tabs > .athlete-performance-v5-back {
          margin-left: auto;
          border: 1px solid #dfe6ea;
          color: #5f6f7a;
          background: #fafbfb;
        }

        .athlete-performance-v5 .athlete-performance-tabs {
          margin: 0;
          padding: 6px;
          border: 1px solid var(--athlete-performance-line);
          border-radius: 16px;
          background: #eef2f4;
        }

        .athlete-performance-v5 .athlete-performance-tabs a {
          min-height: 40px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 900;
        }

        .athlete-performance-v5 .athlete-performance-v4-heading {
          margin: 0;
          padding: 2px 0 0;
        }

        .athlete-performance-v5 .athlete-performance-v4-heading h2 {
          margin-top: 4px;
          color: var(--athlete-performance-ink);
          font-size: 27px;
          letter-spacing: -.03em;
        }

        .athlete-performance-v5 .athlete-performance-v4-heading .muted {
          color: var(--athlete-performance-muted);
          font-size: 12px;
        }

        .athlete-performance-v5 .athlete-performance-v4-kpis {
          gap: 14px;
        }

        .athlete-performance-v5 .athlete-performance-v4-kpis article,
        .athlete-performance-v5 .athlete-performance-v4-feature,
        .athlete-performance-v5 .athlete-performance-v4-summary article,
        .athlete-performance-v5 .athlete-performance-v4-detail-card,
        .athlete-performance-v5 .athlete-performance-v4-comparison,
        .athlete-performance-v5 .athlete-performance-v4-history {
          border: 1px solid var(--athlete-performance-line);
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-performance-v5 .athlete-performance-v4-kpis {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .athlete-performance-v5 .athlete-performance-v4-kpis article {
          min-height: 118px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          position: relative;
          overflow: hidden;
          padding: 17px;
        }

        .athlete-performance-v5 .athlete-performance-v4-kpis article::before,
        .athlete-performance-v5 .athlete-performance-v4-kpis article::after {
          display: none !important;
          content: none !important;
        }

        .athlete-performance-v5-kpi-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 12px;
          color: #719f00;
          background: #eff9d8;
        }

        .athlete-performance-v5-kpi-copy {
          min-width: 0;
          display: grid;
          align-content: start;
        }

        .athlete-performance-v5 .athlete-performance-v5-kpi-copy small {
          color: #74838d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .athlete-performance-v5 .athlete-performance-v5-kpi-copy strong {
          margin-top: 2px;
          color: var(--athlete-performance-ink);
          font-size: 27px;
          line-height: 1.05;
          letter-spacing: -.04em;
        }

        .athlete-performance-v5 .athlete-performance-v5-kpi-copy > span {
          margin-top: 4px;
          color: var(--athlete-performance-muted);
          font-size: 10px;
          font-weight: 700;
          line-height: 1.35;
        }

        .athlete-performance-v5 .page-eyebrow {
          color: #719f00;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .14em;
        }

        @media (max-width: 980px) {
          .athlete-performance-v5 {
            padding: 24px;
          }

          .athlete-performance-v5 .athlete-performance-hero {
            min-height: auto;
            align-items: flex-start;
            flex-direction: column;
          }

          .athlete-performance-v5 .athlete-performance-hero-actions {
            width: 100%;
          }

          .athlete-performance-v5 .athlete-performance-v4-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .athlete-performance-v5 {
            gap: 14px;
            padding: 16px 12px 32px;
          }

          .athlete-performance-v5 .athlete-performance-hero {
            padding: 22px 18px;
            border-radius: 20px;
          }

          .athlete-performance-v5 .athlete-performance-hero-avatar {
            width: 72px;
            height: 72px;
            flex-basis: 72px;
            border-radius: 18px;
          }

          .athlete-performance-v5 .athlete-performance-hero h1 {
            font-size: 32px;
          }

          .athlete-performance-v5-athlete-tabs,
          .athlete-performance-v5 .athlete-performance-tabs {
            overflow-x: auto;
            justify-content: flex-start;
            white-space: nowrap;
          }

          .athlete-performance-v5-athlete-tabs > a,
          .athlete-performance-v5 .athlete-performance-tabs a {
            flex: 0 0 auto;
          }

          .athlete-performance-v5-athlete-tabs > .athlete-performance-v5-back {
            margin-left: 0;
          }

          .athlete-performance-v5 .athlete-performance-v4-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 520px) {
          .athlete-performance-v5 .athlete-performance-v4-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
