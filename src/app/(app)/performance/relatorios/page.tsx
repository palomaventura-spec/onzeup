import Link from "next/link";
import {
  ClubPermissionCode,
  MonthlyAthleteReportStatus,
  SportType,
} from "@prisma/client";

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

const PAGE_SIZE = 20;

type ReportFilters = {
  month?: string;
  category?: string;
  sport?: string;
  q?: string;
  page?: string;
  ok?: string;
  erro?: string;
};

type ReportIcon =
  | "reports"
  | "review"
  | "approved"
  | "sent"
  | "field"
  | "futsal"
  | "search"
  | "eye"
  | "pdf"
  | "arrow"
  | "chevron-left"
  | "chevron-right";

function Icon({
  name,
  size = 18,
}: {
  name: ReportIcon;
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

  if (name === "reports") {
    return (
      <svg {...common}>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 11h6M9 15h6" />
      </svg>
    );
  }

  if (name === "review") {
    return (
      <svg {...common}>
        <path d="M9 4h6M8 7h8M7 4H5v17h14V4h-2" />
        <path d="m9 15 2 2 4-4" />
      </svg>
    );
  }

  if (name === "approved") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (name === "sent") {
    return (
      <svg {...common}>
        <path d="m3 11 18-8-8 18-2-7-8-3Z" />
        <path d="m11 14 5-5" />
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

  if (name === "eye") {
    return (
      <svg {...common}>
        <path d="M2.8 12s3.2-5 9.2-5 9.2 5 9.2 5-3.2 5-9.2 5-9.2-5-9.2-5Z" />
        <circle cx="12" cy="12" r="2.3" />
      </svg>
    );
  }

  if (name === "pdf") {
    return (
      <svg {...common}>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 15h6M9 11h3" />
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

function statusClass(
  status: MonthlyAthleteReportStatus,
) {
  return status.toLowerCase().replace("_", "-");
}

function parseSnapshot(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  return value as MonthlyPresenceSnapshot;
}

function sportLabel(sport: SportType) {
  return sport === SportType.FUTSAL ? "Futsal" : "Campo";
}

function reportsUrl({
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
  const params = new URLSearchParams();

  params.set("month", month);
  params.set("sport", sport);

  if (category) params.set("category", category);
  if (q) params.set("q", q);
  if (page && page > 1) params.set("page", String(page));

  return `/performance/relatorios?${params.toString()}`;
}

export default async function MonthlyReportsPage({
  searchParams,
}: {
  searchParams: Promise<ReportFilters>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;

  const period = parseMonth(query.month);
  const requestedCategoryId = String(
    query.category || "",
  ).trim();
  const search = String(query.q || "").trim();
  const requestedPage = Math.max(
    1,
    Number.parseInt(query.page || "1", 10) || 1,
  );

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
          11UP PERFORMANCE
        </span>
        <h1>Relatórios de Performance</h1>
        <p>
          Gere, revise, aprove e compartilhe documentos
          individuais de performance.
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

  if (
    !hasGlobalAccess &&
    (!allowedCategoryIds ||
      allowedCategoryIds.length === 0)
  ) {
    return (
      <main className="performance-hub">
        <div className="notice" role="status">
          <strong>Acesso restrito.</strong> Você ainda não
          possui uma categoria autorizada para acessar os
          relatórios de Performance.
        </div>
      </main>
    );
  }

  const categories =
    await prisma.category.findMany({
      where: {
        organizationId: user.organizationId,
        active: true,
        type: "STANDARD",
        sport: {
          in: [
            SportType.FOOTBALL,
            SportType.FUTSAL,
          ],
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
        accentColor: true,
      },
    });

  const hasFootball = categories.some(
    (category) =>
      category.sport === SportType.FOOTBALL,
  );
  const hasFutsal = categories.some(
    (category) =>
      category.sport === SportType.FUTSAL,
  );

  const selectedSport: SportType =
    query.sport === SportType.FUTSAL && hasFutsal
      ? SportType.FUTSAL
      : query.sport === SportType.FOOTBALL &&
          hasFootball
        ? SportType.FOOTBALL
        : hasFootball
          ? SportType.FOOTBALL
          : SportType.FUTSAL;

  const sportCategories = categories.filter(
    (category) =>
      category.sport === selectedSport,
  );

  const validCategoryIds = new Set(
    sportCategories.map(
      (category) => category.id,
    ),
  );

  const categoryId = validCategoryIds.has(
    requestedCategoryId,
  )
    ? requestedCategoryId
    : "";

  const categoryIds = categoryId
    ? [categoryId]
    : sportCategories.map(
        (category) => category.id,
      );

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
                  organizationId:
                    user.organizationId,
                  categoryId: {
                    in: categoryIds,
                  },
                  sport: selectedSport,
                  status: "ACTIVE" as const,
                },
              },
            },
          ],
        }
      : {
          id: "__none__",
        };

  const athletes =
    await prisma.athlete.findMany({
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
        photoUrl: true,
        jerseyNumber: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            sport: true,
            accentColor: true,
          },
        },
        memberships: {
          where: {
            organizationId:
              user.organizationId,
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
    });

  const reports =
    await prisma.monthlyAthleteReport.findMany({
      where: {
        organizationId: user.organizationId,
        sport: selectedSport,
        periodStart: period.start,
        athleteId: {
          in: athletes.map(
            (athlete) => athlete.id,
          ),
        },
      },
      select: {
        id: true,
        athleteId: true,
        status: true,
        presenceSnapshot: true,
        includePresence: true,
        includeGps: true,
        includeEvaluation: true,
        gpsSnapshot: true,
        evaluationSnapshot: true,
        updatedAt: true,
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
          sport: selectedSport,
        }));

      const membershipCategory =
        sportCategories.find((category) =>
          athlete.memberships.some(
            (membership) =>
              membership.categoryId ===
              category.id,
          ),
        );

      const category =
        athlete.category?.sport === selectedSport
          ? athlete.category
          : membershipCategory ?? null;

      return {
        athlete,
        category,
        report: report ?? null,
        summary,
      };
    }),
  );

  const generatedCount = reports.length;

  const inReviewCount = reports.filter(
    (report) =>
      report.status ===
      MonthlyAthleteReportStatus.IN_REVIEW,
  ).length;

  const approvedCount = reports.filter(
    (report) =>
      report.status ===
      MonthlyAthleteReportStatus.APPROVED,
  ).length;

  const sentCount = reports.filter(
    (report) =>
      report.status ===
      MonthlyAthleteReportStatus.SENT,
  ).length;

  const totalPages = Math.max(
    1,
    Math.ceil(rows.length / PAGE_SIZE),
  );

  const currentPage = Math.min(
    requestedPage,
    totalPages,
  );

  const pageStart =
    (currentPage - 1) * PAGE_SIZE;

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
    search || categoryId,
  );

  const paginationBase = {
    month: period.value,
    category: categoryId,
    sport: selectedSport,
    q: search,
  };

  return (
    <main className="reports-v6">
      <section className="reports-v6-hero">
        <div>
          <span className="reports-v6-eyebrow">
            11UP PERFORMANCE · RELATÓRIOS
          </span>

          <h1>Relatórios de Performance</h1>

          <p>
            Gere documentos individuais, acompanhe o fluxo de
            aprovação e disponibilize a versão visual ou PDF
            para cada atleta.
          </p>
        </div>

        <div className="reports-v6-hero-aside">
          <small>PERÍODO</small>
          <strong>{generatedCount}</strong>
          <span>
            relatório(s) gerado(s) · {period.label}
          </span>
        </div>
      </section>

      <nav
        className="reports-v6-tabs"
        aria-label="Navegação do Performance"
      >
        <Link
          href={`/performance?sport=${selectedSport}`}
        >
          Visão geral
        </Link>

        <Link
          href={`/performance/frequencia?month=${period.value}&sport=${selectedSport}`}
        >
          Frequência e rendimento
        </Link>

        <Link
          className="is-active"
          href={reportsUrl({
            month: period.value,
            sport: selectedSport,
          })}
        >
          Relatórios
        </Link>

        <Link
          href={`/performance/gps?sport=${selectedSport}`}
        >
          GPS
        </Link>
      </nav>

      <section
        className="reports-v6-sport-switch"
        aria-label="Modalidade dos relatórios"
      >
        <div>
          <span className="reports-v6-eyebrow">
            MODALIDADE
          </span>
          <strong>
            Documentos separados por esporte
          </strong>
        </div>

        <div>
          <Link
            className={
              selectedSport === SportType.FOOTBALL
                ? "is-active"
                : ""
            }
            href={reportsUrl({
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
            href={reportsUrl({
              month: period.value,
              sport: SportType.FUTSAL,
            })}
          >
            <Icon name="futsal" size={17} />
            Futsal
          </Link>
        </div>
      </section>

      <section className="reports-v6-kpis">
        <article>
          <span className="reports-v6-kpi-icon">
            <Icon name="reports" />
          </span>
          <div>
            <small>GERADOS</small>
            <strong>{generatedCount}</strong>
            <span>{period.label}</span>
          </div>
        </article>

        <article>
          <span className="reports-v6-kpi-icon">
            <Icon name="review" />
          </span>
          <div>
            <small>EM REVISÃO</small>
            <strong>{inReviewCount}</strong>
            <span>aguardando conferência</span>
          </div>
        </article>

        <article>
          <span className="reports-v6-kpi-icon">
            <Icon name="approved" />
          </span>
          <div>
            <small>APROVADOS</small>
            <strong>{approvedCount}</strong>
            <span>prontos para envio</span>
          </div>
        </article>

        <article>
          <span className="reports-v6-kpi-icon">
            <Icon name="sent" />
          </span>
          <div>
            <small>ENVIADOS</small>
            <strong>{sentCount}</strong>
            <span>registro concluído</span>
          </div>
        </article>
      </section>

      {query.ok ? (
        <div
          className="reports-v6-notice success"
          role="status"
        >
          Alteração salva com sucesso.
        </div>
      ) : null}

      {query.erro ? (
        <div
          className="reports-v6-notice"
          role="alert"
        >
          Não foi possível concluir essa ação. Verifique
          permissões, categoria, modalidade e status do
          relatório.
        </div>
      ) : null}

      <section className="reports-v6-generator">
        <header>
          <div>
            <span className="reports-v6-eyebrow">
              CENTRAL DE RELATÓRIOS
            </span>
            <h2>Localizar e gerar documentos</h2>
            <p>
              Escolha período, categoria e atleta. O relatório
              usa os dados disponíveis em{" "}
              {sportLabel(selectedSport)}.
            </p>
          </div>

          <span>{rows.length} atleta(s)</span>
        </header>

        <form method="get">
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

              {sportCategories.map(
                (category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="reports-v6-search">
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

          {hasFilters ? (
            <Link
              href={reportsUrl({
                month: period.value,
                sport: selectedSport,
              })}
            >
              Limpar
            </Link>
          ) : null}
        </form>
      </section>

      <section className="reports-v6-history">
        <header>
          <div>
            <span className="reports-v6-eyebrow">
              {period.label.toUpperCase()}
            </span>
            <h2>Relatórios por atleta</h2>
            <p>
              Visualize o documento, gere PDF e acompanhe
              rascunho, revisão, aprovação e envio.
            </p>
          </div>

          <span>
            Exibindo {rows.length ? pageStart + 1 : 0} –{" "}
            {Math.min(
              pageStart + PAGE_SIZE,
              rows.length,
            )}{" "}
            de {rows.length}
          </span>
        </header>

        {pageRows.length ? (
          <>
            <div className="reports-v6-table-head">
              <span>Atleta</span>
              <span>Categoria</span>
              <span>Frequência</span>
              <span>Minutos</span>
              <span>Conteúdo</span>
              <span>Status</span>
              <span>Ações</span>
            </div>

            <div className="reports-v6-list">
              {pageRows.map(
                ({
                  athlete,
                  category,
                  report,
                  summary,
                }) => {
                  const athleteName =
                    athlete.nickname ||
                    athlete.name;

                  return (
                    <article
                      className="reports-v6-row"
                      key={athlete.id}
                    >
                      <div className="reports-v6-person">
                        <span className="reports-v6-avatar">
                          {athlete.photoUrl ? (
                            <img
                              src={athlete.photoUrl}
                              alt={athleteName}
                            />
                          ) : (
                            <b>
                              {athleteName
                                .slice(0, 2)
                                .toUpperCase()}
                            </b>
                          )}
                        </span>

                        <div>
                          <strong>
                            {athleteName}
                          </strong>
                          <small>
                            {athlete.jerseyNumber
                              ? `Camisa ${athlete.jerseyNumber}`
                              : sportLabel(selectedSport)}
                          </small>
                        </div>
                      </div>

                      <div className="reports-v6-cell">
                        <b>
                          {category?.name || "—"}
                        </b>
                      </div>

                      <div className="reports-v6-cell">
                        <b>
                          {percentageLabel(
                            summary.frequencyPercentage,
                          )}
                        </b>
                        <small>
                          {summary.attendedSessions}/
                          {summary.completedSessions} treinos
                        </small>
                      </div>

                      <div className="reports-v6-cell">
                        <b>
                          {summary.athleteMinutes}/
                          {summary.offeredMinutes}
                        </b>
                        <small>
                          realizados / oferecidos
                        </small>
                      </div>

                      <div className="reports-v6-content">
                        <span className="is-on">
                          Frequência
                        </span>
                        {report?.includeGps &&
                        report.gpsSnapshot ? (
                          <span className="is-on">
                            GPS
                          </span>
                        ) : (
                          <span>GPS</span>
                        )}
                        {report?.includeEvaluation &&
                        report.evaluationSnapshot ? (
                          <span className="is-on">
                            Avaliação
                          </span>
                        ) : (
                          <span>Avaliação</span>
                        )}
                      </div>

                      <div className="reports-v6-status">
                        {report ? (
                          <span
                            className={statusClass(
                              report.status,
                            )}
                          >
                            {statusLabel(
                              report.status,
                            )}
                          </span>
                        ) : (
                          <span className="not-generated">
                            Não gerado
                          </span>
                        )}
                      </div>

                      <div className="reports-v6-actions">
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
                            <input
                              type="hidden"
                              name="sport"
                              value={selectedSport}
                            />
                            <button
                              className="reports-v6-primary"
                              type="submit"
                            >
                              Gerar
                            </button>
                          </form>
                        ) : (
                          <>
                            <Link
                              className="reports-v6-icon-action"
                              href={`/monthly-performance-report/${report.id}`}
                              aria-label={`Visualizar relatório de ${athleteName}`}
                              title="Visualizar relatório"
                            >
                              <Icon name="eye" />
                            </Link>

                            <Link
                              className="reports-v6-icon-action"
                              href={`/monthly-performance-report/${report.id}?print=1`}
                              target="_blank"
                              aria-label={`Abrir PDF de ${athleteName}`}
                              title="Imprimir / Salvar PDF"
                            >
                              <Icon name="pdf" />
                            </Link>

                            {report.status ===
                            MonthlyAthleteReportStatus.DRAFT ? (
                              <>
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
                                  <input
                                    type="hidden"
                                    name="sport"
                                    value={selectedSport}
                                  />
                                  <button
                                    className="reports-v6-secondary"
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
                                  <input
                                    type="hidden"
                                    name="sport"
                                    value={selectedSport}
                                  />
                                  <button
                                    className="reports-v6-primary"
                                    type="submit"
                                  >
                                    Revisão
                                  </button>
                                </form>
                              </>
                            ) : report.status ===
                              MonthlyAthleteReportStatus.IN_REVIEW ? (
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
                                <input
                                  type="hidden"
                                  name="sport"
                                  value={selectedSport}
                                />
                                <button
                                  className="reports-v6-primary"
                                  type="submit"
                                >
                                  Aprovar
                                </button>
                              </form>
                            ) : report.status ===
                              MonthlyAthleteReportStatus.APPROVED ? (
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
                                <input
                                  type="hidden"
                                  name="sport"
                                  value={selectedSport}
                                />
                                <button
                                  className="reports-v6-primary"
                                  type="submit"
                                >
                                  Marcar enviado
                                </button>
                              </form>
                            ) : null}
                          </>
                        )}
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            {totalPages > 1 ? (
              <nav
                className="reports-v6-pagination"
                aria-label="Paginação dos relatórios"
              >
                <Link
                  className={
                    currentPage === 1
                      ? "disabled"
                      : ""
                  }
                  href={reportsUrl({
                    ...paginationBase,
                    page: Math.max(
                      1,
                      currentPage - 1,
                    ),
                  })}
                  aria-disabled={
                    currentPage === 1
                  }
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
                        pageNumbers[index - 1];
                      const showDots =
                        previous &&
                        page - previous > 1;

                      return (
                        <span key={page}>
                          {showDots ? (
                            <i>…</i>
                          ) : null}

                          <Link
                            className={
                              page ===
                              currentPage
                                ? "is-active"
                                : ""
                            }
                            href={reportsUrl({
                              ...paginationBase,
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
                    currentPage === totalPages
                      ? "disabled"
                      : ""
                  }
                  href={reportsUrl({
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
                  <Icon
                    name="chevron-right"
                    size={16}
                  />
                </Link>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="reports-v6-empty">
            Nenhum atleta encontrado em{" "}
            {sportLabel(selectedSport)} para os filtros
            selecionados.
          </div>
        )}
      </section>
    </main>
  );
}
