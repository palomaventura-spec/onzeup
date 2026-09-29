import Link from "next/link";
import { notFound } from "next/navigation";
import { SportType } from "@prisma/client";

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

function stringValue(value: unknown, fallback = "—") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

function percentage(value: unknown) {
  return `${numberValue(value).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function sportLabel(sport: SportType) {
  return sport === SportType.FUTSAL ? "Futsal" : "Futebol";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: "Rascunho",
    IN_REVIEW: "Em revisão",
    APPROVED: "Aprovado",
    SENT: "Enviado",
    ARCHIVED: "Arquivado",
  };

  return labels[status] || status;
}

function progressWidth(value: unknown) {
  const normalized = Math.max(0, Math.min(100, numberValue(value)));
  return `${normalized}%`;
}

export default async function MonthlyPerformanceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { reportId } = await params;
  const query = await searchParams;

  const report = await prisma.monthlyAthleteReport.findFirst({
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
          jerseyNumber: true,
          photoUrl: true,
        },
      },
      category: {
        select: {
          name: true,
          accentColor: true,
        },
      },
      organization: {
        select: {
          name: true,
          publicName: true,
          logoUrl: true,
        },
      },
      createdBy: {
        select: { name: true },
      },
      reviewedBy: {
        select: { name: true },
      },
      approvedBy: {
        select: { name: true },
      },
    },
  });

  if (!report) notFound();

  const presence = asRecord(report.presenceSnapshot);
  const categories = asArray(presence.categories)
    .map(asRecord)
    .map((category) => stringValue(category.name, ""))
    .filter(Boolean);

  const athleteName =
    report.athlete.nickname || report.athlete.name;
  const clubName =
    report.organization.publicName || report.organization.name;
  const autoPrint = query.print === "1";

  const completedSessions = numberValue(presence.completedSessions);
  const attendedSessions = numberValue(presence.attendedSessions);
  const absences = numberValue(presence.absences);
  const justifiedAbsences = numberValue(presence.justifiedAbsences);
  const offeredMinutes = numberValue(presence.offeredMinutes);
  const athleteMinutes = numberValue(presence.athleteMinutes);
  const frequencyPercentage = numberValue(
    presence.frequencyPercentage,
  );
  const trainingTimePercentage = numberValue(
    presence.trainingTimePercentage,
  );

  const hasGps = Boolean(report.includeGps && report.gpsSnapshot);
  const hasEvaluation = Boolean(
    report.includeEvaluation && report.evaluationSnapshot,
  );

  return (
    <main className="monthly-performance-report">
      {autoPrint ? (
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("load",function(){window.setTimeout(function(){window.print();},350);});',
          }}
        />
      ) : null}

      <div className="monthly-report-actions no-print">
        <Link
          className="monthly-report-action secondary"
          href={`/performance/relatorios?month=${report.periodStart
            .toISOString()
            .slice(0, 7)}&sport=${report.sport}`}
        >
          ← Voltar aos relatórios
        </Link>

        <Link
          className="monthly-report-action primary"
          href={`/monthly-performance-report/${report.id}?print=1`}
          target="_blank"
        >
          Imprimir / Salvar PDF
        </Link>
      </div>

      <article className="monthly-report-sheet">
        <header className="monthly-report-header">
          <div className="monthly-report-brand">
            {report.organization.logoUrl ? (
              <img
                src={report.organization.logoUrl}
                alt={clubName}
              />
            ) : (
              <div className="monthly-report-logo-fallback">11</div>
            )}

            <div>
              <span>11UP PERFORMANCE · CLUB ELITE</span>
              <strong>{clubName}</strong>
            </div>
          </div>

          <div className="monthly-report-heading">
            <span>RELATÓRIO DE PERFORMANCE</span>
            <h1>{report.title || "Relatório mensal"}</h1>
            <small>{sportLabel(report.sport)}</small>
          </div>
        </header>

        <section className="monthly-report-athlete">
          <div className="monthly-report-athlete-main">
            {report.athlete.photoUrl ? (
              <img
                src={report.athlete.photoUrl}
                alt={athleteName}
              />
            ) : (
              <div className="monthly-report-avatar">
                {athleteName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div>
              <span className="monthly-report-eyebrow">ATLETA</span>
              <h2>{athleteName}</h2>
              <p>
                {report.athlete.name}
                {report.category?.name
                  ? ` · ${report.category.name}`
                  : categories.length
                    ? ` · ${categories.join(", ")}`
                    : ""}
                {report.athlete.position
                  ? ` · ${report.athlete.position}`
                  : ""}
                {report.athlete.jerseyNumber
                  ? ` · Camisa ${report.athlete.jerseyNumber}`
                  : ""}
              </p>
            </div>
          </div>

          <dl>
            <div>
              <dt>Período</dt>
              <dd>
                {formatDate(report.periodStart)} –{" "}
                {formatDate(report.periodEnd)}
              </dd>
            </div>
            <div>
              <dt>Modalidade</dt>
              <dd>{sportLabel(report.sport)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{statusLabel(report.status)}</dd>
            </div>
          </dl>
        </section>

        <section className="monthly-report-section">
          <div className="monthly-report-section-title">
            <span>RESUMO EXECUTIVO</span>
            <h3>Participação no período</h3>
          </div>

          <div className="monthly-report-kpis">
            <article>
              <span>TREINOS</span>
              <strong>{completedSessions}</strong>
              <small>sessões concluídas</small>
            </article>

            <article>
              <span>PRESENÇAS</span>
              <strong>{attendedSessions}</strong>
              <small>participações registradas</small>
            </article>

            <article>
              <span>FREQUÊNCIA</span>
              <strong>{percentage(frequencyPercentage)}</strong>
              <small>presenças ÷ treinos</small>
            </article>

            <article>
              <span>APROVEITAMENTO</span>
              <strong>{percentage(trainingTimePercentage)}</strong>
              <small>minutos treinados ÷ oferecidos</small>
            </article>
          </div>
        </section>

        <section className="monthly-report-section">
          <div className="monthly-report-section-title">
            <span>FREQUÊNCIA E MINUTAGEM</span>
            <h3>Rendimento de treino</h3>
          </div>

          <div className="monthly-report-training-grid">
            <article className="monthly-report-progress-card">
              <div>
                <span>Frequência</span>
                <strong>{percentage(frequencyPercentage)}</strong>
              </div>

              <div className="monthly-report-progress">
                <i
                  style={{
                    width: progressWidth(frequencyPercentage),
                  }}
                />
              </div>

              <small>
                {attendedSessions} de {completedSessions} treino(s)
              </small>
            </article>

            <article className="monthly-report-progress-card">
              <div>
                <span>Aproveitamento do tempo</span>
                <strong>{percentage(trainingTimePercentage)}</strong>
              </div>

              <div className="monthly-report-progress">
                <i
                  style={{
                    width: progressWidth(trainingTimePercentage),
                  }}
                />
              </div>

              <small>
                {athleteMinutes} de {offeredMinutes} minutos oferecidos
              </small>
            </article>

            <article className="monthly-report-stat-card">
              <span>FALTAS</span>
              <strong>{absences + justifiedAbsences}</strong>
              <small>
                {justifiedAbsences} falta(s) justificada(s)
              </small>
            </article>

            <article className="monthly-report-stat-card">
              <span>MINUTOS</span>
              <strong>
                {athleteMinutes}
                <small> / {offeredMinutes}</small>
              </strong>
              <small>realizados / oferecidos</small>
            </article>
          </div>
        </section>

        <section className="monthly-report-section">
          <div className="monthly-report-section-title">
            <span>CONTEÚDO DO RELATÓRIO</span>
            <h3>Módulos incluídos</h3>
          </div>

          <div className="monthly-report-modules">
            <article className="included">
              <strong>Frequência e minutagem</strong>
              <span>Incluído no relatório</span>
            </article>

            <article className={hasGps ? "included" : ""}>
              <strong>GPS</strong>
              <span>
                {hasGps
                  ? "Dados incluídos no snapshot"
                  : "Sem dados incluídos neste relatório"}
              </span>
            </article>

            <article className={hasEvaluation ? "included" : ""}>
              <strong>Avaliação profissional</strong>
              <span>
                {hasEvaluation
                  ? "Avaliação incluída no snapshot"
                  : "Sem avaliação incluída neste relatório"}
              </span>
            </article>
          </div>
        </section>

        {report.professionalComment || report.managerComment ? (
          <section className="monthly-report-section">
            <div className="monthly-report-section-title">
              <span>PARECER</span>
              <h3>Observações profissionais</h3>
            </div>

            <div className="monthly-report-comments">
              {report.professionalComment ? (
                <article>
                  <span>PROFISSIONAL</span>
                  <p>{report.professionalComment}</p>
                </article>
              ) : null}

              {report.managerComment ? (
                <article>
                  <span>GESTÃO</span>
                  <p>{report.managerComment}</p>
                </article>
              ) : null}
            </div>
          </section>
        ) : null}

        <section className="monthly-report-approval">
          <div>
            <span>GERADO POR</span>
            <strong>{report.createdBy?.name || "11UP Club"}</strong>
            <small>{formatDate(report.createdAt)}</small>
          </div>

          <div>
            <span>REVISADO POR</span>
            <strong>{report.reviewedBy?.name || "—"}</strong>
            <small>{formatDate(report.reviewedAt)}</small>
          </div>

          <div>
            <span>APROVADO POR</span>
            <strong>{report.approvedBy?.name || "—"}</strong>
            <small>{formatDate(report.approvedAt)}</small>
          </div>
        </section>

        <footer className="monthly-report-footer">
          <span>11UP · Gestão de performance esportiva</span>
          <span>
            Snapshot preservado · Documento gerado em{" "}
            {formatDate(report.createdAt)}
          </span>
        </footer>
      </article>

      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#eef2f4;color:#0b1c25}
        .monthly-performance-report{min-height:100vh;padding:28px;font-family:Arial,Helvetica,sans-serif}
        .monthly-report-actions{width:min(1120px,100%);margin:0 auto 18px;display:flex;justify-content:space-between;gap:10px}
        .monthly-report-action{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:10px;font-size:12px;font-weight:800;text-decoration:none}
        .monthly-report-action.primary{background:#99e600;color:#0c1608}
        .monthly-report-action.secondary{border:1px solid #d9e1e5;background:#fff;color:#334750}
        .monthly-report-sheet{width:min(1120px,100%);margin:0 auto;overflow:hidden;border:1px solid #dce4e7;border-radius:22px;background:#fff;box-shadow:0 22px 65px rgba(7,27,40,.08)}
        .monthly-report-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:30px 34px;background:linear-gradient(115deg,#06141e 0%,#092023 58%,#1d4c1c 100%);color:#fff}
        .monthly-report-brand{display:flex;align-items:center;gap:14px}
        .monthly-report-brand img,.monthly-report-logo-fallback{width:54px;height:54px;border-radius:13px;background:#fff;object-fit:contain;padding:5px}
        .monthly-report-logo-fallback{display:grid;place-items:center;background:#99e600;color:#07131d;font-size:22px;font-weight:950}
        .monthly-report-brand span,.monthly-report-heading>span,.monthly-report-eyebrow,.monthly-report-section-title>span{color:#99e600;font-size:9px;font-weight:950;letter-spacing:.14em}
        .monthly-report-brand strong{display:block;margin-top:5px;font-size:18px}
        .monthly-report-heading{text-align:right}
        .monthly-report-heading h1{margin:5px 0 4px;font-size:29px;letter-spacing:-.035em}
        .monthly-report-heading small{color:#c8d5d8;font-size:11px}
        .monthly-report-athlete{display:flex;align-items:center;justify-content:space-between;gap:28px;padding:25px 34px;border-bottom:1px solid #e4eaec}
        .monthly-report-athlete-main{display:flex;align-items:center;gap:14px}
        .monthly-report-athlete-main img,.monthly-report-avatar{width:58px;height:58px;border-radius:15px;object-fit:cover}
        .monthly-report-avatar{display:grid;place-items:center;background:#eef7dc;color:#5e8200;font-weight:950}
        .monthly-report-athlete h2{margin:5px 0 3px;font-size:27px;letter-spacing:-.035em}
        .monthly-report-athlete p{margin:0;color:#71818a;font-size:11px}
        .monthly-report-athlete dl{display:grid;grid-template-columns:repeat(3,minmax(115px,1fr));gap:16px;margin:0}
        .monthly-report-athlete dl div{padding-left:14px;border-left:1px solid #dfe6e8}
        .monthly-report-athlete dt{color:#7b8991;font-size:8px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}
        .monthly-report-athlete dd{margin:5px 0 0;font-size:11px;font-weight:850}
        .monthly-report-section{padding:25px 34px;border-bottom:1px solid #e8edef}
        .monthly-report-section-title{margin-bottom:15px}
        .monthly-report-section-title h3{margin:5px 0 0;font-size:20px;letter-spacing:-.025em}
        .monthly-report-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
        .monthly-report-kpis article{padding:15px;border:1px solid #dfe7e9;border-radius:13px;background:#f8faf9}
        .monthly-report-kpis span,.monthly-report-stat-card>span{display:block;color:#75848c;font-size:8px;font-weight:950;letter-spacing:.1em}
        .monthly-report-kpis strong{display:block;margin-top:6px;font-size:25px;letter-spacing:-.04em}
        .monthly-report-kpis small,.monthly-report-stat-card>small{display:block;margin-top:3px;color:#7e8c94;font-size:9px}
        .monthly-report-training-grid{display:grid;grid-template-columns:1.4fr 1.4fr .7fr .8fr;gap:10px}
        .monthly-report-progress-card,.monthly-report-stat-card{padding:15px;border:1px solid #dfe6e8;border-radius:13px}
        .monthly-report-progress-card>div:first-child{display:flex;align-items:end;justify-content:space-between;gap:12px}
        .monthly-report-progress-card span{color:#334750;font-size:10px;font-weight:850}
        .monthly-report-progress-card strong{font-size:19px}
        .monthly-report-progress-card small{display:block;margin-top:7px;color:#7d8b93;font-size:9px}
        .monthly-report-progress{height:7px;margin-top:12px;overflow:hidden;border-radius:999px;background:#edf1f2}
        .monthly-report-progress i{display:block;height:100%;border-radius:999px;background:#99e600}
        .monthly-report-stat-card strong{display:block;margin-top:7px;font-size:25px}
        .monthly-report-stat-card strong small{display:inline;font-size:10px;color:#849199}
        .monthly-report-modules{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
        .monthly-report-modules article{padding:15px;border:1px solid #e0e6e8;border-radius:12px;background:#fafbfb}
        .monthly-report-modules article.included{border-color:#dbe9ba;background:#f5fae9}
        .monthly-report-modules strong{display:block;font-size:11px}
        .monthly-report-modules span{display:block;margin-top:5px;color:#7b8991;font-size:9px}
        .monthly-report-modules .included span{color:#617d13}
        .monthly-report-comments{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .monthly-report-comments article{padding:16px;border:1px solid #e0e7e9;border-radius:12px;background:#fafbfb}
        .monthly-report-comments span{color:#76868e;font-size:8px;font-weight:950;letter-spacing:.1em}
        .monthly-report-comments p{margin:8px 0 0;color:#384b55;font-size:11px;line-height:1.6;white-space:pre-wrap}
        .monthly-report-approval{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;padding:22px 34px;border-bottom:1px solid #e8edef}
        .monthly-report-approval>div{padding-top:12px;border-top:1px solid #cfd9dd}
        .monthly-report-approval span{display:block;color:#7d8b93;font-size:8px;font-weight:950;letter-spacing:.1em}
        .monthly-report-approval strong{display:block;margin-top:6px;font-size:11px}
        .monthly-report-approval small{display:block;margin-top:3px;color:#8b979e;font-size:9px}
        .monthly-report-footer{display:flex;justify-content:space-between;gap:20px;padding:16px 34px;color:#84929a;font-size:8px}
        @media(max-width:800px){
          .monthly-performance-report{padding:12px}
          .monthly-report-header,.monthly-report-athlete{display:block}
          .monthly-report-heading{text-align:left;margin-top:20px}
          .monthly-report-athlete dl{grid-template-columns:1fr;margin-top:20px}
          .monthly-report-kpis,.monthly-report-training-grid,.monthly-report-modules,.monthly-report-comments,.monthly-report-approval{grid-template-columns:1fr 1fr}
        }
        @media(max-width:520px){
          .monthly-report-kpis,.monthly-report-training-grid,.monthly-report-modules,.monthly-report-comments,.monthly-report-approval{grid-template-columns:1fr}
        }
        @page{size:A4 portrait;margin:10mm}
        @media print{
          html,body{margin:0!important;padding:0!important;width:100%!important;background:#fff!important;overflow:visible!important}
          .monthly-performance-report{display:block!important;width:100%!important;min-height:0!important;margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}
          .no-print{display:none!important}
          .monthly-report-sheet{width:100%!important;max-width:none!important;margin:0!important;border:0!important;border-radius:0!important;box-shadow:none!important;overflow:visible!important}
          .monthly-report-header{padding:18px 20px;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
          .monthly-report-athlete,.monthly-report-section{padding:15px 20px}
          .monthly-report-approval{padding:16px 20px}
          .monthly-report-footer{padding:13px 20px}
          .monthly-report-kpis article,.monthly-report-progress-card,.monthly-report-stat-card,.monthly-report-modules article,.monthly-report-comments article{break-inside:avoid}
        }
      `}</style>
    </main>
  );
}
