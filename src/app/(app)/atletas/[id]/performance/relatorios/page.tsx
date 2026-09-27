import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

import { generateIndividualPerformanceReport } from "../actions";

type ReportKind = "TRAINING" | "MATCH" | "GPS" | "EVALUATION";
type ReportIconName = "training" | "match" | "gps" | "evaluation";

function ReportIcon({ name, size = 21 }: { name: ReportIconName; size?: number }) {
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

  if (name === "training") {
    return (
      <svg {...common}>
        <path d="M5 18.5 11.5 12 8 8.5l2-2 7.5 7.5-2 2-3.5-3.5L5 18.5Z" />
        <path d="M13.5 4.5 19.5 10.5" />
      </svg>
    );
  }

  if (name === "match") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m12 8 3 2.2-1.1 3.5h-3.8L9 10.2 12 8Z" />
        <path d="m5.8 9.7 3.2.5M15 10.2l3.2-.5M10.1 13.7 8.2 17M13.9 13.7l1.9 3.3" />
      </svg>
    );
  }

  if (name === "gps") {
    return (
      <svg {...common}>
        <path d="M12 3 6.5 13h4L9 21l8.5-11h-4L12 3Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 8h6M9 12h6M9 16h3" />
      <path d="m15 16 1.5 1.5L19 15" />
    </svg>
  );
}

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

function reportTypeLabel(type: string) {
  if (type === "TRAINING") return "Treino";
  if (type === "MATCH") return "Jogo";
  if (type === "GPS") return "GPS";
  if (type === "EVALUATION") return "Avaliação";
  if (type === "CONSOLIDATED") return "Consolidado";
  return type;
}

function reportErrorMessage(error?: string) {
  if (error === "periodo") return "Informe um período válido para gerar o relatório.";
  if (error === "avaliacao") return "Selecione uma avaliação finalizada para gerar o relatório.";
  if (error === "acesso") return "Atleta ou dados do relatório não encontrados.";
  if (error === "dados") return "Não foi possível identificar o tipo de relatório solicitado.";
  return null;
}

function paginationItems(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  const valid = Array.from(pages)
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];

  valid.forEach((page, index) => {
    const previous = valid[index - 1];
    if (previous && page - previous > 1) items.push("ellipsis");
    items.push(page);
  });

  return items;
}

function PeriodFields({ start, end }: { start: string; end: string }) {
  return (
    <div className="athlete-report-v8-period-grid">
      <label>
        De
        <input name="periodStart" type="date" defaultValue={start} required />
      </label>
      <label>
        Até
        <input name="periodEnd" type="date" defaultValue={end} required />
      </label>
    </div>
  );
}

