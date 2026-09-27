import Link from "next/link";
import { notFound } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
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

  const measurement = athlete.bodyMeasurements[0];
  const wellbeing = athlete.wellbeingEntries[0];
  const height = decimalNumber(measurement?.heightCm);
  const weight = decimalNumber(measurement?.weightKg);
  const bmi = decimalNumber(measurement?.bmi);

  return (
    <main className="athlete-performance-page athlete-performance-v4">
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
          <Link
            className="athlete-performance-hero-primary"
            href={`/atletas/${athlete.id}/performance/avaliacoes/nova`}
          >
            + Nova avaliação
          </Link>

          <Link
            className="athlete-performance-hero-secondary"
            href={`/atletas/${athlete.id}`}
          >
            Voltar ao atleta
          </Link>
        </div>
      </section>

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
          <small>PRESENÇA</small>
          <strong>{attendanceRate === null ? "—" : `${attendanceRate}%`}</strong>
          <span>últimos registros de treino</span>
        </article>

        <article>
          <small>JOGOS</small>
          <strong>{matchTotals.matches || "—"}</strong>
          <span>participações registradas</span>
        </article>

        <article>
          <small>GOLS</small>
          <strong>{matchTotals.goals}</strong>
          <span>em súmulas cadastradas</span>
        </article>

        <article>
          <small>ASSISTÊNCIAS</small>
          <strong>{matchTotals.assists}</strong>
          <span>em súmulas cadastradas</span>
        </article>

        <article>
          <small>AVALIAÇÕES</small>
          <strong>{finalizedEvaluations.length || "—"}</strong>
          <span>finalizadas</span>
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
          <h2>Última medição</h2>

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
    </main>
  );
}
