"use server";

import {
  Prisma,
  TrainingAttendanceStatus,
  TrainingAuditAction,
  TrainingDurationSource,
  TrainingSessionStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getClubTrainingCategoryAccess,
  requireClubPermission,
} from "@/lib/club-access";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(input: FormDataEntryValue | null): string | null {
  const normalized = clean(input);
  return normalized || null;
}

async function validateCategory(
  categoryId: string,
  organizationId: string,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId,
    },
    select: {
      id: true,
    },
  });

  return category?.id ?? null;
}

function parseTrainingDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function dateWithTime(date: Date, value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;

  const [hours, minutes] = value.split(":").map(Number);
  const result = new Date(date);

  result.setHours(hours, minutes, 0, 0);

  return Number.isNaN(result.getTime()) ? null : result;
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / 60_000),
  );
}

function effectiveSessionBounds(session: {
  startsAt: Date;
  endsAt: Date | null;
  actualStartedAt: Date | null;
  actualEndedAt: Date | null;
}) {
  const hasCompleteActualWindow =
    Boolean(session.actualStartedAt) &&
    Boolean(session.actualEndedAt);

  const start =
    hasCompleteActualWindow && session.actualStartedAt
      ? session.actualStartedAt
      : session.startsAt;

  const end =
    hasCompleteActualWindow && session.actualEndedAt
      ? session.actualEndedAt
      : session.endsAt;

  return {
    start,
    end,
    source: hasCompleteActualWindow
      ? TrainingDurationSource.ACTUAL_DURATION_USED
      : TrainingDurationSource.SCHEDULED_DURATION_USED,
  };
}

function attendanceMinutes(input: {
  status: TrainingAttendanceStatus;
  arrivedAt: Date | null;
  leftAt: Date | null;
  sessionStart: Date;
  sessionEnd: Date | null;
}) {
  if (
    input.status === TrainingAttendanceStatus.ABSENT ||
    input.status === TrainingAttendanceStatus.JUSTIFIED_ABSENCE ||
    input.status === TrainingAttendanceStatus.EXCUSED ||
    input.status === TrainingAttendanceStatus.INJURED
  ) {
    return 0;
  }

  if (!input.sessionEnd) return null;

  const totalMinutes = minutesBetween(
    input.sessionStart,
    input.sessionEnd,
  );

  if (totalMinutes <= 0) return 0;

  const athleteStart =
    input.arrivedAt && input.arrivedAt > input.sessionStart
      ? input.arrivedAt
      : input.sessionStart;

  const athleteEnd =
    input.leftAt && input.leftAt < input.sessionEnd
      ? input.leftAt
      : input.sessionEnd;

  if (athleteEnd <= athleteStart) return 0;

  return Math.min(
    totalMinutes,
    minutesBetween(athleteStart, athleteEnd),
  );
}

function normalizeAttendanceStatus(
  value: string,
): TrainingAttendanceStatus | null {
  switch (value) {
    case "PRESENT":
      return TrainingAttendanceStatus.PRESENT;
    case "ABSENT":
      return TrainingAttendanceStatus.ABSENT;
    case "JUSTIFIED_ABSENCE":
      return TrainingAttendanceStatus.JUSTIFIED_ABSENCE;
    case "LATE":
      return TrainingAttendanceStatus.LATE;
    case "PARTIAL":
      return TrainingAttendanceStatus.PARTIAL;
    default:
      return null;
  }
}

async function createTrainingAudit(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    scheduleId?: string | null;
    sessionId?: string | null;
    attendanceId?: string | null;
    actorUserId?: string | null;
    action: TrainingAuditAction;
    metadata?: Prisma.InputJsonValue;
  },
) {
  await tx.trainingAuditLog.create({
    data: {
      organizationId: input.organizationId,
      scheduleId: input.scheduleId ?? null,
      sessionId: input.sessionId ?? null,
      attendanceId: input.attendanceId ?? null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      metadataJson: input.metadata,
    },
  });
}

async function findTrainingForAttendance(
  scheduleId: string,
  organizationId: string,
) {
  return prisma.trainingSchedule.findFirst({
    where: {
      id: scheduleId,
      organizationId,
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      endTime: true,
      location: true,
      categoryId: true,
      sport: true,
      trainingType: true,
      responsibleStaffMemberId: true,
    },
  });
}

