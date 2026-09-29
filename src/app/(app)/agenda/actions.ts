"use server";

import { TrainingAuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T12:00:00`);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(
    result.getDate() +
      (day === 0 ? -6 : 1 - day),
  );

  result.setHours(12, 0, 0, 0);

  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + amount,
  );

  return result;
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function firstDayNextMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1,
    12,
  );
}

function firstDayMonthAfterNext(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 2,
    1,
    12,
  );
}

function trainingSignature(input: {
  categoryId: string;
  date: Date;
  startTime: string;
  endTime: string;
}) {
  return [
    input.categoryId,
    dateKey(input.date),
    input.startTime,
    input.endTime,
  ].join("|");
}

export async function repeatAgendaWeek(
  formData: FormData,
) {
  const user =
    await requireClubPermission(
      "TRAININGS_EDIT",
    );

  const sourceDate = parseDate(
    clean(formData.get("sourceDate")),
  );

  if (!sourceDate) {
    redirect(
      "/agenda/repetir?repeatStatus=invalid-date",
    );
  }

  const rawMode = clean(
    formData.get("repeatMode"),
  );

  /*
   * Compatibilidade temporária com
   * o modal antigo enquanto o removemos.
   */
  const repeatMode =
    rawMode === "ONE"
      ? "NEXT_WEEK"
      : rawMode;

  const allowedModes = new Set([
    "NEXT_WEEK",
    "REST_MONTH",
    "NEXT_MONTH",
  ]);

  if (!allowedModes.has(repeatMode)) {
    redirect(
      "/agenda/repetir?repeatStatus=invalid-mode",
    );
  }

  const sourceStart =
    mondayOf(sourceDate);

  const sourceEnd =
    addDays(sourceStart, 7);

  /*
   * A semana modelo contém apenas
   * programações reais com data.
   */
  const sourceTrainings =
    await prisma.trainingSchedule.findMany({
      where: {
        organizationId:
          user.organizationId,

        date: {
          gte: sourceStart,
          lt: sourceEnd,
        },
      },

      select: {
        id: true,
        date: true,
        weekday: true,
        startTime: true,
        endTime: true,
        location: true,
        notes: true,
        sport: true,
        trainingType: true,
        categoryId: true,
        responsibleStaffMemberId: true,
      },

      orderBy: [
        {
          date: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

  if (!sourceTrainings.length) {
    redirect(
      `/agenda/repetir?week=${dateKey(
        sourceStart,
      )}&repeatStatus=empty`,
    );
  }

  const candidates: {
    source: (typeof sourceTrainings)[number];
    targetDate: Date;
  }[] = [];

  /*
   * 1. PRÓXIMA SEMANA
   */
  if (repeatMode === "NEXT_WEEK") {
    for (const source of sourceTrainings) {
      if (!source.date) continue;

      candidates.push({
        source,
        targetDate: addDays(
          source.date,
          7,
        ),
      });
    }
  }

  /*
   * 2. RESTANTE DO MÊS
   *
   * A semana selecionada vira o modelo.
   * Começamos a repetir a partir da
   * semana seguinte e paramos no último
   * dia do mesmo mês.
   */
  if (repeatMode === "REST_MONTH") {
    const targetStart = sourceEnd;

    const targetEnd =
      firstDayNextMonth(sourceStart);

    for (
      let date = new Date(targetStart);
      date < targetEnd;
      date = addDays(date, 1)
    ) {
      for (const source of sourceTrainings) {
        if (
          source.weekday !== date.getDay()
        ) {
          continue;
        }

        candidates.push({
          source,
          targetDate: new Date(date),
        });
      }
    }
  }

  /*
   * 3. PRÓXIMO MÊS INTEIRO
   *
   * Exemplo:
   * semana modelo tem treinos
   * segunda e quarta.
   *
   * O próximo mês recebe todos os
   * treinos de segunda e quarta,
   * mantendo horários e categorias.
   */
  if (repeatMode === "NEXT_MONTH") {
    const targetStart =
      firstDayNextMonth(sourceStart);

    const targetEnd =
      firstDayMonthAfterNext(sourceStart);

    for (
      let date = new Date(targetStart);
      date < targetEnd;
      date = addDays(date, 1)
    ) {
      for (const source of sourceTrainings) {
        if (
          source.weekday !== date.getDay()
        ) {
          continue;
        }

        candidates.push({
          source,
          targetDate: new Date(date),
        });
      }
    }
  }

  if (!candidates.length) {
    redirect(
      `/agenda/repetir?month=${dateKey(
        sourceStart,
      ).slice(
        0,
        7,
      )}&week=${dateKey(
        sourceStart,
      )}&repeatStatus=nothing`,
    );
  }

  const targetDates =
    candidates.map(
      (candidate) =>
        candidate.targetDate,
    );

  const minTarget = new Date(
    Math.min(
      ...targetDates.map(
        (date) => date.getTime(),
      ),
    ),
  );

  const maxTarget = new Date(
    Math.max(
      ...targetDates.map(
        (date) => date.getTime(),
      ),
    ),
  );

  /*
   * Verificação anti-duplicidade.
   */
  const existingTrainings =
    await prisma.trainingSchedule.findMany({
      where: {
        organizationId:
          user.organizationId,

        date: {
          gte: minTarget,
          lte: maxTarget,
        },
      },

      select: {
        categoryId: true,
        date: true,
        startTime: true,
        endTime: true,
      },
    });

  const existing = new Set<string>();

  for (const training of existingTrainings) {
    if (!training.date) continue;

    existing.add(
      trainingSignature({
        categoryId:
          training.categoryId,

        date:
          training.date,

        startTime:
          training.startTime,

        endTime:
          training.endTime,
      }),
    );
  }

  let createdCount = 0;
  let skippedCount = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const candidate of candidates) {
        const {
          source,
          targetDate,
        } = candidate;

        const signature =
          trainingSignature({
            categoryId:
              source.categoryId,

            date:
              targetDate,

            startTime:
              source.startTime,

            endTime:
              source.endTime,
          });

        if (existing.has(signature)) {
          skippedCount += 1;
          continue;
        }

        const created =
          await tx.trainingSchedule.create({
            data: {
              organizationId:
                user.organizationId,

              categoryId:
                source.categoryId,

              date:
                targetDate,

              weekday:
                targetDate.getDay(),

              startTime:
                source.startTime,

              endTime:
                source.endTime,

              location:
                source.location,

              notes:
                source.notes,

              sport:
                source.sport,

              trainingType:
                source.trainingType,

              responsibleStaffMemberId:
                source.responsibleStaffMemberId,
            },

            select: {
              id: true,
            },
          });

        await tx.trainingAuditLog.create({
          data: {
            organizationId:
              user.organizationId,

            scheduleId:
              created.id,

            actorUserId:
              user.id,

            action:
              TrainingAuditAction.TRAINING_CREATED,

            metadataJson: {
              source:
                "AGENDA_REPEAT_PROGRAM",

              sourceScheduleId:
                source.id,

              sourceWeekStart:
                dateKey(sourceStart),

              repeatMode,

              targetDate:
                dateKey(targetDate),
            },
          },
        });

        existing.add(signature);
        createdCount += 1;
      }
    },
  );

  revalidatePath("/agenda");
  revalidatePath("/agenda/repetir");
  revalidatePath("/treinos");
  revalidatePath("/qtr");
  revalidatePath("/dashboard");
  revalidatePath("/performance");

  redirect(
    `/agenda/repetir?month=${dateKey(
      sourceStart,
    ).slice(
      0,
      7,
    )}&week=${dateKey(
      sourceStart,
    )}&mode=${repeatMode}&repeatStatus=success&created=${createdCount}&skipped=${skippedCount}`,
  );
}