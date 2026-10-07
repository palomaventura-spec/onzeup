"use server";

import { MonthlyAthleteReportStatus, SportType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getClubTrainingCategoryAccess } from "@/lib/club-access";
import { requireOrganizationUser } from "@/lib/auth";
import {
  asPrismaJson,
  buildMonthlyPresenceSnapshot,
  parseMonth,
} from "@/lib/monthly-athlete-report";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function reportsUrl(
  month: string,
  suffix = "",
  sport?: SportType | null,
) {
  const params = new URLSearchParams();
  params.set("month", month);
  if (sport) params.set("sport", sport);

  const base = `/performance/relatorios?${params.toString()}`;
  return suffix ? `${base}&${suffix}` : base;
}

export async function generateMonthlyAthleteReport(
  formData: FormData,
) {
  const user = await requireOrganizationUser();

  const athleteId = clean(
    formData.get("athleteId"),
  );
  const month = clean(
    formData.get("month"),
  );

  const sportValue = clean(formData.get("sport"));
  const sport =
    sportValue === SportType.FOOTBALL
      ? SportType.FOOTBALL
      : sportValue === SportType.FUTSAL
        ? SportType.FUTSAL
        : null;

  if (!sport) {
    redirect(reportsUrl(month, "erro=modalidade", sport));
  }

  if (!athleteId) {
    redirect(
      reportsUrl(month, "erro=atleta", sport),
    );
  }

  const athlete =
    await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        organizationId:
          user.organizationId,
      },
      select: {
        id: true,
        name: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            sport: true,
            active: true,
            organizationId: true,
          },
        },
        memberships: {
          where: {
            organizationId: user.organizationId,
            sport,
            status: "ACTIVE",
          },
          orderBy: { updatedAt: "desc" },
          select: {
            category: {
              select: {
                id: true,
                type: true,
                sport: true,
                active: true,
                organizationId: true,
              },
            },
          },
        },
      },
    });

  // Um atleta pode estar em Campo e Futsal com categorias diferentes.
  // Nunca associar um relatório à categoria da outra modalidade.
  const isValidCategory = (
    category: {
      organizationId: string;
      active: boolean;
      type: string;
      sport: SportType;
    } | null,
  ) =>
    category?.organizationId === user.organizationId &&
    category.active &&
    category.type === "STANDARD" &&
    category.sport === sport;

  if (!athlete) {
    redirect(reportsUrl(month, "erro=atleta", sport));
  }

  const categoryId = isValidCategory(athlete.category)
    ? athlete.category!.id
    : athlete.memberships
        .map((membership) => membership.category)
        .find(isValidCategory)?.id;

  if (!categoryId) {
    redirect(reportsUrl(month, "erro=categoria", sport));
  }

  const access = await getClubTrainingCategoryAccess(
    user,
    categoryId,
    sport,
  );

  if (
    !access.canGeneratePerformanceReport
  ) {
    redirect(
      reportsUrl(month, "erro=permissao", sport),
    );
  }

  const period = parseMonth(month);

  const existing =
    await prisma.monthlyAthleteReport.findUnique({
      where: {
        organizationId_athleteId_sport_periodStart:
          {
            organizationId:
              user.organizationId,
            athleteId,
            sport,
            periodStart: period.start,
          },
      },
      select: {
        id: true,
        status: true,
      },
    });

  const isLocked =
    existing?.status ===
      MonthlyAthleteReportStatus.APPROVED ||
    existing?.status ===
      MonthlyAthleteReportStatus.SENT ||
    existing?.status ===
      MonthlyAthleteReportStatus.ARCHIVED;

  if (isLocked) {
    redirect(
      reportsUrl(month, "erro=bloqueado", sport),
    );
  }

  const snapshot =
    await buildMonthlyPresenceSnapshot({
      organizationId:
        user.organizationId,
      athleteId,
      month: period.value,
      sport,
    });

  await prisma.monthlyAthleteReport.upsert({
    where: {
      organizationId_athleteId_sport_periodStart:
        {
          organizationId:
            user.organizationId,
          athleteId,
          sport,
          periodStart: period.start,
        },
    },
    create: {
      organizationId:
        user.organizationId,
      athleteId,
      categoryId,
      createdByUserId: user.id,
      periodStart: period.start,
      periodEnd: period.end,
      sport,
      status:
        MonthlyAthleteReportStatus.DRAFT,
      title: `Relatório mensal · ${period.label}`,
      includePresence: true,
      includeGps: false,
      includeEvaluation: false,
      presenceSnapshot:
        asPrismaJson(snapshot),
      snapshotVersion: 1,
    },
    update: {
      categoryId,
      periodEnd: period.end,
      title: `Relatório Mensal · ${period.label}`,
      includePresence: true,
      presenceSnapshot:
        asPrismaJson(snapshot),
      snapshotVersion: 1,
    },
  });

  revalidatePath(
    "/performance/relatorios",
  );

  redirect(
    reportsUrl(month, "ok=gerado", sport),
  );
}

