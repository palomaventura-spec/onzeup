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

const AREAS = [
  ["PHYSICAL", "Física"],
  ["TECHNICAL", "Técnica"],
  ["TACTICAL", "Tática"],
  ["COGNITIVE", "Cognitiva"],
  ["EMOTIONAL", "Emocional"],
] as const;

const PAGE_SIZE = 20;

type PerformanceFilters = {
  q?: string;
  category?: string;
  position?: string;
  sport?: string;
  page?: string;
};

type PerformanceIcon =
  | "users"
  | "score"
  | "frequency"
  | "minutes"
  | "search"
  | "arrow"
  | "chevron-left"
  | "chevron-right"
  | "field"
  | "futsal";

function Icon({
  name,
  size = 20,
}: {
  name: PerformanceIcon;
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

  if (name === "users") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6" />
        <path d="M16 7a2.5 2.5 0 0 1 0 5" />
        <path d="M17 15c2 .5 3.2 2.1 3.7 5" />
      </svg>
    );
  }

  if (name === "score") {
    return (
      <svg {...common}>
        <path d="M4 18V9M10 18V5M16 18v-7M22 18H2" />
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

  if (name === "minutes") {
    return (
      <svg {...common}>
        <circle cx="12" cy="13" r="7" />
        <path d="M12 13V9M9 3h6M12 6V3" />
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

function dateLabel(date?: Date | null) {
  return date ? date.toLocaleDateString("pt-BR") : "Sem avaliação";
}

function currentMonthRange() {
  const now = new Date();

  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    label: new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(now),
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

function percentageLabel(value: number | null) {
  if (value === null) return "—";

  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function sportLabel(sport: SportType) {
  return sport === SportType.FUTSAL ? "Futsal" : "Campo";
}

function performanceUrl({
  q,
  category,
  position,
  sport,
  page,
}: {
  q?: string;
  category?: string;
  position?: string;
  sport: SportType;
  page?: number;
}) {
  const query = new URLSearchParams();

  query.set("sport", sport);

  if (q) query.set("q", q);
  if (category) query.set("category", category);
  if (position && position !== "ALL") query.set("position", position);
  if (page && page > 1) query.set("page", String(page));

  return `/performance?${query.toString()}`;
}

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<PerformanceFilters>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;
  const period = currentMonthRange();

  const search = String(query.q || "").trim();
  const requestedCategoryId = String(query.category || "").trim();
  const requestedPosition = String(query.position || "ALL").trim();
  const requestedPage = Math.max(
    1,
    Number.parseInt(query.page || "1", 10) || 1,
  );

  const [subscription, organization] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
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
        <h1>Inteligência para desenvolver o elenco</h1>
        <p>
          Avaliações profissionais, evolução, frequência, rendimento, metas,
          medições e relatórios em um único ambiente.
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
          { userId: user.id },
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
            <span className="page-eyebrow">11UP PERFORMANCE</span>
            <h1>Performance do elenco</h1>
            <p className="muted">
              O Gestor define o acesso de cada profissional por categoria.
            </p>
          </div>
        </div>

        <div className="notice" role="status">
          <strong>Acesso restrito.</strong> Você ainda não possui uma categoria
          autorizada para visualizar o Performance.
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
                    {
                      position: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                  ],
                },
              ]
            : []),
          ...(requestedPosition !== "ALL"
            ? [
                {
                  position: requestedPosition,
                },
              ]
            : []),
        ],
      },
      include: {
        category: true,
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
            sport: true,
          },
        },
        evaluations: {
          where: {
            status: "FINALIZED",
            sport: selectedSport,
          },
          orderBy: {
            evaluatedAt: "desc",
          },
          take: 2,
          include: {
            scores: true,
          },
        },
        performanceGoals: {
          where: {
            sport: selectedSport,
            status: {
              in: ["NOT_STARTED", "IN_PROGRESS", "REVIEW"],
            },
          },
          select: {
            id: true,
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
        sport: selectedSport,
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
    const current = athlete.evaluations[0];
    const previous = athlete.evaluations[1];

    const average = current?.scores.length
      ? current.scores.reduce(
          (sum, score) => sum + score.score,
          0,
        ) / current.scores.length
      : null;

    const previousAverage = previous?.scores.length
      ? previous.scores.reduce(
          (sum, score) => sum + score.score,
          0,
        ) / previous.scores.length
      : null;

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

    const trainingSummary =
      calculateTrainingParticipationSummary(records);

    return {
      athlete,
      current,
      average,
      trainingSummary,
      delta:
        average !== null && previousAverage !== null
          ? average - previousAverage
          : null,
    };
  });

  const positions = [
    ...new Set(
      rows
        .map((row) => row.athlete.position)
        .filter(Boolean),
    ),
  ].sort((a, b) =>
    a!.localeCompare(b!, "pt-BR"),
  ) as string[];

  const evaluated = rows.filter((row) => row.average !== null);

  const squadAverage = evaluated.length
    ? evaluated.reduce(
        (sum, row) => sum + (row.average ?? 0),
        0,
      ) / evaluated.length
    : null;

  const trainingRows = rows.filter(
    (row) => row.trainingSummary.completedSessions > 0,
  );

  const frequencyAverage = trainingRows.length
    ? Math.round(
        (trainingRows.reduce(
          (sum, row) =>
            sum + row.trainingSummary.frequencyPercentage,
          0,
        ) /
          trainingRows.length) *
          10,
      ) / 10
    : null;

  const trainingTimeAverage = trainingRows.length
    ? Math.round(
        (trainingRows.reduce(
          (sum, row) =>
            sum + row.trainingSummary.trainingTimePercentage,
          0,
        ) /
          trainingRows.length) *
          10,
      ) / 10
    : null;

  const activeGoals = athletes.reduce(
    (sum, athlete) => sum + athlete.performanceGoals.length,
    0,
  );

  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - 90);

  const pendingEvaluation = rows.filter(
    (row) =>
      !row.current ||
      row.current.evaluatedAt < staleDate,
  ).length;

  const lowTrainingTime = trainingRows.filter(
    (row) => row.trainingSummary.color !== "green",
  ).length;

  const areaValues = AREAS.map(([key, label]) => {
    const values = rows.flatMap((row) => {
      const scores =
        row.current?.scores.filter(
          (score) => score.area === key,
        ) || [];

      return scores.length
        ? [
            scores.reduce(
              (sum, score) => sum + score.score,
              0,
            ) / scores.length,
          ]
        : [];
    });

    return {
      key,
      label,
      value: values.length
        ? values.reduce(
            (sum, value) => sum + value,
            0,
          ) / values.length
        : null,
    };
  });

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

  const hasFilters = Boolean(
    search ||
      categoryId ||
      requestedPosition !== "ALL",
  );

  const paginationBase = {
    q: search,
    category: categoryId,
    position: requestedPosition,
    sport: selectedSport,
  };

  return (
    <main className="performance-v5">
      <section className="performance-v5-hero">
        <div>
          <span className="performance-v5-eyebrow">
            11UP PERFORMANCE · CLUB ELITE
          </span>

          <h1>Performance do elenco</h1>

          <p>
            Desenvolvimento, frequência, rendimento e avaliações separados por
            modalidade.
          </p>
        </div>

        <div className="performance-v5-hero-score">
          <small>ÍNDICE DO ELENCO</small>
          <strong>
            {squadAverage === null
              ? "—"
              : `${Math.round((squadAverage / 4) * 100)}%`}
          </strong>
          <span>
            {evaluated.length} avaliado(s) · {sportLabel(selectedSport)}
          </span>
        </div>
      </section>

      <nav
        className="performance-v5-module-tabs"
        aria-label="Navegação do Performance"
      >
        <Link className="is-active" href={performanceUrl({ sport: selectedSport })}>
          Visão geral
        </Link>
        <Link href={`/performance/frequencia?sport=${selectedSport}`}>
          Frequência e rendimento
        </Link>
        <Link href={`/performance/relatorios?sport=${selectedSport}`}>
          Relatórios
        </Link>
        <Link href={`/performance/gps?sport=${selectedSport}`}>
          GPS
        </Link>
      </nav>

      <section
        className="performance-v5-sport-switch"
        aria-label="Modalidade do Performance"
      >
        <div>
          <span className="performance-v5-eyebrow">MODALIDADE</span>
          <strong>Dados esportivos separados</strong>
        </div>

        <div>
          <Link
            className={selectedSport === SportType.FOOTBALL ? "is-active" : ""}
            href={performanceUrl({ sport: SportType.FOOTBALL })}
          >
            <Icon name="field" size={17} />
            Campo
          </Link>

          <Link
            className={selectedSport === SportType.FUTSAL ? "is-active" : ""}
            href={performanceUrl({ sport: SportType.FUTSAL })}
          >
            <Icon name="futsal" size={17} />
            Futsal
          </Link>
        </div>
      </section>

      <section className="performance-v5-kpis">
        <article>
          <span className="performance-v5-kpi-icon">
            <Icon name="users" />
          </span>
          <div>
            <small>ATLETAS ATIVOS</small>
            <strong>{athletes.length}</strong>
            <span>{sportCategories.length} categoria(s)</span>
          </div>
        </article>

        <article>
          <span className="performance-v5-kpi-icon">
            <Icon name="score" />
          </span>
          <div>
            <small>NOTA MÉDIA</small>
            <strong>
              {squadAverage === null
                ? "—"
                : `${squadAverage.toFixed(2)}/4`}
            </strong>
            <span>últimas avaliações</span>
          </div>
        </article>

        <article>
          <span className="performance-v5-kpi-icon">
            <Icon name="frequency" />
          </span>
          <div>
            <small>FREQUÊNCIA MÉDIA</small>
            <strong>{percentageLabel(frequencyAverage)}</strong>
            <span>{period.label}</span>
          </div>
        </article>

        <article>
          <span className="performance-v5-kpi-icon">
            <Icon name="minutes" />
          </span>
          <div>
            <small>APROVEITAMENTO MÉDIO</small>
            <strong>{percentageLabel(trainingTimeAverage)}</strong>
            <span>minutos treinados ÷ oferecidos</span>
          </div>
        </article>
      </section>

      <section className="performance-v5-overview">
        <article className="performance-v5-panel">
          <header>
            <div>
              <span className="performance-v5-eyebrow">
                MAPA COLETIVO
              </span>
              <h2>Valências do elenco</h2>
            </div>
            <span className="performance-v5-badge">
              Escala 1–4
            </span>
          </header>

          <div className="performance-v5-area-list">
            {areaValues.map((area) => (
              <div key={area.key}>
                <div>
                  <strong>{area.label}</strong>
                  <span>
                    {area.value === null
                      ? "—"
                      : area.value.toFixed(2)}
                  </span>
                </div>

                <div className="performance-v5-track">
                  <i
                    style={{
                      width: `${((area.value || 0) / 4) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="performance-v5-panel">
          <header>
            <div>
              <span className="performance-v5-eyebrow">
                PRIORIDADES
              </span>
              <h2>Atenção necessária</h2>
            </div>
          </header>

          <div className="performance-v5-priorities">
            <Link href={performanceUrl({ sport: selectedSport })}>
              <span>!</span>
              <div>
                <strong>{pendingEvaluation} avaliações pendentes</strong>
                <small>Sem avaliação ou há mais de 90 dias</small>
              </div>
              <b>→</b>
            </Link>

            <Link href={`/performance/frequencia?sport=${selectedSport}`}>
              <span>↓</span>
              <div>
                <strong>
                  {lowTrainingTime} atleta(s) fora da faixa verde
                </strong>
                <small>Aproveitamento de tempo no mês atual</small>
              </div>
              <b>→</b>
            </Link>

            <Link href={performanceUrl({ sport: selectedSport })}>
              <span>✓</span>
              <div>
                <strong>{activeGoals} metas ativas</strong>
                <small>Planos individuais em andamento</small>
              </div>
              <b>→</b>
            </Link>
          </div>
        </article>
      </section>

      <section className="performance-v5-search-card">
        <header>
          <div>
            <span className="performance-v5-eyebrow">
              CENTRAL DE PERFORMANCE
            </span>
            <h2>Localizar atleta</h2>
            <p>
              Refine a análise de {sportLabel(selectedSport)} por categoria,
              posição ou nome.
            </p>
          </div>

          <span>{rows.length} resultado(s)</span>
        </header>

        <form method="get" className="performance-v5-filter-form">
          <input type="hidden" name="sport" value={selectedSport} />

          <label className="performance-v5-search-field">
            <span>Buscar atleta</span>
            <div>
              <Icon name="search" size={18} />
              <input
                name="q"
                defaultValue={search}
                placeholder="Nome, apelido ou posição"
              />
            </div>
          </label>

          <label>
            <span>Categoria</span>
            <select name="category" defaultValue={categoryId}>
              <option value="">
                Todas de {sportLabel(selectedSport)}
              </option>
              {sportCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Posição</span>
            <select
              name="position"
              defaultValue={requestedPosition}
            >
              <option value="ALL">Todas</option>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </label>

          <button type="submit">Aplicar filtros</button>

          {hasFilters ? (
            <Link
              href={performanceUrl({
                sport: selectedSport,
              })}
            >
              Limpar
            </Link>
          ) : null}
        </form>
      </section>

      <section className="performance-v5-roster">
        <header className="performance-v5-roster-head">
          <div>
            <span className="performance-v5-eyebrow">
              PERFORMANCE INDIVIDUAL
            </span>
            <h2>Atletas encontrados</h2>
          </div>

          <span>
            Exibindo {rows.length ? pageStart + 1 : 0} –{" "}
            {Math.min(pageStart + PAGE_SIZE, rows.length)} de{" "}
            {rows.length}
          </span>
        </header>

        {pageRows.length ? (
          <>
            <div className="performance-v5-table-head">
              <span>Atleta</span>
              <span>Categoria</span>
              <span>Posição</span>
              <span>Nota</span>
              <span>Frequência</span>
              <span>Aproveitamento</span>
              <span>Última avaliação</span>
              <span>Metas</span>
              <span aria-hidden="true" />
            </div>

            <div className="performance-v5-list">
              {pageRows.map(
                ({
                  athlete,
                  current,
                  average,
                  trainingSummary,
                  delta,
                }) => (
                  <article
                    className="performance-v5-row"
                    key={athlete.id}
                  >
                    <Link
                      className="performance-v5-person"
                      href={`/atletas/${athlete.id}/performance?sport=${selectedSport}`}
                    >
                      <span className="performance-v5-avatar">
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
                          {athlete.nickname
                            ? athlete.name
                            : sportLabel(selectedSport)}
                        </small>
                      </div>
                    </Link>

                    <span className="performance-v5-cell">
                      <b>
                        {athlete.category?.sport === selectedSport
                          ? athlete.category.name
                          : sportCategories.find((category) =>
                              athlete.memberships.some(
                                (membership) =>
                                  membership.categoryId === category.id,
                              ),
                            )?.name || "—"}
                      </b>
                    </span>

                    <span className="performance-v5-cell">
                      <b>{athlete.position || "—"}</b>
                    </span>

                    <span className="performance-v5-cell">
                      <b>
                        {average === null
                          ? "—"
                          : `${average.toFixed(1)}/4`}
                      </b>
                      {delta !== null ? (
                        <small className={delta >= 0 ? "up" : "down"}>
                          {delta >= 0 ? "+" : ""}
                          {delta.toFixed(1)}
                        </small>
                      ) : null}
                    </span>

                    <span className="performance-v5-cell">
                      <b>
                        {trainingSummary.completedSessions
                          ? percentageLabel(
                              trainingSummary.frequencyPercentage,
                            )
                          : "—"}
                      </b>
                    </span>

                    <span className="performance-v5-cell">
                      <b>
                        {trainingSummary.completedSessions
                          ? percentageLabel(
                              trainingSummary.trainingTimePercentage,
                            )
                          : "—"}
                      </b>
                    </span>

                    <span className="performance-v5-cell">
                      <b>{dateLabel(current?.evaluatedAt)}</b>
                    </span>

                    <span className="performance-v5-cell">
                      <span className="performance-v5-goal-pill">
                        {athlete.performanceGoals.length}
                      </span>
                    </span>

                    <Link
                      className="performance-v5-open"
                      href={`/atletas/${athlete.id}/performance?sport=${selectedSport}`}
                      aria-label={`Abrir Performance de ${athlete.name}`}
                    >
                      <Icon name="arrow" size={17} />
                    </Link>
                  </article>
                ),
              )}
            </div>

            {totalPages > 1 ? (
              <nav
                className="performance-v5-pagination"
                aria-label="Paginação da Performance"
              >
                <Link
                  className={currentPage === 1 ? "disabled" : ""}
                  href={performanceUrl({
                    ...paginationBase,
                    page: Math.max(1, currentPage - 1),
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
                          href={performanceUrl({
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
                  href={performanceUrl({
                    ...paginationBase,
                    page: Math.min(
                      totalPages,
                      currentPage + 1,
                    ),
                  })}
                  aria-disabled={currentPage === totalPages}
                >
                  Próxima
                  <Icon name="chevron-right" size={16} />
                </Link>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="performance-v5-empty">
            Nenhum atleta encontrado em {sportLabel(selectedSport)}.
          </div>
        )}
      </section>
    </main>
  );
}
