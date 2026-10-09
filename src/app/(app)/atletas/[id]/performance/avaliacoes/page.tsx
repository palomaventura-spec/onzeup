import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

type EvaluationKpiIcon = "total" | "finalized" | "draft" | "archived";

function EvaluationIcon({
  name,
  size = 20,
}: {
  name: EvaluationKpiIcon;
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

  if (name === "total") {
    return (
      <svg {...common}>
        <path d="M6 3h12v18H6z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    );
  }

  if (name === "finalized") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </svg>
    );
  }

  if (name === "draft") {
    return (
      <svg {...common}>
        <path d="M4 20h4l10-10-4-4L4 16v4Z" />
        <path d="m12.5 7.5 4 4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4 7h16M6 7v13h12V7M8 4h8l1 3H7l1-3Z" />
      <path d="M9 12h6" />
    </svg>
  );
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "—";
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

export default async function AthleteEvaluationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
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
        orderBy: {
          evaluatedAt: "desc",
        },
        include: {
          evaluator: {
            select: {
              name: true,
            },
          },
          scores: true,
        },
      },
    },
  });

  if (!athlete) notFound();

  const finalized = athlete.evaluations.filter(
    (evaluation) => evaluation.status === "FINALIZED",
  );
  const drafts = athlete.evaluations.filter(
    (evaluation) => evaluation.status === "DRAFT",
  );
  const archived = athlete.evaluations.filter(
    (evaluation) => evaluation.status === "ARCHIVED",
  );

  const totalRecords = athlete.evaluations.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const requestedPage = Number.parseInt(String(query.page || "1"), 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const visibleEvaluations = athlete.evaluations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const firstVisible = totalRecords ? (currentPage - 1) * pageSize + 1 : 0;
  const lastVisible = Math.min(currentPage * pageSize, totalRecords);
  const pages = paginationItems(currentPage, totalPages);

  return (
    <main className="athlete-performance-page athlete-performance-v4 athlete-evaluations-v7">
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
              Avaliações profissionais, evolução e histórico individual do atleta.
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
          { label: "Visão geral", href: `/atletas/${athlete.id}/performance` },
          { label: "Treino", href: `/atletas/${athlete.id}/performance/treino` },
          { label: "Jogo", href: `/atletas/${athlete.id}/performance/jogo` },
          { label: "GPS", href: `/atletas/${athlete.id}/performance/gps` },
          {
            label: "Avaliações",
            href: `/atletas/${athlete.id}/performance/avaliacoes`,
            active: true,
          },
          {
            label: "Crescimento",
            href: `/atletas/${athlete.id}/performance/crescimento`,
          },
          {
            label: "Relatórios",
            href: `/atletas/${athlete.id}/performance/relatorios`,
          },
        ]}
      />

      <section className="athlete-performance-v4-heading athlete-evaluations-v7-heading">
        <div>
          <span className="page-eyebrow">AVALIAÇÕES</span>
          <h2>Acompanhamento profissional</h2>
          <p className="muted">
            Histórico de avaliações técnicas, físicas, táticas, cognitivas e emocionais.
          </p>
        </div>
      </section>

      <section className="athlete-performance-v4-kpis athlete-evaluations-v7-kpis">
        <article>
          <span className="athlete-evaluations-v7-kpi-icon">
            <EvaluationIcon name="total" />
          </span>
          <div className="athlete-evaluations-v7-kpi-copy">
            <small>TOTAL</small>
            <strong>{totalRecords || "—"}</strong>
            <span>avaliações cadastradas</span>
          </div>
        </article>

        <article>
          <span className="athlete-evaluations-v7-kpi-icon">
            <EvaluationIcon name="finalized" />
          </span>
          <div className="athlete-evaluations-v7-kpi-copy">
            <small>FINALIZADAS</small>
            <strong>{finalized.length || "—"}</strong>
            <span>avaliações concluídas</span>
          </div>
        </article>

        <article>
          <span className="athlete-evaluations-v7-kpi-icon">
            <EvaluationIcon name="draft" />
          </span>
          <div className="athlete-evaluations-v7-kpi-copy">
            <small>RASCUNHOS</small>
            <strong>{drafts.length || "—"}</strong>
            <span>em preenchimento</span>
          </div>
        </article>

        <article>
          <span className="athlete-evaluations-v7-kpi-icon">
            <EvaluationIcon name="archived" />
          </span>
          <div className="athlete-evaluations-v7-kpi-copy">
            <small>ARQUIVADAS</small>
            <strong>{archived.length || "—"}</strong>
            <span>registros arquivados</span>
          </div>
        </article>
      </section>

      <section className="card athlete-evaluations-v7-history">
        <div className="section-title-row athlete-evaluations-v7-history-head">
          <div>
            <span className="page-eyebrow">HISTÓRICO</span>
            <h2>Avaliações do atleta</h2>
            <p className="muted">
              Histórico completo organizado em páginas de {pageSize} avaliações.
            </p>
          </div>
          <span className="badge">{totalRecords} registro(s)</span>
        </div>

        {visibleEvaluations.length ? (
          <>
            <div className="table-wrap athlete-evaluations-v7-table-wrap">
              <table className="table athlete-evaluations-v7-table">
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
                  {visibleEvaluations.map((evaluation) => {
                    const completion = Math.min(
                      100,
                      Math.round((evaluation.scores.length / 25) * 100),
                    );

                    return (
                      <tr key={evaluation.id}>
                        <td>
                          <strong className="athlete-evaluations-v7-title">
                            {evaluation.title || "Avaliação"}
                          </strong>
                        </td>
                        <td>
                          {evaluation.athleteRole === "GOALKEEPER"
                            ? "Goleiro"
                            : "Jogador de linha"}
                        </td>
                        <td>{formatDate(evaluation.evaluatedAt)}</td>
                        <td>{evaluation.evaluator?.name || "—"}</td>
                        <td>
                          <div className="athlete-evaluations-v7-completion">
                            <strong>{evaluation.scores.length}/25</strong>
                            <span>
                              <i style={{ width: `${completion}%` }} />
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`athlete-evaluations-v7-status ${evaluation.status.toLowerCase()}`}
                          >
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
                              className="athlete-evaluations-v7-action"
                              href={`/atletas/${athlete.id}/performance/avaliacoes/${evaluation.id}`}
                            >
                              Ver avaliação →
                            </Link>
                          ) : (
                            <span className="athlete-evaluations-v7-action-muted">
                              {evaluation.status === "DRAFT" ? "Rascunho" : "Arquivada"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="athlete-evaluations-v7-pagination">
              <span className="athlete-evaluations-v7-range">
                {firstVisible}–{lastVisible} de {totalRecords}
              </span>

              {totalPages > 1 ? (
                <nav aria-label="Paginação do histórico de avaliações">
                  <Link
                    className={`athlete-evaluations-v7-page-nav ${currentPage === 1 ? "disabled" : ""}`}
                    href={`/atletas/${athlete.id}/performance/avaliacoes?page=${Math.max(1, currentPage - 1)}`}
                    aria-disabled={currentPage === 1}
                  >
                    ‹
                  </Link>

                  {pages.map((item, index) =>
                    item === "ellipsis" ? (
                      <span
                        className="athlete-evaluations-v7-page-ellipsis"
                        key={`ellipsis-${index}`}
                      >
                        …
                      </span>
                    ) : (
                      <Link
                        className={`athlete-evaluations-v7-page-number ${item === currentPage ? "active" : ""}`}
                        href={`/atletas/${athlete.id}/performance/avaliacoes?page=${item}`}
                        key={item}
                        aria-current={item === currentPage ? "page" : undefined}
                      >
                        {item}
                      </Link>
                    ),
                  )}

                  <Link
                    className={`athlete-evaluations-v7-page-nav ${currentPage === totalPages ? "disabled" : ""}`}
                    href={`/atletas/${athlete.id}/performance/avaliacoes?page=${Math.min(totalPages, currentPage + 1)}`}
                    aria-disabled={currentPage === totalPages}
                  >
                    ›
                  </Link>
                </nav>
              ) : null}
            </div>
          </>
        ) : (
          <p className="muted athlete-evaluations-v7-empty">
            Nenhuma avaliação cadastrada para este atleta.
          </p>
        )}
      </section>

      <style>{`
        .athlete-evaluations-v7 {
          --eval-v7-ink: #07131d;
          --eval-v7-muted: #70808b;
          --eval-v7-line: #dfe6ea;
          --eval-v7-lime: #99e600;
          --eval-v7-lime-dark: #719f00;
          --eval-v7-lime-soft: #eff9d8;
        }

        .athlete-evaluations-v7-heading {
          align-items: flex-end;
        }

        .athlete-evaluations-v7 .athlete-evaluations-v7-kpis {
          gap: 14px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .athlete-evaluations-v7 .athlete-evaluations-v7-kpis article {
          min-height: 118px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          overflow: hidden;
          padding: 17px;
          border: 1px solid var(--eval-v7-line);
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-evaluations-v7 .athlete-evaluations-v7-kpis article::before,
        .athlete-evaluations-v7 .athlete-evaluations-v7-kpis article::after {
          display: none !important;
          content: none !important;
        }

        .athlete-evaluations-v7-kpi-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 12px;
          color: var(--eval-v7-lime-dark);
          background: var(--eval-v7-lime-soft);
        }

        .athlete-evaluations-v7-kpi-copy {
          min-width: 0;
          display: grid;
          align-content: center;
        }

        .athlete-evaluations-v7-kpi-copy small {
          color: #74838d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .athlete-evaluations-v7-kpi-copy strong {
          margin-top: 2px;
          color: var(--eval-v7-ink);
          font-size: 27px;
          line-height: 1.05;
          letter-spacing: -.04em;
        }

        .athlete-evaluations-v7-kpi-copy > span {
          margin-top: 4px;
          color: var(--eval-v7-muted);
          font-size: 10px;
          font-weight: 700;
          line-height: 1.35;
        }

        .athlete-evaluations-v7-history {
          overflow: hidden;
          padding: 22px 24px 18px;
          border: 1px solid var(--eval-v7-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-evaluations-v7-history-head {
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .athlete-evaluations-v7-history-head h2 {
          margin: 4px 0 2px;
          color: var(--eval-v7-ink);
        }

        .athlete-evaluations-v7-history-head .muted {
          margin: 0;
          color: var(--eval-v7-muted);
          font-size: 11px;
        }

        .athlete-evaluations-v7-table-wrap {
          overflow: hidden;
          border: 1px solid var(--eval-v7-line);
          border-radius: 14px;
        }

        .athlete-evaluations-v7-table {
          width: 100%;
          margin: 0;
          border-collapse: collapse;
        }

        .athlete-evaluations-v7-table thead th {
          height: 42px;
          padding: 0 14px;
          border-bottom: 1px solid var(--eval-v7-line);
          color: #71818c;
          background: #f5f8f9;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          white-space: nowrap;
        }

        .athlete-evaluations-v7-table tbody td {
          height: 54px;
          padding: 10px 14px;
          border-bottom: 1px solid #e8edef;
          color: #24323b;
          font-size: 12px;
          vertical-align: middle;
        }

        .athlete-evaluations-v7-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .athlete-evaluations-v7-table tbody tr:hover {
          background: #fbfcfc;
        }

        .athlete-evaluations-v7-title {
          color: var(--eval-v7-ink);
          font-weight: 850;
        }

        .athlete-evaluations-v7-completion {
          min-width: 100px;
          display: grid;
          gap: 5px;
        }

        .athlete-evaluations-v7-completion strong {
          color: var(--eval-v7-ink);
          font-size: 11px;
        }

        .athlete-evaluations-v7-completion > span {
          width: 86px;
          height: 5px;
          overflow: hidden;
          display: block;
          border-radius: 999px;
          background: #edf1f2;
        }

        .athlete-evaluations-v7-completion i {
          height: 100%;
          display: block;
          border-radius: inherit;
          background: var(--eval-v7-lime);
        }

        .athlete-evaluations-v7-status {
          min-height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 900;
        }

        .athlete-evaluations-v7-status.finalized {
          color: #173600;
          background: #eaf8cc;
        }

        .athlete-evaluations-v7-status.draft {
          color: #725000;
          background: #fff2c9;
        }

        .athlete-evaluations-v7-status.archived {
          color: #586770;
          background: #edf1f3;
        }

        .athlete-evaluations-v7-action {
          color: #5c8700;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .athlete-evaluations-v7-action-muted {
          color: #98a3aa;
          font-size: 11px;
          font-weight: 800;
          white-space: nowrap;
        }

        .athlete-evaluations-v7-pagination {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 14px;
        }

        .athlete-evaluations-v7-range {
          color: var(--eval-v7-muted);
          font-size: 11px;
          font-weight: 800;
        }

        .athlete-evaluations-v7-pagination nav {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .athlete-evaluations-v7-page-nav,
        .athlete-evaluations-v7-page-number,
        .athlete-evaluations-v7-page-ellipsis {
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

        .athlete-evaluations-v7-page-nav,
        .athlete-evaluations-v7-page-number {
          border: 1px solid var(--eval-v7-line);
          background: #fff;
        }

        .athlete-evaluations-v7-page-number.active {
          border-color: var(--eval-v7-lime);
          color: #10200a;
          background: var(--eval-v7-lime);
        }

        .athlete-evaluations-v7-page-nav.disabled {
          opacity: .38;
          pointer-events: none;
        }

        .athlete-evaluations-v7-empty {
          margin: 18px 0 4px;
        }

        @media (max-width: 980px) {
          .athlete-evaluations-v7 .athlete-evaluations-v7-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .athlete-evaluations-v7-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .athlete-evaluations-v7-history {
            padding: 18px 14px 14px;
          }

          .athlete-evaluations-v7-table-wrap {
            overflow-x: auto;
          }

          .athlete-evaluations-v7-table {
            min-width: 860px;
          }

          .athlete-evaluations-v7-pagination {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .athlete-evaluations-v7 .athlete-evaluations-v7-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