export async function sendMonthlyReportToReview(
  formData: FormData,
) {
  const user = await requireOrganizationUser();

  const reportId = clean(
    formData.get("reportId"),
  );
  const month = clean(
    formData.get("month"),
  );

  const sportValue = clean(formData.get("sport"));
  const sport =
    sportValue === SportType.FOOTBALL
      ? SportType.FOOTBALL
      : sportValue === SportType.FUTSAL
        ? SportType.FUTSAL
        : null;

  if (!sport) {
    redirect(reportsUrl(month, "erro=modalidade", sport));
  }

  const report =
    await prisma.monthlyAthleteReport.findFirst({
      where: {
        id: reportId,
        organizationId: user.organizationId,
        sport,
      },
      select: {
        id: true,
        categoryId: true,
        status: true,
      },
    });

  if (!report?.categoryId) {
    redirect(
      reportsUrl(month, "erro=relatorio", sport),
    );
  }

  const access =
    await getClubTrainingCategoryAccess(
      user,
      report.categoryId,
      sport,
    );

  if (
    !access.canGeneratePerformanceReport
  ) {
    redirect(
      reportsUrl(month, "erro=permissao", sport),
    );
  }

  if (
    report.status !==
    MonthlyAthleteReportStatus.DRAFT
  ) {
    redirect(
      reportsUrl(month, "erro=status", sport),
    );
  }

  await prisma.monthlyAthleteReport.update({
    where: {
      id: report.id,
    },
    data: {
      status:
        MonthlyAthleteReportStatus.IN_REVIEW,
      reviewedAt: null,
      reviewedByUserId: null,
    },
  });

  revalidatePath(
    "/performance/relatorios",
  );

  redirect(
    reportsUrl(month, "ok=revisao", sport),
  );
}

export async function approveMonthlyReport(
  formData: FormData,
) {
  const user = await requireOrganizationUser();

  const reportId = clean(
    formData.get("reportId"),
  );
  const month = clean(
    formData.get("month"),
  );

  const sportValue = clean(formData.get("sport"));
  const sport =
    sportValue === SportType.FOOTBALL
      ? SportType.FOOTBALL
      : sportValue === SportType.FUTSAL
        ? SportType.FUTSAL
        : null;

  if (!sport) {
    redirect(reportsUrl(month, "erro=modalidade", sport));
  }

  const report =
    await prisma.monthlyAthleteReport.findFirst({
      where: {
        id: reportId,
        organizationId: user.organizationId,
        sport,
      },
      select: {
        id: true,
        categoryId: true,
        status: true,
      },
    });

  if (!report?.categoryId) {
    redirect(
      reportsUrl(month, "erro=relatorio", sport),
    );
  }

  const access =
    await getClubTrainingCategoryAccess(
      user,
      report.categoryId,
      sport,
    );

  if (
    !access.canApprovePerformanceReport
  ) {
    redirect(
      reportsUrl(month, "erro=permissao", sport),
    );
  }

  if (
    report.status !==
    MonthlyAthleteReportStatus.IN_REVIEW
  ) {
    redirect(
      reportsUrl(month, "erro=status", sport),
    );
  }

  const now = new Date();

  await prisma.monthlyAthleteReport.update({
    where: {
      id: report.id,
    },
    data: {
      status:
        MonthlyAthleteReportStatus.APPROVED,
      reviewedByUserId: user.id,
      reviewedAt: now,
      approvedByUserId: user.id,
      approvedAt: now,
    },
  });

  revalidatePath(
    "/performance/relatorios",
  );

  redirect(
    reportsUrl(month, "ok=aprovado", sport),
  );
}

export async function markMonthlyReportSent(
  formData: FormData,
) {
  const user = await requireOrganizationUser();

  const reportId = clean(
    formData.get("reportId"),
  );
  const month = clean(
    formData.get("month"),
  );

  const sportValue = clean(formData.get("sport"));
  const sport =
    sportValue === SportType.FOOTBALL
      ? SportType.FOOTBALL
      : sportValue === SportType.FUTSAL
        ? SportType.FUTSAL
        : null;

  if (!sport) {
    redirect(reportsUrl(month, "erro=modalidade", sport));
  }

  const report =
    await prisma.monthlyAthleteReport.findFirst({
      where: {
        id: reportId,
        organizationId: user.organizationId,
        sport,
      },
      select: {
        id: true,
        categoryId: true,
        status: true,
      },
    });

  if (!report?.categoryId) {
    redirect(
      reportsUrl(month, "erro=relatorio", sport),
    );
  }

  const access =
    await getClubTrainingCategoryAccess(
      user,
      report.categoryId,
      sport,
    );

  if (
    !access.canSendPerformanceReport
  ) {
    redirect(
      reportsUrl(month, "erro=permissao", sport),
    );
  }

  if (
    report.status !==
    MonthlyAthleteReportStatus.APPROVED
  ) {
    redirect(
      reportsUrl(month, "erro=status", sport),
    );
  }

  await prisma.monthlyAthleteReport.update({
    where: {
      id: report.id,
    },
    data: {
      status:
        MonthlyAthleteReportStatus.SENT,
      sentByUserId: user.id,
      sentAt: new Date(),
    },
  });

  revalidatePath(
    "/performance/relatorios",
  );

  redirect(
    reportsUrl(month, "ok=enviado", sport),
  );
}
