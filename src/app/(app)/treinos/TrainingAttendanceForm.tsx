"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import {
  completeTrainingSession,
  saveTrainingAttendance,
  startTrainingSession,
} from "./actions";

type AttendanceStatus =
  | "PRESENT"
  | "ABSENT"
  | "JUSTIFIED_ABSENCE"
  | "LATE"
  | "PARTIAL";

type SessionStatus =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED";

type AthleteRow = {
  id: string;
  name: string;
  nickname: string | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
  status: AttendanceStatus | null;
  arrivalTime: string;
  exitTime?: string;
  justification?: string;
  minutesPresent?: number | null;
};

function makeEditableRows(athletes: AthleteRow[]) {
  return athletes.map((athlete) => ({
    ...athlete,
    status: athlete.status,
    exitTime: athlete.exitTime ?? "",
    justification: athlete.justification ?? "",
  }));
}

function PendingButton({
  children,
  pendingText,
  className,
  disabled = false,
}: {
  children: ReactNode;
  pendingText: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? pendingText : children}
    </button>
  );
}

function statusLabel(status: AttendanceStatus | null) {
  switch (status) {
    case "PRESENT":
      return "Presente";
    case "ABSENT":
      return "Falta";
    case "JUSTIFIED_ABSENCE":
      return "Falta justificada";
    case "LATE":
      return "Atraso";
    case "PARTIAL":
      return "Participação parcial";
    default:
      return "Não registrado";
  }
}

function statusTone(status: AttendanceStatus | null) {
  switch (status) {
    case "PRESENT":
      return "present";
    case "LATE":
      return "late";
    case "PARTIAL":
      return "partial";
    case "ABSENT":
      return "absent";
    case "JUSTIFIED_ABSENCE":
      return "justified";
    default:
      return "pending";
  }
}

function percentageFor(
  minutesPresent: number | null | undefined,
  sessionDurationMinutes: number | null | undefined,
) {
  if (
    minutesPresent === null ||
    minutesPresent === undefined ||
    !sessionDurationMinutes ||
    sessionDurationMinutes <= 0
  ) {
    return null;
  }

  const percentage =
    (minutesPresent / sessionDurationMinutes) * 100;

  return Math.max(
    0,
    Math.min(100, Math.round(percentage * 10) / 10),
  );
}

function effectiveMinutesForDisplay(
  status: AttendanceStatus | null,
  minutesPresent: number | null | undefined,
  sessionDurationMinutes: number | null | undefined,
) {
  if (
    minutesPresent !== null &&
    minutesPresent !== undefined
  ) {
    return minutesPresent;
  }

  if (
    !sessionDurationMinutes ||
    sessionDurationMinutes <= 0
  ) {
    return null;
  }

  if (status === "PRESENT") {
    return sessionDurationMinutes;
  }

  if (
    status === "ABSENT" ||
    status === "JUSTIFIED_ABSENCE"
  ) {
    return 0;
  }

  return null;
}

function percentageTone(percentage: number | null) {
  if (percentage === null) return "neutral";
  if (percentage < 30) return "red";
  if (percentage < 50) return "orange";
  if (percentage < 70) return "blue";
  return "green";
}

