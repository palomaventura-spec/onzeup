import Link from "next/link";
import {
  ClubPermissionCode,
  MonthlyAthleteReportStatus,
} from "@prisma/client";

import ModuleFilterBar from "@/components/ModuleFilterBar";
import ModuleHero from "@/components/ModuleHero";
import ModuleKpiGrid from "@/components/ModuleKpiGrid";
import ModulePanel from "@/components/ModulePanel";
import ModuleTabs from "@/components/ModuleTabs";
import { requireOrganizationUser } from "@/lib/auth";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { hasClubPermission } from "@/lib/club-permissions";
import {
  buildMonthlyPresenceSnapshot,
  parseMonth,
  type MonthlyPresenceSnapshot,
} from "@/lib/monthly-athlete-report";
import { prisma } from "@/lib/prisma";

import {
  approveMonthlyReport,
  generateMonthlyAthleteReport,
  markMonthlyReportSent,
  sendMonthlyReportToReview,
} from "./actions";

function percentageLabel(value: number) {
  return `${value.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
  })}%`;
}

function statusLabel(
  status: MonthlyAthleteReportStatus,
) {
  switch (status) {
    case "DRAFT":
      return "Rascunho";
    case "IN_REVIEW":
      return "Em revisão";
    case "APPROVED":
      return "Aprovado";
    case "SENT":
      return "Enviado";
    case "ARCHIVED":
      return "Arquivado";
    default:
      return status;
  }
}

function parseSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as MonthlyPresenceSnapshot;
}

