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

type Score = { score: number; area: string; metricCode: string; metricLabel: string };

function avg(scores: Array<{ score: number }>) {
  return scores.length
    ? scores.reduce((sum, item) => sum + item.score, 0) / scores.length
    : null;
}

function areaAvg(scores: Score[], area: string) {
  return avg(scores.filter((item) => item.area === area));
}

function pct(score: number | null) {
  return score === null ? null : Math.round((score / 4) * 100);
}

function date(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

function signed(value: number | null) {
  if (value === null) return "—";
  const points = Math.round((value / 4) * 100);
  return `${points > 0 ? "+" : ""}${points} p.p.`;
}

export default async function PerformanceEvolutionPdfPage({
  params,
}: {
  params: Promise<{ athleteId: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { athleteId } = await params;

  const [athlete, subscription, organization] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id: athleteId, organizationId: user.organizationId },
      include: {
        category: true,
        evaluations: {
          where: { status: "FINALIZED" },
          orderBy: { evaluatedAt: "asc" },
          include: {
            scores: { orderBy: [{ sortOrder: "asc" }, { metricLabel: "asc" }] },
            evaluator: { select: { name: true } },
          },
        },
      },
    }),
    prisma.subscription.findUnique({ where: { organizationId: user.organizationId } }),
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

  if (!athlete || !organization) notFound();

  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization.accessStatus,
    complimentaryUntil: organization.complimentaryUntil,
  });
  if (!elite) redirect("/performance?erro=elite");

  const groups = ["LINE_PLAYER", "GOALKEEPER"]
    .map((role) => ({
      role,
      evaluations: athlete.evaluations.filter((item) => item.athleteRole === role),
    }))
    .filter((group) => group.evaluations.length);

  return (
    <main className="performance-evolution-print">
      <style>{`
        html,body{background:#fff!important;color:#101820!important;margin:0!important;padding:0!important;font-family:Arial,Helvetica,sans-serif}
        .performance-evolution-print{max-width:1100px;margin:0 auto;padding:26px;background:#fff;color:#101820}
        .performance-print-actions{display:flex;justify-content:flex-end;margin-bottom:18px}.performance-print-actions button{background:#91dc00;border:0;border-radius:9px;padding:12px 18px;font-weight:800;cursor:pointer}
        .pe-header{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #101820;padding-bottom:16px;margin-bottom:20px}.pe-brand{display:flex;align-items:center;gap:12px}.pe-logo{width:58px;height:58px;object-fit:contain}.pe-club{font-size:22px;font-weight:900}.pe-header h1{font-size:30px;margin:12px 0 4px}.pe-meta{text-align:right;font-size:12px;color:#5c6970;line-height:1.6}
        .pe-overview{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:24px;align-items:center;border:1px solid #dbe4e8;border-radius:14px;padding:18px;margin-top:18px}.pe-overview-copy{align-self:start;padding-top:4px}.pe-radar{border-left:1px solid #e4eaed;padding-left:20px}.pe-radar>div{max-width:430px!important}
        .pe-summary{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0 0}.pe-box{border:1px solid #dbe4e8;border-radius:10px;padding:12px;background:#fbfcfc}.pe-box small{display:block;color:#66757d;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.pe-box strong{display:block;margin-top:5px;font-size:17px}.pe-box span{font-size:10px;color:#66757d}
        .pe-pair{display:grid;grid-template-columns:1.15fr .85fr;gap:18px;align-items:start;margin-top:18px}.pe-pair .pe-section{margin-top:0}
        .pe-section{margin-top:22px;page-break-inside:avoid}.pe-section h2{font-size:20px;margin:0 0 10px}.pe-eyebrow{font-size:9px;color:#668f00;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
        .pe-table{width:100%;border-collapse:collapse;font-size:11px}.pe-table th{background:#f1f5f6;text-align:left;font-size:9px;letter-spacing:.06em;text-transform:uppercase}.pe-table th,.pe-table td{border:1px solid #dbe4e8;padding:8px;vertical-align:top}.pe-positive{color:#4f8f00;font-weight:800}.pe-negative{color:#b45309;font-weight:800}
        .pe-note{border-left:4px solid #91dc00;background:#f7faf3;padding:10px 12px;margin:8px 0;font-size:11px;line-height:1.5}.pe-footer{border-top:1px solid #dbe4e8;margin-top:24px;padding-top:8px;font-size:9px;color:#71808a;display:flex;justify-content:space-between}
        @page{size:A4 landscape;margin:10mm}@media print{.no-print{display:none!important}.performance-evolution-print{max-width:none;padding:0}.pe-overview,.pe-pair,.pe-section{break-inside:avoid}.pe-footer{position:fixed;bottom:0;left:0;right:0}}
      `}</style>

      <PerformanceAutoPrint />

      <header className="pe-header">
        <div>
          <div className="pe-brand">
            {organization.logoUrl ? <img className="pe-logo" src={organization.logoUrl} alt="" /> : null}
            <div className="pe-club">{organization.publicName || organization.name}</div>
          </div>
          <h1>Relatório de evolução</h1>
          <div>{athlete.name} • {athlete.category?.name || "Sem categoria"} • {athlete.position || "Posição não informada"}</div>
        </div>
        <div className="pe-meta">
          Avaliações finalizadas: {athlete.evaluations.length}<br />
          Emitido em: {date(new Date())}<br />
          Documento compartilhável — sem observações internas
        </div>
      </header>

      {!groups.length ? <p>Nenhuma avaliação finalizada.</p> : null}

      {groups.map((group) => {
        const first = group.evaluations[0];
        const last = group.evaluations[group.evaluations.length - 1];
        const firstOverall = avg(first.scores);
        const lastOverall = avg(last.scores);
        const overallDelta = firstOverall !== null && lastOverall !== null ? lastOverall - firstOverall : null;
        const radarItems = AREAS.map(([key, label]) => ({
          label,
          value: pct(areaAvg(last.scores, key)) ?? 0,
          comparisonValue: pct(areaAvg(first.scores, key)),
        }));

        return (
          <section key={group.role}>
            <div className="pe-overview">
              <div className="pe-overview-copy">
                <span className="pe-eyebrow">{group.role === "GOALKEEPER" ? "GOLEIRO" : "JOGADOR DE LINHA"}</span>
                <h2>Evolução geral</h2>
                <p style={{ color: "#66757d", fontSize: 11, lineHeight: 1.5 }}>
                  Síntese da evolução do atleta entre a primeira avaliação e o
                  resultado mais recente.
                </p>
                <div className="pe-summary">
                  <div className="pe-box"><small>Primeira avaliação</small><strong>{pct(firstOverall)}%</strong><span>{date(first.evaluatedAt)}</span></div>
                  <div className="pe-box"><small>Avaliação atual</small><strong>{pct(lastOverall)}%</strong><span>{date(last.evaluatedAt)}</span></div>
                  <div className="pe-box"><small>Evolução</small><strong>{signed(overallDelta)}</strong></div>
                  <div className="pe-box"><small>Avaliações</small><strong>{group.evaluations.length}</strong></div>
                </div>
              </div>
              <div className="pe-radar">
                <span className="pe-eyebrow">MAPA DE PERFORMANCE</span>
                <h2>Perfil por valência</h2>
                <PerformanceRadarChart
                  items={radarItems}
                  currentLabel={`Atual • ${date(last.evaluatedAt)}`}
                  comparisonLabel={`Inicial • ${date(first.evaluatedAt)}`}
                />
              </div>
            </div>

            <div className="pe-pair">
              <div className="pe-section">
                <span className="pe-eyebrow">LINHA DO TEMPO</span>
                <h2>Histórico por avaliação</h2>
                <table className="pe-table">
                  <thead><tr><th>Data</th><th>Avaliador</th><th>Geral</th>{AREAS.map((area) => <th key={area[0]}>{area[1]}</th>)}</tr></thead>
                  <tbody>
                    {group.evaluations.map((evaluation) => (
                      <tr key={evaluation.id}>
                        <td>{date(evaluation.evaluatedAt)}</td>
                        <td>{evaluation.evaluator?.name || "—"}</td>
                        <td><strong>{pct(avg(evaluation.scores))}%</strong></td>
                        {AREAS.map((area) => <td key={area[0]}>{pct(areaAvg(evaluation.scores, area[0]))}%</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pe-section">
                <span className="pe-eyebrow">COMPARATIVO</span>
                <h2>Primeira × atual</h2>
                <table className="pe-table">
                  <thead><tr><th>Valência</th><th>Inicial</th><th>Atual</th><th>Evolução</th></tr></thead>
                  <tbody>
                    {AREAS.map(([key, label]) => {
                      const initial = areaAvg(first.scores, key);
                      const current = areaAvg(last.scores, key);
                      const delta = initial !== null && current !== null ? current - initial : null;
                      return <tr key={key}><td><strong>{label}</strong></td><td>{pct(initial)}%</td><td>{pct(current)}%</td><td className={delta !== null && delta < 0 ? "pe-negative" : "pe-positive"}>{signed(delta)}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pe-section">
              <h2>Evolução dos critérios</h2>
              <table className="pe-table">
                <thead><tr><th>Critério</th><th>Valência</th><th>Inicial</th><th>Atual</th><th>Evolução</th></tr></thead>
                <tbody>
                  {last.scores.map((current) => {
                    const initial = first.scores.find((item) => item.metricCode === current.metricCode);
                    const delta = initial ? current.score - initial.score : null;
                    return <tr key={current.id}><td><strong>{current.metricLabel}</strong></td><td>{AREAS.find((area) => area[0] === current.area)?.[1] || current.area}</td><td>{initial ? `${initial.score}/4 (${pct(initial.score)}%)` : "—"}</td><td>{current.score}/4 ({pct(current.score)}%)</td><td className={delta !== null && delta < 0 ? "pe-negative" : "pe-positive"}>{signed(delta)}</td></tr>;
                  })}
                </tbody>
              </table>
            </div>

            <div className="pe-section">
              <h2>Histórico de pareceres e metas</h2>
              {group.evaluations.map((evaluation) => (
                <div className="pe-note" key={evaluation.id}>
                  <strong>{date(evaluation.evaluatedAt)} • {evaluation.title || "Avaliação"}</strong><br />
                  {evaluation.summary ? <>Parecer: {evaluation.summary}<br /></> : null}
                  {evaluation.strengths ? <>Pontos fortes: {evaluation.strengths}<br /></> : null}
                  {evaluation.developmentPoints ? <>Desenvolvimento: {evaluation.developmentPoints}<br /></> : null}
                  {evaluation.nextGoals ? <>Metas: {evaluation.nextGoals}</> : null}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <footer className="pe-footer">
        <span>ONZEUP Performance • Acompanhamento esportivo</span>
        <span>Relatório de evolução de {athlete.name}</span>
      </footer>
    </main>
  );
}
