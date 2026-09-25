import {
  TrainingSessionStatus,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  calculateTrainingParticipationSummary,
  type TrainingParticipationRecord,
} from "@/lib/training-performance";

export type MonthlyPresenceSnapshot = {
  version: 1;
  generatedAt: string;
  period: {
    value: string;
    label: string;
    start: string;
    end: string;
  };
  athlete: {
    id: string;
    name: string;
    nickname: string | null;
  };
  categories: Array<{
    id: string;
    name: string;
    accentColor: string;
  }>;
  completedSessions: number;
  attendedSessions: number;
  presentSessions: number;
  lateSessions: number;
  partialSessions: number;
  absences: number;
  justifiedAbsences: number;
  injuredAbsences: number;
  excusedAbsences: number;
  unrecordedSessions: number;
  offeredMinutes: number;
  athleteMinutes: number;
  frequencyPercentage: number;
  trainingTimePercentage: number;
  color: "red" | "orange" | "blue" | "green";
};

export function currentMonthValue() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;
}

export function parseMonth(value?: string) {
  const normalized =
    value && /^\d{4}-\d{2}$/.test(value)
      ? value
      : currentMonthValue();

  const [year, month] = normalized
    .split("-")
    .map(Number);

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  return {
    value: normalized,
    start,
    end,
    label: new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(start),
  };
}

function minutesBetween(
  start: Date | null,
  end: Date | null,
) {
  if (!start || !end || end <= start) {
    return null;
  }

  return Math.round(
    (end.getTime() - start.getTime()) / 60_000,
  );
}

function sessionOfferedMinutes(session: {
  startsAt: Date;
  endsAt: Date | null;
  actualStartedAt: Date | null;
  actualEndedAt: Date | null;
}) {
  const actual = minutesBetween(
    session.actualStartedAt,
    session.actualEndedAt,
  );

  if (actual !== null) {
    return actual;
  }

  return minutesBetween(
    session.startsAt,
    session.endsAt,
  );
}

export async function buildMonthlyPresenceSnapshot({
  organizationId,
  athleteId,
  month,
}: {
  organizationId: string;
  athleteId: string;
  month?: string;
}): Promise<MonthlyPresenceSnapshot> {
  const period = parseMonth(month);

  const athlete = await prisma.athlete.findFirst({
    where: {
      id: athleteId,
      organizationId,
    },
    select: {
      id: true,
      name: true,
      nickname: true,
    },
  });

  if (!athlete) {
    throw new Error("Atleta não encontrado.");
  }

  const sessions =
    await prisma.trainingSession.findMany({
      where: {
        organizationId,
        status: {
          in: [
            TrainingSessionStatus.COMPLETED,
            TrainingSessionStatus.ARCHIVED,
          ],
        },
        startsAt: {
          gte: period.start,
          lt: period.end,
        },
        attendances: {
          some: {
            athleteId,
          },
        },
      },
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        actualStartedAt: true,
        actualEndedAt: true,
        status: true,
        category: {
          select: {
            id: true,
            name: true,
            accentColor: true,
          },
        },
        attendances: {
          where: {
            athleteId,
          },
          select: {
            status: true,
            minutesPresent: true,
          },
        },
      },
      orderBy: {
        startsAt: "asc",
      },
    });

  const records: TrainingParticipationRecord[] =
    sessions.map((session) => {
      const attendance =
        session.attendances[0];

      return {
        sessionId: session.id,
        sessionStatus: session.status,
        offeredMinutes:
          sessionOfferedMinutes(session),
        attendanceStatus:
          attendance?.status ?? null,
        athleteMinutes:
          attendance?.minutesPresent ?? 0,
      };
    });

  const summary =
    calculateTrainingParticipationSummary(
      records,
    );

  const categories = Array.from(
    new Map(
      sessions.map((session) => [
        session.category.id,
        {
          id: session.category.id,
          name: session.category.name,
          accentColor:
            session.category.accentColor,
        },
      ]),
    ).values(),
  );

  const statuses = sessions.map(
    (session) =>
      session.attendances[0]?.status ?? null,
  );

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    period: {
      value: period.value,
      label: period.label,
      start: period.start.toISOString(),
      end: period.end.toISOString(),
    },
    athlete,
    categories,
    completedSessions:
      summary.completedSessions,
    attendedSessions:
      summary.attendedSessions,
    presentSessions: statuses.filter(
      (status) => status === "PRESENT",
    ).length,
    lateSessions: statuses.filter(
      (status) => status === "LATE",
    ).length,
    partialSessions: statuses.filter(
      (status) => status === "PARTIAL",
    ).length,
    absences: summary.absences,
    justifiedAbsences:
      summary.justifiedAbsences,
    injuredAbsences:
      summary.injuredAbsences,
    excusedAbsences:
      summary.excusedAbsences,
    unrecordedSessions:
      summary.unrecordedSessions,
    offeredMinutes:
      summary.offeredMinutes,
    athleteMinutes:
      summary.athleteMinutes,
    frequencyPercentage:
      summary.frequencyPercentage,
    trainingTimePercentage:
      summary.trainingTimePercentage,
    color: summary.color,
  };
}

export function asPrismaJson(
  snapshot: MonthlyPresenceSnapshot,
): Prisma.InputJsonValue {
  return snapshot as unknown as Prisma.InputJsonValue;
}
