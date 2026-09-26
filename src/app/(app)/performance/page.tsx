import Link from "next/link";

import ModuleFilterBar from "@/components/ModuleFilterBar";
import ModuleHero from "@/components/ModuleHero";
import ModuleKpiGrid from "@/components/ModuleKpiGrid";
import ModulePanel from "@/components/ModulePanel";
import ModuleTabs from "@/components/ModuleTabs";
import {
  ClubPermissionCode,
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

export default async function PerformancePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;
  const search = String(query.q || "").trim();
  const requestedCategoryId = String(query.category || "").trim();
  const period = currentMonthRange();

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
            <span className="page-eyebrow">11UP PERFORMANCE</span>
            <h1>Performance do elenco</h1>
            <p className="muted">
              O Gestor define o acesso de cada profissional por categoria.
            </p>
          </div>
        </div>

        <div className="notice" role="status">
          <strong>Acesso restrito.</strong> Você ainda não possui uma
          categoria autorizada para visualizar o Performance.
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

  const [athletes, sessions] = await Promise.all([
    prisma.athlete.findMany({
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
                    {
                      position: {
                        contains: search,
                        mode: "insensitive" as const,
                      },
                    },
                    {
                      category: {
                        name: {
                          contains: search,
                          mode: "insensitive" as const,
                        },
                      },
                    },
                  ],
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
            status: "ACTIVE",
          },
          select: {
            categoryId: true,
          },
        },
        evaluations: {
          where: {
            status: "FINALIZED",
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
            status: {
              in: ["NOT_STARTED", "IN_PROGRESS", "REVIEW"],
            },
          },
          select: {
            id: true,
          },
        },
        bodyMeasurements: {
          orderBy: {
            measuredAt: "desc",
          },
          take: 1,
          select: {
            measuredAt: true,
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
      ? current.scores.reduce((sum, score) => sum + score.score, 0) /
        current.scores.length
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
        ? values.reduce((sum, value) => sum + value, 0) /
          values.length
        : null,
    };
  });

  return (
    <main className="performance-hub">
      <ModuleHero
        eyebrow="11UP PERFORMANCE • CLUB ELITE"
        title="Performance do elenco"
        description={
          <p>
            Desenvolvimento esportivo, frequência e rendimento real do
            treinamento em uma visão integrada.
          </p>
        }
        aside={
          <>
            <small>ÍNDICE DO ELENCO</small>

            <strong>
              {squadAverage === null
                ? "—"
                : `${Math.round((squadAverage / 4) * 100)}%`}
            </strong>

            <span>{evaluated.length} avaliados</span>
          </>
        }
      />

      <ModuleTabs
        className="performance-module-tabs"
        ariaLabel="Navegação do Performance"
        items={[
          {
            label: "Visão geral",
            href: "/performance",
            active: true,
          },
          {
            label: "Frequência e rendimento",
            href: "/performance/frequencia",
          },
          {
            label: "Relatórios",
            href: "/performance/relatorios",
          },
          {
            label: "Treinos",
            href: "/treinos",
          },
          {
            label: "GPS",
            href: "/performance/gps",
          },
        ]}
      />

      <ModuleKpiGrid
        className="performance-kpis"
        ariaLabel="Indicadores gerais do Performance"
        items={[
          {
            label: "ATLETAS ATIVOS",
            value: athletes.length,
            description: `${categories.length} categorias autorizadas`,
          },
          {
            label: "NOTA MÉDIA",
            value:
              squadAverage === null
                ? "—"
                : `${squadAverage.toFixed(2)}/4`,
            description: "últimas avaliações",
          },
          {
            label: "FREQUÊNCIA MÉDIA",
            value: percentageLabel(frequencyAverage),
            description: period.label,
          },
          {
            label: "APROVEITAMENTO MÉDIO",
            value: percentageLabel(trainingTimeAverage),
            description: "minutos treinados ÷ oferecidos",
          },
        ]}
      />

      <section className="performance-overview-grid">
        <ModulePanel
          className="performance-panel performance-areas"
          eyebrow="MAPA COLETIVO"
          title="Valências do elenco"
          action={<span className="badge">Escala 1–4</span>}
        >
          <div className="performance-area-list">
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

                <div className="performance-track">
                  <i
                    style={{
                      width: `${((area.value || 0) / 4) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ModulePanel>

        <ModulePanel
          className="performance-panel performance-attention"
          eyebrow="PRIORIDADES"
          title="Atenção necessária"
        >
          <Link href="/performance">
            <span>!</span>
            <div>
              <strong>{pendingEvaluation} avaliações pendentes</strong>
              <small>Sem avaliação ou há mais de 90 dias</small>
            </div>
            <b>→</b>
          </Link>

          <Link href="/performance/frequencia">
            <span>↓</span>
            <div>
              <strong>
                {lowTrainingTime} atleta(s) fora da faixa verde
              </strong>
              <small>
                Aproveitamento de tempo no mês atual
              </small>
            </div>
            <b>→</b>
          </Link>

          <Link href="/performance">
            <span>✓</span>
            <div>
              <strong>{activeGoals} metas ativas</strong>
              <small>Planos individuais em andamento</small>
            </div>
            <b>→</b>
          </Link>
        </ModulePanel>
      </section>

      <ModuleFilterBar
        className="performance-filter-panel"
        ariaLabel="Filtros do Performance"
      >
        <label>
          <span>Buscar atleta</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Nome, apelido ou posição"
          />
        </label>

        <label>
          <span>Categoria</span>
          <select name="category" defaultValue={categoryId}>
            <option value="">Todas as categorias autorizadas</option>

            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit">Aplicar filtros</button>

        {search || categoryId ? (
          <Link
            className="btn btn-secondary"
            href="/performance"
          >
            Limpar
          </Link>
        ) : null}
      </ModuleFilterBar>

      <section className="performance-roster">
        <div className="performance-title">
          <div>
            <span className="page-eyebrow">ELENCO</span>
            <h2>Performance individual</h2>
          </div>

          <span className="badge">{rows.length} atleta(s)</span>
        </div>

        {rows.length ? (
          <div className="performance-athlete-grid">
            {rows.map(
              ({
                athlete,
                current,
                average,
                trainingSummary,
                delta,
              }) => (
                <article
                  className="performance-athlete-card"
                  key={athlete.id}
                >
                  <div className="performance-athlete-cover">
                    <span>
                      {athlete.category?.name ||
                        "Categoria vinculada"}
                    </span>

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

                    <i>{athlete.position || "Atleta"}</i>
                  </div>

                  <div className="performance-athlete-content">
                    <h3>{athlete.nickname || athlete.name}</h3>

                    <p>
                      {athlete.nickname
                        ? athlete.name
                        : "Acompanhamento individual"}
                    </p>

                    <div className="performance-athlete-stats">
                      <div>
                        <span>NOTA</span>
                        <strong>
                          {average === null
                            ? "—"
                            : average.toFixed(1)}
                        </strong>

                        {delta !== null ? (
                          <small
                            className={
                              delta >= 0 ? "up" : "down"
                            }
                          >
                            {delta >= 0 ? "+" : ""}
                            {delta.toFixed(1)}
                          </small>
                        ) : null}
                      </div>

                      <div>
                        <span>FREQUÊNCIA</span>
                        <strong>
                          {trainingSummary.completedSessions
                            ? percentageLabel(
                                trainingSummary.frequencyPercentage,
                              )
                            : "—"}
                        </strong>
                      </div>

                      <div>
                        <span>APROVEIT.</span>
                        <strong>
                          {trainingSummary.completedSessions
                            ? percentageLabel(
                                trainingSummary.trainingTimePercentage,
                              )
                            : "—"}
                        </strong>
                      </div>
                    </div>

                    <small className="performance-last">
                      Última avaliação:{" "}
                      {dateLabel(current?.evaluatedAt)} · Metas ativas:{" "}
                      {athlete.performanceGoals.length}
                    </small>

                    <Link
                      href={`/atletas/${athlete.id}/performance`}
                    >
                      Abrir painel do atleta <b>→</b>
                    </Link>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="empty">Nenhum atleta encontrado.</div>
        )}
      </section>
    </main>
  );
}
