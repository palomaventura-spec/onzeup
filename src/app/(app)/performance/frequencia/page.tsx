import Link from "next/link";
import {
  ClubPermissionCode,
  SportType,
  TrainingSessionStatus,
} from "@prisma/client";

import { requireOrganizationUser } from "@/lib/auth";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import {
  hasClubPermission,
} from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";
import {
  calculateTrainingParticipationSummary,
  type TrainingParticipationRecord,
} from "@/lib/training-performance";

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

export default async function TrainingPerformancePage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    category?: string;
    sport?: string;
    q?: string;
  }>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;

  const period = parseMonth(query.month);
  const requestedCategoryId = String(query.category || "").trim();
  const sport = String(query.sport || "").trim();
  const search = String(query.q || "").trim();

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
        <span className="page-eyebrow">ONZEUP PERFORMANCE</span>
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
      ...(allowedCategoryIds
        ? {
            id: {
              in: allowedCategoryIds,
            },
          }
        : {}),
    },
    orderBy: {
      name: "asc",
    },
    select: {
      id: true,
      name: true,
    },
  });

  const validCategoryIds = new Set(
    categories.map((category) => category.id),
  );

  const categoryId = validCategoryIds.has(requestedCategoryId)
    ? requestedCategoryId
    : "";

  const categoryIds = categoryId
    ? [categoryId]
    : categories.map((category) => category.id);

  const allowedSports: SportType[] | null =
    sport === SportType.FOOTBALL
      ? [SportType.FOOTBALL, SportType.BOTH]
      : sport === SportType.FUTSAL
        ? [SportType.FUTSAL, SportType.BOTH]
        : null;

  const [athletes, sessions] = await Promise.all([
    prisma.athlete.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        ...(search
          ? {
              OR: [
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  nickname: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
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
                status: "ACTIVE",
                ...(allowedSports
                  ? {
                      sport: {
                        in: allowedSports,
                      },
                    }
                  : {}),
              },
            },
          },
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
            name: true,
          },
        },
        memberships: {
          where: {
            organizationId: user.organizationId,
            categoryId: {
              in: categoryIds,
            },
            status: "ACTIVE",
            ...(allowedSports
              ? {
                  sport: {
                    in: allowedSports,
                  },
                }
              : {}),
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
        ...(allowedSports
          ? {
              schedule: {
                is: {
                  sport: {
                    in: allowedSports,
                  },
                },
              },
            }
          : {}),
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

    return {
      athlete,
      summary,
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
          (sum, row) => sum + row.summary.frequencyPercentage,
          0,
        ) /
          athletesWithSessions.length) *
          10,
      ) / 10
    : 0;

  const averageTrainingTime = athletesWithSessions.length
    ? Math.round(
        (athletesWithSessions.reduce(
          (sum, row) => sum + row.summary.trainingTimePercentage,
          0,
        ) /
          athletesWithSessions.length) *
          10,
      ) / 10
    : 0;

  return (
    <main className="performance-hub training-performance-page">
      <header className="performance-hero">
        <div>
          <span className="page-eyebrow">
            ONZEUP PERFORMANCE · TREINOS
          </span>
          <h1>Frequência e rendimento</h1>
          <p>
            Presença, minutos efetivamente treinados e aproveitamento do
            tempo oferecido pela equipe.
          </p>
        </div>

        <div className="performance-hero-score">
          <small>PERÍODO</small>
          <strong>{sessions.length}</strong>
          <span>treinos concluídos em {period.label}</span>
        </div>
      </header>

      <nav className="performance-module-tabs">
        <Link href="/performance">Visão geral</Link>
        <Link className="active" href="/performance/frequencia">
          Frequência e rendimento
        </Link>
        <Link href={`/performance/relatorios?month=${period.value}`}>
          Relatórios
        </Link>
        <Link href="/treinos">Treinos</Link>
        <Link href="/performance/gps">GPS</Link>
      </nav>

      <section className="performance-kpis">
        <article>
          <span>TREINOS REALIZADOS</span>
          <strong>{sessions.length}</strong>
          <small>cancelados não entram</small>
        </article>

        <article>
          <span>MINUTOS OFERECIDOS</span>
          <strong>{sessionMinutes}</strong>
          <small>tempo real ou fallback programado</small>
        </article>

        <article>
          <span>FREQUÊNCIA MÉDIA</span>
          <strong>{percentageLabel(averageFrequency)}</strong>
          <small>participações ÷ treinos concluídos</small>
        </article>

        <article>
          <span>APROVEITAMENTO MÉDIO</span>
          <strong>{percentageLabel(averageTrainingTime)}</strong>
          <small>minutos treinados ÷ minutos oferecidos</small>
        </article>
      </section>

      <section className="performance-filter-panel">
        <form method="get">
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
            <select name="category" defaultValue={categoryId}>
              <option value="">Todas autorizadas</option>

              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Modalidade</span>
            <select name="sport" defaultValue={sport}>
              <option value="">Todas</option>
              <option value="FOOTBALL">Campo</option>
              <option value="FUTSAL">Futsal</option>
            </select>
          </label>

          <label>
            <span>Atleta</span>
            <input
              name="q"
              defaultValue={search}
              placeholder="Nome ou apelido"
            />
          </label>

          <button type="submit">Aplicar filtros</button>
        </form>
      </section>

      <section className="training-performance-panel">
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              {period.label.toUpperCase()}
            </span>
            <h2>Rendimento de treino por atleta</h2>
            <p className="muted">
              Frequência e aproveitamento são indicadores separados.
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            Nenhum atleta encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="training-performance-list">
            {rows.map(({ athlete, summary }) => (
              <article
                className="training-performance-athlete"
                key={athlete.id}
              >
                <div className="training-performance-athlete-id">
                  {athlete.photoUrl ? (
                    <img src={athlete.photoUrl} alt="" />
                  ) : (
                    <span>
                      {(athlete.nickname || athlete.name)
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}

                  <div>
                    <strong>{athlete.nickname || athlete.name}</strong>
                    <small>
                      {athlete.category?.name ?? "Categoria vinculada"}
                      {athlete.jerseyNumber
                        ? ` · Camisa ${athlete.jerseyNumber}`
                        : ""}
                    </small>
                  </div>
                </div>

                <div className="training-performance-metric">
                  <span>FREQUÊNCIA</span>
                  <strong>
                    {percentageLabel(summary.frequencyPercentage)}
                  </strong>
                  <small>
                    {summary.attendedSessions}/
                    {summary.completedSessions} treinos
                  </small>
                </div>

                <div className="training-performance-metric">
                  <span>MINUTOS</span>
                  <strong>
                    {summary.athleteMinutes}/
                    {summary.offeredMinutes}
                  </strong>
                  <small>realizados / oferecidos</small>
                </div>

                <div className="training-performance-metric">
                  <span>FALTAS</span>
                  <strong>
                    {summary.absences +
                      summary.justifiedAbsences}
                  </strong>
                  <small>
                    {summary.justifiedAbsences} justificada(s)
                  </small>
                </div>

                <div className="training-performance-result">
                  <span>APROVEITAMENTO</span>
                  <strong
                    className={`attendance-percentage ${summary.color}`}
                  >
                    {percentageLabel(
                      summary.trainingTimePercentage,
                    )}
                  </strong>
                  <small>
                    {summary.unrecordedSessions
                      ? `${summary.unrecordedSessions} treino(s) sem chamada`
                      : "chamadas completas"}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
