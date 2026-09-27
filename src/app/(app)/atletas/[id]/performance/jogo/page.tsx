import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

type MatchKpiIcon = "matches" | "minutes" | "goals" | "assists" | "cards";

function MatchIcon({
  name,
  size = 20,
}: {
  name: MatchKpiIcon;
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

  if (name === "matches") {
    return (
      <svg {...common}>
        <path d="M4 5h16v14H4z" />
        <path d="M12 5v14" />
        <circle cx="12" cy="12" r="2.1" />
        <path d="M4 9H2v6h2M20 9h2v6h-2" />
      </svg>
    );
  }

  if (name === "minutes") {
    return (
      <svg {...common}>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2" />
        <path d="M9 2h6M12 2v3" />
      </svg>
    );
  }

  if (name === "goals") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="m12 8 3 2.2-1.1 3.5h-3.8L9 10.2 12 8Z" />
        <path d="m5.8 9.7 3.2.5M15 10.2l3.2-.5M10.1 13.7 8.2 17M13.9 13.7l1.9 3.3" />
      </svg>
    );
  }

  if (name === "assists") {
    return (
      <svg {...common}>
        <path d="M4 12h11" />
        <path d="m12 8 4 4-4 4" />
        <circle cx="19" cy="12" r="2" />
        <path d="M5 7V5M5 19v-2" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="5" y="4" width="10" height="15" rx="1.8" />
      <path d="m14 8 5 2-3 8-5-2" />
    </svg>
  );
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

export default async function AthleteMatchPerformancePage({
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
      _count: {
        select: {
          matchStats: true,
        },
      },
    },
  });

  if (!athlete) notFound();

  const totalRecords = athlete._count.matchStats;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const requestedPage = Number.parseInt(String(query.page || "1"), 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;

  const [historyResult, totalsResult] = await Promise.all([
    prisma.athlete.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      select: {
        matchStats: {
          orderBy: {
            match: {
              startsAt: "desc",
            },
          },
          skip: (currentPage - 1) * pageSize,
          take: pageSize,
          include: {
            match: true,
          },
        },
      },
    }),
    prisma.athlete.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      select: {
        matchStats: {
          select: {
            minutesPlayed: true,
            goals: true,
            assists: true,
            yellowCards: true,
            redCards: true,
          },
        },
      },
    }),
  ]);

  const matchStats = historyResult?.matchStats || [];
  const allMatchStats = totalsResult?.matchStats || [];

  const totals = allMatchStats.reduce(
    (acc, item) => ({
      matches:
        acc.matches +
        (item.minutesPlayed || item.goals || item.assists ? 1 : 0),
      minutes: acc.minutes + (item.minutesPlayed || 0),
      goals: acc.goals + item.goals,
      assists: acc.assists + item.assists,
      yellowCards: acc.yellowCards + item.yellowCards,
      redCards: acc.redCards + item.redCards,
    }),
    {
      matches: 0,
      minutes: 0,
      goals: 0,
      assists: 0,
      yellowCards: 0,
      redCards: 0,
    },
  );

  const firstVisible = totalRecords ? (currentPage - 1) * pageSize + 1 : 0;
  const lastVisible = Math.min(currentPage * pageSize, totalRecords);
  const pages = paginationItems(currentPage, totalPages);

  return (
    <main className="athlete-performance-page athlete-performance-v4 athlete-match-performance-v6">
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
              Participação competitiva, minutagem e produção em jogo.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <Link
            className="athlete-performance-hero-primary"
            href={`/atletas/${athlete.id}/performance/relatorios`}
          >
            Gerar relatório
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
          },
          {
            label: "Treino",
            href: `/atletas/${athlete.id}/performance/treino`,
          },
          {
            label: "Jogo",
            href: `/atletas/${athlete.id}/performance/jogo`,
            active: true,
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
          <span className="page-eyebrow">JOGO</span>

          <h2>Rendimento em partidas</h2>

          <p className="muted">
            Minutagem, gols, assistências e participação competitiva registrada
            nas súmulas.
          </p>
        </div>
      </section>

      <section className="athlete-performance-v4-kpis athlete-match-v6-kpis">
        <article>
          <span className="athlete-match-v6-kpi-icon">
            <MatchIcon name="matches" />
          </span>
          <div className="athlete-match-v6-kpi-copy">
            <small>JOGOS</small>
            <strong>{totals.matches || "—"}</strong>
            <span>participações registradas</span>
          </div>
        </article>

        <article>
          <span className="athlete-match-v6-kpi-icon">
            <MatchIcon name="minutes" />
          </span>
          <div className="athlete-match-v6-kpi-copy">
            <small>MINUTOS</small>
            <strong>{totals.minutes || "—"}</strong>
            <span>minutos em jogo</span>
          </div>
        </article>

        <article>
          <span className="athlete-match-v6-kpi-icon">
            <MatchIcon name="goals" />
          </span>
          <div className="athlete-match-v6-kpi-copy">
            <small>GOLS</small>
            <strong>{totals.goals}</strong>
            <span>gols registrados</span>
          </div>
        </article>

        <article>
          <span className="athlete-match-v6-kpi-icon">
            <MatchIcon name="assists" />
          </span>
          <div className="athlete-match-v6-kpi-copy">
            <small>ASSISTÊNCIAS</small>
            <strong>{totals.assists}</strong>
            <span>assistências registradas</span>
          </div>
        </article>

        <article>
          <span className="athlete-match-v6-kpi-icon">
            <MatchIcon name="cards" />
          </span>
          <div className="athlete-match-v6-kpi-copy">
            <small>CARTÕES</small>
            <strong>{totals.yellowCards + totals.redCards}</strong>
            <span>
              {totals.yellowCards} amarelo(s) · {totals.redCards} vermelho(s)
            </span>
          </div>
        </article>
      </section>

      <section className="card athlete-match-v6-history">
        <div className="section-title-row athlete-match-v6-history-head">
          <div>
            <span className="page-eyebrow">HISTÓRICO</span>
            <h2>Últimos jogos</h2>
            <p className="muted">
              Histórico completo, organizado em páginas de {pageSize} jogos.
            </p>
          </div>

          <span className="badge">{totalRecords} jogo(s)</span>
        </div>

        {matchStats.length ? (
          <>
            <div className="table-wrap athlete-match-v6-table-wrap">
              <table className="table athlete-match-v6-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Adversário</th>
                    <th>Minutos</th>
                    <th>Gols</th>
                    <th>Assist.</th>
                    <th>Cartões</th>
                  </tr>
                </thead>

                <tbody>
                  {matchStats.map((stat) => (
                    <tr key={stat.id}>
                      <td>{stat.match.startsAt.toLocaleDateString("pt-BR")}</td>
                      <td>
                        <strong className="athlete-match-v6-opponent">
                          {stat.match.opponent || "Adversário não informado"}
                        </strong>
                      </td>
                      <td>{stat.minutesPlayed || "—"}</td>
                      <td>{stat.goals}</td>
                      <td>{stat.assists}</td>
                      <td>
                        {stat.yellowCards || stat.redCards
                          ? `${stat.yellowCards}A · ${stat.redCards}V`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="athlete-match-v6-pagination">
              <span className="athlete-match-v6-range">
                {firstVisible}–{lastVisible} de {totalRecords}
              </span>

              {totalPages > 1 ? (
                <nav aria-label="Paginação do histórico de jogos">
                  <Link
                    className={`athlete-match-v6-page-nav ${currentPage === 1 ? "disabled" : ""}`}
                    href={`/atletas/${athlete.id}/performance/jogo?page=${Math.max(1, currentPage - 1)}`}
                    aria-disabled={currentPage === 1}
                  >
                    ‹
                  </Link>

                  {pages.map((item, index) =>
                    item === "ellipsis" ? (
                      <span className="athlete-match-v6-page-ellipsis" key={`ellipsis-${index}`}>
                        …
                      </span>
                    ) : (
                      <Link
                        className={`athlete-match-v6-page-number ${item === currentPage ? "active" : ""}`}
                        href={`/atletas/${athlete.id}/performance/jogo?page=${item}`}
                        key={item}
                        aria-current={item === currentPage ? "page" : undefined}
                      >
                        {item}
                      </Link>
                    ),
                  )}

                  <Link
                    className={`athlete-match-v6-page-nav ${currentPage === totalPages ? "disabled" : ""}`}
                    href={`/atletas/${athlete.id}/performance/jogo?page=${Math.min(totalPages, currentPage + 1)}`}
                    aria-disabled={currentPage === totalPages}
                  >
                    ›
                  </Link>
                </nav>
              ) : null}
            </div>
          </>
        ) : (
          <p className="muted athlete-match-v6-empty">
            Nenhum jogo registrado para este atleta.
          </p>
        )}
      </section>

      <style>{`
        .athlete-match-performance-v6 {
          --match-v6-ink: #07131d;
          --match-v6-muted: #70808b;
          --match-v6-line: #dfe6ea;
          --match-v6-lime: #99e600;
          --match-v6-lime-dark: #719f00;
          --match-v6-lime-soft: #eff9d8;
        }

        .athlete-match-performance-v6 .athlete-match-v6-kpis {
          gap: 14px;
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .athlete-match-performance-v6 .athlete-match-v6-kpis article {
          min-height: 118px;
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          overflow: hidden;
          padding: 17px;
          border: 1px solid var(--match-v6-line);
          border-radius: 19px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-match-performance-v6 .athlete-match-v6-kpis article::before,
        .athlete-match-performance-v6 .athlete-match-v6-kpis article::after {
          display: none !important;
          content: none !important;
        }

        .athlete-match-v6-kpi-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          align-self: center;
          border-radius: 12px;
          color: var(--match-v6-lime-dark);
          background: var(--match-v6-lime-soft);
        }

        .athlete-match-v6-kpi-copy {
          min-width: 0;
          display: grid;
          align-content: center;
        }

        .athlete-match-v6-kpi-copy small {
          color: #74838d;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .athlete-match-v6-kpi-copy strong {
          margin-top: 2px;
          color: var(--match-v6-ink);
          font-size: 27px;
          line-height: 1.05;
          letter-spacing: -.04em;
        }

        .athlete-match-v6-kpi-copy > span {
          margin-top: 4px;
          color: var(--match-v6-muted);
          font-size: 10px;
          font-weight: 700;
          line-height: 1.35;
        }

        .athlete-match-performance-v6 .athlete-match-v6-history {
          overflow: hidden;
          padding: 22px 24px 18px;
          border: 1px solid var(--match-v6-line);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .athlete-match-v6-history-head {
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .athlete-match-v6-history-head h2 {
          margin: 4px 0 2px;
          color: var(--match-v6-ink);
        }

        .athlete-match-v6-history-head .muted {
          margin: 0;
          color: var(--match-v6-muted);
          font-size: 11px;
        }

        .athlete-match-v6-table-wrap {
          margin-top: 0;
          overflow: hidden;
          border: 1px solid var(--match-v6-line);
          border-radius: 14px;
        }

        .athlete-match-v6-table {
          width: 100%;
          margin: 0;
          border-collapse: collapse;
        }

        .athlete-match-v6-table thead th {
          height: 42px;
          padding: 0 14px;
          border-bottom: 1px solid var(--match-v6-line);
          color: #71818c;
          background: #f5f8f9;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          white-space: nowrap;
        }

        .athlete-match-v6-table tbody td {
          height: 50px;
          padding: 10px 14px;
          border-bottom: 1px solid #e8edef;
          color: #24323b;
          font-size: 12px;
          vertical-align: middle;
        }

        .athlete-match-v6-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .athlete-match-v6-table tbody tr:hover {
          background: #fbfcfc;
        }

        .athlete-match-v6-opponent {
          color: var(--match-v6-ink);
          font-weight: 800;
        }

        .athlete-match-v6-pagination {
          min-height: 54px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding-top: 14px;
        }

        .athlete-match-v6-range {
          color: var(--match-v6-muted);
          font-size: 11px;
          font-weight: 800;
        }

        .athlete-match-v6-pagination nav {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .athlete-match-v6-page-nav,
        .athlete-match-v6-page-number,
        .athlete-match-v6-page-ellipsis {
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

        .athlete-match-v6-page-nav,
        .athlete-match-v6-page-number {
          border: 1px solid var(--match-v6-line);
          background: #fff;
        }

        .athlete-match-v6-page-number.active {
          border-color: var(--match-v6-lime);
          color: #10200a;
          background: var(--match-v6-lime);
        }

        .athlete-match-v6-page-nav:hover:not(.disabled),
        .athlete-match-v6-page-number:hover:not(.active) {
          color: var(--match-v6-ink);
          background: #f4f7f8;
        }

        .athlete-match-v6-page-nav.disabled {
          opacity: .38;
          pointer-events: none;
        }

        .athlete-match-v6-empty {
          margin: 18px 0 4px;
        }

        @media (max-width: 1100px) {
          .athlete-match-performance-v6 .athlete-match-v6-kpis {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .athlete-match-performance-v6 .athlete-match-v6-kpis {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .athlete-match-performance-v6 .athlete-match-v6-history {
            padding: 18px 14px 14px;
          }

          .athlete-match-v6-table-wrap {
            overflow-x: auto;
          }

          .athlete-match-v6-table {
            min-width: 680px;
          }

          .athlete-match-v6-pagination {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (max-width: 520px) {
          .athlete-match-performance-v6 .athlete-match-v6-kpis {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
