import Link from "next/link";
import {
  MatchStatus,
  SportType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";

import { createMatch } from "./actions";

const PAGE_SIZE = 20;

type MatchView =
  | "upcoming"
  | "open"
  | "history";

type MatchFilters = {
  sport?: string;
  view?: string;
  category?: string;
  q?: string;
  page?: string;
};

type MatchIcon =
  | "field"
  | "futsal"
  | "calendar"
  | "open"
  | "history"
  | "category"
  | "users"
  | "location"
  | "arrow"
  | "search"
  | "chevron-left"
  | "chevron-right";

function Icon({
  name,
  size = 18,
}: {
  name: MatchIcon;
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

  if (name === "field") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M12 5v14M3 12h18" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    );
  }

  if (name === "futsal") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m9.2 9.2 2.8-2 2.8 2-1.1 3.2h-3.4L9.2 9.2Z" />
      </svg>
    );
  }

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }

  if (name === "open") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }

  if (name === "history") {
    return (
      <svg {...common}>
        <path d="M4 7v5h5" />
        <path d="M5.2 16.5A8 8 0 1 0 4 9" />
        <path d="M12 8v4l3 2" />
      </svg>
    );
  }

  if (name === "category") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M4 18c0-3 2.2-5 5-5s5 2 5 5" />
        <path d="M16 7a2.5 2.5 0 0 1 0 5M16 14c2.4.2 4 1.8 4 4" />
      </svg>
    );
  }

  if (name === "location") {
    return (
      <svg {...common}>
        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
        <circle cx="12" cy="10" r="2" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  if (name === "chevron-left") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === "chevron-right") {
    return (
      <svg {...common}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  );
}

function normalizeView(
  value?: string,
): MatchView {
  if (value === "open" || value === "history") {
    return value;
  }

  return "upcoming";
}

function sportLabel(sport: SportType) {
  return sport === SportType.FUTSAL
    ? "Futsal"
    : "Campo";
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function matchesUrl({
  sport,
  view,
  category,
  q,
  page,
}: {
  sport: SportType;
  view?: MatchView;
  category?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  params.set("sport", sport);

  if (view && view !== "upcoming") {
    params.set("view", view);
  }

  if (category) {
    params.set("category", category);
  }

  if (q) {
    params.set("q", q);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  return `/jogos?${params.toString()}`;
}

function homeAwayLabel(
  value: string | null,
) {
  switch (value) {
    case "HOME":
      return "Mandante";
    case "AWAY":
      return "Visitante";
    case "NEUTRAL":
      return "Neutro";
    default:
      return null;
  }
}

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<MatchFilters>;
}) {
  const user =
    await requireClubPermission(
      "MATCHES_VIEW",
    );

  const canEdit =
    hasClubPermission(
      user,
      "MATCHES_EDIT",
    );

  const canViewCallUps =
    hasClubPermission(
      user,
      "CALLUPS_VIEW",
    );

  const query = await searchParams;
  const view = normalizeView(query.view);
  const search = String(query.q || "").trim();

  const requestedPage = Math.max(
    1,
    Number.parseInt(query.page || "1", 10) || 1,
  );

  const allCategories =
    await prisma.category.findMany({
      where: {
        organizationId:
          user.organizationId,
        active: true,
        type: "STANDARD",
      },
      select: {
        id: true,
        name: true,
        sport: true,
        birthYear: true,
      },
      orderBy: [
        { sport: "asc" },
        { birthYear: "desc" },
        { name: "asc" },
      ],
    });

  const hasFootball =
    allCategories.some(
      (category) =>
        category.sport ===
        SportType.FOOTBALL,
    );

  const hasFutsal =
    allCategories.some(
      (category) =>
        category.sport ===
        SportType.FUTSAL,
    );

  const selectedSport: SportType =
    query.sport ===
      SportType.FUTSAL &&
    hasFutsal
      ? SportType.FUTSAL
      : query.sport ===
            SportType.FOOTBALL &&
          hasFootball
        ? SportType.FOOTBALL
        : hasFootball
          ? SportType.FOOTBALL
          : SportType.FUTSAL;

  const categories =
    allCategories.filter(
      (category) =>
        category.sport ===
        selectedSport,
    );

  const legacyCategoryCount =
    allCategories.filter(
      (category) =>
        category.sport ===
        SportType.BOTH,
    ).length;

  const requestedCategoryId =
    String(query.category || "").trim();

  const categoryId =
    categories.some(
      (category) =>
        category.id ===
        requestedCategoryId,
    )
      ? requestedCategoryId
      : "";

  const staffMembers =
    canEdit
      ? await prisma.staffMember.findMany({
          where: {
            organizationId:
              user.organizationId,
            active: true,
            OR: [
              {
                sport:
                  selectedSport,
              },
              {
                sport:
                  SportType.BOTH,
              },
            ],
          },
          orderBy: {
            name: "asc",
          },
        })
      : [];

  const matches =
    await prisma.match.findMany({
      where: {
        organizationId:
          user.organizationId,
        sport: selectedSport,
        ...(categoryId
          ? {
              categoryId,
            }
          : {
              categoryId: {
                in: categories.map(
                  (category) =>
                    category.id,
                ),
              },
            }),
        ...(search
          ? {
              OR: [
                {
                  opponent: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  location: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  competition: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        callUps: true,
      },
      orderBy: {
        startsAt: "asc",
      },
    });

  const now = new Date();

  const rows = matches.map((match) => {
    let bucket: MatchView;

    if (
      match.status ===
        MatchStatus.FINISHED ||
      match.status ===
        MatchStatus.CANCELLED
    ) {
      bucket = "history";
    } else if (
      match.startsAt < now
    ) {
      bucket = "open";
    } else {
      bucket = "upcoming";
    }

    return {
      match,
      bucket,
    };
  });

  const upcomingCount =
    rows.filter(
      (item) =>
        item.bucket === "upcoming",
    ).length;

  const openCount =
    rows.filter(
      (item) =>
        item.bucket === "open",
    ).length;

  const historyCount =
    rows.filter(
      (item) =>
        item.bucket === "history",
    ).length;

  const finishedCount =
    rows.filter(
      (item) =>
        item.match.status ===
        MatchStatus.FINISHED,
    ).length;

  const visibleRows =
    rows
      .filter(
        (item) =>
          item.bucket === view,
      )
      .sort((a, b) =>
        view === "history"
          ? b.match.startsAt.getTime() -
            a.match.startsAt.getTime()
          : a.match.startsAt.getTime() -
            b.match.startsAt.getTime(),
      );

  const totalPages = Math.max(
    1,
    Math.ceil(
      visibleRows.length / PAGE_SIZE,
    ),
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );

  const pageStart =
    (currentPage - 1) * PAGE_SIZE;

  const pageRows =
    visibleRows.slice(
      pageStart,
      pageStart + PAGE_SIZE,
    );

  const pageNumbers =
    Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    ).filter(
      (page) =>
        page === 1 ||
        page === totalPages ||
        Math.abs(
          page - currentPage,
        ) <= 1,
    );

  const selectedCategory =
    categories.find(
      (category) =>
        category.id ===
        categoryId,
    );

  return (
    <main className="matches-v12">
      <section className="matches-v12-hero">
        <div>
          <span className="matches-v12-eyebrow">
            11UP CLUB · JOGOS E SÚMULAS
          </span>

          <h1>Jogos</h1>

          <p>
            Planejamento, convocação,
            resultado e súmula das
            partidas em um fluxo único.
          </p>
        </div>

        <div className="matches-v12-hero-aside">
          <small>
            JOGOS ·{" "}
            {sportLabel(
              selectedSport,
            ).toUpperCase()}
          </small>

          <strong>
            {matches.length}
          </strong>

          <span>
            registro(s) na modalidade
            selecionada
          </span>
        </div>
      </section>

      <section className="matches-v12-sport-switch">
        <div>
          <span className="matches-v12-eyebrow">
            MODALIDADE
          </span>

          <strong>
            Partidas separadas por esporte
          </strong>
        </div>

        <div>
          <Link
            className={
              selectedSport ===
              SportType.FOOTBALL
                ? "is-active"
                : ""
            }
            href={matchesUrl({
              sport:
                SportType.FOOTBALL,
              view,
            })}
          >
            <Icon
              name="field"
              size={17}
            />
            Campo
          </Link>

          <Link
            className={
              selectedSport ===
              SportType.FUTSAL
                ? "is-active"
                : ""
            }
            href={matchesUrl({
              sport:
                SportType.FUTSAL,
              view,
            })}
          >
            <Icon
              name="futsal"
              size={17}
            />
            Futsal
          </Link>
        </div>
      </section>

      {legacyCategoryCount > 0 ? (
        <div className="matches-v12-notice">
          <strong>
            {legacyCategoryCount} categoria(s)
          </strong>{" "}
          ainda estão sem modalidade
          definida e não podem gerar novos
          jogos.
        </div>
      ) : null}

      <section className="matches-v12-kpis">
        <article>
          <span className="matches-v12-kpi-icon">
            <Icon name="calendar" />
          </span>

          <div>
            <small>
              PRÓXIMOS JOGOS
            </small>

            <strong>
              {upcomingCount}
            </strong>

            <span>
              agendados
            </span>
          </div>
        </article>

        <article>
          <span className="matches-v12-kpi-icon">
            <Icon name="open" />
          </span>

          <div>
            <small>
              EM ABERTO
            </small>

            <strong>
              {openCount}
            </strong>

            <span>
              aguardando fechamento
            </span>
          </div>
        </article>

        <article>
          <span className="matches-v12-kpi-icon">
            <Icon name="history" />
          </span>

          <div>
            <small>
              FINALIZADOS
            </small>

            <strong>
              {finishedCount}
            </strong>

            <span>
              com resultado
            </span>
          </div>
        </article>

        <article>
          <span className="matches-v12-kpi-icon">
            <Icon name="category" />
          </span>

          <div>
            <small>
              CATEGORIAS
            </small>

            <strong>
              {categories.length}
            </strong>

            <span>
              {sportLabel(
                selectedSport,
              )}
            </span>
          </div>
        </article>
      </section>

      {canEdit ? (
        <details
          className="matches-v12-create"
          id="novo-jogo"
        >
          <summary>
            <div>
              <span className="matches-v12-eyebrow">
                PLANEJAMENTO
              </span>

              <h2>Novo jogo</h2>

              <p>
                Cadastre os dados essenciais
                e configure convocação,
                equipamentos e comissão
                quando necessário.
              </p>
            </div>

            <span>
              + Novo jogo
            </span>
          </summary>

          <div className="matches-v12-create-body">
            {categories.length === 0 ? (
              <div className="matches-v12-empty">
                Não há categoria de{" "}
                {sportLabel(
                  selectedSport,
                )}{" "}
                disponível.
              </div>
            ) : (
              <form
                action={createMatch}
                className="matches-v12-form"
              >
                <section className="matches-v12-form-section">
                  <header>
                    <div>
                      <span className="matches-v12-eyebrow">
                        PARTIDA
                      </span>

                      <h3>
                        Informações principais
                      </h3>
                    </div>
                  </header>

                  <div className="matches-v12-form-grid">
                    <label>
                      <span>
                        Categoria
                      </span>

                      <select
                        name="categoryId"
                        required
                        defaultValue=""
                      >
                        <option
                          value=""
                          disabled
                        >
                          Selecione
                        </option>

                        {categories.map(
                          (category) => (
                            <option
                              key={
                                category.id
                              }
                              value={
                                category.id
                              }
                            >
                              {
                                category.name
                              }
                            </option>
                          ),
                        )}
                      </select>

                      <small>
                        A modalidade será
                        definida automaticamente
                        pela categoria.
                      </small>
                    </label>

                    <label>
                      <span>
                        Adversário
                      </span>

                      <input
                        name="opponent"
                        placeholder="Nome do adversário"
                        required
                      />
                    </label>

                    <label>
                      <span>Data</span>

                      <input
                        name="matchDate"
                        type="date"
                        required
                      />
                    </label>

                    <label>
                      <span>
                        Horário
                      </span>

                      <input
                        name="matchTime"
                        type="time"
                        required
                      />
                    </label>

                    <label>
                      <span>Local</span>

                      <input
                        name="location"
                        placeholder="Campo / ginásio"
                      />
                    </label>

                    <label>
                      <span>
                        Mandante / visitante
                      </span>

                      <select
                        name="homeAway"
                        defaultValue=""
                      >
                        <option value="">
                          Não informado
                        </option>

                        <option value="HOME">
                          Mandante
                        </option>

                        <option value="AWAY">
                          Visitante
                        </option>

                        <option value="NEUTRAL">
                          Campo neutro
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>
                        Evento / torneio
                      </span>

                      <input
                        name="competition"
                        placeholder="Opcional"
                      />
                    </label>

                    <label className="matches-v12-form-wide">
                      <span>
                        Observações
                      </span>

                      <textarea
                        name="notes"
                        rows={3}
                        placeholder="Informações gerais da partida"
                      />
                    </label>
                  </div>
                </section>

                <details className="matches-v12-advanced">
                  <summary>
                    Convocação e equipamentos
                  </summary>

                  <div className="matches-v12-form-grid">
                    <label>
                      <span>
                        Limite de convocados
                      </span>

                      <input
                        name="callUpLimit"
                        type="number"
                        min={
                          selectedSport ===
                          SportType.FUTSAL
                            ? 5
                            : 9
                        }
                        max="30"
                        defaultValue={
                          selectedSport ===
                          SportType.FUTSAL
                            ? 14
                            : 18
                        }
                        required
                      />
                    </label>

                    <label>
                      <span>
                        Tipo de convocação
                      </span>

                      <select
                        name="callUpMode"
                        defaultValue="CONFIRMATION_REQUIRED"
                        required
                      >
                        <option value="CONFIRMATION_REQUIRED">
                          Confirmação obrigatória
                        </option>

                        <option value="INFORMATION_ONLY">
                          Somente informativa
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>
                        Horário de apresentação
                      </span>

                      <input
                        name="presentationTime"
                        type="time"
                      />
                    </label>

                    <label>
                      <span>
                        Como o atleta deve chegar
                      </span>

                      <select
                        name="arrivalAttire"
                        defaultValue="GAME_UNIFORM"
                      >
                        <option value="GAME_UNIFORM">
                          Uniforme de jogo
                        </option>

                        <option value="TRAINING_UNIFORM">
                          Uniforme de treino
                        </option>
                      </select>
                    </label>

                    <label>
                      <span>
                        Uniforme / padrão
                      </span>

                      <input
                        name="uniform"
                        placeholder="Ex.: camisa branca, short preto"
                      />
                    </label>

                    <label>
                      <span>Meião</span>

                      <input
                        name="sockRequirement"
                        placeholder="Ex.: meião oficial"
                      />
                    </label>

                    <label>
                      <span>Calçado</span>

                      <select
                        name="footwearType"
                        defaultValue={
                          selectedSport ===
                          SportType.FUTSAL
                            ? "FUTSAL_SHOES"
                            : "FIELD_CLEATS"
                        }
                      >
                        <option value="FIELD_CLEATS">
                          Chuteira de trava
                        </option>

                        <option value="SOCIETY_CLEATS">
                          Chuteira society
                        </option>

                        <option value="FUTSAL_SHOES">
                          Tênis/chuteira de futsal
                        </option>
                      </select>
                    </label>

                    <label className="matches-v12-check">
                      <input
                        name="shinGuardsRequired"
                        type="checkbox"
                        defaultChecked
                      />

                      <span>
                        Caneleira obrigatória
                      </span>
                    </label>

                    <label className="matches-v12-form-wide">
                      <span>
                        Outras orientações
                      </span>

                      <textarea
                        name="equipmentNotes"
                        rows={3}
                        placeholder="Ex.: levar garrafa de água e documento"
                      />
                    </label>
                  </div>
                </details>

                <details className="matches-v12-advanced">
                  <summary>
                    Comissão técnica presente
                  </summary>

                  <div className="matches-v12-staff">
                    {staffMembers.length ? (
                      staffMembers.map(
                        (member) => (
                          <label
                            key={
                              member.id
                            }
                          >
                            <input
                              name="staffIds"
                              type="checkbox"
                              value={
                                member.id
                              }
                            />

                            <span>
                              <strong>
                                {
                                  member.name
                                }
                              </strong>

                              <small>
                                {
                                  member.roleTitle
                                }
                                {` · ${sportLabel(member.sport)}`}
                              </small>
                            </span>
                          </label>
                        ),
                      )
                    ) : (
                      <p>
                        Nenhum profissional
                        ativo disponível.
                      </p>
                    )}
                  </div>
                </details>

                <button
                  className="matches-v12-create-submit"
                  type="submit"
                >
                  Cadastrar jogo
                </button>
              </form>
            )}
          </div>
        </details>
      ) : (
        <div className="matches-v12-notice neutral">
          <strong>
            Somente visualização.
          </strong>{" "}
          Os dados da partida são
          alterados por usuários
          autorizados.
        </div>
      )}

      <section className="matches-v12-controls">
        <nav aria-label="Visualização dos jogos">
          <Link
            className={
              view === "upcoming"
                ? "is-active"
                : ""
            }
            href={matchesUrl({
              sport:
                selectedSport,
              view: "upcoming",
              category:
                categoryId,
              q: search,
            })}
          >
            Próximos
            <span>
              {upcomingCount}
            </span>
          </Link>

          <Link
            className={
              view === "open"
                ? "is-active"
                : ""
            }
            href={matchesUrl({
              sport:
                selectedSport,
              view: "open",
              category:
                categoryId,
              q: search,
            })}
          >
            Em aberto
            <span>
              {openCount}
            </span>
          </Link>

          <Link
            className={
              view === "history"
                ? "is-active"
                : ""
            }
            href={matchesUrl({
              sport:
                selectedSport,
              view: "history",
              category:
                categoryId,
              q: search,
            })}
          >
            Histórico
            <span>
              {historyCount}
            </span>
          </Link>
        </nav>

        <form method="get">
          <input
            type="hidden"
            name="sport"
            value={selectedSport}
          />

          <input
            type="hidden"
            name="view"
            value={view}
          />

          <label>
            <span>
              Categoria
            </span>

            <select
              name="category"
              defaultValue={
                categoryId
              }
            >
              <option value="">
                Todas de{" "}
                {sportLabel(
                  selectedSport,
                )}
              </option>

              {categories.map(
                (category) => (
                  <option
                    key={
                      category.id
                    }
                    value={
                      category.id
                    }
                  >
                    {
                      category.name
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="matches-v12-search">
            <span>
              Buscar
            </span>

            <div>
              <Icon
                name="search"
                size={17}
              />

              <input
                name="q"
                defaultValue={search}
                placeholder="Adversário ou local"
              />
            </div>
          </label>

          <button type="submit">
            Filtrar
          </button>
        </form>
      </section>

      <section className="matches-v12-list-panel">
        <header>
          <div>
            <span className="matches-v12-eyebrow">
              {view === "upcoming"
                ? "AGENDA"
                : view === "open"
                  ? "ACOMPANHAMENTO"
                  : "REGISTROS"}
            </span>

            <h2>
              {view === "upcoming"
                ? "Próximos jogos"
                : view === "open"
                  ? "Jogos em aberto"
                  : "Histórico de jogos"}
            </h2>

            <p>
              {selectedCategory
                ? `${selectedCategory.name} · ${sportLabel(selectedSport)}`
                : `Todas as categorias · ${sportLabel(selectedSport)}`}
            </p>
          </div>

          <span>
            {visibleRows.length} jogo(s)
          </span>
        </header>

        {pageRows.length ? (
          <>
            <div className="matches-v12-table-head">
              <span>Data</span>
              <span>Categoria</span>
              <span>Adversário</span>
              <span>Local</span>
              <span>Convocação</span>
              <span>Resultado</span>
              <span>Status</span>
              <span>Ação</span>
            </div>

            <div className="matches-v12-list">
              {pageRows.map(
                ({ match }) => {
                  const homeAway =
                    homeAwayLabel(
                      match.homeAway,
                    );

                  const isFinished =
                    match.status ===
                    MatchStatus.FINISHED;

                  const isCancelled =
                    match.status ===
                    MatchStatus.CANCELLED;

                  const isOpen =
                    match.status ===
                      MatchStatus.SCHEDULED &&
                    match.startsAt <
                      now;

                  return (
                    <article
                      className="matches-v12-row"
                      key={match.id}
                    >
                      <div className="matches-v12-date">
                        <strong>
                          {formatDate(
                            match.startsAt,
                          )}
                        </strong>

                        <small>
                          {formatTime(
                            match.startsAt,
                          )}
                        </small>
                      </div>

                      <div className="matches-v12-cell">
                        <b>
                          {
                            match
                              .category
                              .name
                          }
                        </b>

                        <small>
                          {sportLabel(
                            selectedSport,
                          )}
                        </small>
                      </div>

                      <div className="matches-v12-cell">
                        <b>
                          {
                            match.opponent
                          }
                        </b>

                        <small>
                          {match.competition ||
                            homeAway ||
                            "Partida"}
                        </small>
                      </div>

                      <div className="matches-v12-cell">
                        <b>
                          {match.location ||
                            "A definir"}
                        </b>

                        {homeAway ? (
                          <small>
                            {homeAway}
                          </small>
                        ) : null}
                      </div>

                      <div className="matches-v12-callup">
                        <span>
                          <Icon
                            name="users"
                            size={14}
                          />

                          {
                            match
                              .callUps
                              .length
                          }
                          /
                          {
                            match.callUpLimit
                          }
                        </span>

                        <small>
                          {canViewCallUps
                            ? "convocados"
                            : "restrito"}
                        </small>
                      </div>

                      <div className="matches-v12-result">
                        {isFinished ? (
                          <strong>
                            {match.goalsFor ??
                              0}{" "}
                            ×{" "}
                            {match.goalsAgainst ??
                              0}
                          </strong>
                        ) : (
                          <span>—</span>
                        )}
                      </div>

                      <div className="matches-v12-status">
                        <span
                          className={
                            isFinished
                              ? "finished"
                              : isCancelled
                                ? "cancelled"
                                : isOpen
                                  ? "open"
                                  : "scheduled"
                          }
                        >
                          {isFinished
                            ? "Finalizado"
                            : isCancelled
                              ? "Cancelado"
                              : isOpen
                                ? "Em aberto"
                                : "Agendado"}
                        </span>
                      </div>

                      <div className="matches-v12-actions">
                        <Link
                          href={`/jogos/${match.id}`}
                        >
                          Abrir jogo
                          <Icon
                            name="arrow"
                            size={15}
                          />
                        </Link>
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            {totalPages > 1 ? (
              <nav
                className="matches-v12-pagination"
                aria-label="Paginação dos jogos"
              >
                <Link
                  className={
                    currentPage === 1
                      ? "disabled"
                      : ""
                  }
                  href={matchesUrl({
                    sport:
                      selectedSport,
                    view,
                    category:
                      categoryId,
                    q: search,
                    page: Math.max(
                      1,
                      currentPage - 1,
                    ),
                  })}
                >
                  <Icon
                    name="chevron-left"
                    size={16}
                  />
                  Anterior
                </Link>

                <div>
                  {pageNumbers.map(
                    (page, index) => {
                      const previous =
                        pageNumbers[
                          index - 1
                        ];

                      return (
                        <span key={page}>
                          {previous &&
                          page -
                            previous >
                            1 ? (
                            <i>…</i>
                          ) : null}

                          <Link
                            className={
                              page ===
                              currentPage
                                ? "is-active"
                                : ""
                            }
                            href={matchesUrl({
                              sport:
                                selectedSport,
                              view,
                              category:
                                categoryId,
                              q: search,
                              page,
                            })}
                          >
                            {page}
                          </Link>
                        </span>
                      );
                    },
                  )}
                </div>

                <Link
                  className={
                    currentPage ===
                    totalPages
                      ? "disabled"
                      : ""
                  }
                  href={matchesUrl({
                    sport:
                      selectedSport,
                    view,
                    category:
                      categoryId,
                    q: search,
                    page: Math.min(
                      totalPages,
                      currentPage + 1,
                    ),
                  })}
                >
                  Próxima
                  <Icon
                    name="chevron-right"
                    size={16}
                  />
                </Link>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="matches-v12-empty">
            {view === "upcoming"
              ? "Nenhum próximo jogo encontrado."
              : view === "open"
                ? "Nenhum jogo aguardando fechamento."
                : "Nenhum jogo no histórico para os filtros selecionados."}
          </div>
        )}
      </section>
    </main>
  );
}
