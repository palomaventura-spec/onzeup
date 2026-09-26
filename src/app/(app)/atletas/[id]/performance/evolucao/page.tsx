import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PerformanceRadarChart from "@/components/PerformanceRadarChart";
import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";

const AREAS = [
  ["PHYSICAL", "Física"],
  ["TECHNICAL", "Técnica"],
  ["TACTICAL", "Tática"],
  ["COGNITIVE", "Cognitiva"],
  ["EMOTIONAL", "Emocional"],
] as const;

type Score = { score: number; area: string; metricCode: string; metricLabel: string };

function average(scores: Array<{ score: number }>) {
  return scores.length
    ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length
    : null;
}

function areaAverage(scores: Score[], area: string) {
  return average(scores.filter((score) => score.area === area));
}

function percentage(value: number | null) {
  return value === null ? null : Math.round((value / 4) * 100);
}

function change(initial: number | null, current: number | null) {
  return initial === null || current === null ? null : current - initial;
}

function changeLabel(value: number | null) {
  if (value === null) return "—";
  const points = Math.round((value / 4) * 100);
  return `${points > 0 ? "+" : ""}${points} p.p.`;
}

function dateLabel(value: Date) {
  return value.toLocaleDateString("pt-BR");
}

export default async function PerformanceEvolutionReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { id } = await params;
  const query = await searchParams;

  const [athlete, subscription, organization] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        category: true,
        evaluations: {
          where: { status: "FINALIZED" },
          orderBy: { evaluatedAt: "asc" },
          include: {
            evaluator: { select: { name: true } },
            scores: { orderBy: [{ sortOrder: "asc" }, { metricLabel: "asc" }] },
          },
        },
      },
    }),
    prisma.subscription.findUnique({ where: { organizationId: user.organizationId } }),
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
  if (!elite) redirect("/performance?erro=elite");

  const availableRoles = ["LINE_PLAYER", "GOALKEEPER"].filter((role) =>
    athlete.evaluations.some((evaluation) => evaluation.athleteRole === role)
  );
  const selectedRole =
    query.role && availableRoles.includes(query.role)
      ? query.role
      : availableRoles[0] || "LINE_PLAYER";
  const evaluations = athlete.evaluations.filter(
    (evaluation) => evaluation.athleteRole === selectedRole
  );
  const first = evaluations[0];
  const latest = evaluations[evaluations.length - 1];
  const firstOverall = first ? average(first.scores) : null;
  const latestOverall = latest ? average(latest.scores) : null;
  const overallChange = change(firstOverall, latestOverall);
  const radarItems = first && latest
    ? AREAS.map(([key, label]) => ({
        label,
        value: percentage(areaAverage(latest.scores, key)) ?? 0,
        comparisonValue: percentage(areaAverage(first.scores, key)),
      }))
    : [];

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">11UP PERFORMANCE • EVOLUÇÃO</span>
          <h1>Relatório de evolução</h1>
          <p className="muted">
            {athlete.name} • {athlete.category?.name || "Sem categoria"} •{" "}
            {athlete.position || "Posição não informada"}
          </p>
        </div>
        <div className="actions">
          <Link className="btn btn-secondary" href={`/atletas/${id}/performance`}>
            Voltar ao Performance
          </Link>
          {evaluations.length ? (
            <Link className="btn" href={`/performance-evolution-pdf/${id}?role=${selectedRole}`}>
              Gerar PDF de evolução
            </Link>
          ) : null}
        </div>
      </div>

      {availableRoles.length > 1 ? (
        <section className="card" style={{ marginBottom: 18 }}>
          <span className="page-eyebrow">TIPO DE AVALIAÇÃO</span>
          <div className="actions" style={{ marginTop: 10 }}>
            {availableRoles.map((role) => (
              <Link
                className={role === selectedRole ? "btn" : "btn btn-secondary"}
                href={`/atletas/${id}/performance/evolucao?role=${role}`}
                key={role}
              >
                {role === "GOALKEEPER" ? "Goleiro" : "Jogador de linha"}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {!evaluations.length ? (
        <section className="card empty">
          Finalize pelo menos uma avaliação para gerar o relatório de evolução.
        </section>
      ) : (
        <>
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 14,
              marginBottom: 18,
            }}
          >
            {[
              ["Avaliações", evaluations.length],
              ["Resultado inicial", `${percentage(firstOverall)}%`],
              ["Resultado atual", `${percentage(latestOverall)}%`],
              ["Evolução total", changeLabel(overallChange)],
            ].map(([label, value]) => (
              <article className="card" key={label} style={{ padding: 18 }}>
                <span className="help" style={{ display: "block" }}>{label}</span>
                <strong style={{ display: "block", fontSize: 26, marginTop: 6 }}>{value}</strong>
              </article>
            ))}
          </section>

          <section className="card">
            <span className="page-eyebrow">MAPA DE PERFORMANCE</span>
            <h2>Comparativo das cinco valências</h2>
            <p className="muted">
              A área verde representa a avaliação atual e o contorno cinza tracejado representa a primeira avaliação.
            </p>
            <PerformanceRadarChart
              items={radarItems}
              currentLabel={`Atual • ${dateLabel(latest.evaluatedAt)}`}
              comparisonLabel={`Inicial • ${dateLabel(first.evaluatedAt)}`}
            />
          </section>

          <section className="card" style={{ marginTop: 18 }}>
            <span className="page-eyebrow">LINHA DO TEMPO</span>
            <h2>Resultado geral e valências por avaliação</h2>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th><th>Avaliador</th><th>Geral</th>
                    {AREAS.map(([key, label]) => <th key={key}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {evaluations.map((evaluation) => (
                    <tr key={evaluation.id}>
                      <td>{dateLabel(evaluation.evaluatedAt)}</td>
                      <td>{evaluation.evaluator?.name || "—"}</td>
                      <td><strong>{percentage(average(evaluation.scores))}%</strong></td>
                      {AREAS.map(([key]) => (
                        <td key={key}>{percentage(areaAverage(evaluation.scores, key))}%</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" style={{ marginTop: 18 }}>
            <span className="page-eyebrow">COMPARATIVO</span>
            <h2>Primeira avaliação × avaliação atual</h2>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="table">
                <thead><tr><th>Total / valência</th><th>Inicial</th><th>Atual</th><th>Evolução</th></tr></thead>
                <tbody>
                  <tr style={{ background: "#f5f8f9" }}>
                    <td><strong>Resultado geral</strong></td>
                    <td>{percentage(firstOverall)}%</td>
                    <td>{percentage(latestOverall)}%</td>
                    <td><strong>{changeLabel(overallChange)}</strong></td>
                  </tr>
                  {AREAS.map(([key, label]) => {
                    const initial = areaAverage(first.scores, key);
                    const current = areaAverage(latest.scores, key);
                    const delta = change(initial, current);
                    return (
                      <tr key={key}>
                        <td><strong>{label}</strong></td>
                        <td>{percentage(initial)}%</td>
                        <td>{percentage(current)}%</td>
                        <td><strong style={{ color: delta !== null && delta < 0 ? "#b45309" : "#4f8f00" }}>{changeLabel(delta)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" style={{ marginTop: 18 }}>
            <span className="page-eyebrow">CRITÉRIOS</span>
            <h2>Evolução item por item</h2>
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table className="table">
                <thead><tr><th>Item</th><th>Valência</th><th>Inicial</th><th>Atual</th><th>Evolução</th></tr></thead>
                <tbody>
                  {latest.scores.map((current) => {
                    const initial = first.scores.find(
                      (score) => score.metricCode === current.metricCode
                    );
                    const delta = initial ? current.score - initial.score : null;
                    return (
                      <tr key={current.id}>
                        <td><strong>{current.metricLabel}</strong></td>
                        <td>{AREAS.find(([key]) => key === current.area)?.[1] || current.area}</td>
                        <td>{initial ? `${initial.score}/4 (${percentage(initial.score)}%)` : "—"}</td>
                        <td>{current.score}/4 ({percentage(current.score)}%)</td>
                        <td><strong style={{ color: delta !== null && delta < 0 ? "#b45309" : "#4f8f00" }}>{changeLabel(delta)}</strong></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card" style={{ marginTop: 18 }}>
            <span className="page-eyebrow">PARECERES E METAS</span>
            <h2>Histórico do acompanhamento</h2>
            <div className="stack" style={{ marginTop: 16 }}>
              {evaluations.map((evaluation) => (
                <article key={evaluation.id} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 16 }}>
                  <strong>{dateLabel(evaluation.evaluatedAt)} • {evaluation.title || "Avaliação"}</strong>
                  <p><b>Parecer:</b> {evaluation.summary || "—"}</p>
                  <p><b>Pontos fortes:</b> {evaluation.strengths || "—"}</p>
                  <p><b>Desenvolvimento:</b> {evaluation.developmentPoints || "—"}</p>
                  <p><b>Metas:</b> {evaluation.nextGoals || "—"}</p>
                  {evaluation.internalNotes ? (
                    <p className="help"><b>Uso interno:</b> {evaluation.internalNotes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