export default async function MonthlyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    category?: string;
    q?: string;
    ok?: string;
    erro?: string;
  }>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;

  const period = parseMonth(query.month);
  const requestedCategoryId = String(
    query.category || "",
  ).trim();
  const search = String(query.q || "").trim();

  const [subscription, organization] =
    await Promise.all([
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
    currentPeriodEnd:
      subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil:
      organization?.complimentaryUntil,
  });

  if (!elite) {
    return (
      <section className="performance-upgrade">
        <span className="page-eyebrow">
          ONZEUP PERFORMANCE
        </span>
        <h1>Relatórios mensais</h1>
        <p>
          Frequência, minutagem e rendimento mensal do atleta
          em um relatório consolidado.
        </p>
        <Link className="btn" href="/planos">
          Conhecer o Club Elite
        </Link>
      </section>
    );
  }

  const hasGlobalAccess =
    hasClubPermission(user, "PERFORMANCE_VIEW") ||
    hasClubPermission(user, "PERFORMANCE_MANAGE") ||
    hasClubPermission(
      user,
      "PERFORMANCE_REPORT_GENERATE",
    ) ||
    hasClubPermission(
      user,
      "PERFORMANCE_REPORT_REVIEW",
    ) ||
    hasClubPermission(
      user,
      "PERFORMANCE_REPORT_APPROVE",
    ) ||
    hasClubPermission(
      user,
      "PERFORMANCE_REPORT_SEND",
    );

  let allowedCategoryIds: string[] | null = null;

  if (!hasGlobalAccess) {
    const staffLinks =
      await prisma.staffMember.findMany({
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
              organizationId:
                user.organizationId,
              enabled: true,
              permission: {
                in: [
                  ClubPermissionCode.PERFORMANCE_VIEW,
                  ClubPermissionCode.PERFORMANCE_MANAGE,
                  ClubPermissionCode.PERFORMANCE_REPORT_GENERATE,
                  ClubPermissionCode.PERFORMANCE_REPORT_REVIEW,
                  ClubPermissionCode.PERFORMANCE_REPORT_APPROVE,
                  ClubPermissionCode.PERFORMANCE_REPORT_SEND,
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
            (permission) =>
              permission.categoryId,
          ),
        ),
      ),
    );
  }

  const categories =
    await prisma.category.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        type: "STANDARD",
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
        accentColor: true,
      },
    });

  const validCategoryIds = new Set(
    categories.map((category) => category.id),
  );

  const categoryId = validCategoryIds.has(
    requestedCategoryId,
  )
    ? requestedCategoryId
    : "";

  const categoryIds = categoryId
    ? [categoryId]
    : categories.map((category) => category.id);

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      categoryId: {
        in: categoryIds,
      },
      category: {
        type: "STANDARD",
        active: true,
      },
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
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
          accentColor: true,
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
  });

  const reports =
    await prisma.monthlyAthleteReport.findMany({
      where: {
        organizationId: user.organizationId,
        periodStart: period.start,
        athleteId: {
          in: athletes.map((athlete) => athlete.id),
        },
      },
      select: {
        id: true,
        athleteId: true,
        status: true,
        presenceSnapshot: true,
      },
    });

  const reportByAthlete = new Map(
    reports.map((report) => [
      report.athleteId,
      report,
    ]),
  );

  const rows = await Promise.all(
    athletes.map(async (athlete) => {
      const report =
        reportByAthlete.get(athlete.id);

      const savedSnapshot = report
        ? parseSnapshot(
            report.presenceSnapshot,
          )
        : null;

      const summary =
        savedSnapshot ??
        (await buildMonthlyPresenceSnapshot({
          organizationId:
            user.organizationId,
          athleteId: athlete.id,
          month: period.value,
        }));

      return {
        athlete,
        report: report ?? null,
        summary,
      };
    }),
  );

  const generatedCount = reports.length;

  const approvedCount = reports.filter(
    (report) =>
      report.status === "APPROVED" ||
      report.status === "SENT",
  ).length;

  const sentCount = reports.filter(
    (report) => report.status === "SENT",
  ).length;

  const athletesWithTraining = rows.filter(
    (item) =>
      item.summary.completedSessions > 0,
  );

  const averageFrequency =
    athletesWithTraining.length
      ? Math.round(
          (athletesWithTraining.reduce(
            (sum, item) =>
              sum +
              item.summary.frequencyPercentage,
            0,
          ) /
            athletesWithTraining.length) *
            10,
        ) / 10
      : 0;

  return (
    <main className="performance-hub">
      <ModuleHero
        eyebrow="ONZEUP PERFORMANCE · RELATÓRIOS"
        title="Relatório Mensal "
        description={
          <p>
            Presença e minutagem consolidadas por atleta.
            GPS e avaliação profissional continuam módulos
            independentes e entram no relatório somente
            quando houver dados.
          </p>
        }
        aside={
          <>
            <small>PERÍODO</small>
            <strong>{generatedCount}</strong>
            <span>
              relatório(s) gerado(s) em {period.label}
            </span>
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
          },
          {
            label: "Frequência e rendimento",
            href: `/performance/frequencia?month=${period.value}`,
          },
          {
            label: "Relatórios mensais",
            href: `/performance/relatorios?month=${period.value}`,
            active: true,
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
        items={[
          {
            label: "RELATÓRIOS GERADOS",
            value: generatedCount,
            description: period.label,
          },
          {
            label: "APROVADOS",
            value: approvedCount,
            description: "inclui enviados",
          },
          {
            label: "ENVIADOS",
            value: sentCount,
            description: "registrados como enviados",
          },
          {
            label: "FREQUÊNCIA MÉDIA",
            value: percentageLabel(
              averageFrequency,
            ),
            description:
              "atletas com treino no período",
          },
        ]}
      />

      {query.ok ? (
        <div
          className="notice"
          role="status"
        >
          Alteração salva com sucesso.
        </div>
      ) : null}

      {query.erro ? (
        <div
          className="notice"
          role="alert"
        >
          Não foi possível concluir essa ação.
          Verifique permissões, categoria e status
          do relatório.
        </div>
      ) : null}

      <ModuleFilterBar
        trailing={
          <span>
            {athletes.length} atleta(s)
          </span>
        }
      >
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
              Todas autorizadas
            </option>

            {categories.map((category) => (
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
          <span>Atleta</span>
          <input
            name="q"
            defaultValue={search}
            placeholder="Nome ou apelido"
          />
        </label>

        <button type="submit">
          Aplicar filtros
        </button>
      </ModuleFilterBar>

      <ModulePanel
        eyebrow={period.label.toUpperCase()}
        title="Relatórios por atleta"
        description={
          <p>
            O relatório usa apenas chamadas realmente
            registradas. Falta e falta justificada ficam
            com 0 minuto. Ausência de GPS ou avaliação
            não reduz nenhum indicador.
          </p>
        }
      >
        {!rows.length ? (
          <div className="empty">
            Nenhum atleta encontrado para os filtros
            selecionados.
          </div>
        ) : (
          <div className="training-performance-list">
            {rows.map(
              ({
                athlete,
                report,
                summary,
              }) => (
                <article
                  className="training-performance-athlete"
                  key={athlete.id}
                  style={{
                    borderLeft: `4px solid ${
                      athlete.category
                        ?.accentColor ||
                      "#9DDB16"
                    }`,
                  }}
                >
                  <div className="training-performance-athlete-id">
                    <div>
                      <strong>
                        {athlete.nickname ||
                          athlete.name}
                      </strong>
                      <small>
                        {athlete.category?.name ||
                          "Sem categoria"}
                      </small>
                    </div>
                  </div>

                  <div className="training-performance-metric">
                    <span>FREQUÊNCIA</span>
                    <strong>
                      {percentageLabel(
                        summary.frequencyPercentage,
                      )}
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
                    <small>
                      realizados / oferecidos
                    </small>
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
                    <span>RELATÓRIO</span>
                    <strong>
                      {report
                        ? statusLabel(
                            report.status,
                          )
                        : "Não gerado"}
                    </strong>

                    {!report ? (
                      <form
                        action={
                          generateMonthlyAthleteReport
                        }
                      >
                        <input
                          type="hidden"
                          name="athleteId"
                          value={athlete.id}
                        />
                        <input
                          type="hidden"
                          name="month"
                          value={period.value}
                        />
                        <button
                          className="btn btn-small"
                          type="submit"
                        >
                          Gerar relatório
                        </button>
                      </form>
                    ) : report.status ===
                      "DRAFT" ? (
                      <div className="actions">
                        <form
                          action={
                            generateMonthlyAthleteReport
                          }
                        >
                          <input
                            type="hidden"
                            name="athleteId"
                            value={athlete.id}
                          />
                          <input
                            type="hidden"
                            name="month"
                            value={period.value}
                          />
                          <button
                            className="btn-secondary btn-small"
                            type="submit"
                          >
                            Atualizar
                          </button>
                        </form>

                        <form
                          action={
                            sendMonthlyReportToReview
                          }
                        >
                          <input
                            type="hidden"
                            name="reportId"
                            value={report.id}
                          />
                          <input
                            type="hidden"
                            name="month"
                            value={period.value}
                          />
                          <button
                            className="btn btn-small"
                            type="submit"
                          >
                            Enviar p/ revisão
                          </button>
                        </form>
                      </div>
                    ) : report.status ===
                      "IN_REVIEW" ? (
                      <form
                        action={
                          approveMonthlyReport
                        }
                      >
                        <input
                          type="hidden"
                          name="reportId"
                          value={report.id}
                        />
                        <input
                          type="hidden"
                          name="month"
                          value={period.value}
                        />
                        <button
                          className="btn btn-small"
                          type="submit"
                        >
                          Aprovar
                        </button>
                      </form>
                    ) : report.status ===
                      "APPROVED" ? (
                      <form
                        action={
                          markMonthlyReportSent
                        }
                      >
                        <input
                          type="hidden"
                          name="reportId"
                          value={report.id}
                        />
                        <input
                          type="hidden"
                          name="month"
                          value={period.value}
                        />
                        <button
                          className="btn btn-small"
                          type="submit"
                        >
                          Marcar enviado
                        </button>
                      </form>
                    ) : (
                      <small>
                        Snapshot mensal preservado
                      </small>
                    )}
                  </div>
                </article>
              ),
            )}
          </div>
        )}
      </ModulePanel>
    </main>
  );
}
