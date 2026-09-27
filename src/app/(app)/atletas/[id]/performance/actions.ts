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


function optionalNumber(value: FormDataEntryValue | null) {
  const raw = clean(value).replace(",", ".");
  if (!raw) return null;

  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function optionalInt(value: FormDataEntryValue | null) {
  const number = optionalNumber(value);
  if (number === null) return null;

  return Number.isInteger(number) ? number : null;
}

function activityDate(value: FormDataEntryValue | null) {
  const raw = clean(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
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

async function requireEliteGps() {
  const user = await requireClubPermission("GPS_MANAGE");

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

export async function createManualGpsRecord(formData: FormData) {
  const user = await requireEliteGps();

  const athleteId = clean(formData.get("athleteId"));
  const context = clean(formData.get("context"));
  const recordedAt = activityDate(formData.get("activityAt"));

  const trainingSessionId = nullable(formData.get("trainingSessionId"));
  const matchId = nullable(formData.get("matchId"));

  if (
    !athleteId ||
    !recordedAt ||
    (context !== "TRAINING" && context !== "MATCH")
  ) {
    redirect(
      `/atletas/${athleteId || "invalido"}/performance/gps?erro=dados`,
    );
  }

  const athlete = await prisma.athlete.findFirst({
    where: {
      id: athleteId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });

  if (!athlete) {
    redirect(`/atletas/${athleteId}/performance/gps?erro=acesso`);
  }

  if (context === "TRAINING" && trainingSessionId) {
    const trainingSession = await prisma.trainingSession.findFirst({
      where: {
        id: trainingSessionId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });

    if (!trainingSession) {
      redirect(`/atletas/${athleteId}/performance/gps?erro=treino`);
    }
  }

  if (context === "MATCH" && matchId) {
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        organizationId: user.organizationId,
      },
      select: { id: true },
    });

    if (!match) {
      redirect(`/atletas/${athleteId}/performance/gps?erro=jogo`);
    }
  }

  const durationMinutes = optionalInt(formData.get("durationMinutes"));
  const distanceMeters = optionalNumber(formData.get("distanceMeters"));
  const maxSpeedKmh = optionalNumber(formData.get("maxSpeedKmh"));
  const averageSpeedKmh = optionalNumber(formData.get("averageSpeedKmh"));
  const sprintCount = optionalInt(formData.get("sprintCount"));
  const highIntensityDistanceMeters = optionalNumber(
    formData.get("highIntensityDistanceMeters"),
  );
  const accelerations = optionalInt(formData.get("accelerations"));
  const decelerations = optionalInt(formData.get("decelerations"));
  const playerLoad = optionalNumber(formData.get("playerLoad"));

  const numericValues = [
    durationMinutes,
    distanceMeters,
    maxSpeedKmh,
    averageSpeedKmh,
    sprintCount,
    highIntensityDistanceMeters,
    accelerations,
    decelerations,
    playerLoad,
  ].filter((value): value is number => value !== null);

  if (numericValues.some((value) => value < 0)) {
    redirect(`/atletas/${athleteId}/performance/gps?erro=valores`);
  }

  await prisma.athleteGpsRecord.create({
    data: {
      organizationId: user.organizationId,
      athleteId: athlete.id,
      recordedByUserId: user.id,
      context,
      source: "MANUAL",
      activityAt: recordedAt,
      trainingSessionId:
        context === "TRAINING" ? trainingSessionId : null,
      matchId: context === "MATCH" ? matchId : null,
      durationMinutes,
      distanceMeters,
      maxSpeedKmh,
      averageSpeedKmh,
      sprintCount,
      highIntensityDistanceMeters,
      accelerations,
      decelerations,
      playerLoad,
      notes: nullable(formData.get("notes")),
    },
  });

  revalidatePath("/performance");
  revalidatePath(`/atletas/${athleteId}/performance`);
  revalidatePath(`/atletas/${athleteId}/performance/gps`);

  redirect(`/atletas/${athleteId}/performance/gps?status=gps-salvo`);
}

