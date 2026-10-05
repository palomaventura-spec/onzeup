"use server";

import { createHash, randomBytes } from "node:crypto";

import {
  Prisma,
  SportType,
  TrainingAttendanceStatus,
  TrainingSessionStatus,
} from "@prisma/client";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { getEffectiveClubRole } from "@/lib/club-permissions";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import {
  buildMeasurementMetrics,
  familyTargetHeight,
  GROWTH_DISCLAIMER,
  khamisRocheProjection,
} from "@/lib/growth-calculations";
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

function numericValue(value: unknown) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function optionalInt(value: FormDataEntryValue | null) {
  const number = optionalNumber(value);
  if (number === null) return null;

  return Number.isInteger(number) ? number : null;
}


function trainingStartAt(date: Date, value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;

  const [hours, minutes] = value.split(":").map(Number);
  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);

  return Number.isNaN(result.getTime()) ? null : result;
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

  let periodStart = formDate(formData.get("periodStart"));
  let periodEnd = formDate(formData.get("periodEnd"));

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

  const trainingScheduleId = nullable(formData.get("trainingScheduleId"));
  const returnToRaw = nullable(formData.get("returnTo"));
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/")
      ? returnToRaw
      : `/atletas/${athleteId}/performance`;

  let trainingSessionId: string | null = null;
  let trainingDate: Date | null = null;

  if (trainingScheduleId) {
    const trainingSchedule = await prisma.trainingSchedule.findFirst({
      where: {
        id: trainingScheduleId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        date: true,
        startTime: true,
        categoryId: true,
        location: true,
        notes: true,
      },
    });

    if (!trainingSchedule?.date) {
      redirect(
        `/atletas/${athleteId}/performance/avaliacoes/nova?erro=treino`,
      );
    }

    trainingDate = trainingSchedule.date;

    const startsAt = trainingStartAt(
      trainingSchedule.date,
      trainingSchedule.startTime,
    );

    if (!startsAt) {
      redirect(
        `/atletas/${athleteId}/performance/avaliacoes/nova?erro=treino`,
      );
    }

    const session = await prisma.trainingSession.findFirst({
      where: {
        organizationId: user.organizationId,
        scheduleId: trainingSchedule.id,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        actualStartedAt: true,
        actualEndedAt: true,
      },
    });

    /*
     * A avaliação aberta a partir de um treino nunca deve criar uma sessão
     * paralela/silenciosa. A sessão precisa ter sido iniciada pelo fluxo de
     * Treinos. Treinos já concluídos continuam aceitos para histórico.
     */
    if (
      !session ||
      (!session.actualStartedAt &&
        session.status !== TrainingSessionStatus.COMPLETED)
    ) {
      redirect(
        `${returnTo}?erro=treino-nao-iniciado&athleteId=${encodeURIComponent(
          athleteId,
        )}`,
      );
    }

    trainingSessionId = session.id;
    periodStart = trainingDate;
    periodEnd = trainingDate;
  }

  if (!periodStart || !periodEnd) {
    redirect(
      `/atletas/${athleteId}/performance/avaliacoes/nova?erro=dados`,
    );
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

  if (trainingSessionId && status === "FINALIZED") {
    const existingEvaluation =
      await prisma.athleteEvaluation.findFirst({
        where: {
          organizationId: user.organizationId,
          athleteId: athlete.id,
          trainingSessionId,
          status: "FINALIZED",
        },
        select: {
          id: true,
        },
        orderBy: {
          evaluatedAt: "desc",
        },
      });

    if (existingEvaluation) {
      revalidatePath(`/treinos/${trainingScheduleId}`);

      redirect(
        `${returnTo}?status=avaliacao-ja-existente&athleteId=${encodeURIComponent(
          athleteId,
        )}&evaluationId=${encodeURIComponent(
          existingEvaluation.id,
        )}`,
      );
    }
  }
  /*
   * Se a avaliação pertence a um treino e está sendo FINALIZADA, presença
   * e avaliação precisam permanecer coerentes.
   *
   * - PRESente / atraso / parcial já registrados: preserva.
   * - Ausência registrada: não sobrescreve silenciosamente.
   * - Sem chamada ou PENDING: cria/atualiza como PRESENTE.
   *
   * Isso também protege chamadas antigas/URLs abertas diretamente.
   */
  if (trainingSessionId && status === "FINALIZED") {
    const attendance = await prisma.trainingAttendance.findUnique({
      where: {
        sessionId_athleteId: {
          sessionId: trainingSessionId,
          athleteId: athlete.id,
        },
      },
      select: {
        status: true,
      },
    });

    if (
      attendance?.status === TrainingAttendanceStatus.ABSENT ||
      attendance?.status === TrainingAttendanceStatus.JUSTIFIED_ABSENCE ||
      attendance?.status === TrainingAttendanceStatus.EXCUSED ||
      attendance?.status === TrainingAttendanceStatus.INJURED
    ) {
      redirect(
        `${returnTo}?erro=avaliacao-conflito-presenca&athleteId=${encodeURIComponent(
          athleteId,
        )}`,
      );
    }
  }

  const evaluation = await prisma.$transaction(async (tx) => {
    const createdEvaluation = await tx.athleteEvaluation.create({
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
        trainingSessionId,
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

    if (trainingSessionId && status === "FINALIZED") {
      const session = await tx.trainingSession.findUnique({
        where: { id: trainingSessionId },
        select: {
          actualStartedAt: true,
          actualEndedAt: true,
        },
      });

      const minutesPresent =
        session?.actualStartedAt &&
        session.actualEndedAt &&
        session.actualEndedAt > session.actualStartedAt
          ? Math.round(
              (session.actualEndedAt.getTime() -
                session.actualStartedAt.getTime()) /
                60_000,
            )
          : null;

      const existingAttendance =
        await tx.trainingAttendance.findUnique({
          where: {
            sessionId_athleteId: {
              sessionId: trainingSessionId,
              athleteId: athlete.id,
            },
          },
          select: {
            id: true,
            status: true,
          },
        });

      if (!existingAttendance) {
        await tx.trainingAttendance.create({
          data: {
            organizationId: user.organizationId,
            sessionId: trainingSessionId,
            athleteId: athlete.id,
            status: TrainingAttendanceStatus.PRESENT,
            minutesPresent,
            recordedByUserId: user.id,
          },
        });
      } else if (
        existingAttendance.status ===
        TrainingAttendanceStatus.PENDING
      ) {
        await tx.trainingAttendance.update({
          where: {
            id: existingAttendance.id,
          },
          data: {
            status: TrainingAttendanceStatus.PRESENT,
            minutesPresent,
            recordedByUserId: user.id,
          },
        });
      }
      /*
       * PRESENT, LATE e PARTIAL já registrados pela chamada
       * são preservados. A avaliação nunca transforma atraso/parcial
       * em presença integral.
       */
    }

    return createdEvaluation;
  });

  revalidatePath("/performance");
  revalidatePath(`/atletas/${athleteId}/performance`);
  revalidatePath(`/atletas/${athleteId}/performance/avaliacoes/${evaluation.id}`);

  if (trainingScheduleId) {
    revalidatePath(`/treinos/${trainingScheduleId}`);
    revalidatePath("/treinos");
  }

  redirect(
    trainingScheduleId
      ? `${returnTo}?status=${
          status === "FINALIZED"
            ? "avaliacao-finalizada"
            : "rascunho-salvo"
        }&athleteId=${encodeURIComponent(athleteId)}&evaluationId=${encodeURIComponent(evaluation.id)}`
      : `/atletas/${athleteId}/performance?status=${
          status === "FINALIZED" ? "avaliacao-finalizada" : "rascunho-salvo"
        }`,
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
  "TECHNICAL_RECORD",
] as const;

type IndividualReportType = (typeof INDIVIDUAL_REPORT_TYPES)[number];

// Uma modalidade so e atribuida quando a origem dos dados a identifica.
// Dados mistos ou sem modalidade identificavel permanecem como BOTH.
function sourceSport(
  primary: SportType | null | undefined,
  linked?: SportType | null,
): SportType {
  const first = primary ?? SportType.BOTH;
  const second = linked ?? SportType.BOTH;

  if (first === SportType.BOTH) return second;
  if (second === SportType.BOTH || first === second) return first;
  return SportType.BOTH;
}

function reportSportFromRecords(sports: SportType[]): SportType {
  const unique = new Set(sports);
  return unique.size === 1 ? (sports[0] ?? SportType.BOTH) : SportType.BOTH;
}

function reportDate(value: FormDataEntryValue | null, endOfDay = false) {
  const raw = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;

  const date = new Date(
    `${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`,
  );
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
    case "TECHNICAL_RECORD":
      return "registro técnico";
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

  const suffix =
    start && end
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

export async function generateIndividualPerformanceReport(
  formData: FormData,
) {
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
  const rawSport = clean(formData.get("sport"));
  const requestedSport: SportType | null =
    rawSport === SportType.FOOTBALL
      ? SportType.FOOTBALL
      : rawSport === SportType.FUTSAL
        ? SportType.FUTSAL
        : null;

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
  let reportSport: SportType = SportType.BOTH;
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
      redirect(
        `/atletas/${athleteId}/performance/relatorios?erro=avaliacao`,
      );
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
        trainingSession: {
          select: { sport: true, category: { select: { sport: true } } },
        },
        scores: {
          orderBy: [{ area: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!evaluation) {
      redirect(
        `/atletas/${athleteId}/performance/relatorios?erro=avaliacao`,
      );
    }

    periodStart = evaluation.periodStart;
    periodEnd = evaluation.periodEnd;
    linkedEvaluationId = evaluation.id;
    reportSport = sourceSport(
      evaluation.sport,
      evaluation.trainingSession
        ? sourceSport(evaluation.trainingSession.category.sport, evaluation.trainingSession.sport)
        : null,
    );

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

    if (reportType === "TECHNICAL_RECORD") {
      // O Registro Técnico é independente da Avaliação Profissional.
      // Somente registros que a comissão marcou como compartilháveis
      // podem ser copiados para um documento imprimível.
      const entries = await prisma.athleteHistoryEntry.findMany({
        where: {
          organizationId: user.organizationId,
          athleteId,
          visibility: "SHAREABLE",
          source: { in: ["TRAINING", "MATCH", "MANUAL"] },
          occurredAt: { gte: periodStart, lte: periodEnd },
          ...(requestedSport ? { sportSnapshot: requestedSport } : {}),
        },
        orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          occurredAt: true,
          source: true,
          sourceLabelSnapshot: true,
          topic: true,
          visibility: true,
          title: true,
          content: true,
          followUpRequired: true,
          followUpResolvedAt: true,
          sportSnapshot: true,
          categoryNameSnapshot: true,
          authorNameSnapshot: true,
          resolvedByNameSnapshot: true,
        },
      });

      if (!entries.length) {
        redirect(`/atletas/${athleteId}/performance/relatorios?erro=sem-registros`);
      }

      reportSport = reportSportFromRecords(
        entries.map((entry) => entry.sportSnapshot ?? SportType.BOTH),
      );

      snapshot = {
        snapshotVersion: 1,
        generatedAt: new Date().toISOString(),
        documentKind: "TECHNICAL_RECORD",
        reportType,
        athlete: athleteSnapshot,
        period: {
          start: periodStart.toISOString(),
          end: periodEnd.toISOString(),
        },
        summary: {
          entries: entries.length,
          followUps: entries.filter((entry) => entry.followUpRequired).length,
          pendingFollowUps: entries.filter(
            (entry) => entry.followUpRequired && !entry.followUpResolvedAt,
          ).length,
        },
        records: entries.map((entry) => ({
          id: entry.id,
          occurredAt: entry.occurredAt.toISOString(),
          source: entry.source,
          sourceLabelSnapshot: entry.sourceLabelSnapshot,
          topic: entry.topic,
          visibility: entry.visibility,
          title: entry.title,
          content: entry.content,
          followUpRequired: entry.followUpRequired,
          followUpResolvedAt: entry.followUpResolvedAt?.toISOString() ?? null,
          sportSnapshot: entry.sportSnapshot,
          categoryNameSnapshot: entry.categoryNameSnapshot,
          authorNameSnapshot: entry.authorNameSnapshot,
          resolvedByNameSnapshot: entry.resolvedByNameSnapshot,
        })),
      };
    } else if (reportType === "TRAINING") {
      let attendances = await prisma.trainingAttendance.findMany({
        where: {
          organizationId: user.organizationId,
          athleteId,
          session: {
            status: "COMPLETED",
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
              sport: true,
              location: true,
              status: true,
              durationSource: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  sport: true,
                },
              },
            },
          },
        },
        orderBy: {
          session: { startsAt: "asc" },
        },
      });

      if (requestedSport) {
        attendances = attendances.filter(
          (item) =>
            sourceSport(item.session.category.sport, item.session.sport) ===
            requestedSport,
        );
      }

      const presentStatuses = new Set(["PRESENT", "LATE", "PARTIAL"]);
      const counted = attendances.filter((item) => item.status !== "PENDING");
      reportSport =
        requestedSport ??
        reportSportFromRecords(
          counted.map((item) =>
            sourceSport(item.session.category.sport, item.session.sport),
          ),
        );
      const present = counted.filter((item) =>
        presentStatuses.has(item.status),
      );
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
          absences: counted.filter(
            (item) => item.status === "ABSENT",
          ).length,
          justifiedAbsences: counted.filter(
            (item) =>
              item.status === "JUSTIFIED_ABSENCE",
          ).length,
          otherZeroAttendances: counted.filter((item) =>
            ["INJURED", "EXCUSED"].includes(item.status),
          ).length,
          attendanceRate: counted.length
            ? Math.round((present.length / counted.length) * 1000) / 10
            : 0,
          minutesPresent: minutes,
          minutesAvailable: counted.reduce((sum, item) => {
            const start =
              item.session.actualStartedAt ??
              item.session.startsAt;
            const end =
              item.session.actualEndedAt ??
              item.session.endsAt;

            if (!end || end <= start) return sum;

            return (
              sum +
              Math.round(
                (end.getTime() - start.getTime()) /
                  60_000,
              )
            );
          }, 0),
        },
        records: counted.map((item) => {
          const sessionStart =
            item.session.actualStartedAt ??
            item.session.startsAt;
          const sessionEnd =
            item.session.actualEndedAt ??
            item.session.endsAt;

          const durationMinutes =
            sessionEnd && sessionEnd > sessionStart
              ? Math.round(
                  (sessionEnd.getTime() -
                    sessionStart.getTime()) /
                    60_000,
                )
              : null;

          const participationPercent =
            durationMinutes &&
            item.minutesPresent !== null
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    Math.round(
                      (item.minutesPresent /
                        durationMinutes) *
                        1000,
                    ) / 10,
                  ),
                )
              : null;

          return {
            id: item.id,
            status: item.status,
            minutesPresent: item.minutesPresent,
            durationMinutes,
            participationPercent,
            arrivedAt:
              item.arrivedAt?.toISOString() || null,
            leftAt:
              item.leftAt?.toISOString() || null,
            justification: item.justification,
            notes: item.notes,
            session: {
              id: item.session.id,
              startsAt:
                item.session.startsAt.toISOString(),
              endsAt:
                item.session.endsAt?.toISOString() ||
                null,
              actualStartedAt:
                item.session.actualStartedAt?.toISOString() ||
                null,
              actualEndedAt:
                item.session.actualEndedAt?.toISOString() ||
                null,
              trainingType:
                item.session.trainingType,
              sport: item.session.sport,
              location: item.session.location,
              status: item.session.status,
              durationSource:
                item.session.durationSource,
              category: item.session.category,
            },
          };
        }),
      };
    } else if (reportType === "MATCH") {
      let matchStats = await prisma.matchAthleteStat.findMany({
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

      if (requestedSport) {
        matchStats = matchStats.filter(
          (item) => item.match.sport === requestedSport,
        );
      }
      reportSport =
        requestedSport ??
        reportSportFromRecords(matchStats.map((item) => item.match.sport));

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
          redCards: matchStats.reduce(
            (sum, item) => sum + item.redCards,
            0,
          ),
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
      let gpsRecords = await prisma.athleteGpsRecord.findMany({
        where: {
          organizationId: user.organizationId,
          athleteId,
          activityAt: {
            gte: periodStart,
            lte: periodEnd,
          },
        },
        orderBy: { activityAt: "asc" },
        include: {
          trainingSession: {
            select: {
              sport: true,
              category: { select: { sport: true } },
            },
          },
          match: { select: { sport: true } },
        },
      });

      const gpsSport = (record: (typeof gpsRecords)[number]): SportType => {
        const linkedSport = record.match
          ? record.match.sport
          : record.trainingSession
            ? sourceSport(
                record.trainingSession.category.sport,
                record.trainingSession.sport,
              )
            : SportType.BOTH;
        return sourceSport(record.sport, linkedSport);
      };

      if (requestedSport) {
        gpsRecords = gpsRecords.filter(
          (record) => gpsSport(record) === requestedSport,
        );
      }
      reportSport =
        requestedSport ??
        reportSportFromRecords(gpsRecords.map(gpsSport));

      const numbers = gpsRecords.map((record) => ({
        distanceMeters: record.distanceMeters
          ? Number(record.distanceMeters)
          : null,
        maxSpeedKmh: record.maxSpeedKmh
          ? Number(record.maxSpeedKmh)
          : null,
        averageSpeedKmh: record.averageSpeedKmh
          ? Number(record.averageSpeedKmh)
          : null,
        highIntensityDistanceMeters:
          record.highIntensityDistanceMeters
            ? Number(record.highIntensityDistanceMeters)
            : null,
        playerLoad: record.playerLoad
          ? Number(record.playerLoad)
          : null,
      }));

      const totalDistance = numbers.reduce(
        (sum, item) => sum + (item.distanceMeters || 0),
        0,
      );
      const totalHighIntensity = numbers.reduce(
        (sum, item) =>
          sum + (item.highIntensityDistanceMeters || 0),
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
          matches: gpsRecords.filter(
            (item) => item.context === "MATCH",
          ).length,
          totalDistanceMeters: totalDistance,
          totalHighIntensityDistanceMeters: totalHighIntensity,
          maxSpeedKmh: maxSpeed,
          averagePlayerLoad: loads.length
            ? Math.round(
                (loads.reduce((sum, value) => sum + value, 0) /
                  loads.length) *
                  10,
              ) / 10
            : null,
        },
        records: gpsRecords.map((record) => ({
          id: record.id,
          context: record.context,
          source: record.source,
          sport: gpsSport(record),
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
          highIntensityDistanceMeters:
            record.highIntensityDistanceMeters
              ? Number(record.highIntensityDistanceMeters)
              : null,
          accelerations: record.accelerations,
          decelerations: record.decelerations,
          playerLoad: record.playerLoad
            ? Number(record.playerLoad)
            : null,
          notes: record.notes,
        })),
      };
    }
  }

  // Congela tambem a modalidade no documento e em seu registro de historico.
  snapshot = { ...snapshot, sport: reportSport };

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
      sport: reportSport,
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


