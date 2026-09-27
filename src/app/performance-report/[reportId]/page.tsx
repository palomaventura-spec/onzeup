import Link from "next/link";
import { notFound } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = "—") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR");
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

function typeLabel(type: string) {
  if (type === "TRAINING") return "Treino";
  if (type === "MATCH") return "Jogo";
  if (type === "GPS") return "GPS";
  if (type === "EVALUATION") return "Avaliação";
  if (type === "CONSOLIDATED") return "Consolidado";
  return type;
}

function trainingStatusLabel(status: unknown) {
  const labels: Record<string, string> = {
    PRESENT: "Presente",
    ABSENT: "Falta",
    JUSTIFIED_ABSENCE: "Falta justificada",
    INJURED: "Lesionado",
    EXCUSED: "Dispensado",
    LATE: "Atraso",
    PARTIAL: "Parcial",
    PENDING: "Pendente",
  };
  const key = typeof status === "string" ? status : "";
  return labels[key] || textValue(status);
}

function lineupLabel(value: unknown) {
  const labels: Record<string, string> = {
    STARTER: "Titular",
    SUBSTITUTE: "Reserva",
    DID_NOT_PLAY: "Não atuou",
  };
  const key = typeof value === "string" ? value : "";
  return labels[key] || textValue(value);
}

function contextLabel(value: unknown) {
  if (value === "TRAINING") return "Treino";
  if (value === "MATCH") return "Jogo";
  return textValue(value);
}

function areaLabel(value: unknown) {
  const labels: Record<string, string> = {
    PHYSICAL: "Física",
    TECHNICAL: "Técnica",
    TACTICAL: "Tática",
    COGNITIVE: "Cognitiva",
    EMOTIONAL: "Emocional",
    BEHAVIORAL: "Comportamental",
    COMPETITIVE: "Competitiva",
  };
  const key = typeof value === "string" ? value : "";
  return labels[key] || textValue(value);
}

function scoreAverage(records: unknown[]) {
  const values = records
    .map((item) => numberValue(asRecord(item).score, 0))
    .filter((value) => value > 0);

  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function SummaryCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="report-kpi">
      <span>{label}</span>
      <strong>
        {value}
        {suffix ? <small>{suffix}</small> : null}
      </strong>
    </div>
  );
}