async function findEligibleTrainingAthletes(
  organizationId: string,
  categoryId: string,
  sport: "FOOTBALL" | "FUTSAL" | "BOTH",
) {
  return prisma.athlete.findMany({
    where: {
      organizationId,
      active: true,
      OR: [
        {
          categoryId,
        },
        {
          memberships: {
            some: {
              organizationId,
              categoryId,
              status: "ACTIVE",
              sport: {
                in: ["BOTH", sport],
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });
}

function revalidateTrainingPaths(scheduleId: string) {
  revalidatePath(`/treinos/${scheduleId}`);
  revalidatePath("/treinos");
  revalidatePath("/agenda");
  revalidatePath("/performance");
  revalidatePath("/dashboard");
}

export async function createTraining(formData: FormData) {
  const user = await requireClubPermission("TRAININGS_EDIT");

  const categoryId = await validateCategory(
    clean(formData.get("categoryId")),
    user.organizationId,
  );

  const date = parseTrainingDate(clean(formData.get("date")));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));

  if (!categoryId || !date || !startTime || !endTime) return;

  const training = await prisma.$transaction(async (tx) => {
    const created = await tx.trainingSchedule.create({
      data: {
        date,
        weekday: date.getDay(),
        startTime,
        endTime,
        location: nullable(formData.get("location")),
        notes: nullable(formData.get("notes")),
        categoryId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
      },
    });

    await createTrainingAudit(tx, {
      organizationId: user.organizationId,
      scheduleId: created.id,
      actorUserId: user.id,
      action: TrainingAuditAction.TRAINING_CREATED,
    });

    return created;
  });

  revalidateTrainingPaths(training.id);
  revalidatePath("/qtr");
}

export async function updateTraining(formData: FormData) {
  const user = await requireClubPermission("TRAININGS_EDIT");

  const id = clean(formData.get("id"));

  const categoryId = await validateCategory(
    clean(formData.get("categoryId")),
    user.organizationId,
  );

  const date = parseTrainingDate(clean(formData.get("date")));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));

  if (!id || !categoryId || !date || !startTime || !endTime) return;

  await prisma.$transaction(async (tx) => {
    const result = await tx.trainingSchedule.updateMany({
      where: {
        id,
        organizationId: user.organizationId,
      },
      data: {
        date,
        weekday: date.getDay(),
        startTime,
        endTime,
        location: nullable(formData.get("location")),
        notes: nullable(formData.get("notes")),
        categoryId,
      },
    });

    if (result.count > 0) {
      await createTrainingAudit(tx, {
        organizationId: user.organizationId,
        scheduleId: id,
        actorUserId: user.id,
        action: TrainingAuditAction.TRAINING_UPDATED,
      });
    }
  });

  revalidateTrainingPaths(id);
  revalidatePath("/qtr");

  redirect("/treinos");
}

export async function deleteTraining(formData: FormData) {
  const user = await requireClubPermission("TRAININGS_EDIT");

  const id = clean(formData.get("id"));

  if (!id) return;

  await prisma.$transaction(async (tx) => {
    const exists = await tx.trainingSchedule.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!exists) return;

    await createTrainingAudit(tx, {
      organizationId: user.organizationId,
      scheduleId: id,
      actorUserId: user.id,
      action: TrainingAuditAction.TRAINING_DELETED,
    });

    await tx.trainingSchedule.delete({
      where: {
        id,
      },
    });
  });

  revalidateTrainingPaths(id);
  revalidatePath("/qtr");
}

export async function startTrainingSession(formData: FormData) {
  const user = await requireOrganizationUser();
  const scheduleId = clean(formData.get("scheduleId"));

  if (!scheduleId) return;

  const training = await findTrainingForAttendance(
    scheduleId,
    user.organizationId,
  );

  if (!training?.date) return;

  const trainingDate = training.date;

  const access = await getClubTrainingCategoryAccess(
    user,
    training.categoryId,
    training.sport,
  );

  if (!access.canManageAttendance) {
    redirect("/dashboard?erro=sem-permissao");
  }

  const startsAt = dateWithTime(
    trainingDate,
    training.startTime,
  );

  const endsAt = dateWithTime(
    trainingDate,
    training.endTime,
  );

  if (!startsAt) return;

  const requestedStart = clean(
    formData.get("actualStartTime"),
  );

  if (!requestedStart) return;

  const actualStartedAt = dateWithTime(
    trainingDate,
    requestedStart,
  );

  if (!actualStartedAt) return;

  await prisma.$transaction(async (tx) => {
    let session = await tx.trainingSession.findFirst({
      where: {
        organizationId: user.organizationId,
        scheduleId: training.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!session) {
      session = await tx.trainingSession.create({
        data: {
          organizationId: user.organizationId,
          categoryId: training.categoryId,
          scheduleId: training.id,
          recordedByUserId: user.id,
          startsAt,
          endsAt,
          actualStartedAt,
          location: training.location,
          trainingType: training.trainingType,
          responsibleStaffMemberId:
            training.responsibleStaffMemberId,
          status: TrainingSessionStatus.IN_PROGRESS,
          durationSource:
            TrainingDurationSource.SCHEDULED_DURATION_USED,
        },
      });
    } else if (
      session.status !== TrainingSessionStatus.COMPLETED &&
      session.status !== TrainingSessionStatus.CANCELLED &&
      session.status !== TrainingSessionStatus.ARCHIVED
    ) {
      session = await tx.trainingSession.update({
        where: {
          id: session.id,
        },
        data: {
          actualStartedAt:
            session.actualStartedAt ?? actualStartedAt,
          recordedByUserId: user.id,
          status: TrainingSessionStatus.IN_PROGRESS,
        },
      });
    } else {
      return;
    }

    await createTrainingAudit(tx, {
      organizationId: user.organizationId,
      scheduleId: training.id,
      sessionId: session.id,
      actorUserId: user.id,
      action: TrainingAuditAction.SESSION_STARTED,
      metadata: {
        actualStartedAt:
          session.actualStartedAt?.toISOString() ??
          actualStartedAt.toISOString(),
      },
    });
  });

  revalidateTrainingPaths(scheduleId);
}

export async function saveTrainingAttendance(
  formData: FormData,
) {
  const user = await requireOrganizationUser();

  const scheduleId = clean(formData.get("scheduleId"));

  if (!scheduleId) return;

  const training = await findTrainingForAttendance(
    scheduleId,
    user.organizationId,
  );

  if (!training?.date) return;

  const trainingDate = training.date;

  const access = await getClubTrainingCategoryAccess(
    user,
    training.categoryId,
    training.sport,
  );

  if (!access.canManageAttendance) {
    redirect("/dashboard?erro=sem-permissao");
  }

  const athletes = await findEligibleTrainingAthletes(
    user.organizationId,
    training.categoryId,
    training.sport,
  );

  const startsAt = dateWithTime(
    trainingDate,
    training.startTime,
  );

  const endsAt = dateWithTime(
    trainingDate,
    training.endTime,
  );

  if (!startsAt) return;

  const preparedAttendance = athletes.map((athlete) => {
    const rawStatus = clean(
      formData.get(`status_${athlete.id}`),
    );

    const status = normalizeAttendanceStatus(rawStatus);

    if (!status) {
      throw new Error(
        "A lista de presença está incompleta. Registre a situação de todos os atletas antes de salvar.",
      );
    }

    const arrivalValue = clean(
      formData.get(`arrival_${athlete.id}`),
    );

    const exitValue = clean(
      formData.get(`exit_${athlete.id}`),
    );

    const arrivedAt =
      status === TrainingAttendanceStatus.LATE ||
      status === TrainingAttendanceStatus.PARTIAL
        ? dateWithTime(trainingDate, arrivalValue)
        : null;

    const leftAt =
      status === TrainingAttendanceStatus.PARTIAL
        ? dateWithTime(trainingDate, exitValue)
        : null;

    if (
      status === TrainingAttendanceStatus.LATE &&
      !arrivedAt
    ) {
      throw new Error(
        "Informe o horário de chegada de todos os atletas marcados como atraso.",
      );
    }

    if (
      status === TrainingAttendanceStatus.PARTIAL &&
      !arrivedAt &&
      !leftAt
    ) {
      throw new Error(
        "Informe a entrada e/ou a saída de todos os atletas com participação parcial.",
      );
    }

    const justification =
      status === TrainingAttendanceStatus.JUSTIFIED_ABSENCE
        ? nullable(
            formData.get(
              `justification_${athlete.id}`,
            ),
          )
        : null;

    return {
      athleteId: athlete.id,
      status,
      arrivedAt,
      leftAt,
      justification,
    };
  });

  await prisma.$transaction(async (tx) => {
    let session = await tx.trainingSession.findFirst({
      where: {
        organizationId: user.organizationId,
        scheduleId: training.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!session) {
      session = await tx.trainingSession.create({
        data: {
          organizationId: user.organizationId,
          categoryId: training.categoryId,
          scheduleId: training.id,
          recordedByUserId: user.id,
          startsAt,
          endsAt,
          location: training.location,
          trainingType: training.trainingType,
          responsibleStaffMemberId:
            training.responsibleStaffMemberId,
          status: TrainingSessionStatus.SCHEDULED,
          durationSource:
            TrainingDurationSource.SCHEDULED_DURATION_USED,
        },
      });
    }

    if (
      session.status === TrainingSessionStatus.COMPLETED ||
      session.status === TrainingSessionStatus.CANCELLED ||
      session.status === TrainingSessionStatus.ARCHIVED
    ) {
      throw new Error(
        "Este treino já está encerrado e a chamada não pode mais ser alterada.",
      );
    }

    const bounds = effectiveSessionBounds(session);

    let recorded = 0;
    let absent = 0;
    let justified = 0;
    let partial = 0;

    for (const item of preparedAttendance) {
      const minutesPresent = attendanceMinutes({
        status: item.status,
        arrivedAt: item.arrivedAt,
        leftAt: item.leftAt,
        sessionStart: bounds.start,
        sessionEnd: bounds.end,
      });

      const attendance =
        await tx.trainingAttendance.upsert({
          where: {
            sessionId_athleteId: {
              sessionId: session.id,
              athleteId: item.athleteId,
            },
          },
          update: {
            status: item.status,
            arrivedAt: item.arrivedAt,
            leftAt: item.leftAt,
            minutesPresent,
            justification: item.justification,
            recordedByUserId: user.id,
          },
          create: {
            organizationId: user.organizationId,
            sessionId: session.id,
            athleteId: item.athleteId,
            status: item.status,
            arrivedAt: item.arrivedAt,
            leftAt: item.leftAt,
            minutesPresent,
            justification: item.justification,
            recordedByUserId: user.id,
          },
        });

      recorded += 1;

      if (
        item.status === TrainingAttendanceStatus.ABSENT
      ) {
        absent += 1;
      }

      if (
        item.status ===
        TrainingAttendanceStatus.JUSTIFIED_ABSENCE
      ) {
        justified += 1;
      }

      if (
        item.status === TrainingAttendanceStatus.LATE ||
        item.status === TrainingAttendanceStatus.PARTIAL
      ) {
        partial += 1;
      }

      if (
        item.status ===
        TrainingAttendanceStatus.JUSTIFIED_ABSENCE
      ) {
        await createTrainingAudit(tx, {
          organizationId: user.organizationId,
          scheduleId: training.id,
          sessionId: session.id,
          attendanceId: attendance.id,
          actorUserId: user.id,
          action:
            TrainingAuditAction.ATTENDANCE_JUSTIFIED,
        });
      }
    }

    if (recorded !== preparedAttendance.length) {
      throw new Error(
        "A lista de presença não foi salva por completo. Nenhuma alteração foi confirmada.",
      );
    }

    await tx.trainingSession.update({
      where: {
        id: session.id,
      },
      data: {
        recordedByUserId: user.id,
        durationSource: bounds.source,
      },
    });

    await createTrainingAudit(tx, {
      organizationId: user.organizationId,
      scheduleId: training.id,
      sessionId: session.id,
      actorUserId: user.id,
      action: TrainingAuditAction.ATTENDANCE_RECORDED,
      metadata: {
        recorded,
        expectedAthletes: preparedAttendance.length,
        absent,
        justified,
        partial,
        durationSource: bounds.source,
      },
    });
  });

  revalidateTrainingPaths(scheduleId);
}

export async function completeTrainingSession(
  formData: FormData,
) {
  const user = await requireOrganizationUser();
  const scheduleId = clean(formData.get("scheduleId"));

  if (!scheduleId) return;

  const training = await findTrainingForAttendance(
    scheduleId,
    user.organizationId,
  );

  if (!training?.date) return;

  const trainingDate = training.date;

  const access = await getClubTrainingCategoryAccess(
    user,
    training.categoryId,
    training.sport,
  );

  if (!access.canManageAttendance) {
    redirect("/dashboard?erro=sem-permissao");
  }

  const startsAt = dateWithTime(
    trainingDate,
    training.startTime,
  );

  if (!startsAt) return;

  const requestedEnd = clean(
    formData.get("actualEndTime"),
  );

  const requestedStart = clean(
    formData.get("actualStartTime"),
  );

  const expectedAthletes = await findEligibleTrainingAthletes(
    user.organizationId,
    training.categoryId,
    training.sport,
  );

  const expectedAthleteIds = new Set(
    expectedAthletes.map((athlete) => athlete.id),
  );

  await prisma.$transaction(async (tx) => {
    const session = await tx.trainingSession.findFirst({
      where: {
        organizationId: user.organizationId,
        scheduleId: training.id,
      },
      include: {
        attendances: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!session) {
      throw new Error(
        "Não existe chamada salva para este treino.",
      );
    }

    if (
      session.status === TrainingSessionStatus.COMPLETED ||
      session.status === TrainingSessionStatus.CANCELLED ||
      session.status === TrainingSessionStatus.ARCHIVED
    ) {
      return;
    }

    const attendanceByAthlete = new Map(
      session.attendances.map((attendance) => [
        attendance.athleteId,
        attendance,
      ]),
    );

    const missingAthletes = Array.from(
      expectedAthleteIds,
    ).filter((athleteId) => {
      const attendance = attendanceByAthlete.get(athleteId);

      return (
        !attendance ||
        attendance.status === TrainingAttendanceStatus.PENDING
      );
    });

    if (missingAthletes.length > 0) {
      throw new Error(
        `Não é possível finalizar o treino. Existem ${missingAthletes.length} atleta(s) sem chamada salva.`,
      );
    }

    if (!requestedEnd) {
      throw new Error(
        "Informe o horário real de término do treino.",
      );
    }

    const actualStartedAt =
      session.actualStartedAt ??
      (requestedStart
        ? dateWithTime(trainingDate, requestedStart)
        : null);

    const actualEndedAt = dateWithTime(
      trainingDate,
      requestedEnd,
    );

    if (!actualStartedAt || !actualEndedAt) {
      throw new Error(
        "Os horários reais de início e término do treino são obrigatórios.",
      );
    }

    if (actualEndedAt <= actualStartedAt) {
      throw new Error(
        "O horário de término deve ser posterior ao horário de início.",
      );
    }

    await tx.trainingSession.update({
      where: {
        id: session.id,
      },
      data: {
        actualStartedAt,
        actualEndedAt,
        recordedByUserId: user.id,
        status: TrainingSessionStatus.COMPLETED,
        durationSource:
          TrainingDurationSource.ACTUAL_DURATION_USED,
      },
    });

    for (const attendance of session.attendances) {
      if (!expectedAthleteIds.has(attendance.athleteId)) {
        continue;
      }

      const minutesPresent = attendanceMinutes({
        status: attendance.status,
        arrivedAt: attendance.arrivedAt,
        leftAt: attendance.leftAt,
        sessionStart: actualStartedAt,
        sessionEnd: actualEndedAt,
      });

      await tx.trainingAttendance.update({
        where: {
          id: attendance.id,
        },
        data: {
          minutesPresent,
          recordedByUserId: user.id,
        },
      });
    }

    await createTrainingAudit(tx, {
      organizationId: user.organizationId,
      scheduleId: training.id,
      sessionId: session.id,
      actorUserId: user.id,
      action: TrainingAuditAction.SESSION_COMPLETED,
      metadata: {
        actualStartedAt:
          actualStartedAt.toISOString(),
        actualEndedAt:
          actualEndedAt.toISOString(),
        durationMinutes: minutesBetween(
          actualStartedAt,
          actualEndedAt,
        ),
        attendanceValidated: true,
        expectedAthletes: expectedAthleteIds.size,
      },
    });

    await createTrainingAudit(tx, {
      organizationId: user.organizationId,
      scheduleId: training.id,
      sessionId: session.id,
      actorUserId: user.id,
      action: TrainingAuditAction.MINUTES_RECALCULATED,
      metadata: {
        athletes: expectedAthleteIds.size,
        durationSource:
          TrainingDurationSource.ACTUAL_DURATION_USED,
      },
    });
  });

  revalidateTrainingPaths(scheduleId);
}
