import Link from "next/link";
import { notFound } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
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
            <span className="page-eyebrow">ONZEUP PERFORMANCE</span>
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
    <main className="athlete-performance-page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">ONZEUP PERFORMANCE • CLUB ELITE</span>
          <h1>{athlete.nickname || athlete.name}</h1>
          <p className="muted">
            {athlete.name} • {athlete.category?.name || "Sem categoria"} •{" "}
            {athlete.position || "Posição não informada"}
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" href={`/atletas/${athlete.id}`}>
            Voltar ao atleta
          </Link>
          {finalizedEvaluations.length > 0 ? (
            <Link
              className="btn btn-secondary"
              href={`/performance-evolution-pdf/${athlete.id}`}
            >
              Relatório de evolução
            </Link>
          ) : null}
          <Link
            className="btn"
            href={`/atletas/${athlete.id}/performance/avaliacoes/nova`}
          >
            Nova avaliação
          </Link>
        </div>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {[
          ["Avaliações", finalizedEvaluations.length || "—"],
          ["Presença", attendanceRate === null ? "—" : `${attendanceRate}%`],
          ["Jogos", matchTotals.matches || "—"],
          ["Gols", matchTotals.goals],
          ["Assistências", matchTotals.assists],
        ].map(([label, value]) => (
          <article className="card" key={label} style={{ padding: 18 }}>
            <span className="help">{label}</span>
            <strong style={{ display: "block", fontSize: 28, marginTop: 5 }}>
              {value}
            </strong>
          </article>
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
          gap: 18,
        }}
      >
        <article className="card">
          <span className="page-eyebrow">ÚLTIMA AVALIAÇÃO</span>
          <h2>Evolução por área</h2>
          <p className="muted">
            {latestEvaluation
              ? `${latestEvaluation.title || "Avaliação"} • ${formatDate(latestEvaluation.evaluatedAt)}`
              : "Nenhuma avaliação finalizada."}
          </p>

          <div className="stack" style={{ marginTop: 20 }}>
            {areaAverages.map(({ area, average }) => (
              <div key={area}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <strong>{AREA_LABELS[area]}</strong>
                  <span>
                    {average !== null
                      ? `${average.toFixed(1)} / 4 • ${scorePercent(average)}%`
                      : "— / 4"}
                  </span>
                </div>
                <div
                  style={{
                    height: 9,
                    marginTop: 7,
                    overflow: "hidden",
                    borderRadius: 999,
                    background: "#e9eef0",
                  }}
                >
                  <div
                    style={{
                      width: `${((average || 0) / 4) * 100}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "#9ddb16",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <span className="page-eyebrow">ACOMPANHAMENTO</span>
          <h2>Metas em andamento</h2>
          {athlete.performanceGoals.length ? (
            <div className="stack" style={{ marginTop: 18 }}>
              {athlete.performanceGoals.map((goal) => (
                <div key={goal.id}>
                  <strong>{goal.title}</strong>
                  <div className="help">
                    {AREA_LABELS[goal.area] || goal.area} • até{" "}
                    {formatDate(goal.targetDate)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhuma meta ativa cadastrada.</p>
          )}
        </article>

        <article className="card">
          <span className="page-eyebrow">DADOS FÍSICOS</span>
          <h2>Última medição</h2>
          <div className="stack" style={{ marginTop: 18 }}>
            <div>
              <span className="help">Altura</span>
              <strong>{height ? `${height} cm` : "—"}</strong>
            </div>
            <div>
              <span className="help">Peso</span>
              <strong>{weight ? `${weight} kg` : "—"}</strong>
            </div>
            <div>
              <span className="help">IMC</span>
              <strong>{bmi?.toFixed(1) || "—"}</strong>
            </div>
            <div>
              <span className="help">Medição</span>
              <strong>{formatDate(measurement?.measuredAt)}</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <span className="page-eyebrow">BEM-ESTAR</span>
          <h2>Registro mais recente</h2>
          <div className="stack" style={{ marginTop: 18 }}>
            <div>
              <span className="help">Sono</span>
              <strong>{decimalNumber(wellbeing?.sleepHours) ?? "—"} h</strong>
            </div>
            <div>
              <span className="help">Qualidade do sono</span>
              <strong>{wellbeing?.sleepQuality ?? "—"}</strong>
            </div>
            <div>
              <span className="help">Energia</span>
              <strong>{wellbeing?.energyLevel ?? "—"}</strong>
            </div>
            <div>
              <span className="help">Dor relatada</span>
              <strong>
                {wellbeing?.hasPain ? wellbeing.painLocation || "Sim" : "Não"}
              </strong>
            </div>
          </div>
        </article>

        <article className="card">
          <span className="page-eyebrow">SÚMULA</span>
          <h2>Resumo dos jogos</h2>
          <div className="stack" style={{ marginTop: 18 }}>
            <div>
              <span className="help">Cartões amarelos</span>
              <strong>{matchTotals.yellowCards}</strong>
            </div>
            <div>
              <span className="help">Cartões vermelhos</span>
              <strong>{matchTotals.redCards}</strong>
            </div>
          </div>
        </article>

        <article className="card">
          <span className="page-eyebrow">ROTINA COMPLEMENTAR</span>
          <h2>Treinos complementares</h2>
          {athlete.externalTrainings.length ? (
            <div className="stack" style={{ marginTop: 18 }}>
              {athlete.externalTrainings.map((training) => (
                <div key={training.id}>
                  <strong>{training.activity}</strong>
                  <div className="help">
                    {training.providerName ||
                      training.modality ||
                      "Atividade externa"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">Nenhum treino complementar ativo.</p>
          )}
        </article>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="page-eyebrow">COMPARATIVO DE EVOLUÇÃO</span>
        <h2>Primeira avaliação × avaliação atual</h2>
        {latestEvaluation && firstComparableEvaluation ? (
          <>
            <p className="muted">
              {formatDate(firstComparableEvaluation.evaluatedAt)} →{" "}
              {formatDate(latestEvaluation.evaluatedAt)} •{" "}
              {latestEvaluation.athleteRole === "GOALKEEPER"
                ? "Goleiro"
                : "Jogador de linha"}
            </p>
            <div className="table-wrap" style={{ marginTop: 18 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Total / valência</th>
                    <th>Inicial</th>
                    <th>Atual</th>
                    <th>Evolução</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "#f5f8f9" }}>
                    <td>
                      <strong>Resultado geral — 5 valências</strong>
                    </td>
                    <td>
                      <strong>
                        {initialOverallAverage !== null
                          ? `${initialOverallAverage.toFixed(2)} (${scorePercent(initialOverallAverage)}%)`
                          : "—"}
                      </strong>
                    </td>
                    <td>
                      <strong>
                        {currentOverallAverage !== null
                          ? `${currentOverallAverage.toFixed(2)} (${scorePercent(currentOverallAverage)}%)`
                          : "—"}
                      </strong>
                    </td>
                    <td>
                      <strong
                        style={{
                          color:
                            overallDelta === null || overallDelta === 0
                              ? "inherit"
                              : overallDelta > 0
                                ? "#4f8f00"
                                : "#b45309",
                        }}
                      >
                        {overallDelta === null
                          ? "—"
                          : `${overallDelta > 0 ? "+" : ""}${overallDelta.toFixed(2)} (${overallDelta > 0 ? "+" : ""}${Math.round((overallDelta / 4) * 100)} p.p.)`}
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
                        <strong
                          style={{
                            color:
                              delta === null || delta === 0
                                ? "inherit"
                                : delta > 0
                                  ? "#4f8f00"
                                  : "#b45309",
                          }}
                        >
                          {delta === null
                            ? "—"
                            : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} (${delta > 0 ? "+" : ""}${Math.round((delta / 4) * 100)} p.p.)`}
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
            Finalize pelo menos duas avaliações do mesmo tipo para visualizar o
            comparativo de evolução.
          </p>
        )}
      </section>

      <section className="card" style={{ marginTop: 18 }}>
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
          <div className="table-wrap" style={{ marginTop: 18 }}>
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
