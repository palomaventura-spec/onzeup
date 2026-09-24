export type TrainingSessionStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

export type TrainingAttendanceStatus =
  | "PENDING"
  | "PRESENT"
  | "ABSENT"
  | "JUSTIFIED_ABSENCE"
  | "INJURED"
  | "EXCUSED"
  | "LATE"
  | "PARTIAL";

export type TrainingPerformanceColor =
  | "red"
  | "orange"
  | "blue"
  | "green";

export type TrainingPerformanceThresholds = {
  redUnder: number;
  orangeUnder: number;
  blueUnder: number;
};

export type TrainingParticipationRecord = {
  sessionId: string;
  sessionStatus: TrainingSessionStatus;
  offeredMinutes: number | null;
  attendanceStatus: TrainingAttendanceStatus | null;
  athleteMinutes: number | null;
};

export type TrainingParticipationSummary = {
  completedSessions: number;
  attendedSessions: number;
  absences: number;
  justifiedAbsences: number;
  injuredAbsences: number;
  excusedAbsences: number;
  unrecordedSessions: number;
  offeredMinutes: number;
  athleteMinutes: number;
  frequencyPercentage: number;
  trainingTimePercentage: number;
  color: TrainingPerformanceColor;
};

export const DEFAULT_TRAINING_PERFORMANCE_THRESHOLDS: TrainingPerformanceThresholds =
  {
    redUnder: 30,
    orangeUnder: 50,
    blueUnder: 70,
  };

function clampPercentage(value: number) {
  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(100, value));
}

function roundedPercentage(value: number) {
  return Math.round(clampPercentage(value) * 10) / 10;
}

function isCompletedForPerformance(
  status: TrainingSessionStatus,
) {
  return status === "COMPLETED" || status === "ARCHIVED";
}

function isAttendedStatus(
  status: TrainingAttendanceStatus | null,
) {
  return (
    status === "PRESENT" ||
    status === "LATE" ||
    status === "PARTIAL"
  );
}

export function trainingPerformanceColor(
  percentage: number,
  thresholds: TrainingPerformanceThresholds =
    DEFAULT_TRAINING_PERFORMANCE_THRESHOLDS,
): TrainingPerformanceColor {
  const value = clampPercentage(percentage);

  if (value < thresholds.redUnder) return "red";
  if (value < thresholds.orangeUnder) return "orange";
  if (value < thresholds.blueUnder) return "blue";

  return "green";
}

export function calculateTrainingParticipationSummary(
  records: TrainingParticipationRecord[],
  thresholds: TrainingPerformanceThresholds =
    DEFAULT_TRAINING_PERFORMANCE_THRESHOLDS,
): TrainingParticipationSummary {
  const effectiveRecords = records.filter((record) =>
    isCompletedForPerformance(record.sessionStatus),
  );

  let attendedSessions = 0;
  let absences = 0;
  let justifiedAbsences = 0;
  let injuredAbsences = 0;
  let excusedAbsences = 0;
  let unrecordedSessions = 0;
  let offeredMinutes = 0;
  let athleteMinutes = 0;

  for (const record of effectiveRecords) {
    const offered = Math.max(0, record.offeredMinutes ?? 0);
    const athlete = Math.max(
      0,
      Math.min(record.athleteMinutes ?? 0, offered),
    );

    offeredMinutes += offered;
    athleteMinutes += athlete;

    if (isAttendedStatus(record.attendanceStatus)) {
      attendedSessions += 1;
      continue;
    }

    switch (record.attendanceStatus) {
      case "ABSENT":
        absences += 1;
        break;

      case "JUSTIFIED_ABSENCE":
        justifiedAbsences += 1;
        break;

      case "INJURED":
        injuredAbsences += 1;
        break;

      case "EXCUSED":
        excusedAbsences += 1;
        break;

      case "PENDING":
      case null:
        unrecordedSessions += 1;
        break;

      default:
        break;
    }
  }

  const completedSessions = effectiveRecords.length;

  const frequencyPercentage =
    completedSessions > 0
      ? roundedPercentage(
          (attendedSessions / completedSessions) * 100,
        )
      : 0;

  const trainingTimePercentage =
    offeredMinutes > 0
      ? roundedPercentage(
          (athleteMinutes / offeredMinutes) * 100,
        )
      : 0;

  return {
    completedSessions,
    attendedSessions,
    absences,
    justifiedAbsences,
    injuredAbsences,
    excusedAbsences,
    unrecordedSessions,
    offeredMinutes,
    athleteMinutes,
    frequencyPercentage,
    trainingTimePercentage,
    color: trainingPerformanceColor(
      trainingTimePercentage,
      thresholds,
    ),
  };
}

export function calculateFinalPerformanceScore(
  observedPerformanceScore: number | null,
  trainingTimePercentage: number,
) {
  if (
    observedPerformanceScore === null ||
    !Number.isFinite(observedPerformanceScore)
  ) {
    return null;
  }

  const participationFactor =
    clampPercentage(trainingTimePercentage) / 100;

  return (
    Math.round(
      observedPerformanceScore * participationFactor * 100,
    ) / 100
  );
}
