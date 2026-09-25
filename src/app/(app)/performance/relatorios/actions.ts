"use server";

import { MonthlyAthleteReportStatus } from "@prisma/client";
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
) {
  const base =
    `/performance/relatorios?month=${encodeURIComponent(
      month,
    )}`;

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

  if (!athleteId) {
    redirect(
      reportsUrl(month, "erro=atleta"),
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
          },
        },
      },
    });

  if (
    !athlete ||
    !athlete.categoryId ||
    athlete.category?.type !== "STANDARD"
  ) {
    redirect(
      reportsUrl(
        month,
        "erro=categoria",
      ),
    );
  }

  const access =
    await getClubTrainingCategoryAccess(
      user,
      athlete.categoryId,
    );

  if (
    !access.canGeneratePerformanceReport
  ) {
    redirect(
      reportsUrl(
        month,
        "erro=permissao",
      ),
    );
  }

  const period = parseMonth(month);

  const existing =
    await prisma.monthlyAthleteReport.findUnique({
      where: {
        organizationId_athleteId_periodStart:
          {
            organizationId:
              user.organizationId,
            athleteId,
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
      reportsUrl(
        month,
        "erro=bloqueado",
      ),
    );
  }

  const snapshot =
    await buildMonthlyPresenceSnapshot({
      organizationId:
        user.organizationId,
      athleteId,
      month: period.value,
    });

  await prisma.monthlyAthleteReport.upsert({
    where: {
      organizationId_athleteId_periodStart:
        {
          organizationId:
            user.organizationId,
          athleteId,
          periodStart: period.start,
        },
    },
    create: {
      organizationId:
        user.organizationId,
      athleteId,
      categoryId:
        athlete.categoryId,
      createdByUserId: user.id,
      periodStart: period.start,
      periodEnd: period.end,
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
      categoryId:
        athlete.categoryId,
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
    reportsUrl(
      month,
      "ok=gerado",
    ),
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

  const report =
    await prisma.monthlyAthleteReport.findFirst({
      where: {
        id: reportId,
        organizationId:
          user.organizationId,
      },
      select: {
        id: true,
        categoryId: true,
        status: true,
      },
    });

  if (!report?.categoryId) {
    redirect(
      reportsUrl(
        month,
        "erro=relatorio",
      ),
    );
  }

  const access =
    await getClubTrainingCategoryAccess(
      user,
      report.categoryId,
    );

  if (
    !access.canGeneratePerformanceReport
  ) {
    redirect(
      reportsUrl(
        month,
        "erro=permissao",
      ),
    );
  }

  if (
    report.status !==
    MonthlyAthleteReportStatus.DRAFT
  ) {
    redirect(
      reportsUrl(
        month,
        "erro=status",
      ),
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
    reportsUrl(
      month,
      "ok=revisao",
    ),
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

  const report =
    await prisma.monthlyAthleteReport.findFirst({
      where: {
        id: reportId,
        organizationId:
          user.organizationId,
      },
      select: {
        id: true,
        categoryId: true,
        status: true,
      },
    });

  if (!report?.categoryId) {
    redirect(
      reportsUrl(
        month,
        "erro=relatorio",
      ),
    );
  }

  const access =
    await getClubTrainingCategoryAccess(
      user,
      report.categoryId,
    );

  if (
    !access.canApprovePerformanceReport
  ) {
    redirect(
      reportsUrl(
        month,
        "erro=permissao",
      ),
    );
  }

  if (
    report.status !==
    MonthlyAthleteReportStatus.IN_REVIEW
  ) {
    redirect(
      reportsUrl(
        month,
        "erro=status",
      ),
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
    reportsUrl(
      month,
      "ok=aprovado",
    ),
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

  const report =
    await prisma.monthlyAthleteReport.findFirst({
      where: {
        id: reportId,
        organizationId:
          user.organizationId,
      },
      select: {
        id: true,
        categoryId: true,
        status: true,
      },
    });

  if (!report?.categoryId) {
    redirect(
      reportsUrl(
        month,
        "erro=relatorio",
      ),
    );
  }

  const access =
    await getClubTrainingCategoryAccess(
      user,
      report.categoryId,
    );

  if (
    !access.canSendPerformanceReport
  ) {
    redirect(
      reportsUrl(
        month,
        "erro=permissao",
      ),
    );
  }

  if (
    report.status !==
    MonthlyAthleteReportStatus.APPROVED
  ) {
    redirect(
      reportsUrl(
        month,
        "erro=status",
      ),
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
    reportsUrl(
      month,
      "ok=enviado",
    ),
  );
}
