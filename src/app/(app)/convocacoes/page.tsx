import Link from "next/link";
import { SportType } from "@prisma/client";

import ModuleTour from "@/components/help/ModuleTour";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

type CallUpFilters = {
  sport?: string;
  category?: string;
  q?: string;
  page?: string;
};

type CallUpIcon =
  | "field"
  | "futsal"
  | "calendar"
  | "users"
  | "confirmed"
  | "pending"
  | "search"
  | "arrow"
  | "chevron-left"
  | "chevron-right";

function Icon({
  name,
  size = 18,
}: {
  name: CallUpIcon;
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

  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M4 18c0-3 2.2-5 5-5s5 2 5 5" />
        <path d="M16 7a2.5 2.5 0 0 1 0 5M16 14c2.4.2 4 1.8 4 4" />
      </svg>
    );
  }

  if (name === "confirmed") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (name === "pending") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
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

function callUpsUrl({
  sport,
  category,
  q,
  page,
}: {
  sport: SportType;
  category?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  params.set("sport", sport);

  if (category) {
    params.set("category", category);
  }

  if (q) {
    params.set("q", q);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  return `/convocacoes?${params.toString()}`;
}

export default async function CallUpsPage({
  searchParams,
}: {
  searchParams: Promise<CallUpFilters>;
}) {
  const user =
    await requireClubPermission(
      "CALLUPS_VIEW",
    );

  const query = await searchParams;

  const search =
    String(query.q || "").trim();

  const requestedPage = Math.max(
    1,
    Number.parseInt(
      query.page || "1",
      10,
    ) || 1,
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
    String(
      query.category || "",
    ).trim();

  const categoryId =
    categories.some(
      (category) =>
        category.id ===
        requestedCategoryId,
    )
      ? requestedCategoryId
      : "";

  const matches =
    await prisma.match.findMany({
      where: {
        organizationId:
          user.organizationId,
        status: "SCHEDULED",
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

  const totalCalled =
    matches.reduce(
      (total, match) =>
        total +
        match.callUps.length,
      0,
    );

  const confirmed =
    matches.reduce(
      (total, match) =>
        total +
        match.callUps.filter(
          (callUp) =>
            callUp.status ===
            "CONFIRMED",
        ).length,
      0,
    );

  const pending =
    matches.reduce(
      (total, match) =>
        total +
        match.callUps.filter(
          (callUp) =>
            callUp.status ===
            "PENDING",
        ).length,
      0,
    );

  const totalPages = Math.max(
    1,
    Math.ceil(
      matches.length / PAGE_SIZE,
    ),
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );

  const pageStart =
    (currentPage - 1) *
    PAGE_SIZE;

  const pageRows =
    matches.slice(
      pageStart,
      pageStart + PAGE_SIZE,
    );

  const pageNumbers =
    Array.from(
      {
        length: totalPages,
      },
      (_, index) =>
        index + 1,
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
            11UP CLUB · GESTÃO DE ELENCO
          </span>

          <h1>Convocações</h1>

          <p>
            Organize os atletas de cada partida,
            acompanhe confirmações e avance até a
            escalação e a arte oficial da convocação.
          </p>
        </div>

        <div className="matches-v12-hero-aside">
          <small>
            {sportLabel(
              selectedSport,
            ).toUpperCase()}
          </small>

          <strong>
            {matches.length}
          </strong>

          <span>
            jogo(s) aguardando convocação
          </span>

          <ModuleTour module="convocacoes" />
        </div>
      </section>

      <section className="matches-v12-sport-switch">
        <div>
          <span className="matches-v12-eyebrow">
            MODALIDADE
          </span>

          <strong>
            Convocações separadas por esporte
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
            href={callUpsUrl({
              sport:
                SportType.FOOTBALL,
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
            href={callUpsUrl({
              sport:
                SportType.FUTSAL,
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
          ainda estão sem modalidade definida.
          Esses registros legados não aparecem
          nesta central até serem classificados
          como Campo ou Futsal.
        </div>
      ) : null}

      <section className="matches-v12-kpis">
        <article>
          <span className="matches-v12-kpi-icon">
            <Icon name="calendar" />
          </span>

          <div>
            <small>
              JOGOS ABERTOS
            </small>

            <strong>
              {matches.length}
            </strong>

            <span>
              aguardando convocação
            </span>
          </div>
        </article>

        <article>
          <span className="matches-v12-kpi-icon">
            <Icon name="users" />
          </span>

          <div>
            <small>
              CONVOCADOS
            </small>

            <strong>
              {totalCalled}
            </strong>

            <span>
              atletas nas listas
            </span>
          </div>
        </article>

        <article>
          <span className="matches-v12-kpi-icon">
            <Icon name="confirmed" />
          </span>

          <div>
            <small>
              CONFIRMADOS
            </small>

            <strong>
              {confirmed}
            </strong>

            <span>
              presenças confirmadas
            </span>
          </div>
        </article>

        <article>
          <span className="matches-v12-kpi-icon">
            <Icon name="pending" />
          </span>

          <div>
            <small>
              AGUARDANDO
            </small>

            <strong>
              {pending}
            </strong>

            <span>
              respostas pendentes
            </span>
          </div>
        </article>
      </section>

      <section className="matches-v12-controls">
        <nav aria-label="Central de convocações">
          <Link
            className="is-active"
            href={callUpsUrl({
              sport:
                selectedSport,
              category:
                categoryId,
              q: search,
            })}
          >
            Próximas partidas
            <span>
              {matches.length}
            </span>
          </Link>
        </nav>

        <form method="get">
          <input
            type="hidden"
            name="sport"
            value={selectedSport}
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
                    {category.name}
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
                defaultValue={
                  search
                }
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
              PRÓXIMAS PARTIDAS
            </span>

            <h2>
              Central de convocações
            </h2>

            <p>
              {selectedCategory
                ? `${selectedCategory.name} · ${sportLabel(selectedSport)}`
                : `Todas as categorias · ${sportLabel(selectedSport)}`}
            </p>
          </div>

          <span>
            {matches.length} jogo(s)
          </span>
        </header>

        {pageRows.length ? (
          <>
            <div className="matches-v12-table-head">
              <span>Data</span>
              <span>Categoria</span>
              <span>Adversário</span>
              <span>Local</span>
              <span>Lista</span>
              <span>Confirmados</span>
              <span>Pendentes</span>
              <span>Ação</span>
            </div>

            <div className="matches-v12-list">
              {pageRows.map(
                (match) => {
                  const yes =
                    match.callUps.filter(
                      (callUp) =>
                        callUp.status ===
                        "CONFIRMED",
                    ).length;

                  const waiting =
                    match.callUps.filter(
                      (callUp) =>
                        callUp.status ===
                        "PENDING",
                    ).length;

                  const limit =
                    match.callUpLimit ||
                    (selectedSport ===
                    SportType.FUTSAL
                      ? 14
                      : 18);

                  return (
                    <article
                      className="matches-v12-row"
                      key={
                        match.id
                      }
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
                            "Partida"}
                        </small>
                      </div>

                      <div className="matches-v12-cell">
                        <b>
                          {match.location ||
                            "A definir"}
                        </b>

                        <small>
                          Local da partida
                        </small>
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
                          /{limit}
                        </span>

                        <small>
                          convocados
                        </small>
                      </div>

                      <div className="matches-v12-result">
                        <strong>
                          {yes}
                        </strong>
                      </div>

                      <div className="matches-v12-status">
                        <span
                          className={
                            waiting > 0
                              ? "open"
                              : "scheduled"
                          }
                        >
                          {waiting} pendente
                          {waiting === 1
                            ? ""
                            : "s"}
                        </span>
                      </div>

                      <div className="matches-v12-actions">
                        <Link
                          href={`/convocacoes/${match.id}`}
                        >
                          Gerenciar
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
                aria-label="Paginação das convocações"
              >
                <Link
                  className={
                    currentPage === 1
                      ? "disabled"
                      : ""
                  }
                  href={callUpsUrl({
                    sport:
                      selectedSport,
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
                    (
                      page,
                      index,
                    ) => {
                      const previous =
                        pageNumbers[
                          index - 1
                        ];

                      return (
                        <span
                          key={
                            page
                          }
                        >
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
                            href={callUpsUrl({
                              sport:
                                selectedSport,
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
                  href={callUpsUrl({
                    sport:
                      selectedSport,
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
            Nenhum jogo agendado para convocação
            nos filtros selecionados.
          </div>
        )}
      </section>
    </main>
  );
}