export default async function AthletePerformanceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { reportId } = await params;
  const query = await searchParams;

  const report = await prisma.performanceReport.findFirst({
    where: {
      id: reportId,
      organizationId: user.organizationId,
    },
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
          nickname: true,
          position: true,
          photoUrl: true,
          category: { select: { name: true } },
        },
      },
      organization: {
        select: {
          name: true,
          publicName: true,
          logoUrl: true,
        },
      },
      generatedBy: {
        select: { name: true },
      },
    },
  });

  if (!report) notFound();

  const snapshot = asRecord(report.snapshot);
  const summary = asRecord(snapshot.summary);
  const records = asArray(snapshot.records);
  const evaluation = asRecord(snapshot.evaluation);
  const evaluationScores = asArray(evaluation.scores);

  const athleteName = report.athlete.nickname || report.athlete.name;
  const clubName = report.organization.publicName || report.organization.name;
  const autoPrint = query.print === "1";

  const groupedScores = evaluationScores.reduce<Record<string, unknown[]>>(
    (groups, item) => {
      const area = textValue(asRecord(item).area, "OUTROS");
      if (!groups[area]) groups[area] = [];
      groups[area].push(item);
      return groups;
    },
    {},
  );

  return (
    <main className="performance-report-print">
      {autoPrint ? (
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("load",function(){window.setTimeout(function(){window.print();},350);});',
          }}
        />
      ) : null}

      <div className="report-actions no-print">
        <Link
          className="report-action secondary"
          href={`/atletas/${report.athlete.id}/performance/relatorios`}
        >
          ← Voltar aos relatórios
        </Link>

        <Link
          className="report-action primary"
          href={`/performance-report/${report.id}?print=1`}
          target="_blank"
        >
          Imprimir / Salvar PDF
        </Link>
      </div>

      <article className="report-sheet">
        <header className="report-header">
          <div className="report-brand">
            {report.organization.logoUrl ? (
              <img src={report.organization.logoUrl} alt={clubName} />
            ) : (
              <div className="report-logo-fallback">11</div>
            )}

            <div>
              <span className="report-overline">11UP PERFORMANCE · CLUB ELITE</span>
              <strong>{clubName}</strong>
            </div>
          </div>

          <div className="report-type">
            <span>RELATÓRIO INDIVIDUAL</span>
            <h1>{typeLabel(report.reportType)}</h1>
          </div>
        </header>

        <section className="report-athlete">
          <div>
            <span className="report-eyebrow">ATLETA</span>
            <h2>{athleteName}</h2>
            <p>
              {report.athlete.name}
              {report.athlete.category?.name
                ? ` · ${report.athlete.category.name}`
                : ""}
              {report.athlete.position ? ` · ${report.athlete.position}` : ""}
            </p>
          </div>

          <dl>
            <div>
              <dt>Período</dt>
              <dd>
                {report.periodStart && report.periodEnd
                  ? `${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}`
                  : report.reportType === "EVALUATION"
                    ? `${dateValue(evaluation.periodStart)} – ${dateValue(evaluation.periodEnd)}`
                    : "—"}
              </dd>
            </div>
            <div>
              <dt>Gerado em</dt>
              <dd>{formatDate(report.createdAt)}</dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>{report.generatedBy?.name || "—"}</dd>
            </div>
          </dl>
        </section>

        {report.reportType === "TRAINING" ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>RESUMO</span>
                <h3>Desempenho nos treinos</h3>
              </div>

              <div className="report-kpis four">
                <SummaryCard label="TREINOS" value={numberValue(summary.sessions)} />
                <SummaryCard label="PRESENÇAS" value={numberValue(summary.present)} />
                <SummaryCard label="FREQUÊNCIA" value={numberValue(summary.attendanceRate)} suffix="%" />
                <SummaryCard label="MINUTAGEM" value={numberValue(summary.minutesPresent)} suffix=" min" />
              </div>
            </section>

            <section className="report-section">
              <div className="report-section-title">
                <span>HISTÓRICO</span>
                <h3>Treinos do período</h3>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Minutos</th>
                    <th>Local</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length ? (
                    records.map((raw, index) => {
                      const item = asRecord(raw);
                      const session = asRecord(item.session);
                      return (
                        <tr key={textValue(item.id, String(index))}>
                          <td>{dateValue(session.startsAt)}</td>
                          <td>{textValue(session.trainingType)}</td>
                          <td>{trainingStatusLabel(item.status)}</td>
                          <td>{textValue(item.minutesPresent, "0")}</td>
                          <td>{textValue(session.location)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5}>Nenhum treino encontrado no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        ) : null}

        {report.reportType === "MATCH" ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>RESUMO</span>
                <h3>Desempenho em jogos</h3>
              </div>

              <div className="report-kpis six">
                <SummaryCard label="JOGOS" value={numberValue(summary.matches)} />
                <SummaryCard label="MINUTOS" value={numberValue(summary.minutes)} />
                <SummaryCard label="GOLS" value={numberValue(summary.goals)} />
                <SummaryCard label="ASSISTÊNCIAS" value={numberValue(summary.assists)} />
                <SummaryCard label="AMARELOS" value={numberValue(summary.yellowCards)} />
                <SummaryCard label="VERMELHOS" value={numberValue(summary.redCards)} />
              </div>
            </section>

            <section className="report-section">
              <div className="report-section-title">
                <span>HISTÓRICO</span>
                <h3>Jogos do período</h3>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Adversário</th>
                    <th>Competição</th>
                    <th>Função</th>
                    <th>Min</th>
                    <th>G</th>
                    <th>A</th>
                    <th>Cartões</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length ? (
                    records.map((raw, index) => {
                      const item = asRecord(raw);
                      const match = asRecord(item.match);
                      return (
                        <tr key={textValue(item.id, String(index))}>
                          <td>{dateValue(match.startsAt)}</td>
                          <td>{textValue(match.opponent)}</td>
                          <td>{textValue(match.competition)}</td>
                          <td>{lineupLabel(item.lineupRole)}</td>
                          <td>{numberValue(item.minutesPlayed)}</td>
                          <td>{numberValue(item.goals)}</td>
                          <td>{numberValue(item.assists)}</td>
                          <td>
                            {numberValue(item.yellowCards)}A · {numberValue(item.redCards)}V
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>Nenhum jogo encontrado no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        ) : null}

        {report.reportType === "GPS" ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>RESUMO</span>
                <h3>Carga e métricas de GPS</h3>
              </div>

              <div className="report-kpis five">
                <SummaryCard label="SESSÕES" value={numberValue(summary.sessions)} />
                <SummaryCard
                  label="DISTÂNCIA"
                  value={Math.round(numberValue(summary.totalDistanceMeters))}
                  suffix=" m"
                />
                <SummaryCard
                  label="VEL. MÁX."
                  value={numberValue(summary.maxSpeedKmh)}
                  suffix=" km/h"
                />
                <SummaryCard
                  label="ALTA INTENSIDADE"
                  value={Math.round(numberValue(summary.totalHighIntensityDistanceMeters))}
                  suffix=" m"
                />
                <SummaryCard
                  label="PLAYER LOAD"
                  value={nullableNumber(summary.averagePlayerLoad) ?? "—"}
                />
              </div>
            </section>

            <section className="report-section">
              <div className="report-section-title">
                <span>HISTÓRICO</span>
                <h3>Sessões do período</h3>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Contexto</th>
                    <th>Duração</th>
                    <th>Distância</th>
                    <th>Vel. máx.</th>
                    <th>Sprints</th>
                    <th>Alta intensidade</th>
                    <th>Load</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length ? (
                    records.map((raw, index) => {
                      const item = asRecord(raw);
                      return (
                        <tr key={textValue(item.id, String(index))}>
                          <td>{dateValue(item.activityAt)}</td>
                          <td>{contextLabel(item.context)}</td>
                          <td>{numberValue(item.durationMinutes)} min</td>
                          <td>{numberValue(item.distanceMeters)} m</td>
                          <td>{numberValue(item.maxSpeedKmh)} km/h</td>
                          <td>{numberValue(item.sprintCount)}</td>
                          <td>{numberValue(item.highIntensityDistanceMeters)} m</td>
                          <td>{nullableNumber(item.playerLoad) ?? "—"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>Nenhum registro de GPS encontrado no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        ) : null}

        {report.reportType === "EVALUATION" ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>AVALIAÇÃO PROFISSIONAL</span>
                <h3>{textValue(evaluation.title, textValue(evaluation.templateName, "Avaliação"))}</h3>
              </div>

              <div className="evaluation-meta">
                <div>
                  <span>Avaliador</span>
                  <strong>{textValue(evaluation.evaluatorName)}</strong>
                </div>
                <div>
                  <span>Temporada</span>
                  <strong>{textValue(evaluation.season)}</strong>
                </div>
                <div>
                  <span>Média geral</span>
                  <strong>{scoreAverage(evaluationScores).toFixed(1)} / 4</strong>
                </div>
              </div>
            </section>

            {Object.entries(groupedScores).map(([area, areaScores]) => (
              <section className="report-section evaluation-area" key={area}>
                <div className="report-section-title inline">
                  <div>
                    <span>ÁREA</span>
                    <h3>{areaLabel(area)}</h3>
                  </div>
                  <strong className="area-average">
                    {scoreAverage(areaScores).toFixed(1)} / 4
                  </strong>
                </div>

                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Critério</th>
                      <th>Nota</th>
                      <th>Nível</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaScores.map((raw, index) => {
                      const item = asRecord(raw);
                      return (
                        <tr key={`${area}-${textValue(item.metricCode, String(index))}`}>
                          <td>{textValue(item.metricLabel)}</td>
                          <td><strong>{numberValue(item.score)} / 4</strong></td>
                          <td>{textValue(item.ratingLabel)}</td>
                          <td>{textValue(item.ratingDescription)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))}

            <section className="report-section">
              <div className="report-section-title">
                <span>PARECER</span>
                <h3>Conclusão profissional</h3>
              </div>

              <div className="evaluation-conclusion">
                <div>
                  <span>Pontos fortes</span>
                  <p>{textValue(evaluation.strengths, "Não informado.")}</p>
                </div>
                <div>
                  <span>A desenvolver</span>
                  <p>{textValue(evaluation.developmentPoints, "Não informado.")}</p>
                </div>
                <div>
                  <span>Próximas metas</span>
                  <p>{textValue(evaluation.nextGoals, "Não informado.")}</p>
                </div>
                <div className="wide">
                  <span>Parecer</span>
                  <p>{textValue(evaluation.summary, "Não informado.")}</p>
                </div>
              </div>
            </section>
          </>
        ) : null}

        <footer className="report-footer">
          <span>11UP · Gestão de performance esportiva</span>
          <span>Documento gerado em {formatDate(report.createdAt)}</span>
        </footer>
      </article>

      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#eef2f4;color:#07131d}
        .performance-report-print{min-height:100vh;padding:28px;font-family:Arial,Helvetica,sans-serif}
        .report-actions{width:min(1120px,100%);margin:0 auto 18px;display:flex;justify-content:flex-end;gap:10px}
        .report-action{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:10px;font-weight:800;text-decoration:none;font-size:13px}
        .report-action.primary{background:#99e600;color:#08110a}
        .report-action.secondary{background:#fff;color:#21313c;border:1px solid #d9e0e4}
        .report-sheet{width:min(1120px,100%);margin:0 auto;background:#fff;border:1px solid #dfe6ea;border-radius:22px;box-shadow:0 24px 70px rgba(8,25,38,.08);overflow:hidden}
        .report-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:30px 34px;background:linear-gradient(115deg,#06111a,#0a1a17 58%,#204617);color:#fff}
        .report-brand{display:flex;align-items:center;gap:14px}
        .report-brand img,.report-logo-fallback{width:52px;height:52px;border-radius:13px;background:#fff;object-fit:contain;padding:5px}
        .report-logo-fallback{display:grid;place-items:center;background:#99e600;color:#07131d;font-weight:900;font-size:22px}
        .report-brand strong{display:block;margin-top:5px;font-size:19px}
        .report-overline,.report-type span,.report-eyebrow,.report-section-title>span,.report-section-title>div>span{font-size:10px;font-weight:900;letter-spacing:.14em;color:#99e600}
        .report-type{text-align:right}
        .report-type h1{margin:5px 0 0;font-size:30px;letter-spacing:-.04em}
        .report-athlete{display:flex;justify-content:space-between;gap:28px;padding:26px 34px;border-bottom:1px solid #e3e9ec}
        .report-athlete h2{margin:5px 0 4px;font-size:30px;letter-spacing:-.04em}
        .report-athlete p{margin:0;color:#6c7b85;font-size:13px}
        .report-athlete dl{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:18px;margin:0}
        .report-athlete dl div{padding-left:16px;border-left:1px solid #dfe6ea}
        .report-athlete dt{font-size:9px;font-weight:900;letter-spacing:.12em;color:#788892;text-transform:uppercase}
        .report-athlete dd{margin:6px 0 0;font-size:12px;font-weight:800}
        .report-section{padding:26px 34px;border-bottom:1px solid #e8edef}
        .report-section-title{margin-bottom:16px}
        .report-section-title.inline{display:flex;align-items:end;justify-content:space-between;gap:16px}
        .report-section-title h3{margin:5px 0 0;font-size:20px;letter-spacing:-.025em}
        .report-kpis{display:grid;gap:10px}
        .report-kpis.four{grid-template-columns:repeat(4,1fr)}
        .report-kpis.five{grid-template-columns:repeat(5,1fr)}
        .report-kpis.six{grid-template-columns:repeat(6,1fr)}
        .report-kpi{padding:15px;border:1px solid #dfe7e8;border-radius:13px;background:#f8faf9}
        .report-kpi span{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;color:#72818b}
        .report-kpi strong{display:block;margin-top:7px;font-size:24px;letter-spacing:-.04em}
        .report-kpi strong small{font-size:10px;margin-left:3px;color:#6d7b85;letter-spacing:0}
        .report-table{width:100%;border-collapse:collapse;font-size:11px}
        .report-table th{padding:10px 9px;text-align:left;background:#f3f6f7;border-bottom:1px solid #dfe6e8;color:#657680;font-size:9px;letter-spacing:.08em;text-transform:uppercase}
        .report-table td{padding:10px 9px;border-bottom:1px solid #edf1f2;vertical-align:top}
        .evaluation-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .evaluation-meta div{padding:14px;border-radius:12px;background:#f4f8ea;border:1px solid #dfebc3}
        .evaluation-meta span,.evaluation-conclusion span{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;color:#708009;text-transform:uppercase}
        .evaluation-meta strong{display:block;margin-top:6px;font-size:14px}
        .area-average{font-size:18px;color:#6f9800}
        .evaluation-conclusion{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .evaluation-conclusion>div{padding:15px;border:1px solid #e1e7e9;border-radius:12px;background:#fafbfb}
        .evaluation-conclusion .wide{grid-column:1/-1}
        .evaluation-conclusion p{margin:7px 0 0;font-size:12px;line-height:1.55;color:#394a54;white-space:pre-wrap}
        .report-footer{display:flex;justify-content:space-between;gap:20px;padding:18px 34px;color:#81909a;font-size:9px}
        @media(max-width:800px){
          .performance-report-print{padding:12px}
          .report-header,.report-athlete{display:block}
          .report-type{text-align:left;margin-top:20px}
          .report-athlete dl{grid-template-columns:1fr;margin-top:20px}
          .report-kpis.four,.report-kpis.five,.report-kpis.six{grid-template-columns:repeat(2,1fr)}
          .evaluation-meta,.evaluation-conclusion{grid-template-columns:1fr}
          .report-table{min-width:720px}
          .report-section{overflow-x:auto}
        }
        @page{size:A4 portrait;margin:10mm}
        @media print{
          html,body{
            margin:0!important;
            padding:0!important;
            width:100%!important;
            min-height:0!important;
            background:#fff!important;
            overflow:visible!important;
          }
.performance-report-print{
            display:block!important;
            visibility:visible!important;
            opacity:1!important;
            position:static!important;
            width:100%!important;
            min-height:0!important;
            margin:0!important;
            padding:0!important;
            background:#fff!important;
            overflow:visible!important;
            transform:none!important;
          }

          .performance-report-print *{
            visibility:visible!important;
            opacity:1!important;
          }

          .no-print{
            display:none!important;
          }

          .report-sheet{
            display:block!important;
            width:100%!important;
            max-width:none!important;
            margin:0!important;
            border:0!important;
            border-radius:0!important;
            box-shadow:none!important;
            overflow:visible!important;
            background:#fff!important;
            color:#07131d!important;
          }

          .report-header{
            padding:18px 20px;
            -webkit-print-color-adjust:exact!important;
            print-color-adjust:exact!important;
          }

          .report-athlete,.report-section{padding:16px 20px}
          .report-footer{padding:14px 20px}
          .report-kpi{break-inside:avoid}
          .evaluation-area,.evaluation-conclusion>div{break-inside:avoid}
          .report-table tr{break-inside:avoid}.report-section{overflow:visible!important}.report-table{min-width:0!important;width:100%!important}
        }
      `}</style>
    </main>
  );
}
