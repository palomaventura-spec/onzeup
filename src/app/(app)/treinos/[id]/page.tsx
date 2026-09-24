import Link from "next/link";
import { notFound } from "next/navigation";

import TrainingAttendanceForm from "../TrainingAttendanceForm";
import { getClubTrainingCategoryAccess } from "@/lib/club-access";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AttendanceUiStatus =
  | "PRESENT"
  | "ABSENT"
  | "JUSTIFIED_ABSENCE"
  | "LATE"
  | "PARTIAL";

function timeInputValue(value: Date | null) {
  return value
    ? `${String(value.getHours()).padStart(2, "0")}:${String(
        value.getMinutes(),
      ).padStart(2, "0")}`
    : "";
}

function attendanceStatus(
  status: string | null | undefined,
): AttendanceUiStatus | null {
  switch (status) {
    case "PRESENT":
      return "PRESENT";
    case "ABSENT":
      return "ABSENT";
    case "JUSTIFIED_ABSENCE":
      return "JUSTIFIED_ABSENCE";
    case "LATE":
      return "LATE";
    case "PARTIAL":
      return "PARTIAL";
    default:
      return null;
  }
}

function formatTrainingDate(date: Date | null) {
  if (!date) return "Treino legado";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}


function sessionDurationMinutes(
  actualStartedAt: Date | null,
  actualEndedAt: Date | null,
  scheduledStartAt: Date | null,
  scheduledEndAt: Date | null,
) {
  const start = actualStartedAt ?? scheduledStartAt;
  const end = actualEndedAt ?? scheduledEndAt;

  if (!start || !end || end <= start) return null;

  return Math.round((end.getTime() - start.getTime()) / 60_000);
}

function scheduledDateTime(date: Date | null, time: string) {
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return null;

  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);

  return Number.isNaN(result.getTime()) ? null : result;
}

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOrganizationUser();
  const { id } = await params;

  const training = await prisma.trainingSchedule.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      category: true,
    },
  });

  if (!training) notFound();

  const access = await getClubTrainingCategoryAccess(
    user,
    training.categoryId,
    training.sport,
  );

  if (!access.canViewTraining) notFound();

  const canViewAttendance = access.canViewAttendance;
  const canManageAttendance = access.canManageAttendance;

  const [athletes, session] = await Promise.all([
    canViewAttendance
      ? prisma.athlete.findMany({
          where: {
            organizationId: user.organizationId,
            active: true,
            OR: [
              {
                categoryId: training.categoryId,
              },
              {
                memberships: {
                  some: {
                    organizationId: user.organizationId,
                    categoryId: training.categoryId,
                    status: "ACTIVE",
                    sport: {
                      in: ["BOTH", training.sport],
                    },
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            nickname: true,
            jerseyNumber: true,
            photoUrl: true,
          },
          orderBy: {
            name: "asc",
          },
        })
      : Promise.resolve([]),

    canViewAttendance
      ? prisma.trainingSession.findFirst({
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
        })
      : Promise.resolve(null),
  ]);

  const attendanceByAthlete = new Map(
    session?.attendances.map((item) => [item.athleteId, item]) ?? [],
  );

  const attendanceRows = athletes.map((athlete) => {
    const attendance = attendanceByAthlete.get(athlete.id);

    return {
      ...athlete,
      status: attendanceStatus(attendance?.status),
      arrivalTime: timeInputValue(attendance?.arrivedAt ?? null),
      exitTime: timeInputValue(attendance?.leftAt ?? null),
      justification: attendance?.justification ?? "",
      minutesPresent: attendance?.minutesPresent ?? null,
    };
  });

  const attendanceEditable =
    canManageAttendance &&
    session?.status !== "COMPLETED" &&
    session?.status !== "CANCELLED" &&
    session?.status !== "ARCHIVED";

  const plannedStartAt = scheduledDateTime(
    training.date,
    training.startTime,
  );

  const plannedEndAt = scheduledDateTime(
    training.date,
    training.endTime,
  );

  const consideredDurationMinutes = sessionDurationMinutes(
    session?.actualStartedAt ?? null,
    session?.actualEndedAt ?? null,
    plannedStartAt,
    plannedEndAt,
  );

  return (
    <main className="training-attendance-page">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">
            TREINO · {training.category.name}
          </span>

          <h1>Lista de presença</h1>

          <p className="muted">
            {formatTrainingDate(training.date)} · {training.startTime} –{" "}
            {training.endTime}
            {training.location ? ` · ${training.location}` : ""}
          </p>
        </div>

        <Link className="btn btn-secondary" href="/treinos">
          Voltar
        </Link>
      </div>

      {!canViewAttendance ? (
        <div className="notice" role="status">
          <strong>Acesso restrito.</strong> O Gestor define quais profissionais
          podem visualizar ou realizar a lista de presença desta categoria.
        </div>
      ) : !training.date ? (
        <div className="empty">
          Defina uma data para o treino antes de realizar a chamada.
        </div>
      ) : (
        <section className="card training-attendance-card training-attendance-focus">
          <div className="section-title-row">
            <div>
              <span className="page-eyebrow">CHAMADA DO TREINO</span>
              <h2>{training.category.name}</h2>
              <p className="muted">
                {athletes.length} atleta(s) ativo(s) nesta categoria
              </p>
            </div>
          </div>

          {session?.status === "CANCELLED" ? (
            <div
              className="notice"
              role="status"
              style={{ marginBottom: 16 }}
            >
              <strong>Treino cancelado.</strong> Esta sessão não gera falta e
              não entra no denominador de participação.
            </div>
          ) : null}

          {athletes.length ? (
            <TrainingAttendanceForm
              scheduleId={training.id}
              athletes={attendanceRows}
              canEdit={attendanceEditable}
              sessionStatus={session?.status ?? "SCHEDULED"}
              actualStartTime={timeInputValue(
                session?.actualStartedAt ?? null,
              )}
              actualEndTime={timeInputValue(
                session?.actualEndedAt ?? null,
              )}
              sessionDurationMinutes={consideredDurationMinutes}
            />
          ) : (
            <div className="empty">
              Nenhum atleta ativo vinculado a {training.category.name}.
            </div>
          )}
        </section>
      )}
    </main>
  );
}
