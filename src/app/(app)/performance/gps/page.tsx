import Link from "next/link";
import {
  ClubPermissionCode,
  GpsContext,
  GpsDataSource,
  SportType,
} from "@prisma/client";

import { requireOrganizationUser } from "@/lib/auth";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

import {
  createClubManualGpsRecord,
  importClubGpsCsv,
} from "./actions";

const PAGE_SIZE = 20;

type GpsFilters = {
  sport?: string;
  context?: string;
  category?: string;
  q?: string;
  page?: string;
  ok?: string;
  erro?: string;
  importados?: string;
  ignorados?: string;
};

type IconName =
  | "field"
  | "futsal"
  | "upload"
  | "manual"
  | "sessions"
  | "distance"
  | "speed"
  | "load"
  | "search"
  | "training"
  | "match"
  | "chevron-left"
  | "chevron-right";

function Icon({
  name,
  size = 18,
}: {
  name: IconName;
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

  if (name === "upload") {
    return (
      <svg {...common}>
        <path d="M12 16V4M8 8l4-4 4 4" />
        <path d="M5 14v5h14v-5" />
      </svg>
    );
  }

  if (name === "manual") {
    return (
      <svg {...common}>
        <path d="M4 20h4l11-11-4-4L4 16v4Z" />
        <path d="m13.5 6.5 4 4" />
      </svg>
    );
  }

  if (name === "sessions") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2.2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }

  if (name === "distance") {
    return (
      <svg {...common}>
        <path d="M4 17c2.5-4.5 5.2-8 8-11 2.4 2.7 5 6.4 8 11" />
        <path d="M7 19h10" />
      </svg>
    );
  }

  if (name === "speed") {
    return (
      <svg {...common}>
        <path d="M5 16a7 7 0 1 1 14 0" />
        <path d="M12 13l4-4M7 16h10" />
      </svg>
    );
  }

  if (name === "load") {
    return (
      <svg {...common}>
        <path d="M7 21h10" />
        <path d="M8.5 21V9.5a3.5 3.5 0 1 1 7 0V21" />
        <path d="M6 9.5h12" />
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
        <rect x="4" y="6" width="16" height="10" rx="2" />
        <circle cx="12" cy="11" r="2" />
        <path d="M7 18h10M9 16v2M15 16v2" />
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

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMetric(
  value: unknown,
  {
    suffix = "",
    digits = 0,
  }: {
    suffix?: string;
    digits?: number;
  } = {},
) {
  const numeric = numberValue(value);
  if (numeric === null) return "—";

  return `${numeric.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR");
}

function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function sportLabel(sport: SportType) {
  return sport === SportType.FUTSAL ? "Futsal" : "Campo";
}

function contextLabel(context: GpsContext) {
  return context === GpsContext.MATCH ? "Jogo" : "Treino";
}

function sourceLabel(source: GpsDataSource) {
  if (source === GpsDataSource.CSV) return "CSV";
  if (source === GpsDataSource.XLSX) return "XLSX";
  if (source === GpsDataSource.INTEGRATION) return "Integração";
  return "Manual";
}

function gpsUrl({
  sport,
  context,
  category,
  q,
  page,
}: {
  sport: SportType;
  context?: string;
  category?: string;
  q?: string;
  page?: number;
}) {
  const params = new URLSearchParams();

  params.set("sport", sport);

  if (context && context !== "ALL") params.set("context", context);
  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));

  return `/performance/gps?${params.toString()}`;
}

export default async function PerformanceGpsPage({
  searchParams,
}: {
  searchParams: Promise<GpsFilters>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;

  const requestedContext =
    query.context === GpsContext.TRAINING ||
    query.context === GpsContext.MATCH
      ? query.context
      : "ALL";

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
        <h1>GPS e carga física</h1>
        <p>
          Importe ou registre manualmente métricas físicas de treinos e jogos.
        </p>

        <Link className="btn" href="/planos">
          Conhecer o Club Elite
        </Link>
      </section>
    );
  }

  const hasGlobalGpsAccess =
    hasClubPermission(user, "GPS_VIEW") ||
    hasClubPermission(user, "GPS_IMPORT") ||
    hasClubPermission(user, "GPS_MANAGE") ||
    hasClubPermission(user, "PERFORMANCE_VIEW") ||
    hasClubPermission(user, "PERFORMANCE_MANAGE");

  let allowedCategoryIds: string[] | null = null;

  if (!hasGlobalGpsAccess) {
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
                ClubPermissionCode.GPS_VIEW,
                ClubPermissionCode.GPS_IMPORT,
                ClubPermissionCode.GPS_MANAGE,
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
    !hasGlobalGpsAccess &&
    (!allowedCategoryIds || allowedCategoryIds.length === 0)
  ) {
    return (
      <main className="performance-hub">
        <div className="notice" role="status">
          <strong>Acesso restrito.</strong> Você ainda não possui uma
          categoria autorizada para visualizar os dados de GPS.
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

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      AND: [
        {
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
        },
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
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const trainingSessions = await prisma.trainingSession.findMany({
    where: {
      organizationId: user.organizationId,
      categoryId: {
        in: categoryIds,
      },
      OR: [
        { sport: selectedSport },
        { sport: SportType.BOTH },
      ],
    },
    orderBy: {
      startsAt: "desc",
    },
    take: 80,
    select: {
      id: true,
      startsAt: true,
      trainingType: true,
      location: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const matches = await prisma.match.findMany({
    where: {
      organizationId: user.organizationId,
      categoryId: {
        in: categoryIds,
      },
      sport: selectedSport,
    },
    orderBy: {
      startsAt: "desc",
    },
    take: 80,
    select: {
      id: true,
      startsAt: true,
      opponent: true,
      competition: true,
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const historyWhere = {
    organizationId: user.organizationId,
    athleteId: {
      in: athletes.map((athlete) => athlete.id),
    },
    OR: [
      {
        sport: selectedSport,
      },
      {
        sport: SportType.BOTH,
        athlete: {
          category: {
            sport: selectedSport,
          },
        },
      },
    ],
    ...(requestedContext !== "ALL"
      ? {
          context: requestedContext,
        }
      : {}),
  };

  const [history, totalHistory, allRecords] = await Promise.all([
    prisma.athleteGpsRecord.findMany({
      where: historyWhere,
      orderBy: {
        activityAt: "desc",
      },
      skip: (requestedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        athlete: {
          select: {
            id: true,
            name: true,
            nickname: true,
            category: {
              select: {
                name: true,
                sport: true,
              },
            },
          },
        },
        trainingSession: {
          select: {
            trainingType: true,
          },
        },
        match: {
          select: {
            opponent: true,
          },
        },
      },
    }),
    prisma.athleteGpsRecord.count({
      where: historyWhere,
    }),
    prisma.athleteGpsRecord.findMany({
      where: historyWhere,
      select: {
        distanceMeters: true,
        maxSpeedKmh: true,
        playerLoad: true,
      },
    }),
  ]);

  const totalDistance = allRecords.reduce(
    (sum, record) =>
      sum + (numberValue(record.distanceMeters) || 0),
    0,
  );

  const maxSpeed = allRecords.reduce(
    (max, record) =>
      Math.max(
        max,
        numberValue(record.maxSpeedKmh) || 0,
      ),
    0,
  );

  const loads = allRecords
    .map((record) => numberValue(record.playerLoad))
    .filter((value): value is number => value !== null);

  const averageLoad = loads.length
    ? loads.reduce((sum, value) => sum + value, 0) /
      loads.length
    : null;

  const totalPages = Math.max(
    1,
    Math.ceil(totalHistory / PAGE_SIZE),
  );

  const currentPage = Math.min(requestedPage, totalPages);

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1,
  );

  const currentDate = new Date().toISOString().slice(0, 10);

  return (
    <main className="gps-club-v8">
      <section className="gps-club-v8-hero">
        <div>
          <span className="gps-club-v8-eyebrow">
            11UP PERFORMANCE · GPS
          </span>

          <h1>GPS e carga física</h1>

          <p>
            Importe arquivos do equipamento ou registre métricas
            manualmente. Treino e jogo permanecem separados e
            vinculados ao atleta correto.
          </p>
        </div>

        <div className="gps-club-v8-hero-aside">
          <small>REGISTROS</small>
          <strong>{totalHistory}</strong>
          <span>
            em {sportLabel(selectedSport)}
          </span>
        </div>
      </section>

      <nav
        className="gps-club-v8-tabs"
        aria-label="Navegação do Performance"
      >
        <Link href={`/performance?sport=${selectedSport}`}>
          Visão geral
        </Link>

        <Link
          href={`/performance/frequencia?sport=${selectedSport}`}
        >
          Frequência e rendimento
        </Link>

        <Link
          href={`/performance/relatorios?sport=${selectedSport}`}
        >
          Relatórios
        </Link>

        <Link
          className="is-active"
          href={`/performance/gps?sport=${selectedSport}`}
        >
          GPS
        </Link>
      </nav>

      <section className="gps-club-v8-sport-switch">
        <div>
          <span className="gps-club-v8-eyebrow">
            MODALIDADE
          </span>
          <strong>Dados físicos separados</strong>
        </div>

        <div>
          <Link
            className={
              selectedSport === SportType.FOOTBALL
                ? "is-active"
                : ""
            }
            href={gpsUrl({
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
            href={gpsUrl({
              sport: SportType.FUTSAL,
            })}
          >
            <Icon name="futsal" size={17} />
            Futsal
          </Link>
        </div>
      </section>

      <section className="gps-club-v8-kpis">
        <article>
          <span className="gps-club-v8-kpi-icon">
            <Icon name="sessions" />
          </span>
          <div>
            <small>REGISTROS</small>
            <strong>{allRecords.length}</strong>
            <span>sessões monitoradas</span>
          </div>
        </article>

        <article>
          <span className="gps-club-v8-kpi-icon">
            <Icon name="distance" />
          </span>
          <div>
            <small>DISTÂNCIA TOTAL</small>
            <strong>
              {formatMetric(totalDistance, {
                suffix: " m",
              })}
            </strong>
            <span>soma dos registros</span>
          </div>
        </article>

        <article>
          <span className="gps-club-v8-kpi-icon">
            <Icon name="speed" />
          </span>
          <div>
            <small>VEL. MÁXIMA</small>
            <strong>
              {formatMetric(maxSpeed || null, {
                suffix: " km/h",
                digits: 1,
              })}
            </strong>
            <span>maior valor registrado</span>
          </div>
        </article>

        <article>
          <span className="gps-club-v8-kpi-icon">
            <Icon name="load" />
          </span>
          <div>
            <small>PLAYER LOAD</small>
            <strong>
              {averageLoad !== null
                ? averageLoad.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })
                : "—"}
            </strong>
            <span>média dos registros</span>
          </div>
        </article>
      </section>

      {query.ok ? (
        <div className="gps-club-v8-notice success">
          {query.ok === "importado"
            ? `Importação concluída: ${query.importados || "0"} registro(s) importado(s) e ${query.ignorados || "0"} linha(s) ignorada(s).`
            : "Registro de GPS salvo com sucesso."}
        </div>
      ) : null}

      {query.erro ? (
        <div className="gps-club-v8-notice">
          Não foi possível concluir a operação. Verifique
          modalidade, categoria, atleta, arquivo e os valores
          informados.
        </div>
      ) : null}

      <section className="gps-club-v8-entry-grid">
        <article className="gps-club-v8-entry-card import">
          <header>
            <span className="gps-club-v8-entry-icon">
              <Icon name="upload" size={22} />
            </span>

            <div>
              <span className="gps-club-v8-eyebrow">
                IMPORTAÇÃO
              </span>
              <h2>Importar arquivo GPS</h2>
              <p>
                Envie um CSV exportado pelo sistema GPS para
                registrar vários atletas de uma mesma sessão.
              </p>
            </div>
          </header>

          <form
            action={importClubGpsCsv}
          >
            <input
              type="hidden"
              name="sport"
              value={selectedSport}
            />

            <label>
              <span>Contexto</span>
              <select
                name="context"
                defaultValue={GpsContext.TRAINING}
                required
              >
                <option value={GpsContext.TRAINING}>
                  Treino
                </option>
                <option value={GpsContext.MATCH}>
                  Jogo
                </option>
              </select>
            </label>

            <label>
              <span>Categoria</span>
              <select name="categoryId" required>
                <option value="">
                  Selecionar categoria
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

            <label>
              <span>Data da atividade</span>
              <input
                name="activityAt"
                type="date"
                defaultValue={currentDate}
                required
              />
            </label>

            <label>
              <span>Treino relacionado · opcional</span>
              <select name="trainingSessionId">
                <option value="">
                  Não vincular
                </option>
                {trainingSessions.map((session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {formatDateTime(session.startsAt)} ·{" "}
                    {session.category.name}
                    {session.trainingType
                      ? ` · ${session.trainingType}`
                      : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Jogo relacionado · opcional</span>
              <select name="matchId">
                <option value="">
                  Não vincular
                </option>
                {matches.map((match) => (
                  <option
                    key={match.id}
                    value={match.id}
                  >
                    {formatDateTime(match.startsAt)} ·{" "}
                    {match.category.name} x {match.opponent}
                  </option>
                ))}
              </select>
            </label>

            <label className="gps-club-v8-file">
              <span>Arquivo CSV</span>
              <input
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
              />
              <small>
                O arquivo deve conter uma coluna de atleta/nome.
                Métricas reconhecidas incluem minutos, distância,
                velocidade, sprints, alta intensidade, acelerações,
                desacelerações e Player Load.
              </small>
            </label>

            <button type="submit">
              <Icon name="upload" size={17} />
              Importar CSV
            </button>
          </form>

          <footer>
            <strong>Próxima etapa:</strong> XLSX + mapeamento
            visual de colunas para fornecedores diferentes.
          </footer>
        </article>

        <article className="gps-club-v8-entry-card manual">
          <header>
            <span className="gps-club-v8-entry-icon">
              <Icon name="manual" size={22} />
            </span>

            <div>
              <span className="gps-club-v8-eyebrow">
                LANÇAMENTO MANUAL
              </span>
              <h2>Inserir dados manualmente</h2>
              <p>
                Registre as métricas de um atleta e vincule o
                registro ao treino ou jogo quando desejar.
              </p>
            </div>
          </header>

          <form action={createClubManualGpsRecord}>
            <input
              type="hidden"
              name="sport"
              value={selectedSport}
            />

            <label>
              <span>Contexto</span>
              <select
                name="context"
                defaultValue={GpsContext.TRAINING}
                required
              >
                <option value={GpsContext.TRAINING}>
                  Treino
                </option>
                <option value={GpsContext.MATCH}>
                  Jogo
                </option>
              </select>
            </label>

            <label>
              <span>Atleta</span>
              <select name="athleteId" required>
                <option value="">
                  Selecionar atleta
                </option>
                {athletes.map((athlete) => {
                  const membershipCategory =
                    athlete.memberships[0]?.category
                      ?.name;
                  const currentCategory =
                    athlete.category?.sport ===
                    selectedSport
                      ? athlete.category.name
                      : membershipCategory;

                  return (
                    <option
                      key={athlete.id}
                      value={athlete.id}
                    >
                      {athlete.nickname ||
                        athlete.name}{" "}
                      · {currentCategory || "Sem categoria"}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              <span>Data</span>
              <input
                name="activityAt"
                type="date"
                defaultValue={currentDate}
                required
              />
            </label>

            <label>
              <span>Treino relacionado · opcional</span>
              <select name="trainingSessionId">
                <option value="">
                  Não vincular
                </option>
                {trainingSessions.map((session) => (
                  <option
                    key={session.id}
                    value={session.id}
                  >
                    {formatDateTime(session.startsAt)} ·{" "}
                    {session.category.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Jogo relacionado · opcional</span>
              <select name="matchId">
                <option value="">
                  Não vincular
                </option>
                {matches.map((match) => (
                  <option
                    key={match.id}
                    value={match.id}
                  >
                    {formatDateTime(match.startsAt)} ·{" "}
                    {match.category.name} x {match.opponent}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Duração · min</span>
              <input
                name="durationMinutes"
                type="number"
                min="0"
                placeholder="75"
              />
            </label>

            <label>
              <span>Distância · m</span>
              <input
                name="distanceMeters"
                type="number"
                min="0"
                step="0.01"
                placeholder="4250"
              />
            </label>

            <label>
              <span>Vel. máxima · km/h</span>
              <input
                name="maxSpeedKmh"
                type="number"
                min="0"
                step="0.01"
                placeholder="24.8"
              />
            </label>

            <label>
              <span>Vel. média · km/h</span>
              <input
                name="averageSpeedKmh"
                type="number"
                min="0"
                step="0.01"
                placeholder="8.5"
              />
            </label>

            <label>
              <span>Sprints</span>
              <input
                name="sprintCount"
                type="number"
                min="0"
                placeholder="12"
              />
            </label>

            <label>
              <span>Alta intensidade · m</span>
              <input
                name="highIntensityDistanceMeters"
                type="number"
                min="0"
                step="0.01"
                placeholder="580"
              />
            </label>

            <label>
              <span>Acelerações</span>
              <input
                name="accelerations"
                type="number"
                min="0"
                placeholder="22"
              />
            </label>

            <label>
              <span>Desacelerações</span>
              <input
                name="decelerations"
                type="number"
                min="0"
                placeholder="18"
              />
            </label>

            <label>
              <span>Player Load</span>
              <input
                name="playerLoad"
                type="number"
                min="0"
                step="0.01"
                placeholder="385"
              />
            </label>

            <label className="gps-club-v8-notes">
              <span>Observações</span>
              <textarea
                name="notes"
                rows={3}
                placeholder="Informações adicionais do equipamento ou da sessão."
              />
            </label>

            <button type="submit">
              Salvar GPS
            </button>
          </form>
        </article>
      </section>

      <section className="gps-club-v8-history">
        <header>
          <div>
            <span className="gps-club-v8-eyebrow">
              HISTÓRICO
            </span>
            <h2>Registros GPS</h2>
            <p>
              Consulte dados importados e lançamentos manuais
              da modalidade selecionada.
            </p>
          </div>

          <span>{totalHistory} registro(s)</span>
        </header>

        <form method="get" className="gps-club-v8-filters">
          <input
            type="hidden"
            name="sport"
            value={selectedSport}
          />

          <label>
            <span>Contexto</span>
            <select
              name="context"
              defaultValue={requestedContext}
            >
              <option value="ALL">Todos</option>
              <option value={GpsContext.TRAINING}>
                Treino
              </option>
              <option value={GpsContext.MATCH}>
                Jogo
              </option>
            </select>
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

          <label className="gps-club-v8-search">
            <span>Atleta</span>
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
        </form>

        {history.length ? (
          <>
            <div className="gps-club-v8-table-head">
              <span>Data</span>
              <span>Atleta</span>
              <span>Contexto</span>
              <span>Distância</span>
              <span>Vel. máx.</span>
              <span>Sprints</span>
              <span>Player Load</span>
              <span>Fonte</span>
            </div>

            <div className="gps-club-v8-list">
              {history.map((record) => (
                <article
                  className="gps-club-v8-row"
                  key={record.id}
                >
                  <span className="gps-club-v8-cell">
                    <b>{formatDate(record.activityAt)}</b>
                  </span>

                  <Link
                    className="gps-club-v8-athlete"
                    href={`/atletas/${record.athlete.id}/performance/gps?sport=${selectedSport}`}
                  >
                    <strong>
                      {record.athlete.nickname ||
                        record.athlete.name}
                    </strong>
                    <small>
                      {record.athlete.category?.name ||
                        sportLabel(selectedSport)}
                    </small>
                  </Link>

                  <span
                    className={`gps-club-v8-context ${record.context.toLowerCase()}`}
                  >
                    <Icon
                      name={
                        record.context ===
                        GpsContext.MATCH
                          ? "match"
                          : "training"
                      }
                      size={14}
                    />
                    {contextLabel(record.context)}
                  </span>

                  <span className="gps-club-v8-cell">
                    <b>
                      {formatMetric(
                        record.distanceMeters,
                        {
                          suffix: " m",
                        },
                      )}
                    </b>
                  </span>

                  <span className="gps-club-v8-cell">
                    <b>
                      {formatMetric(
                        record.maxSpeedKmh,
                        {
                          suffix: " km/h",
                          digits: 1,
                        },
                      )}
                    </b>
                  </span>

                  <span className="gps-club-v8-cell">
                    <b>
                      {record.sprintCount ?? "—"}
                    </b>
                  </span>

                  <span className="gps-club-v8-cell">
                    <b>
                      {formatMetric(
                        record.playerLoad,
                        {
                          digits: 1,
                        },
                      )}
                    </b>
                  </span>

                  <span className="gps-club-v8-source">
                    {sourceLabel(record.source)}
                  </span>
                </article>
              ))}
            </div>

            {totalPages > 1 ? (
              <nav
                className="gps-club-v8-pagination"
                aria-label="Paginação do histórico GPS"
              >
                <Link
                  className={
                    currentPage === 1
                      ? "disabled"
                      : ""
                  }
                  href={gpsUrl({
                    sport: selectedSport,
                    context: requestedContext,
                    category: categoryId,
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
                  {pageNumbers.map((page, index) => {
                    const previous =
                      pageNumbers[index - 1];

                    return (
                      <span key={page}>
                        {previous &&
                        page - previous > 1 ? (
                          <i>…</i>
                        ) : null}

                        <Link
                          className={
                            page === currentPage
                              ? "is-active"
                              : ""
                          }
                          href={gpsUrl({
                            sport: selectedSport,
                            context:
                              requestedContext,
                            category: categoryId,
                            q: search,
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
                  href={gpsUrl({
                    sport: selectedSport,
                    context: requestedContext,
                    category: categoryId,
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
          <div className="gps-club-v8-empty">
            Nenhum registro GPS encontrado em{" "}
            {sportLabel(selectedSport)}.
          </div>
        )}
      </section>
    </main>
  );
}