export default function TrainingAttendanceForm({
  scheduleId,
  athletes,
  canEdit,
  sessionStatus,
  actualStartTime = "",
  actualEndTime = "",
  sessionDurationMinutes = null,
}: {
  scheduleId: string;
  athletes: AthleteRow[];
  canEdit: boolean;
  sessionStatus?: SessionStatus | null;
  actualStartTime?: string;
  actualEndTime?: string;
  sessionDurationMinutes?: number | null;
}) {
  const [rows, setRows] = useState(() =>
    makeEditableRows(athletes),
  );
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setRows(makeEditableRows(athletes));
    setIsDirty(false);
  }, [athletes]);

  const counts = useMemo(
    () => ({
      present: rows.filter(
        (row) => row.status === "PRESENT",
      ).length,
      absent: rows.filter(
        (row) => row.status === "ABSENT",
      ).length,
      justified: rows.filter(
        (row) => row.status === "JUSTIFIED_ABSENCE",
      ).length,
      late: rows.filter(
        (row) => row.status === "LATE",
      ).length,
      partial: rows.filter(
        (row) => row.status === "PARTIAL",
      ).length,
      unrecorded: rows.filter((row) => row.status === null)
        .length,
    }),
    [rows],
  );

  const persistedRecordedCount = useMemo(
    () =>
      athletes.filter((athlete) => athlete.status !== null)
        .length,
    [athletes],
  );

  const persistedAttendanceComplete =
    athletes.length > 0 &&
    persistedRecordedCount === athletes.length;

  const currentSelectionComplete =
    rows.length > 0 &&
    rows.every((row) => row.status !== null);

  function updateStatus(
    id: string,
    status: AttendanceStatus,
  ) {
    setIsDirty(true);

    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? {
              ...row,
              status,
              arrivalTime:
                status === "LATE" ||
                status === "PARTIAL"
                  ? row.arrivalTime
                  : "",
              exitTime:
                status === "PARTIAL"
                  ? row.exitTime
                  : "",
              justification:
                status === "JUSTIFIED_ABSENCE"
                  ? row.justification
                  : "",
            }
          : row,
      ),
    );
  }

  function markAllPresent() {
    setIsDirty(true);

    setRows((current) =>
      current.map((row) => ({
        ...row,
        status: "PRESENT" as AttendanceStatus,
        arrivalTime: "",
        exitTime: "",
        justification: "",
      })),
    );
  }

  const canOperateSession =
    canEdit &&
    sessionStatus !== "COMPLETED" &&
    sessionStatus !== "CANCELLED" &&
    sessionStatus !== "ARCHIVED";

  const isHistoricalReadOnly =
    !canEdit &&
    (sessionStatus === "COMPLETED" ||
      sessionStatus === "CANCELLED" ||
      sessionStatus === "ARCHIVED");

  const canFinalizePersistedAttendance =
    persistedAttendanceComplete && !isDirty;

  return (
    <div className="attendance-workspace">
      {sessionStatus !== undefined ? (
        <section className="attendance-session-control">
          <div>
            <span className="page-eyebrow">
              TEMPO REAL DO TREINO
            </span>

            <h3>
              {sessionStatus === "COMPLETED"
                ? "Treino finalizado"
                : sessionStatus === "IN_PROGRESS"
                  ? "Treino em andamento"
                  : sessionStatus === "CANCELLED"
                    ? "Treino cancelado"
                    : sessionStatus === "ARCHIVED"
                      ? "Treino arquivado"
                      : "Treino ainda não iniciado"}
            </h3>

            {sessionDurationMinutes !== null &&
            sessionDurationMinutes !== undefined ? (
              <p className="muted">
                Duração considerada: {sessionDurationMinutes} min
              </p>
            ) : null}
          </div>

          {canOperateSession &&
          sessionStatus !== "IN_PROGRESS" ? (
            <div>
              <form action={startTrainingSession}>
                <input
                  type="hidden"
                  name="scheduleId"
                  value={scheduleId}
                />

                <label>
                  <span>Início real</span>
                  <input
                    type="time"
                    name="actualStartTime"
                    defaultValue={actualStartTime}
                    required
                  />
                </label>

                <PendingButton
                  className="btn"
                  pendingText="Iniciando treino..."
                  disabled={isDirty}
                >
                  Iniciar treino
                </PendingButton>
              </form>

              {isDirty ? (
                <small className="muted">
                  Salve a lista de presença antes de iniciar o
                  treino para não perder alterações.
                </small>
              ) : null}
            </div>
          ) : null}

          {canOperateSession &&
          sessionStatus === "IN_PROGRESS" ? (
            <div>
              <form action={completeTrainingSession}>
                <input
                  type="hidden"
                  name="scheduleId"
                  value={scheduleId}
                />

                {actualStartTime ? (
                  <input
                    type="hidden"
                    name="actualStartTime"
                    value={actualStartTime}
                  />
                ) : null}

                <label>
                  <span>Fim real</span>
                  <input
                    type="time"
                    name="actualEndTime"
                    defaultValue={actualEndTime}
                    required
                  />
                </label>

                <PendingButton
                  className="btn"
                  pendingText="Finalizando treino..."
                  disabled={!canFinalizePersistedAttendance}
                >
                  Finalizar treino
                </PendingButton>
              </form>

              {!persistedAttendanceComplete ? (
                <small className="muted">
                  Finalização bloqueada: salve a chamada de todos
                  os atletas primeiro.
                </small>
              ) : isDirty ? (
                <small className="muted">
                  Existem alterações não salvas. Salve a lista
                  antes de finalizar o treino.
                </small>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {!isHistoricalReadOnly ? (
        <div
          className="notice"
          role="status"
          style={{ marginBottom: 16 }}
        >
          {isDirty ? (
            <>
              <strong>Alterações ainda não salvas.</strong>{" "}
              Clique em “Salvar lista de presença” antes de iniciar
              ou finalizar o treino.
            </>
          ) : persistedAttendanceComplete ? (
            <>
              <strong>✓ Lista de presença salva.</strong>{" "}
              {persistedRecordedCount} de {athletes.length} atletas
              têm chamada registrada no banco.
            </>
          ) : persistedRecordedCount > 0 ? (
            <>
              <strong>Chamada incompleta.</strong>{" "}
              {persistedRecordedCount} de {athletes.length} atletas
              têm registro salvo.
            </>
          ) : (
            <>
              <strong>Chamada ainda não salva.</strong>{" "}
              Nenhum atleta será considerado presente
              automaticamente.
            </>
          )}
        </div>
      ) : null}

      <div className="attendance-toolbar">
        <div className="attendance-counters">
          <span className="is-present">
            <b>{counts.present}</b> presentes
          </span>

          <span className="is-late">
            <b>{counts.late}</b> atrasos
          </span>

          <span className="is-partial">
            <b>{counts.partial}</b> parciais
          </span>

          <span className="is-absent">
            <b>{counts.absent}</b> faltas
          </span>

          <span className="is-justified">
            <b>{counts.justified}</b> justificadas
          </span>

          {counts.unrecorded > 0 ? (
            <span>
              <b>{counts.unrecorded}</b> não registrados
            </span>
          ) : null}
        </div>

        {canEdit ? (
          <button
            type="button"
            className="btn btn-secondary btn-small"
            onClick={markAllPresent}
          >
            Marcar todos presentes
          </button>
        ) : null}
      </div>

      {isHistoricalReadOnly ? (
        <div className="attendance-history-list">
          {rows.map((athlete) => {
            const effectiveMinutes =
              effectiveMinutesForDisplay(
                athlete.status,
                athlete.minutesPresent,
                sessionDurationMinutes,
              );

            const percentage = percentageFor(
              effectiveMinutes,
              sessionDurationMinutes,
            );

            return (
              <article
                className="attendance-history-athlete"
                key={athlete.id}
              >
                <div className="attendance-athlete-id">
                  {athlete.photoUrl ? (
                    <img src={athlete.photoUrl} alt="" />
                  ) : (
                    <span>
                      {(athlete.nickname || athlete.name)
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}

                  <div>
                    <strong>
                      {athlete.nickname || athlete.name}
                    </strong>

                    <small>
                      {athlete.jerseyNumber
                        ? `Camisa ${athlete.jerseyNumber}`
                        : athlete.name}
                    </small>
                  </div>
                </div>

                <div className="attendance-history-status">
                  <span
                    className={`attendance-status-pill ${statusTone(
                      athlete.status,
                    )}`}
                  >
                    {statusLabel(athlete.status)}
                  </span>

                  {athlete.status === "LATE" &&
                  athlete.arrivalTime ? (
                    <small>Entrada {athlete.arrivalTime}</small>
                  ) : null}

                  {athlete.status === "PARTIAL" ? (
                    <small>
                      {athlete.arrivalTime
                        ? `Entrada ${athlete.arrivalTime}`
                        : "Entrada no início"}
                      {" · "}
                      {athlete.exitTime
                        ? `Saída ${athlete.exitTime}`
                        : "Saída no fim"}
                    </small>
                  ) : null}

                  {athlete.status === "JUSTIFIED_ABSENCE" &&
                  athlete.justification ? (
                    <small>{athlete.justification}</small>
                  ) : null}
                </div>

                <div className="attendance-history-minutes">
                  <span>MINUTOS</span>
                  <strong>
                    {effectiveMinutes !== null
                      ? `${effectiveMinutes} min`
                      : "Não registrado"}
                  </strong>
                </div>

                <div className="attendance-history-percentage">
                  <span>APROVEITAMENTO</span>
                  <strong
                    className={`attendance-percentage ${percentageTone(
                      percentage,
                    )}`}
                  >
                    {percentage !== null
                      ? `${percentage.toLocaleString("pt-BR", {
                          maximumFractionDigits: 1,
                        })}%`
                      : "—"}
                  </strong>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <form
          action={saveTrainingAttendance}
          className="attendance-form"
        >
          <input
            type="hidden"
            name="scheduleId"
            value={scheduleId}
          />

          <div className="attendance-list">
            {rows.map((athlete) => (
              <article
                className="attendance-athlete"
                key={athlete.id}
              >
                <div className="attendance-athlete-id">
                  {athlete.photoUrl ? (
                    <img src={athlete.photoUrl} alt="" />
                  ) : (
                    <span>
                      {(athlete.nickname || athlete.name)
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}

                  <div>
                    <strong>
                      {athlete.nickname || athlete.name}
                    </strong>

                    <small>
                      {athlete.jerseyNumber
                        ? `Camisa ${athlete.jerseyNumber}`
                        : athlete.name}
                    </small>

                    {athlete.minutesPresent !== null &&
                    athlete.minutesPresent !== undefined ? (
                      <small>
                        {athlete.minutesPresent} min registrados
                      </small>
                    ) : null}
                  </div>
                </div>

                <div
                  className="attendance-options"
                  role="group"
                  aria-label={`Presença de ${athlete.name}`}
                >
                  {(
                    [
                      "PRESENT",
                      "LATE",
                      "PARTIAL",
                      "ABSENT",
                      "JUSTIFIED_ABSENCE",
                    ] as AttendanceStatus[]
                  ).map((status) => (
                    <label
                      className={
                        athlete.status === status
                          ? `selected ${status.toLowerCase()}`
                          : ""
                      }
                      key={status}
                    >
                      <input
                        type="radio"
                        name={`status_${athlete.id}`}
                        value={status}
                        checked={athlete.status === status}
                        required
                        disabled={!canEdit}
                        onChange={() =>
                          updateStatus(athlete.id, status)
                        }
                      />

                      {statusLabel(status)}
                    </label>
                  ))}
                </div>

                <div className="attendance-exception-fields">
                  {athlete.status === "LATE" ? (
                    <label className="attendance-arrival visible">
                      <span>Hora que chegou</span>
                      <input
                        type="time"
                        name={`arrival_${athlete.id}`}
                        value={athlete.arrivalTime}
                        required
                        disabled={!canEdit}
                        onChange={(event) => {
                          setIsDirty(true);
                          setRows((current) =>
                            current.map((row) =>
                              row.id === athlete.id
                                ? {
                                    ...row,
                                    arrivalTime: event.target.value,
                                  }
                                : row,
                            ),
                          );
                        }}
                      />
                    </label>
                  ) : null}

                  {athlete.status === "PARTIAL" ? (
                    <>
                      <label className="attendance-arrival visible">
                        <span>Entrada, se diferente</span>
                        <input
                          type="time"
                          name={`arrival_${athlete.id}`}
                          value={athlete.arrivalTime}
                          disabled={!canEdit}
                          onChange={(event) => {
                            setIsDirty(true);
                            setRows((current) =>
                              current.map((row) =>
                                row.id === athlete.id
                                  ? {
                                      ...row,
                                      arrivalTime: event.target.value,
                                    }
                                  : row,
                              ),
                            );
                          }}
                        />
                      </label>

                      <label className="attendance-arrival visible">
                        <span>Saída, se antecipada</span>
                        <input
                          type="time"
                          name={`exit_${athlete.id}`}
                          value={athlete.exitTime}
                          disabled={!canEdit}
                          onChange={(event) => {
                            setIsDirty(true);
                            setRows((current) =>
                              current.map((row) =>
                                row.id === athlete.id
                                  ? {
                                      ...row,
                                      exitTime: event.target.value,
                                    }
                                  : row,
                              ),
                            );
                          }}
                        />
                      </label>

                      <small className="muted">
                        Informe ao menos entrada ou saída para
                        participação parcial.
                      </small>
                    </>
                  ) : null}

                  {athlete.status === "JUSTIFIED_ABSENCE" ? (
                    <label className="attendance-justification">
                      <span>Justificativa</span>
                      <input
                        type="text"
                        name={`justification_${athlete.id}`}
                        value={athlete.justification}
                        placeholder="Motivo informado"
                        disabled={!canEdit}
                        onChange={(event) => {
                          setIsDirty(true);
                          setRows((current) =>
                            current.map((row) =>
                              row.id === athlete.id
                                ? {
                                    ...row,
                                    justification: event.target.value,
                                  }
                                : row,
                            ),
                          );
                        }}
                      />
                    </label>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {canEdit ? (
            <div>
              <PendingButton
                className="attendance-submit"
                pendingText="Salvando chamada..."
                disabled={!currentSelectionComplete}
              >
                Salvar lista de presença
              </PendingButton>

              {!currentSelectionComplete ? (
                <p className="muted">
                  Registre a situação de todos os atletas para
                  habilitar o salvamento.
                </p>
              ) : null}
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
