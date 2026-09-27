"use server";

import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

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

const INDIVIDUAL_REPORT_TYPES = [
  "TRAINING",
  "MATCH",
  "GPS",
  "EVALUATION",
] as const;

type IndividualReportType = (typeof INDIVIDUAL_REPORT_TYPES)[number];

function reportDate(value: FormDataEntryValue | null, endOfDay = false) {
  const raw = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const date = new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function reportTypeLabel(type: IndividualReportType) {
  switch (type) {
    case "TRAINING":
      return "treino";
    case "MATCH":
      return "jogo";
    case "GPS":
      return "GPS";
    case "EVALUATION":
      return "avaliação";
  }
}

function reportDateLabel(date: Date) {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function reportFileName(
  athleteName: string,
  type: IndividualReportType,
  start: Date | null,
  end: Date | null,
) {
  const athlete = athleteName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  const suffix = start && end
    ? `-${start.toISOString().slice(0, 10)}-${end.toISOString().slice(0, 10)}`
    : "";

  return `11up-${athlete}-${type.toLowerCase()}${suffix}.pdf`;
}

async function requireEliteReportGeneration() {
  const user = await requireClubPermission("PERFORMANCE_REPORT_GENERATE");

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

export async function generateIndividualPerformanceReport(formData: FormData) {
  const user = await requireEliteReportGeneration();

  const athleteId = clean(formData.get("athleteId"));
  const rawType = clean(formData.get("reportType"));
  const evaluationId = nullable(formData.get("evaluationId"));

  if (
    !athleteId ||
    !INDIVIDUAL_REPORT_TYPES.includes(rawType as IndividualReportType)
  ) {
    redirect(
      `/atletas/${athleteId || "invalido"}/performance/relatorios?erro=dados`,
    );
  }

  const reportType = rawType as IndividualReportType;

  const athlete = await prisma.athlete.findFirst({
    where: {
      id: athleteId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      position: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!athlete) {
    redirect(`/atletas/${athleteId}/performance/relatorios?erro=acesso`);
  }

  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  let linkedEvaluationId: string | null = null;
  let snapshot: Prisma.InputJsonObject = {};

  const athleteSnapshot = {
    id: athlete.id,
    name: athlete.name,
    nickname: athlete.nickname,
    position: athlete.position,
    categoryId: athlete.categoryId,
    categoryName: athlete.category?.name || null,
  };

  if (reportType === "EVALUATION") {
    if (!evaluationId) {
      redirect(`/atletas/${athleteId}/performance/relatorios?erro=avaliacao`);
    }

    const evaluation = await prisma.athleteEvaluation.findFirst({
      where: {
        id: evaluationId,
        athleteId,
        organizationId: user.organizationId,
        status: "FINALIZED",
      },
      include: {
        evaluator: {
          select: { name: true },
        },
        template: {
          select: { name: true },
        },
        scores: {
          orderBy: [{ area: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!evaluation) {
      redirect(`/atletas/${athleteId}/performance/relatorios?erro=avaliacao`);
    }

    periodStart = evaluation.periodStart;
    periodEnd = evaluation.periodEnd;
    linkedEvaluationId = evaluation.id;

    snapshot = {
      snapshotVersion: 1,
      generatedAt: new Date().toISOString(),
      reportType,
      athlete: athleteSnapshot,
      evaluation: {
        id: evaluation.id,
        title: evaluation.title,
        templateName: evaluation.template?.name || null,
        athleteRole: evaluation.athleteRole,
        sport: evaluation.sport,
        season: evaluation.season,
        positionSnapshot: evaluation.positionSnapshot,
        evaluatedAt: evaluation.evaluatedAt.toISOString(),
        periodStart: evaluation.periodStart.toISOString(),
        periodEnd: evaluation.periodEnd.toISOString(),
        evaluatorName: evaluation.evaluator?.name || null,
        strengths: evaluation.strengths,
        developmentPoints: evaluation.developmentPoints,
        nextGoals: evaluation.nextGoals,
        summary: evaluation.summary,
        scores: evaluation.scores.map((score) => ({
          area: score.area,
          metricCode: score.metricCode,
          metricLabel: score.metricLabel,
          score: score.score,
          ratingLabel: score.ratingLabel,
          ratingDescription: score.ratingDescription,
          notes: score.notes,
          sortOrder: score.sortOrder,
        })),
      },
    };
  } else {
    periodStart = reportDate(formData.get("periodStart"));
    periodEnd = reportDate(formData.get("periodEnd"), true);

    if (!periodStart || !periodEnd || periodEnd < periodStart) {
      redirect(`/atletas/${athleteId}/performance/relatorios?erro=periodo`);
    }

    if (reportType === "TRAINING") {
      const attendances = await prisma.trainingAttendance.findMany({
        where: {
          organizationId: user.organizationId,
          athleteId,
          session: {
            startsAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        },
        include: {
          session: {
            select: {
              id: true,
              startsAt: true,
              endsAt: true,
              actualStartedAt: true,
              actualEndedAt: true,
              trainingType: true,
              location: true,
              status: true,
            },
          },
        },
        orderBy: {
          session: { startsAt: "asc" },
        },
      });

      const presentStatuses = new Set(["PRESENT", "LATE", "PARTIAL"]);
      const counted = attendances.filter((item) => item.status !== "PENDING");
      const present = counted.filter((item) => presentStatuses.has(item.status));
      const minutes = counted.reduce(
        (sum, item) => sum + (item.minutesPresent || 0),
        0,
      );

      snapshot = {
        snapshotVersion: 1,
        generatedAt: new Date().toISOString(),
        reportType,
        athlete: athleteSnapshot,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        summary: {
          sessions: counted.length,
          present: present.length,
          absences: counted.filter((item) =>
            ["ABSENT", "JUSTIFIED_ABSENCE", "INJURED", "EXCUSED"].includes(
              item.status,
            ),
          ).length,
          attendanceRate: counted.length
            ? Math.round((present.length / counted.length) * 1000) / 10
            : 0,
          minutesPresent: minutes,
        },
        records: counted.map((item) => ({
          id: item.id,
          status: item.status,
          minutesPresent: item.minutesPresent,
          arrivedAt: item.arrivedAt?.toISOString() || null,
          leftAt: item.leftAt?.toISOString() || null,
          justification: item.justification,
          notes: item.notes,
          session: {
            id: item.session.id,
            startsAt: item.session.startsAt.toISOString(),
            endsAt: item.session.endsAt?.toISOString() || null,
            actualStartedAt: item.session.actualStartedAt?.toISOString() || null,
            actualEndedAt: item.session.actualEndedAt?.toISOString() || null,
            trainingType: item.session.trainingType,
            location: item.session.location,
            status: item.session.status,
          },
        })),
      };
    } else if (reportType === "MATCH") {
      const matchStats = await prisma.matchAthleteStat.findMany({
        where: {
          organizationId: user.organizationId,
          athleteId,
          match: {
            startsAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        },
        include: {
          match: {
            select: {
              id: true,
              startsAt: true,
              opponent: true,
              competition: true,
              round: true,
              sport: true,
              status: true,
              goalsFor: true,
              goalsAgainst: true,
              homeAway: true,
              location: true,
            },
          },
        },
        orderBy: {
          match: { startsAt: "asc" },
        },
      });

      const participated = matchStats.filter(
        (item) =>
          (item.minutesPlayed || 0) > 0 ||
          item.lineupRole === "STARTER" ||
          item.lineupRole === "SUBSTITUTE",
      );

      snapshot = {
        snapshotVersion: 1,
        generatedAt: new Date().toISOString(),
        reportType,
        athlete: athleteSnapshot,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        summary: {
          matches: participated.length,
          minutes: matchStats.reduce(
            (sum, item) => sum + (item.minutesPlayed || 0),
            0,
          ),
          goals: matchStats.reduce((sum, item) => sum + item.goals, 0),
          assists: matchStats.reduce((sum, item) => sum + item.assists, 0),
          yellowCards: matchStats.reduce(
            (sum, item) => sum + item.yellowCards,
            0,
          ),
          redCards: matchStats.reduce((sum, item) => sum + item.redCards, 0),
        },
        records: matchStats.map((item) => ({
          id: item.id,
          participation: item.participation,
          lineupRole: item.lineupRole,
          minutesPlayed: item.minutesPlayed,
          positionPlayed: item.positionPlayed,
          jerseyNumber: item.jerseyNumber,
          isCaptain: item.isCaptain,
          goals: item.goals,
          assists: item.assists,
          yellowCards: item.yellowCards,
          redCards: item.redCards,
          notes: item.notes,
          match: {
            id: item.match.id,
            startsAt: item.match.startsAt.toISOString(),
            opponent: item.match.opponent,
            competition: item.match.competition,
            round: item.match.round,
            sport: item.match.sport,
            status: item.match.status,
            goalsFor: item.match.goalsFor,
            goalsAgainst: item.match.goalsAgainst,
            homeAway: item.match.homeAway,
            location: item.match.location,
          },
        })),
      };
    } else {
      const gpsRecords = await prisma.athleteGpsRecord.findMany({
        where: {
          organizationId: user.organizationId,
          athleteId,
          activityAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: { activityAt: "asc" },
      });

      const numbers = gpsRecords.map((record) => ({
        distanceMeters: record.distanceMeters
          ? Number(record.distanceMeters)
          : null,
        maxSpeedKmh: record.maxSpeedKmh ? Number(record.maxSpeedKmh) : null,
        averageSpeedKmh: record.averageSpeedKmh
          ? Number(record.averageSpeedKmh)
          : null,
        highIntensityDistanceMeters: record.highIntensityDistanceMeters
          ? Number(record.highIntensityDistanceMeters)
          : null,
        playerLoad: record.playerLoad ? Number(record.playerLoad) : null,
      }));

      const totalDistance = numbers.reduce(
        (sum, item) => sum + (item.distanceMeters || 0),
        0,
      );
      const totalHighIntensity = numbers.reduce(
        (sum, item) => sum + (item.highIntensityDistanceMeters || 0),
        0,
      );
      const maxSpeed = numbers.reduce(
        (max, item) => Math.max(max, item.maxSpeedKmh || 0),
        0,
      );
      const loads = numbers
        .map((item) => item.playerLoad)
        .filter((value): value is number => value !== null);

      snapshot = {
        snapshotVersion: 1,
        generatedAt: new Date().toISOString(),
        reportType,
        athlete: athleteSnapshot,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        summary: {
          sessions: gpsRecords.length,
          trainingSessions: gpsRecords.filter(
            (item) => item.context === "TRAINING",
          ).length,
          matches: gpsRecords.filter((item) => item.context === "MATCH").length,
          totalDistanceMeters: totalDistance,
          totalHighIntensityDistanceMeters: totalHighIntensity,
          maxSpeedKmh: maxSpeed,
          averagePlayerLoad: loads.length
            ? Math.round(
                (loads.reduce((sum, value) => sum + value, 0) / loads.length) *
                  10,
              ) / 10
            : null,
        },
        records: gpsRecords.map((record) => ({
          id: record.id,
          context: record.context,
          source: record.source,
          activityAt: record.activityAt.toISOString(),
          durationMinutes: record.durationMinutes,
          distanceMeters: record.distanceMeters
            ? Number(record.distanceMeters)
            : null,
          maxSpeedKmh: record.maxSpeedKmh
            ? Number(record.maxSpeedKmh)
            : null,
          averageSpeedKmh: record.averageSpeedKmh
            ? Number(record.averageSpeedKmh)
            : null,
          sprintCount: record.sprintCount,
          highIntensityDistanceMeters: record.highIntensityDistanceMeters
            ? Number(record.highIntensityDistanceMeters)
            : null,
          accelerations: record.accelerations,
          decelerations: record.decelerations,
          playerLoad: record.playerLoad ? Number(record.playerLoad) : null,
          notes: record.notes,
        })),
      };
    }
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const typeLabel = reportTypeLabel(reportType);
  const periodLabel =
    periodStart && periodEnd
      ? `${reportDateLabel(periodStart)} a ${reportDateLabel(periodEnd)}`
      : reportDateLabel(new Date());

  const report = await prisma.performanceReport.create({
    data: {
      organizationId: user.organizationId,
      athleteId,
      evaluationId: linkedEvaluationId,
      generatedByUserId: user.id,
      title: `Relatório de ${typeLabel} · ${periodLabel}`,
      reportType,
      status: "GENERATED",
      periodStart,
      periodEnd,
      includeScores: reportType === "EVALUATION",
      includeInternalNotes: false,
      snapshot,
      fileName: reportFileName(
        athlete.nickname || athlete.name,
        reportType,
        periodStart,
        periodEnd,
      ),
      tokenHash,
    },
    select: { id: true },
  });

  revalidatePath(`/atletas/${athleteId}/performance/relatorios`);

  redirect(`/performance-report/${report.id}?print=1`);
}

