import { notFound, redirect } from "next/navigation";

import PerformanceRadarChart from "@/components/PerformanceRadarChart";
import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";

import PerformanceAutoPrint from "./PerformanceAutoPrint";

const AREAS = [
  ["PHYSICAL", "Física"],
  ["TECHNICAL", "Técnica"],
  ["TACTICAL", "Tática"],
  ["COGNITIVE", "Cognitiva"],
  ["EMOTIONAL", "Emocional"],
] as const;

type Score = { score: number; area: string };

function average(scores: Score[]) {
  return scores.length
    ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length
    : null;
}

function areaAverage(scores: Score[], area: string) {
  return average(scores.filter((item) => item.area === area));
}

function percentage(value: number | null) {
  return value === null ? null : Math.round((value / 4) * 100);
}

function classification(value: number | null) {
  if (value === null) return "Sem resultado";
  if (value < 1.5) return "Iniciante";
  if (value < 2.5) return "Em desenvolvimento";
  if (value < 3.5) return "Eficiente";
  return "Excelente";
}

function dateLabel(value: Date) {
  return value.toLocaleDateString("pt-BR");
}

export default async function PerformanceIndividualPdfPage({
  params,
}: {
  params: Promise<{ evaluationId: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { evaluationId } = await params;

  const [evaluation, subscription, organization] = await Promise.all([
    prisma.athleteEvaluation.findFirst({
      where: {
        id: evaluationId,
        organizationId: user.organizationId,
        status: "FINALIZED",
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
      select: {
        name: true,
        publicName: true,
        logoUrl: true,
        accessStatus: true,
        complimentaryUntil: true,
      },
    }),
  ]);

  if (!evaluation || !organization) notFound();

  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization.accessStatus,
    complimentaryUntil: organization.complimentaryUntil,
  });
  if (!elite) redirect("/performance?erro=elite");

  const initialEvaluation = await prisma.athleteEvaluation.findFirst({
    where: {
      athleteId: evaluation.athleteId,
      organizationId: user.organizationId,
      athleteRole: evaluation.athleteRole,
      status: "FINALIZED",
      evaluatedAt: { lte: evaluation.evaluatedAt },
    },
    orderBy: { evaluatedAt: "asc" },
    include: { scores: true },
  });

  const overall = average(evaluation.scores);
  const radarItems = AREAS.map(([key, label]) => ({
    label,
    value: percentage(areaAverage(evaluation.scores, key)) ?? 0,
    comparisonValue: initialEvaluation
      ? percentage(areaAverage(initialEvaluation.scores, key))
      : null,
  }));

  return (
    <main className="performance-print">
      <style>{`
        html,body{background:#fff!important;color:#101820!important;margin:0!important;padding:0!important;font-family:Arial,Helvetica,sans-serif}
        .performance-print{max-width:900px;margin:0 auto;padding:26px;background:#fff;color:#101820}
        .print-actions{display:flex;justify-content:flex-end;margin-bottom:18px}.print-actions button,.performance-print-actions button{background:#91dc00;border:0;border-radius:9px;padding:12px 18px;font-weight:800;cursor:pointer}
        .pr-header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #101820;padding-bottom:16px;margin-bottom:20px}.pr-brand{display:flex;align-items:center;gap:12px}.pr-logo{width:58px;height:58px;object-fit:contain}.pr-club{font-size:22px;font-weight:900}.pr-header h1{font-size:28px;margin:12px 0 5px}.pr-meta{text-align:right;font-size:11px;color:#5c6970;line-height:1.65}
        .pr-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0}.pr-box{border:1px solid #dbe4e8;border-radius:10px;padding:12px}.pr-box small{display:block;color:#66757d;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.pr-box strong{display:block;margin-top:5px;font-size:17px}
        .pr-section{margin-top:22px}.pr-section h2{font-size:19px;margin:2px 0 10px}.pr-eyebrow{font-size:9px;color:#668f00;font-weight:900;letter-spacing:.12em;text-transform:uppercase}.pr-muted{color:#66757d;font-size:11px;line-height:1.5}
        .pr-table{width:100%;border-collapse:collapse;font-size:10px}.pr-table th{background:#f1f5f6;text-align:left;font-size:8px;letter-spacing:.06em;text-transform:uppercase}.pr-table th,.pr-table td{border:1px solid #dbe4e8;padding:7px;vertical-align:top}.pr-area{break-inside:avoid;margin-top:18px}.pr-note{border-left:4px solid #91dc00;background:#f7faf3;padding:10px 12px;margin:8px 0;font-size:11px;line-height:1.5}.pr-footer{border-top:1px solid #dbe4e8;margin-top:24px;padding-top:8px;font-size:9px;color:#71808a;display:flex;justify-content:space-between}
        @page{size:A4 portrait;margin:10mm}@media print{.no-print{display:none!important}.performance-print{max-width:none;padding:0}.pr-area,.pr-note{break-inside:avoid}.pr-footer{position:fixed;bottom:0;left:0;right:0}}
      `}</style>

      <PerformanceAutoPrint />

      <header className="pr-header">
        <div>
          <div className="pr-brand">
            {organization.logoUrl ? (
              <img className="pr-logo" src={organization.logoUrl} alt="" />
            ) : null}
            <div className="pr-club">
              {organization.publicName || organization.name}
            </div>
          </div>
          <h1>{evaluation.title || "Relatório de avaliação"}</h1>
          <div>
            {evaluation.athlete.name} •{" "}
            {evaluation.athlete.category?.name || "Sem categoria"} •{" "}
            {evaluation.athlete.position || "Posição não informada"}
          </div>
        </div>
        <div className="pr-meta">
          Período: {dateLabel(evaluation.periodStart)} a {dateLabel(evaluation.periodEnd)}<br />
          Avaliador: {evaluation.evaluator?.name || "Não informado"}<br />
          Emitido em: {dateLabel(new Date())}<br />
          Documento compartilhável
        </div>
      </header>

      <section className="pr-summary">
        <div className="pr-box">
          <small>Resultado geral</small>
          <strong>{overall === null ? "—" : `${overall.toFixed(2)} / 4`}</strong>
        </div>
        <div className="pr-box">
          <small>Percentual</small>
          <strong>{percentage(overall) ?? "—"}%</strong>
        </div>
        <div className="pr-box">
          <small>Classificação</small>
          <strong>{classification(overall)}</strong>
        </div>
        <div className="pr-box">
          <small>Função avaliada</small>
          <strong>{evaluation.athleteRole === "GOALKEEPER" ? "Goleiro" : "Jogador de linha"}</strong>
        </div>
      </section>

      <section className="pr-section">
        <span className="pr-eyebrow">MAPA DE PERFORMANCE</span>
        <h2>Perfil de desempenho por valência</h2>
        <p className="pr-muted">
          Quanto mais distante do centro, maior o desempenho alcançado. A área
          verde mostra esta avaliação e o contorno tracejado representa a
          avaliação inicial.
        </p>
        <PerformanceRadarChart
          items={radarItems}
          currentLabel={`Esta avaliação • ${dateLabel(evaluation.evaluatedAt)}`}
          comparisonLabel={initialEvaluation
            ? `Avaliação inicial • ${dateLabel(initialEvaluation.evaluatedAt)}`
            : "Avaliação inicial"}
        />
      </section>

      {AREAS.map(([key, label]) => {
        const scores = evaluation.scores.filter((score) => score.area === key);
        if (!scores.length) return null;
        const result = areaAverage(scores, key);
        return (
          <section className="pr-area" key={key}>
            <span className="pr-eyebrow">VALÊNCIA {label.toUpperCase()}</span>
            <h2>{percentage(result)}% • {result?.toFixed(1)} de 4</h2>
            <table className="pr-table">
              <thead>
                <tr><th>Critério</th><th>Nota</th><th>Percentual</th><th>Nível</th><th>Descrição e observação</th></tr>
              </thead>
              <tbody>
                {scores.map((score) => (
                  <tr key={score.id}>
                    <td><strong>{score.metricLabel}</strong></td>
                    <td>{score.score}/4</td>
                    <td>{percentage(score.score)}%</td>
                    <td>{score.ratingLabel || "—"}</td>
                    <td>
                      {score.ratingDescription || "—"}
                      {score.notes ? <><br /><strong>Observação:</strong> {score.notes}</> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <section className="pr-section">
        <span className="pr-eyebrow">PARECER DA AVALIAÇÃO</span>
        <h2>Conclusão e próximos passos</h2>
        <div className="pr-note"><strong>Pontos fortes:</strong><br />{evaluation.strengths || "Não informado."}</div>
        <div className="pr-note"><strong>Pontos de desenvolvimento:</strong><br />{evaluation.developmentPoints || "Não informado."}</div>
        <div className="pr-note"><strong>Próximas metas:</strong><br />{evaluation.nextGoals || "Não informado."}</div>
        <div className="pr-note"><strong>Parecer geral:</strong><br />{evaluation.summary || "Não informado."}</div>
      </section>

      <footer className="pr-footer">
        <span>ONZEUP Performance • Acompanhamento esportivo</span>
        <span>Avaliação de {evaluation.athlete.name}</span>
      </footer>
    </main>
  );
}