/**
 * Prontuário esportivo: snapshot independente dos relatórios individuais.
 * Somente o gestor do clube (não o suporte) pode gerar as duas versões.
 * O compartilhável não copia documentação, notas internas ou observações
 * técnicas que não estejam explicitamente marcadas como SHAREABLE.
 */
export async function generateSportsDossier(formData: FormData) {
  const user = await requireEliteReportGeneration();
  if (user.role === "SUPER_ADMIN" || getEffectiveClubRole(user) !== "MANAGER") {
    redirect("/acesso-bloqueado");
  }

  const athleteId = clean(formData.get("athleteId"));
  const audience = clean(formData.get("audience"));
  const internal = audience === "INTERNAL";
  if (!athleteId || (audience !== "INTERNAL" && audience !== "SHAREABLE")) {
    redirect(`/atletas/${athleteId || "invalido"}/performance/relatorios?erro=dados`);
  }
  if (!internal && clean(formData.get("confirmShare")) !== "yes") {
    redirect(`/atletas/${athleteId}/performance/relatorios?erro=confirmacao`);
  }

  const periodStart = reportDate(formData.get("periodStart"));
  const periodEnd = reportDate(formData.get("periodEnd"), true);
  if (!periodStart || !periodEnd || periodEnd < periodStart) {
    redirect(`/atletas/${athleteId}/performance/relatorios?erro=periodo`);
  }
  const sportRaw = clean(formData.get("sport"));
  const selectedSport: SportType | null = sportRaw === "FOOTBALL"
    ? SportType.FOOTBALL : sportRaw === "FUTSAL" ? SportType.FUTSAL : null;

  const allowedSections = ["TRAINING", "MATCH", "GPS", "EVALUATION", "TECHNICAL_RECORD", "MEASUREMENTS", "GROWTH", "DOCUMENTS"] as const;
  const requested = new Set(formData.getAll("sections").map((value) => String(value)));
  // Crescimento/projeções e documentos são sempre privados e nunca entram no compartilhável.
  const sections = allowedSections.filter((item) =>
    requested.has(item) && (internal || (item !== "DOCUMENTS" && item !== "GROWTH")),
  );
  if (!sections.length) {
    redirect(`/atletas/${athleteId}/performance/relatorios?erro=secoes`);
  }

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, organizationId: user.organizationId },
    select: {
      id: true, name: true, nickname: true, position: true, photoUrl: true, categoryId: true,
      category: { select: { name: true } },
      privateData: { select: { birthDate: true } },
      growthProfile: { select: { referenceSex: true, fatherHeightCm: true, motherHeightCm: true } },
    },
  });
  if (!athlete) redirect(`/atletas/${athleteId}/performance/relatorios?erro=acesso`);

  const [
    attendances,
    matchStats,
    gpsRecords,
    evaluations,
    historyEntries,
    measurements,
    documents,
    growthMeasurements,
    boneAgeAssessments,
  ] = await Promise.all([
    sections.includes("TRAINING") ? prisma.trainingAttendance.findMany({
      where: {
        organizationId: user.organizationId, athleteId,
        session: { status: "COMPLETED", startsAt: { gte: periodStart, lte: periodEnd } },
      },
      include: { session: { select: {
        startsAt: true, trainingType: true, sport: true, location: true,
        category: { select: { name: true, sport: true } },
      } } },
      orderBy: { session: { startsAt: "asc" } },
    }) : Promise.resolve([]),
    sections.includes("MATCH") ? prisma.matchAthleteStat.findMany({
      where: {
        organizationId: user.organizationId, athleteId,
        match: { startsAt: { gte: periodStart, lte: periodEnd } },
      },
      include: { match: { select: {
        startsAt: true, opponent: true, competition: true, sport: true,
      } } },
      orderBy: { match: { startsAt: "asc" } },
    }) : Promise.resolve([]),
    sections.includes("GPS") ? prisma.athleteGpsRecord.findMany({
      where: { organizationId: user.organizationId, athleteId,
        activityAt: { gte: periodStart, lte: periodEnd } },
      orderBy: { activityAt: "asc" },
    }) : Promise.resolve([]),
    sections.includes("EVALUATION") ? prisma.athleteEvaluation.findMany({
      where: { organizationId: user.organizationId, athleteId, status: "FINALIZED",
        evaluatedAt: { gte: periodStart, lte: periodEnd } },
      include: {
        evaluator: { select: { name: true } },
        template: { select: { name: true } },
        trainingSession: { select: { sport: true, category: { select: { sport: true } } } },
        scores: { orderBy: [{ area: "asc" }, { sortOrder: "asc" }] },
      },
      orderBy: { evaluatedAt: "asc" },
    }) : Promise.resolve([]),
    sections.includes("TECHNICAL_RECORD") ? prisma.athleteHistoryEntry.findMany({
      where: {
        organizationId: user.organizationId, athleteId,
        occurredAt: { gte: periodStart, lte: periodEnd },
        ...(!internal ? { visibility: "SHAREABLE" as const } : {}),
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    }) : Promise.resolve([]),
    sections.includes("MEASUREMENTS") ? prisma.athleteBodyMeasurement.findMany({
      where: { organizationId: user.organizationId, athleteId,
        measuredAt: { gte: periodStart, lte: periodEnd } },
      orderBy: { measuredAt: "asc" },
    }) : Promise.resolve([]),
    internal && sections.includes("DOCUMENTS") ? prisma.athleteDocument.findMany({
      where: { organizationId: user.organizationId, athleteId, deletedAt: null,
        createdAt: { lte: periodEnd } },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, category: true, status: true,
        originalFileName: true, createdAt: true, expiresAt: true },
    }) : Promise.resolve([]),
    internal && sections.includes("GROWTH") ? prisma.athleteBodyMeasurement.findMany({
      where: { organizationId: user.organizationId, athleteId, measuredAt: { lte: periodEnd } },
      orderBy: [{ measuredAt: "asc" }, { createdAt: "asc" }],
    }) : Promise.resolve([]),
    internal && sections.includes("GROWTH") ? prisma.athleteBoneAgeAssessment.findMany({
      where: { organizationId: user.organizationId, athleteId, examinedAt: { lte: periodEnd } },
      orderBy: { examinedAt: "asc" },
      select: { id: true, examinedAt: true, boneAgeMonths: true, method: true },
    }) : Promise.resolve([]),
  ]);

  const inSport = (value: SportType | null | undefined) =>
    !selectedSport || value === selectedSport;
  const training = attendances.filter((item) =>
    inSport(sourceSport(item.session.category.sport, item.session.sport)) && item.status !== "PENDING",
  );
  const matches = matchStats.filter((item) => inSport(item.match.sport));
  const gps = gpsRecords.filter((item) => inSport(item.sport));
  const evaluationSport = (item: (typeof evaluations)[number]): SportType =>
    sourceSport(item.sport, item.trainingSession
      ? sourceSport(item.trainingSession.category.sport, item.trainingSession.sport)
      : null);
  const evals = evaluations.filter((item) => inSport(evaluationSport(item)));
  const history = historyEntries.filter((item) =>
    !selectedSport || item.sportSnapshot === selectedSport,
  );
  const present = training.filter((item) => ["PRESENT", "LATE", "PARTIAL"].includes(item.status));

  const growthMetrics = internal && sections.includes("GROWTH")
    ? buildMeasurementMetrics(
        growthMeasurements.map((item) => ({
          id: item.id,
          measuredAt: item.measuredAt,
          heightCm: numericValue(item.heightCm),
          weightKg: numericValue(item.weightKg),
          bmi: numericValue(item.bmi),
          wingspanCm: numericValue(item.wingspanCm),
          sittingHeightCm: numericValue(item.sittingHeightCm),
        })),
        athlete.privateData?.birthDate ?? null,
      )
    : [];
  const growthLatest = growthMetrics[growthMetrics.length - 1] ?? null;
  const growthTarget = internal && sections.includes("GROWTH")
    ? familyTargetHeight({
        sex: athlete.growthProfile?.referenceSex,
        fatherHeightCm: numericValue(athlete.growthProfile?.fatherHeightCm),
        motherHeightCm: numericValue(athlete.growthProfile?.motherHeightCm),
      })
    : null;
  const growthProjection = growthLatest?.exactAge
    ? khamisRocheProjection({
        sex: athlete.growthProfile?.referenceSex,
        ageYears: growthLatest.exactAge.decimalYears,
        heightCm: growthLatest.heightCm,
        weightKg: growthLatest.weightKg,
        fatherHeightCm: numericValue(athlete.growthProfile?.fatherHeightCm),
        motherHeightCm: numericValue(athlete.growthProfile?.motherHeightCm),
      })
    : null;

  const snapshot: Prisma.InputJsonObject = {
    snapshotVersion: 2,
    documentKind: internal ? "INTERNAL_DOSSIER" : "SHAREABLE_DOSSIER",
    audience,
    generatedAt: new Date().toISOString(),
    generatedByName: user.name || null,
    sections,
    athlete: { id: athlete.id, name: athlete.name, nickname: athlete.nickname,
      photoUrl: athlete.photoUrl, position: athlete.position, categoryName: athlete.category?.name ?? null },
    period: { start: periodStart.toISOString(), end: periodEnd.toISOString() },
    selectedSport: selectedSport ?? "BOTH",
    ...(sections.includes("TRAINING") ? { training: {
      summary: {
        sessions: training.length, present: present.length,
        attendanceRate: training.length ? Math.round(1000 * present.length / training.length) / 10 : 0,
        minutesPresent: training.reduce((total, item) => total + (item.minutesPresent ?? 0), 0),
      },
      records: training.map((item) => ({
        date: item.session.startsAt.toISOString(),
        category: item.session.category.name,
        sport: sourceSport(item.session.category.sport, item.session.sport),
        trainingType: item.session.trainingType, location: item.session.location,
        status: !internal && item.status === "INJURED" ? "NOT_DISCLOSED" : item.status,
        minutesPresent: item.minutesPresent,
        ...(internal ? { justification: item.justification, notes: item.notes } : {}),
      })),
    } } : {}),
    ...(sections.includes("MATCH") ? { matches: {
      summary: {
        matches: matches.length,
        goals: matches.reduce((total, item) => total + item.goals, 0),
        assists: matches.reduce((total, item) => total + item.assists, 0),
        minutes: matches.reduce((total, item) => total + (item.minutesPlayed ?? 0), 0),
      },
      records: matches.map((item) => ({
        date: item.match.startsAt.toISOString(), opponent: item.match.opponent,
        competition: item.match.competition, sport: item.match.sport,
        goals: item.goals, assists: item.assists, minutesPlayed: item.minutesPlayed,
        lineupRole: item.lineupRole,
        ...(internal ? { notes: item.notes } : {}),
      })),
    } } : {}),
    ...(sections.includes("GPS") ? { gps: {
      summary: {
        sessions: gps.length,
        totalDistanceMeters: gps.reduce((sum, item) => sum + Number(item.distanceMeters ?? 0), 0),
        maxSpeedKmh: gps.reduce((max, item) => Math.max(max, Number(item.maxSpeedKmh ?? 0)), 0),
      },
      records: gps.map((item) => ({
        date: item.activityAt.toISOString(), sport: item.sport, context: item.context,
        durationMinutes: item.durationMinutes,
        distanceMeters: item.distanceMeters === null ? null : Number(item.distanceMeters),
        maxSpeedKmh: item.maxSpeedKmh === null ? null : Number(item.maxSpeedKmh),
        sprintCount: item.sprintCount,
        ...(internal ? { notes: item.notes } : {}),
      })),
    } } : {}),
    ...(sections.includes("EVALUATION") ? { evaluations: evals.map((item) => ({
      id: item.id, title: item.title ?? item.template?.name ?? "Avaliação",
      sport: evaluationSport(item), date: item.evaluatedAt.toISOString(),
      evaluatorName: item.evaluator?.name ?? null,
      strengths: item.strengths, developmentPoints: item.developmentPoints,
      nextGoals: item.nextGoals, summary: item.summary,
      ...(internal ? { internalNotes: item.internalNotes } : {}),
      scores: item.scores.map((score) => ({
        area: score.area, criterion: score.metricLabel,
        score: score.score, level: score.ratingLabel, description: score.ratingDescription,
        ...(internal ? { notes: score.notes } : {}),
      })),
    })) } : {}),
    ...(sections.includes("TECHNICAL_RECORD") ? { technicalRecords: history.map((entry) => ({
      id: entry.id, date: entry.occurredAt.toISOString(),
      title: entry.title, topic: entry.topic, source: entry.source,
      sourceLabel: entry.sourceLabelSnapshot, sport: entry.sportSnapshot,
      category: entry.categoryNameSnapshot, author: entry.authorNameSnapshot,
      visibility: entry.visibility, content: entry.content,
      followUpRequired: entry.followUpRequired,
      followUpResolvedAt: entry.followUpResolvedAt?.toISOString() ?? null,
      resolvedByName: entry.resolvedByNameSnapshot,
    })) } : {}),
    ...(sections.includes("MEASUREMENTS") ? { measurements: measurements.map((item) => ({
      date: item.measuredAt.toISOString(),
      heightCm: item.heightCm === null ? null : Number(item.heightCm),
      weightKg: item.weightKg === null ? null : Number(item.weightKg),
      wingspanCm: item.wingspanCm === null ? null : Number(item.wingspanCm),
      ...(internal ? {
        bmi: item.bmi === null ? null : Number(item.bmi),
        bodyFatPercent: item.bodyFatPercent === null ? null : Number(item.bodyFatPercent),
        muscleMassKg: item.muscleMassKg === null ? null : Number(item.muscleMassKg),
        notes: item.notes,
      } : {}),
    })) } : {}),
    ...(internal && sections.includes("GROWTH") ? { growth: {
      whoReference: "OMS 2007 · altura por idade · 5–19 anos",
      referenceSex: athlete.growthProfile?.referenceSex ?? null,
      latest: growthLatest ? {
        date: growthLatest.measuredAt.toISOString(),
        ageLabel: growthLatest.exactAge?.label ?? null,
        ageMonths: growthLatest.exactAge?.totalMonths ?? null,
        heightCm: growthLatest.heightCm,
        weightKg: growthLatest.weightKg,
        bmi: growthLatest.bmi ?? null,
        growthDeltaCm: growthLatest.growthDeltaCm ?? null,
        growthVelocityCmPerYear: growthLatest.growthVelocityCmPerYear ?? null,
      } : null,
      targetHeight: growthTarget,
      khamisRoche: growthProjection,
      measurements: growthMetrics.map((item) => ({
        id: item.id,
        date: item.measuredAt.toISOString(),
        ageLabel: item.exactAge?.label ?? null,
        ageMonths: item.exactAge?.totalMonths ?? null,
        heightCm: item.heightCm,
        weightKg: item.weightKg,
        bmi: item.bmi ?? null,
        wingspanCm: item.wingspanCm ?? null,
        sittingHeightCm: item.sittingHeightCm ?? null,
        growthDeltaCm: item.growthDeltaCm ?? null,
        growthVelocityCmPerYear: item.growthVelocityCmPerYear ?? null,
      })),
      boneAgeAssessments: boneAgeAssessments.map((item) => ({
        id: item.id,
        date: item.examinedAt.toISOString(),
        boneAgeMonths: item.boneAgeMonths,
        method: item.method,
      })),
      disclaimer: GROWTH_DISCLAIMER,
    } } : {}),
    ...(internal && sections.includes("DOCUMENTS") ? { documents: documents.map((item) => ({
      id: item.id, title: item.title, category: item.category,
      status: item.status, originalFileName: item.originalFileName,
      createdAt: item.createdAt.toISOString(),
      expiresAt: item.expiresAt?.toISOString() ?? null,
    })) } : {}),
  };

  const rawToken = randomBytes(32).toString("hex");
  const report = await prisma.performanceReport.create({
    data: {
      organizationId: user.organizationId, athleteId,
      generatedByUserId: user.id,
      title: `Prontuário ${internal ? "interno" : "compartilhável"} · ${reportDateLabel(periodStart)} a ${reportDateLabel(periodEnd)}`,
      reportType: "CONSOLIDATED", sport: selectedSport ?? SportType.BOTH,
      status: "GENERATED", periodStart, periodEnd,
      includeScores: sections.includes("EVALUATION"), includeInternalNotes: internal,
      snapshot,
      fileName: `11up-prontuario-${internal ? "interno" : "compartilhavel"}-${athlete.id}-${periodStart.toISOString().slice(0,10)}.pdf`,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    },
    select: { id: true },
  });
  revalidatePath(`/atletas/${athleteId}/performance/relatorios`);
  revalidatePath(`/atletas/${athleteId}/dados`);
  redirect(`/performance-report/${report.id}`);
}
