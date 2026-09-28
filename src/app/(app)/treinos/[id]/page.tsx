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
    weekday: "long",
    day: "2-digit",
    month: "long",
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

function scheduledDateTime(
  date: Date | null,
  time: string,
) {
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return null;

  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(date);

  result.setHours(hours, minutes, 0, 0);

  return Number.isNaN(result.getTime())
    ? null
    : result;
}

function sportLabel(sport: string) {
  return sport === "FUTSAL"
    ? "Futsal"
    : "Campo";
}

function sessionStatusLabel(
  status: string | null | undefined,
) {
  switch (status) {
    case "IN_PROGRESS":
      return "Em andamento";
    case "COMPLETED":
      return "Finalizado";
    case "CANCELLED":
      return "Cancelado";
    case "ARCHIVED":
      return "Arquivado";
    default:
      return "Agendado";
  }
}

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOrganizationUser();
  const { id } = await params;

  const training =
    await prisma.trainingSchedule.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      include: {
        category: true,
      },
    });

  if (!training) notFound();

  const access =
    await getClubTrainingCategoryAccess(
      user,
      training.categoryId,
      training.sport,
    );

  if (!access.canViewTraining) notFound();

  const canViewAttendance =
    access.canViewAttendance;

  const canManageAttendance =
    access.canManageAttendance;

  const [athletes, session] = await Promise.all([
    canViewAttendance
      ? prisma.athlete.findMany({
          where: {
            organizationId:
              user.organizationId,
            active: true,
            OR: [
              {
                categoryId:
                  training.categoryId,
              },
              {
                memberships: {
                  some: {
                    organizationId:
                      user.organizationId,
                    categoryId:
                      training.categoryId,
                    status: "ACTIVE",
                    sport: {
                      in: [
                        "BOTH",
                        training.sport,
                      ],
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
            organizationId:
              user.organizationId,
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
    session?.attendances.map((item) => [
      item.athleteId,
      item,
    ]) ?? [],
  );

  const attendanceRows =
    athletes.map((athlete) => {
      const attendance =
        attendanceByAthlete.get(
          athlete.id,
        );

      return {
        ...athlete,
        status: attendanceStatus(
          attendance?.status,
        ),
        arrivalTime:
          timeInputValue(
            attendance?.arrivedAt ?? null,
          ),
        exitTime:
          timeInputValue(
            attendance?.leftAt ?? null,
          ),
        justification:
          attendance?.justification ?? "",
        minutesPresent:
          attendance?.minutesPresent ??
          null,
      };
    });

  const attendanceEditable =
    canManageAttendance &&
    session?.status !== "COMPLETED" &&
    session?.status !== "CANCELLED" &&
    session?.status !== "ARCHIVED";

  const plannedStartAt =
    scheduledDateTime(
      training.date,
      training.startTime,
    );

  const plannedEndAt =
    scheduledDateTime(
      training.date,
      training.endTime,
    );

  const consideredDurationMinutes =
    sessionDurationMinutes(
      session?.actualStartedAt ??
        null,
      session?.actualEndedAt ??
        null,
      plannedStartAt,
      plannedEndAt,
    );

  const isRetroactive =
    Boolean(training.date) &&
    new Date(
      training.date!.getFullYear(),
      training.date!.getMonth(),
      training.date!.getDate(),
    ).getTime() <
      new Date(
        training.createdAt.getFullYear(),
        training.createdAt.getMonth(),
        training.createdAt.getDate(),
      ).getTime();
  const recordedCount =
    session?.attendances.filter(
      (attendance) =>
        attendance.status !==
        "PENDING",
    ).length ?? 0;

  return (
    <main className="training-attendance-v9">
      <section className="training-attendance-v9-hero">
        <div>
          <span className="training-attendance-v9-eyebrow">
            11UP TREINOS ·{" "}
            {sportLabel(
              training.sport,
            ).toUpperCase()}
          </span>

          <h1>Lista de presença</h1>

          <p>
            {training.category.name} ·{" "}
            {formatTrainingDate(
              training.date,
            )}
            {" · "}
            {training.startTime} –{" "}
            {training.endTime}
            {training.location
              ? ` · ${training.location}`
              : ""}
          </p>
        </div>

        {isRetroactive ? (
          <span className="badge">Registro retroativo</span>
        ) : null}
        <div className="training-attendance-v9-hero-aside">
          <small>STATUS</small>

          <strong>
            {sessionStatusLabel(
              session?.status,
            )}
          </strong>

          <span>
            {recordedCount}/
            {athletes.length} atleta(s)
            registrados
          </span>
        </div>
      </section>

      <section className="training-attendance-v9-summary">
        <article>
          <span>MODALIDADE</span>
          <strong>
            {sportLabel(
              training.sport,
            )}
          </strong>
        </article>

        <article>
          <span>CATEGORIA</span>
          <strong>
            {training.category.name}
          </strong>
        </article>

        <article>
          <span>PLANEJADO</span>
          <strong>
            {training.startTime} –{" "}
            {training.endTime}
          </strong>
        </article>

        <article>
          <span>
            DURAÇÃO CONSIDERADA
          </span>

          <strong>
            {consideredDurationMinutes !==
            null
              ? `${consideredDurationMinutes} min`
              : "—"}
          </strong>
        </article>

        <Link
          className="training-attendance-v9-back"
          href="/treinos"
        >
          ← Voltar aos treinos
        </Link>
      </section>

      {!canViewAttendance ? (
        <div className="training-attendance-v9-notice">
          <strong>
            Acesso restrito.
          </strong>{" "}
          O Gestor define quais
          profissionais podem visualizar
          ou realizar a lista de presença
          desta categoria.
        </div>
      ) : !training.date ? (
        <div className="training-attendance-v9-empty">
          Defina uma data para o treino
          antes de realizar a chamada.
        </div>
      ) : (
        <section className="training-attendance-v9-card">
          <header>
            <div>
              <span className="training-attendance-v9-eyebrow">
                CHAMADA DO TREINO
              </span>

              <h2>
                {training.category.name}
              </h2>

              <p>
                {athletes.length} atleta(s)
                ativo(s) nesta categoria
              </p>
            </div>

            <div className="training-attendance-v9-rule">
              <span>
                REGRA DE CÁLCULO
              </span>

              <strong>
                Minutos reais ÷ duração
                real do treino
              </strong>

              <small>
                Falta e falta justificada
                = 0 minuto
              </small>
            </div>
          </header>

          {session?.status ===
          "CANCELLED" ? (
            <div className="training-attendance-v9-notice">
              <strong>
                Treino cancelado.
              </strong>{" "}
              Esta sessão não gera falta
              e não entra no denominador
              de participação.
            </div>
          ) : null}

          {athletes.length ? (
            <TrainingAttendanceForm
              scheduleId={
                training.id
              }
              athletes={
                attendanceRows
              }
              canEdit={
                attendanceEditable
              }
              sessionStatus={
                session?.status ??
                "SCHEDULED"
              }
              actualStartTime={timeInputValue(
                session?.actualStartedAt ??
                  null,
              )}
              actualEndTime={timeInputValue(
                session?.actualEndedAt ??
                  null,
              )}
              sessionDurationMinutes={
                consideredDurationMinutes
              }
            />
          ) : (
            <div className="training-attendance-v9-empty">
              Nenhum atleta ativo
              vinculado a{" "}
              {training.category.name}.
            </div>
          )}
        </section>
      )}
    </main>
  );
}