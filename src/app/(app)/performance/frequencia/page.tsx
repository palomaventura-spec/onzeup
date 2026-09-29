import Link from "next/link";

import {
  ClubPermissionCode,
  SportType,
  TrainingSessionStatus,
} from "@prisma/client";

import { requireOrganizationUser } from "@/lib/auth";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";
import {
  calculateTrainingParticipationSummary,
  type TrainingParticipationRecord,
} from "@/lib/training-performance";

const PAGE_SIZE = 20;

type FrequencyFilters = {
  month?: string;
  category?: string;
  sport?: string;
  q?: string;
  page?: string;
};

type FrequencyIcon =
  | "training"
  | "minutes"
  | "frequency"
  | "performance"
  | "field"
  | "futsal"
  | "search"
  | "arrow"
  | "chevron-left"
  | "chevron-right";

function Icon({
  name,
  size = 20,
}: {
  name: FrequencyIcon;
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

  if (name === "training") {
    return (
      <svg {...common}>
        <path d="M4 18V8l8-4 8 4v10" />
        <path d="M8 18v-5h8v5M7 9h.01M17 9h.01" />
      </svg>
    );
  }

  if (name === "minutes") {
    return (
      <svg {...common}>
        <circle cx="12" cy="13" r="7" />
        <path d="M12 13V9M9 3h6M12 6V3" />
      </svg>
    );
  }

  if (name === "frequency") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (name === "performance") {
    return (
      <svg {...common}>
        <path d="M4 19V9M10 19V5M16 19v-7M22 19H2" />
      </svg>
    );
  }

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

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
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

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function currentMonthValue() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function parseMonth(value?: string) {
  const normalized =
    value && /^\d{4}-\d{2}$/.test(value)
      ? value
      : currentMonthValue();

  const [year, month] = normalized.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  return {
    value: normalized,
    start,
    end,
    label: new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(start),
  };
}

function minutesBetween(start: Date | null, end: Date | null) {
  if (!start || !end || end <= start) return null;

  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function sessionOfferedMinutes(session: {
  startsAt: Date;
  endsAt: Date | null;
  actualStartedAt: Date | null;
  actualEndedAt: Date | null;
}) {
  const actual = minutesBetween(
    session.actualStartedAt,
    session.actualEndedAt,
  );

  if (actual !== null) return actual;

  return minutesBetween(session.startsAt, session.endsAt);
}

function percentageLabel(value: number) {
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function sportLabel(sport: SportType) {
  return sport === SportType.FUTSAL ? "Futsal" : "Futebol";
}

function frequencyUrl({
  month,
  category,
  sport,
  q,
  page,
}: {
  month: string;
  category?: string;
  sport: SportType;
  q?: string;
  page?: number;
}) {
  const query = new URLSearchParams();

  query.set("month", month);
  query.set("sport", sport);

  if (category) query.set("category", category);
  if (q) query.set("q", q);
  if (page && page > 1) query.set("page", String(page));

  return `/performance/frequencia?${query.toString()}`;
}

export default async function TrainingPerformancePage({
  searchParams,
}: {
  searchParams: Promise<FrequencyFilters>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;

  const period = parseMonth(query.month);
  const requestedCategoryId = String(query.category || "").trim();
  const search = String(query.q || "").trim();
  const requestedPage = Math.max(
    1,
    Number.parseInt(query.page || "1", 10) || 1,
  );

  const [subscription, organization] = await Promise.all([
    prisma.subscription.findUnique({
      where: {
        organizationId: user.organizationId,
      },
    }),
    prisma.organization.findUnique({
      where: {
        id: user.organizationId,
      },
      select: {
        accessStatus: true,
        complimentaryUntil: true,
      },
    }),
  ]);

  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  });

  if (!elite) {
    return (
      <section className="performance-upgrade">
        <span className="page-eyebrow">11UP PERFORMANCE</span>
        <h1>Frequência e rendimento de treino</h1>
        <p>
          Acompanhe presença, minutagem e aproveitamento real dos atletas.
        </p>

        <Link className="btn" href="/planos">
          Conhecer o Club Elite
        </Link>
      </section>
    );
  }

  const hasGlobalPerformanceAccess =
    hasClubPermission(user, "PERFORMANCE_VIEW") ||
    hasClubPermission(user, "PERFORMANCE_MANAGE");

  let allowedCategoryIds: string[] | null = null;

  if (!hasGlobalPerformanceAccess) {
    const staffLinks = await prisma.staffMember.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        OR: [
          {
            userId: user.id,
          },
          {
            coachEmail: {
              equals: user.email,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        categoryPermissions: {
          where: {
            organizationId: user.organizationId,
            enabled: true,
            permission: {
              in: [
                ClubPermissionCode.PERFORMANCE_VIEW,
                ClubPermissionCode.PERFORMANCE_MANAGE,
              ],
            },
          },
          select: {
            categoryId: true,
          },
        },
      },
    });

    allowedCategoryIds = Array.from(
      new Set(
        staffLinks.flatMap((staff) =>
          staff.categoryPermissions.map(
            (permission) => permission.categoryId,
          ),
        ),
      ),
    );
  }

  if (
    !hasGlobalPerformanceAccess &&
    (!allowedCategoryIds || allowedCategoryIds.length === 0)
  ) {
    return (
      <main className="performance-hub">
        <div className="page-head">
          <div>
            <span className="page-eyebrow">
              PERFORMANCE · TREINOS
            </span>
            <h1>Frequência e rendimento</h1>
            <p className="muted">
              Acesso definido pelo Gestor por profissional e categoria.
            </p>
          </div>
        </div>

        <div className="notice" role="status">
          <strong>Acesso restrito.</strong> Você ainda não possui uma
          categoria autorizada para visualizar os dados de Performance.
        </div>
      </main>
    );
  }

  const categories = await prisma.category.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      type: "STANDARD",
      sport: {
        in: [SportType.FOOTBALL, SportType.FUTSAL],
      },
      ...(allowedCategoryIds
        ? {
            id: {
              in: allowedCategoryIds,
            },
          }
        : {}),
    },
    orderBy: [
      { sport: "asc" },
      { birthYear: "desc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      sport: true,
    },
  });

  const hasFootball = categories.some(
    (category) => category.sport === SportType.FOOTBALL,
  );
  const hasFutsal = categories.some(
    (category) => category.sport === SportType.FUTSAL,
  );

  const selectedSport: SportType =
    query.sport === SportType.FUTSAL && hasFutsal
      ? SportType.FUTSAL
      : query.sport === SportType.FOOTBALL && hasFootball
        ? SportType.FOOTBALL
        : hasFootball
          ? SportType.FOOTBALL
          : SportType.FUTSAL;

  const sportCategories = categories.filter(
    (category) => category.sport === selectedSport,
  );

  const validCategoryIds = new Set(
    sportCategories.map((category) => category.id),
  );

  const categoryId = validCategoryIds.has(requestedCategoryId)
    ? requestedCategoryId
    : "";

  const categoryIds = categoryId
    ? [categoryId]
    : sportCategories.map((category) => category.id);

  const athleteScope =
    categoryIds.length > 0
      ? {
          OR: [
            {
              categoryId: {
                in: categoryIds,
              },
            },
            {
              memberships: {
                some: {
                  organizationId: user.organizationId,
                  categoryId: {
                    in: categoryIds,
                  },
                  sport: selectedSport,
                  status: "ACTIVE",
                },
              },
            },
          ],
        }
      : {
          id: "__none__",
        };

  const [athletes, sessions] = await Promise.all([
    prisma.athlete.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        AND: [
          athleteScope,
          ...(search
            ? [
                {
                  OR: [
                    {
                      name: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      nickname: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        jerseyNumber: true,
        photoUrl: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            sport: true,
          },
        },
        memberships: {
          where: {
            organizationId: user.organizationId,
            categoryId: {
              in: categoryIds,
            },
            sport: selectedSport,
            status: "ACTIVE",
          },
          select: {
            categoryId: true,
          },
        },
      },
      orderBy: [
        {
          category: {
            name: "asc",
          },
        },
        {
          name: "asc",
        },
      ],
    }),

    prisma.trainingSession.findMany({
      where: {
        organizationId: user.organizationId,
        categoryId: {
          in: categoryIds,
        },
        status: {
          in: [
            TrainingSessionStatus.COMPLETED,
            TrainingSessionStatus.ARCHIVED,
          ],
        },
        startsAt: {
          gte: period.start,
          lt: period.end,
        },
        OR: [
          {
            sport: selectedSport,
          },
          {
            sport: SportType.BOTH,
          },
        ],
      },
      select: {
        id: true,
        categoryId: true,
        startsAt: true,
        endsAt: true,
        actualStartedAt: true,
        actualEndedAt: true,
        status: true,
        attendances: {
          select: {
            athleteId: true,
            status: true,
            minutesPresent: true,
          },
        },
      },
      orderBy: {
        startsAt: "asc",
      },
    }),
  ]);

  const offeredMinutesBySession = new Map(
    sessions.map((session) => [
      session.id,
      sessionOfferedMinutes(session),
    ]),
  );

  const rows = athletes.map((athlete) => {
    const athleteCategoryIds = new Set<string>();

    if (
      athlete.categoryId &&
      categoryIds.includes(athlete.categoryId)
    ) {
      athleteCategoryIds.add(athlete.categoryId);
    }

    for (const membership of athlete.memberships) {
      if (membership.categoryId) {
        athleteCategoryIds.add(membership.categoryId);
      }
    }

    const relevantSessions = sessions.filter((session) =>
      athleteCategoryIds.has(session.categoryId),
    );

    const records: TrainingParticipationRecord[] =
      relevantSessions.map((session) => {
        const attendance = session.attendances.find(
          (item) => item.athleteId === athlete.id,
        );

        return {
          sessionId: session.id,
          sessionStatus: session.status,
          offeredMinutes:
            offeredMinutesBySession.get(session.id) ?? null,
          attendanceStatus: attendance?.status ?? null,
          athleteMinutes: attendance?.minutesPresent ?? 0,
        };
      });

    const summary =
      calculateTrainingParticipationSummary(records);

    const categoryName =
      athlete.category?.sport === selectedSport
        ? athlete.category.name
        : sportCategories.find((category) =>
            athlete.memberships.some(
              (membership) =>
                membership.categoryId === category.id,
            ),
          )?.name || "—";

    return {
      athlete,
      summary,
      categoryName,
    };
  });

  const sessionMinutes = Array.from(
    offeredMinutesBySession.values(),
  ).reduce<number>(
    (sum, minutes) => sum + (minutes ?? 0),
    0,
  );

  const athletesWithSessions = rows.filter(
    (row) => row.summary.completedSessions > 0,
  );

  const averageFrequency = athletesWithSessions.length
    ? Math.round(
        (athletesWithSessions.reduce(
          (sum, row) =>
            sum + row.summary.frequencyPercentage,
          0,
        ) /
          athletesWithSessions.length) *
          10,
      ) / 10
    : 0;

  const averageTrainingTime = athletesWithSessions.length
    ? Math.round(
        (athletesWithSessions.reduce(
          (sum, row) =>
            sum + row.summary.trainingTimePercentage,
          0,
        ) /
          athletesWithSessions.length) *
          10,
      ) / 10
    : 0;

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / PAGE_SIZE),
  );

  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(
    pageStart,
    pageStart + PAGE_SIZE,
  );

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1,
  );

  const hasFilters = Boolean(search || categoryId);

  const paginationBase = {
    month: period.value,
    category: categoryId,
    sport: selectedSport,
    q: search,
  };

  return (
    <main className="frequency-v5">
      <section className="frequency-v5-hero">
        <div>
          <span className="frequency-v5-eyebrow">
            11UP PERFORMANCE · TREINOS
          </span>

          <h1>Frequência e rendimento</h1>

          <p>
            Presença, minutagem e aproveitamento de treino separados por
            modalidade.
          </p>
        </div>

        <div className="frequency-v5-hero-period">
          <small>PERÍODO</small>
          <strong>{sessions.length}</strong>
          <span>
            treino(s) concluído(s) · {period.label}
          </span>
        </div>
      </section>

      <nav
        className="frequency-v5-module-tabs"
        aria-label="Navegação do Performance"
      >
        <Link
          href={`/performance?sport=${selectedSport}`}
        >
          Visão geral
        </Link>

        <Link
          className="is-active"
          href={frequencyUrl({
            month: period.value,
            sport: selectedSport,
          })}
        >
          Frequência e rendimento
        </Link>

        <Link
          href={`/performance/relatorios?month=${period.value}&sport=${selectedSport}`}
        >
          Relatórios
        </Link>

        <Link href={`/performance/gps?sport=${selectedSport}`}>
          GPS
        </Link>
      </nav>

      <section
        className="frequency-v5-sport-switch"
        aria-label="Modalidade da frequência"
      >
        <div>
          <span className="frequency-v5-eyebrow">
            MODALIDADE
          </span>
          <strong>Frequência e minutagem independentes</strong>
        </div>

        <div>
          <Link
            className={
              selectedSport === SportType.FOOTBALL
                ? "is-active"
                : ""
            }
            href={frequencyUrl({
              month: period.value,
              sport: SportType.FOOTBALL,
            })}
          >
            <Icon name="field" size={17} />
            Campo
          </Link>

          <Link
            className={
              selectedSport === SportType.FUTSAL
                ? "is-active"
                : ""
            }
            href={frequencyUrl({
              month: period.value,
              sport: SportType.FUTSAL,
            })}
          >
            <Icon name="futsal" size={17} />
            Futsal
          </Link>
        </div>
      </section>

      <section className="frequency-v5-kpis">
        <article>
          <span className="frequency-v5-kpi-icon">
            <Icon name="training" />
          </span>
          <div>
            <small>TREINOS REALIZADOS</small>
            <strong>{sessions.length}</strong>
            <span>cancelados não entram</span>
          </div>
        </article>

        <article>
          <span className="frequency-v5-kpi-icon">
            <Icon name="minutes" />
          </span>
          <div>
            <small>MINUTOS OFERECIDOS</small>
            <strong>{sessionMinutes}</strong>
            <span>tempo real ou programado</span>
          </div>
        </article>

        <article>
          <span className="frequency-v5-kpi-icon">
            <Icon name="frequency" />
          </span>
          <div>
            <small>FREQUÊNCIA MÉDIA</small>
            <strong>{percentageLabel(averageFrequency)}</strong>
            <span>participações ÷ treinos</span>
          </div>
        </article>

        <article>
          <span className="frequency-v5-kpi-icon">
            <Icon name="performance" />
          </span>
          <div>
            <small>APROVEITAMENTO MÉDIO</small>
            <strong>{percentageLabel(averageTrainingTime)}</strong>
            <span>minutos treinados ÷ oferecidos</span>
          </div>
        </article>
      </section>

      <section className="frequency-v5-search-card">
        <header>
          <div>
            <span className="frequency-v5-eyebrow">
              FILTROS DO PERÍODO
            </span>
            <h2>Localizar rendimento</h2>
            <p>
              Analise {sportLabel(selectedSport)} por mês, categoria ou atleta.
            </p>
          </div>

          <span>{rows.length} resultado(s)</span>
        </header>

        <form method="get" className="frequency-v5-filter-form">
          <input
            type="hidden"
            name="sport"
            value={selectedSport}
          />

          <label>
            <span>Mês</span>
            <input
              type="month"
              name="month"
              defaultValue={period.value}
            />
          </label>

          <label>
            <span>Categoria</span>
            <select
              name="category"
              defaultValue={categoryId}
            >
              <option value="">
                Todas de {sportLabel(selectedSport)}
              </option>

              {sportCategories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="frequency-v5-search-field">
            <span>Buscar atleta</span>
            <div>
              <Icon name="search" size={18} />
              <input
                name="q"
                defaultValue={search}
                placeholder="Nome ou apelido"
              />
            </div>
          </label>

          <button type="submit">
            Aplicar filtros
          </button>

          {hasFilters ? (
            <Link
              href={frequencyUrl({
                month: period.value,
                sport: selectedSport,
              })}
            >
              Limpar
            </Link>
          ) : null}
        </form>
      </section>

      <section className="frequency-v5-roster">
        <header className="frequency-v5-roster-head">
          <div>
            <span className="frequency-v5-eyebrow">
              {period.label.toUpperCase()}
            </span>
            <h2>Rendimento de treino por atleta</h2>
          </div>

          <span>
            Exibindo {rows.length ? pageStart + 1 : 0} –{" "}
            {Math.min(pageStart + PAGE_SIZE, rows.length)} de{" "}
            {rows.length}
          </span>
        </header>

        {pageRows.length ? (
          <>
            <div className="frequency-v5-table-head">
              <span>Atleta</span>
              <span>Categoria</span>
              <span>Presença</span>
              <span>Frequência</span>
              <span>Minutos</span>
              <span>Faltas</span>
              <span>Aproveitamento</span>
              <span aria-hidden="true" />
            </div>

            <div className="frequency-v5-list">
              {pageRows.map(
                ({ athlete, summary, categoryName }) => (
                  <article
                    className="frequency-v5-row"
                    key={athlete.id}
                  >
                    <Link
                      className="frequency-v5-person"
                      href={`/atletas/${athlete.id}/performance/treino?sport=${selectedSport}`}
                    >
                      <span className="frequency-v5-avatar">
                        {athlete.photoUrl ? (
                          <img
                            src={athlete.photoUrl}
                            alt={athlete.name}
                          />
                        ) : (
                          <b>
                            {(athlete.nickname || athlete.name)
                              .slice(0, 2)
                              .toUpperCase()}
                          </b>
                        )}
                      </span>

                      <div>
                        <strong>
                          {athlete.nickname || athlete.name}
                        </strong>
                        <small>
                          {athlete.jerseyNumber
                            ? `Camisa ${athlete.jerseyNumber}`
                            : sportLabel(selectedSport)}
                        </small>
                      </div>
                    </Link>

                    <span className="frequency-v5-cell">
                      <b>{categoryName}</b>
                    </span>

                    <span className="frequency-v5-cell">
                      <b>
                        {summary.attendedSessions}/
                        {summary.completedSessions}
                      </b>
                      <small>treinos</small>
                    </span>

                    <span className="frequency-v5-cell">
                      <b>
                        {percentageLabel(
                          summary.frequencyPercentage,
                        )}
                      </b>
                    </span>

                    <span className="frequency-v5-cell">
                      <b>
                        {summary.athleteMinutes}/
                        {summary.offeredMinutes}
                      </b>
                      <small>realizados / oferecidos</small>
                    </span>

                    <span className="frequency-v5-cell">
                      <b>
                        {summary.absences +
                          summary.justifiedAbsences}
                      </b>
                      <small>
                        {summary.justifiedAbsences} justificada(s)
                      </small>
                    </span>

                    <span className="frequency-v5-cell">
                      <span
                        className={`frequency-v5-result ${summary.color}`}
                      >
                        {percentageLabel(
                          summary.trainingTimePercentage,
                        )}
                      </span>
                      <small>
                        {summary.unrecordedSessions
                          ? `${summary.unrecordedSessions} sem chamada`
                          : "chamadas completas"}
                      </small>
                    </span>

                    <Link
                      className="frequency-v5-open"
                      href={`/atletas/${athlete.id}/performance/treino?sport=${selectedSport}`}
                      aria-label={`Abrir rendimento de ${athlete.name}`}
                    >
                      <Icon name="arrow" size={17} />
                    </Link>
                  </article>
                ),
              )}
            </div>

            {totalPages > 1 ? (
              <nav
                className="frequency-v5-pagination"
                aria-label="Paginação da frequência"
              >
                <Link
                  className={
                    currentPage === 1 ? "disabled" : ""
                  }
                  href={frequencyUrl({
                    ...paginationBase,
                    page: Math.max(
                      1,
                      currentPage - 1,
                    ),
                  })}
                  aria-disabled={currentPage === 1}
                >
                  <Icon name="chevron-left" size={16} />
                  Anterior
                </Link>

                <div>
                  {pageNumbers.map((page, index) => {
                    const previous = pageNumbers[index - 1];
                    const showDots =
                      previous && page - previous > 1;

                    return (
                      <span key={page}>
                        {showDots ? <i>…</i> : null}
                        <Link
                          className={
                            page === currentPage
                              ? "is-active"
                              : ""
                          }
                          href={frequencyUrl({
                            ...paginationBase,
                            page,
                          })}
                        >
                          {page}
                        </Link>
                      </span>
                    );
                  })}
                </div>

                <Link
                  className={
                    currentPage === totalPages
                      ? "disabled"
                      : ""
                  }
                  href={frequencyUrl({
                    ...paginationBase,
                    page: Math.min(
                      totalPages,
                      currentPage + 1,
                    ),
                  })}
                  aria-disabled={
                    currentPage === totalPages
                  }
                >
                  Próxima
                  <Icon name="chevron-right" size={16} />
                </Link>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="frequency-v5-empty">
            Nenhum atleta encontrado em {sportLabel(selectedSport)}.
          </div>
        )}
      </section>
    </main>
  );
}