export default async function AthleteReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
    erro?: string;
    reportId?: string;
  }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { id } = await params;
  const query = await searchParams;

  const pageSize = 10;

  const athlete = await prisma.athlete.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      category: true,
      evaluations: {
        where: { status: "FINALIZED" },
        orderBy: { evaluatedAt: "desc" },
        select: {
          id: true,
          title: true,
          evaluatedAt: true,
          periodStart: true,
          periodEnd: true,
          template: { select: { name: true } },
        },
      },
    },
  });

  if (!athlete) notFound();

  const totalReports = await prisma.performanceReport.count({
    where: {
      athleteId: athlete.id,
      organizationId: user.organizationId,
    },
  });

  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize));
  const requestedPage = Number.parseInt(String(query.page || "1"), 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const reports = await prisma.performanceReport.findMany({
    where: {
      athleteId: athlete.id,
      organizationId: user.organizationId,
    },
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * pageSize,
    take: pageSize,
    include: {
      generatedBy: { select: { name: true } },
    },
  });

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultStart = inputDate(monthStart);
  const defaultEnd = inputDate(today);

  const firstVisible = totalReports ? (currentPage - 1) * pageSize + 1 : 0;
  const lastVisible = Math.min(currentPage * pageSize, totalReports);
  const pages = paginationItems(currentPage, totalPages);
  const errorMessage = reportErrorMessage(query.erro);
  const generatedMessage =
    query.status === "relatorio-gerado"
      ? "Relatório gerado e salvo no histórico com os dados congelados deste momento."
      : null;

  const cards: Array<{
    type: ReportKind;
    icon: ReportIconName;
    eyebrow: string;
    title: string;
    description: string;
    sourceHref: string;
    sourceLabel: string;
  }> = [
    {
      type: "TRAINING",
      icon: "training",
      eyebrow: "TREINO",
      title: "Relatório de treino",
      description: "Frequência, presença, faltas, minutagem e rendimento de treino.",
      sourceHref: `/atletas/${athlete.id}/performance/treino`,
      sourceLabel: "Ver dados de treino",
    },
    {
      type: "MATCH",
      icon: "match",
      eyebrow: "JOGO",
      title: "Relatório de jogo",
      description: "Participação, minutagem, gols, assistências, cartões e partidas.",
      sourceHref: `/atletas/${athlete.id}/performance/jogo`,
      sourceLabel: "Ver dados de jogo",
    },
    {
      type: "GPS",
      icon: "gps",
      eyebrow: "GPS",
      title: "Relatório de GPS",
      description: "Carga física, distância, velocidade e intensidade em treino e jogo.",
      sourceHref: `/atletas/${athlete.id}/performance/gps`,
      sourceLabel: "Ver dados de GPS",
    },
  ];

  return (
    <main className="athlete-performance-page athlete-performance-v4 athlete-report-performance-v8">
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
              Geração, histórico e consulta dos relatórios individuais do atleta.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <Link
            className="athlete-performance-hero-primary"
            href={`/atletas/${athlete.id}/performance`}
          >
            Ver visão geral
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
          { label: "Visão geral", href: `/atletas/${athlete.id}/performance` },
          { label: "Treino", href: `/atletas/${athlete.id}/performance/treino` },
          { label: "Jogo", href: `/atletas/${athlete.id}/performance/jogo` },
          { label: "GPS", href: `/atletas/${athlete.id}/performance/gps` },
          {
            label: "Avaliações",
            href: `/atletas/${athlete.id}/performance/avaliacoes`,
          },
          {
            label: "Relatórios",
            href: `/atletas/${athlete.id}/performance/relatorios`,
            active: true,
          },
        ]}
      />

      <section className="athlete-performance-v4-heading">
        <div>
          <span className="page-eyebrow">RELATÓRIOS</span>
          <h2>Relatórios do atleta</h2>
          <p className="muted">
            Escolha o tipo e o período. Ao gerar, o 11UP salva uma fotografia dos
            dados daquele momento no histórico do atleta.
          </p>
        </div>
      </section>

      {generatedMessage ? (
        <div className="notice athlete-report-v8-success">{generatedMessage}</div>
      ) : null}

      {errorMessage ? <div className="notice error">{errorMessage}</div> : null}

      <section className="athlete-report-v8-grid">
        {cards.map((card) => (
          <article className="card athlete-report-v8-card" key={card.type}>
            <div className="athlete-report-v8-card-head">
              <span className="athlete-report-v8-icon">
                <ReportIcon name={card.icon} />
              </span>

              <div>
                <span className="page-eyebrow">{card.eyebrow}</span>
                <h3>{card.title}</h3>
              </div>
            </div>

            <p className="muted">{card.description}</p>

            <form action={generateIndividualPerformanceReport}>
              <input type="hidden" name="athleteId" value={athlete.id} />
              <input type="hidden" name="reportType" value={card.type} />

              <PeriodFields start={defaultStart} end={defaultEnd} />

              <div className="athlete-report-v8-card-actions">
                <Link href={card.sourceHref}>{card.sourceLabel}</Link>
                <button className="btn" type="submit">
                  Gerar relatório
                </button>
              </div>
            </form>
          </article>
        ))}

        <article className="card athlete-report-v8-card athlete-report-v8-evaluation-card">
          <div className="athlete-report-v8-card-head">
            <span className="athlete-report-v8-icon">
              <ReportIcon name="evaluation" />
            </span>

            <div>
              <span className="page-eyebrow">AVALIAÇÕES</span>
              <h3>Relatório de avaliação</h3>
            </div>
          </div>

          <p className="muted">
            Resultados profissionais, notas, evolução, pontos fortes, metas e parecer.
          </p>

          {athlete.evaluations.length ? (
            <form action={generateIndividualPerformanceReport}>
              <input type="hidden" name="athleteId" value={athlete.id} />
              <input type="hidden" name="reportType" value="EVALUATION" />

              <label className="athlete-report-v8-evaluation-select">
                Avaliação finalizada
                <select name="evaluationId" required defaultValue={athlete.evaluations[0]?.id}>
                  {athlete.evaluations.map((evaluation) => (
                    <option value={evaluation.id} key={evaluation.id}>
                      {evaluation.title || evaluation.template?.name || "Avaliação"} · {formatDate(evaluation.evaluatedAt)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="athlete-report-v8-card-actions">
                <Link href={`/atletas/${athlete.id}/performance/avaliacoes`}>
                  Ver avaliações
                </Link>
                <button className="btn" type="submit">
                  Gerar relatório
                </button>
              </div>
            </form>
          ) : (
            <div className="athlete-report-v8-no-evaluation">
              <p>Nenhuma avaliação finalizada disponível.</p>
              <Link
                className="btn btn-secondary"
                href={`/atletas/${athlete.id}/performance/avaliacoes/nova`}
              >
                Criar avaliação
              </Link>
            </div>
          )}
        </article>
      </section>

      <section className="card athlete-report-v8-history">
        <div className="section-title-row athlete-report-v8-history-head">
          <div>
            <span className="page-eyebrow">HISTÓRICO</span>
            <h2>Relatórios gerados</h2>
            <p className="muted">
              Os dados de cada relatório permanecem congelados desde a geração.
            </p>
          </div>

          <span className="badge">{totalReports} registro(s)</span>
        </div>

        {reports.length ? (
          <>
            <div className="table-wrap athlete-report-v8-table-wrap">
              <table className="table athlete-report-v8-table">
                <thead>
                  <tr>
                    <th>Gerado em</th>
                    <th>Tipo</th>
                    <th>Relatório</th>
                    <th>Período</th>
                    <th>Responsável</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      className={query.reportId === report.id ? "is-new" : undefined}
                    >
                      <td>{report.createdAt.toLocaleDateString("pt-BR")}</td>
                      <td>
                        <span className="athlete-report-v8-type-badge">
                          {reportTypeLabel(report.reportType)}
                        </span>
                      </td>
                      <td>
                        <strong>{report.title}</strong>
                      </td>
                      <td>
                        {report.periodStart && report.periodEnd
                          ? `${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}`
                          : "—"}
                      </td>
                      <td>{report.generatedBy?.name || "—"}</td>
                      <td>
                        <span className="badge">
                          {report.status === "ARCHIVED" ? "Arquivado" : "Gerado"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="athlete-report-v8-pagination">
              <span>
                {firstVisible}–{lastVisible} de {totalReports}
              </span>

              {totalPages > 1 ? (
                <nav aria-label="Paginação do histórico de relatórios">
                  <Link
                    className={`athlete-report-v8-page ${currentPage === 1 ? "disabled" : ""}`}
                    href={`/atletas/${athlete.id}/performance/relatorios?page=${Math.max(1, currentPage - 1)}`}
                    aria-disabled={currentPage === 1}
                  >
                    ‹
                  </Link>

                  {pages.map((item, index) =>
                    item === "ellipsis" ? (
                      <span className="athlete-report-v8-ellipsis" key={`ellipsis-${index}`}>
                        …
                      </span>
                    ) : (
                      <Link
                        className={`athlete-report-v8-page ${item === currentPage ? "active" : ""}`}
                        href={`/atletas/${athlete.id}/performance/relatorios?page=${item}`}
                        key={item}
                        aria-current={item === currentPage ? "page" : undefined}
                      >
                        {item}
                      </Link>
                    ),
                  )}

                  <Link
                    className={`athlete-report-v8-page ${currentPage === totalPages ? "disabled" : ""}`}
                    href={`/atletas/${athlete.id}/performance/relatorios?page=${Math.min(totalPages, currentPage + 1)}`}
                    aria-disabled={currentPage === totalPages}
                  >
                    ›
                  </Link>
                </nav>
              ) : null}
            </div>
          </>
        ) : (
          <div className="athlete-report-v8-empty">
            <strong>Nenhum relatório gerado ainda.</strong>
            <p className="muted">
              Escolha Treino, Jogo, GPS ou uma Avaliação finalizada acima para criar o primeiro relatório.
            </p>
          </div>
        )}
      </section>

      <style>{`
        .athlete-report-performance-v8 {
          --report-ink: #07131d;
          --report-muted: #70808b;
          --report-line: #dfe6ea;
          --report-lime: #99e600;
          --report-lime-dark: #719f00;
          --report-lime-soft: #eff9d8;
        }

        .athlete-report-v8-success {
          margin-bottom: 18px;
          border-color: #cfe99c;
          color: #365600;
          background: #f4fbe8;
        }

        .athlete-report-v8-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .athlete-report-v8-card {
          padding: 22px;
          border: 1px solid var(--report-line);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(8, 26, 38, .04);
        }

        .athlete-report-v8-card-head {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .athlete-report-v8-icon {
          width: 44px;
          height: 44px;
          display: grid;
          place-items: center;
          flex: 0 0 44px;
          border-radius: 12px;
          color: var(--report-lime-dark);
          background: var(--report-lime-soft);
        }

        .athlete-report-v8-card-head h3 {
          margin: 4px 0 0;
          color: var(--report-ink);
          font-size: 22px;
          line-height: 1.1;
          letter-spacing: -.03em;
        }

        .athlete-report-v8-card > .muted {
          min-height: 42px;
          margin: 14px 0 18px;
          font-size: 12px;
          line-height: 1.5;
        }

        .athlete-report-v8-period-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .athlete-report-v8-period-grid label,
        .athlete-report-v8-evaluation-select {
          display: grid;
          gap: 7px;
          color: #34434d;
          font-size: 11px;
          font-weight: 800;
        }

        .athlete-report-v8-card-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 18px;
        }

        .athlete-report-v8-card-actions > a {
          color: #667781;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .athlete-report-v8-card-actions > a:hover {
          color: var(--report-ink);
        }

        .athlete-report-v8-no-evaluation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 18px;
          padding: 14px;
          border: 1px solid var(--report-line);
          border-radius: 14px;
          background: #fafcfc;
        }

        .athlete-report-v8-no-evaluation p {
          margin: 0;
          color: var(--report-muted);
          font-size: 12px;
        }

        .athlete-report-v8-history {
          margin-top: 22px;
          padding: 22px 24px 18px;
          border: 1px solid var(--report-line);
          border-radius: 20px;
          box-shadow: 0 10px 30px rgba(8, 26, 38, .04);
        }

        .athlete-report-v8-history-head {
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .athlete-report-v8-history-head h2 {
          margin: 4px 0 2px;
        }

        .athlete-report-v8-history-head .muted {
          margin: 0;
          font-size: 11px;
        }

        .athlete-report-v8-table-wrap {
          overflow: hidden;
          border: 1px solid var(--report-line);
          border-radius: 14px;
        }

        .athlete-report-v8-table {
          width: 100%;
          margin: 0;
          border-collapse: collapse;
        }

        .athlete-report-v8-table thead th {
          height: 42px;
          padding: 0 14px;
          border-bottom: 1px solid var(--report-line);
          color: #71818c;
          background: #f5f8f9;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          white-space: nowrap;
        }

        .athlete-report-v8-table tbody td {
          min-height: 50px;
          padding: 12px 14px;
          border-bottom: 1px solid #e8edef;
          color: #24323b;
          font-size: 11px;
          vertical-align: middle;
        }

        .athlete-report-v8-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .athlete-report-v8-table tbody tr.is-new {
          background: #f6fce9;
        }

        .athlete-report-v8-type-badge {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          color: #4e7300;
          background: var(--report-lime-soft);
          font-size: 10px;
          font-weight: 900;
        }

        .athlete-report-v8-pagination {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 14px;
          color: var(--report-muted);
          font-size: 11px;
          font-weight: 800;
        }

        .athlete-report-v8-pagination nav {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .athlete-report-v8-page,
        .athlete-report-v8-ellipsis {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          color: #596a75;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
        }

        .athlete-report-v8-page {
          border: 1px solid var(--report-line);
          background: #fff;
        }

        .athlete-report-v8-page.active {
          border-color: var(--report-lime);
          color: #10200a;
          background: var(--report-lime);
        }

        .athlete-report-v8-page.disabled {
          opacity: .38;
          pointer-events: none;
        }

        .athlete-report-v8-empty {
          padding: 24px 4px 8px;
        }

        .athlete-report-v8-empty p {
          margin: 5px 0 0;
        }

        @media (max-width: 900px) {
          .athlete-report-v8-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 760px) {
          .athlete-report-v8-history {
            padding: 18px 14px 14px;
          }

          .athlete-report-v8-table-wrap {
            overflow-x: auto;
          }

          .athlete-report-v8-table {
            min-width: 820px;
          }

          .athlete-report-v8-pagination {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .athlete-report-v8-period-grid {
            grid-template-columns: 1fr;
          }

          .athlete-report-v8-card-actions,
          .athlete-report-v8-no-evaluation {
            align-items: stretch;
            flex-direction: column;
          }

          .athlete-report-v8-card-actions .btn,
          .athlete-report-v8-no-evaluation .btn {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
