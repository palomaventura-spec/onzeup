import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PerformanceRadarChart from "@/components/PerformanceRadarChart";
import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";

const AREAS = [
  { key: "PHYSICAL", label: "Física", color: "#2563eb" },
  { key: "TECHNICAL", label: "Técnica", color: "#84cc16" },
  { key: "TACTICAL", label: "Tática", color: "#f59e0b" },
  { key: "COGNITIVE", label: "Cognitiva", color: "#8b5cf6" },
  { key: "EMOTIONAL", label: "Emocional", color: "#ec4899" },
] as const;

type ScoreLike = { score: number; area: string };

function average(scores: ScoreLike[]) {
  return scores.length
    ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length
    : null;
}

function areaAverage(scores: ScoreLike[], area: string) {
  return average(scores.filter((item) => item.area === area));
}

function percent(score: number | null) {
  return score === null ? null : Math.round((score / 4) * 100);
}

function classification(score: number | null) {
  if (score === null) return "Sem resultado";
  if (score < 1.5) return "Iniciante";
  if (score < 2.5) return "Em desenvolvimento";
  if (score < 3.5) return "Eficiente";
  return "Excelente";
}

function dateLabel(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

export default async function PerformanceEvaluationReportPage({
  params,
}: {
  params: Promise<{ id: string; evaluationId: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { id, evaluationId } = await params;

  const [evaluation, subscription, organization] = await Promise.all([
    prisma.athleteEvaluation.findFirst({
      where: {
        id: evaluationId,
        athleteId: id,
        organizationId: user.organizationId,
      },
      include: {
        athlete: { include: { category: true } },
        evaluator: { select: { name: true } },
        template: { select: { name: true } },
        scores: {
          orderBy: [{ sortOrder: "asc" }, { metricLabel: "asc" }],
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

  if (!evaluation) notFound();

  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  });
  if (!elite) redirect("/performance?erro=elite");

  const history = await prisma.athleteEvaluation.findMany({
    where: {
      athleteId: id,
      organizationId: user.organizationId,
      athleteRole: evaluation.athleteRole,
      status: "FINALIZED",
    },
    orderBy: { evaluatedAt: "asc" },
    include: { scores: true },
  });

  const overall = average(evaluation.scores);
  const overallPercent = percent(overall);
  const areaResults = AREAS.map((area) => {
    const result = areaAverage(evaluation.scores, area.key);
    return { ...area, result, resultPercent: percent(result) };
  });

  const firstEvaluation = history[0];
  const radarItems = AREAS.map((area) => ({
    label: area.label,
    value: percent(areaAverage(evaluation.scores, area.key)) ?? 0,
    comparisonValue: firstEvaluation
      ? percent(areaAverage(firstEvaluation.scores, area.key))
      : null,
  }));

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">RELATÓRIO INTERNO • PERFORMANCE</span>
          <h1>{evaluation.title || "Avaliação do atleta"}</h1>
          <p className="muted">
            {evaluation.athlete.name} •{" "}
            {evaluation.athlete.category?.name || "Sem categoria"} •{" "}
            {dateLabel(evaluation.periodStart)} a {dateLabel(evaluation.periodEnd)}
          </p>
        </div>
        <div className="actions">
          <Link
            className="btn btn-secondary"
            href={`/atletas/${id}/performance`}
          >
            Voltar
          </Link>
          {evaluation.status === "FINALIZED" ? (
            <Link className="btn" href={`/performance-pdf/${evaluation.id}`}>
              Gerar PDF
            </Link>
          ) : null}
        </div>
      </div>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {[
          ["Resultado geral", overall === null ? "—" : `${overall.toFixed(2)} / 4`],
          ["Percentual geral", overallPercent === null ? "—" : `${overallPercent}%`],
          ["Classificação", classification(overall)],
          ["Tipo", evaluation.athleteRole === "GOALKEEPER" ? "Goleiro" : "Jogador de linha"],
          ["Avaliador", evaluation.evaluator?.name || "—"],
          ["Status", evaluation.status === "FINALIZED" ? "Finalizada" : "Rascunho"],
        ].map(([label, value]) => (
          <article className="card" key={label} style={{ padding: 18 }}>
            <span className="help" style={{ display: "block" }}>{label}</span>
            <strong style={{ display: "block", fontSize: 21, marginTop: 6 }}>{value}</strong>
          </article>
        ))}
      </section>

      <section className="card">
        <span className="page-eyebrow">RESULTADO POR VALÊNCIA</span>
        <h2>Desempenho nesta avaliação</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 14,
            marginTop: 18,
          }}
        >
          {areaResults.map((area) => (
            <div key={area.key} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 15 }}>
              <strong>{area.label}</strong>
              <div style={{ fontSize: 24, fontWeight: 900, marginTop: 8 }}>
                {area.resultPercent ?? "—"}%
              </div>
              <span className="help">
                {area.result === null ? "Sem notas" : `${area.result.toFixed(1)} de 4`}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <span className="page-eyebrow">MAPA DE PERFORMANCE</span>
        <h2>Mapa das cinco valências</h2>
        <p className="muted">
          A área verde representa esta avaliação. O contorno cinza tracejado
          representa a primeira avaliação finalizada do atleta.
        </p>
        <PerformanceRadarChart
          items={radarItems}
          currentLabel={`Esta avaliação • ${dateLabel(evaluation.evaluatedAt)}`}
          comparisonLabel={firstEvaluation
            ? `Avaliação inicial • ${dateLabel(firstEvaluation.evaluatedAt)}`
            : "Avaliação inicial"}
        />
      </section>

      {AREAS.map((area) => {
        const scores = evaluation.scores.filter((score) => score.area === area.key);
        if (!scores.length) return null;
        return (
          <section className="card" style={{ marginTop: 18 }} key={area.key}>
            <span className="page-eyebrow">VALÊNCIA {area.label.toUpperCase()}</span>
            <h2>{percent(areaAverage(scores, area.key))}% • critérios avaliados</h2>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="table">
                <thead><tr><th>Item</th><th>Nota</th><th>Percentual</th><th>Nível</th><th>Descrição e observação</th></tr></thead>
                <tbody>
                  {scores.map((score) => (
                    <tr key={score.id}>
                      <td><strong>{score.metricLabel}</strong></td>
                      <td>{score.score}/4</td>
                      <td>{percent(score.score)}%</td>
                      <td>{score.ratingLabel || "—"}</td>
                      <td>
                        <span>{score.ratingDescription || "—"}</span>
                        {score.notes ? <small className="help" style={{ display: "block", marginTop: 5 }}>Observação: {score.notes}</small> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <section className="card" style={{ marginTop: 18 }}>
        <span className="page-eyebrow">PARECER</span>
        <h2>Conclusão da avaliação</h2>
        <div className="stack" style={{ marginTop: 18 }}>
          <div><span className="help" style={{ display: "block" }}>Pontos fortes</span><p>{evaluation.strengths || "—"}</p></div>
          <div><span className="help" style={{ display: "block" }}>Pontos de desenvolvimento</span><p>{evaluation.developmentPoints || "—"}</p></div>
          <div><span className="help" style={{ display: "block" }}>Próximas metas</span><p>{evaluation.nextGoals || "—"}</p></div>
          <div><span className="help" style={{ display: "block" }}>Parecer geral</span><p>{evaluation.summary || "—"}</p></div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 18, borderColor: "#f59e0b" }}>
        <span className="page-eyebrow">USO INTERNO DO CLUBE</span>
        <h2>Observações internas</h2>
        <p className="muted">{evaluation.internalNotes || "Nenhuma observação interna."}</p>
        <small className="help">Este conteúdo não será incluído no PDF compartilhável.</small>
      </section>
    </>
  );
}
