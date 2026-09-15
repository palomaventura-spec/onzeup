"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const result = clean(value);
  return result || null;
}

function formDate(value: FormDataEntryValue | null) {
  const raw = clean(value);
  if (!raw) return null;
  const date = new Date(`${raw}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function requireElitePerformance() {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const [subscription, organization] = await Promise.all([
    prisma.subscription.findUnique({
      where: { organizationId: user.organizationId },
    }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { accessStatus: true, complimentaryUntil: true },
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

  if (!elite) redirect("/performance?erro=elite");
  return user;
}

export async function createPerformanceEvaluation(formData: FormData) {
  const user = await requireElitePerformance();

  const athleteId = clean(formData.get("athleteId"));
  const templateId = clean(formData.get("templateId"));
  const intent = clean(formData.get("intent"));
  const status = intent === "FINALIZED" ? "FINALIZED" : "DRAFT";

  const periodStart = formDate(formData.get("periodStart"));
  const periodEnd = formDate(formData.get("periodEnd"));

  if (!athleteId || !templateId || !periodStart || !periodEnd) {
    redirect(
      `/atletas/${athleteId || "invalido"}/performance/avaliacoes/nova?erro=dados`
    );
  }

  if (periodEnd < periodStart) {
    redirect(
      `/atletas/${athleteId}/performance/avaliacoes/nova?erro=periodo`
    );
  }

  const [athlete, template] = await Promise.all([
    prisma.athlete.findFirst({
      where: { id: athleteId, organizationId: user.organizationId },
      select: { id: true, categoryId: true, position: true },
    }),
    prisma.performanceTemplate.findFirst({
      where: {
        id: templateId,
        active: true,
        OR: [{ organizationId: null }, { organizationId: user.organizationId }],
      },
      include: {
        criteria: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
          include: { levels: { orderBy: { score: "asc" } } },
        },
      },
    }),
  ]);

  if (!athlete || !template) {
    redirect(`/atletas/${athleteId}/performance/avaliacoes/nova?erro=acesso`);
  }

  const scores = template.criteria.flatMap((criterion) => {
    const rawScore = Number(clean(formData.get(`score_${criterion.id}`)));
    if (!Number.isInteger(rawScore) || rawScore < 1 || rawScore > 4) return [];

    const level = criterion.levels.find((item) => item.score === rawScore);
    if (!level) return [];

    return [
      {
        criterionId: criterion.id,
        area: criterion.area,
        metricCode: criterion.code,
        metricLabel: criterion.label,
        score: rawScore,
        ratingLabel: level.label,
        ratingDescription: level.description,
        notes: nullable(formData.get(`notes_${criterion.id}`)),
        sortOrder: criterion.sortOrder,
      },
    ];
  });

  if (status === "FINALIZED" && scores.length !== template.criteria.length) {
    redirect(`/atletas/${athleteId}/performance/avaliacoes/nova?erro=notas`);
  }

  const evaluation = await prisma.athleteEvaluation.create({
    data: {
      organizationId: user.organizationId,
      athleteId: athlete.id,
      categoryId: athlete.categoryId,
      evaluatorUserId: user.id,
      templateId: template.id,
      title: nullable(formData.get("title")),
      periodStart,
      periodEnd,
      season: nullable(formData.get("season")),
      sport: template.sport,
      athleteRole: template.athleteRole,
      positionSnapshot: athlete.position,
      status,
      strengths: nullable(formData.get("strengths")),
      developmentPoints: nullable(formData.get("developmentPoints")),
      nextGoals: nullable(formData.get("nextGoals")),
      internalNotes: nullable(formData.get("internalNotes")),
      summary: nullable(formData.get("summary")),
      scores: { create: scores },
    },
    select: { id: true },
  });

  revalidatePath("/performance");
  revalidatePath(`/atletas/${athleteId}/performance`);
  revalidatePath(`/atletas/${athleteId}/performance/avaliacoes/${evaluation.id}`);

  redirect(
    `/atletas/${athleteId}/performance?status=${
      status === "FINALIZED" ? "avaliacao-finalizada" : "rascunho-salvo"
    }`
  );
}
