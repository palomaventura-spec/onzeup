"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

type AttendanceIcon =
  | "clock"
  | "play"
  | "stop"
  | "check"
  | "late"
  | "partial"
  | "absent"
  | "justified"
  | "save";

function Icon({
  name,
  size = 18,
}: {
  name: AttendanceIcon;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m10 8 6 4-6 4Z" />
      </svg>
    );
  }

  if (name === "stop") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M9 9h6v6H9z" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </svg>
    );
  }

  if (name === "late") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 7v5h4" />
      </svg>
    );
  }

  if (name === "partial") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 4v16" />
      </svg>
    );
  }

  if (name === "absent") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m9 9 6 6M15 9l-6 6" />
      </svg>
    );
  }

  if (name === "justified") {
    return (
      <svg {...common}>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M14 3v4h4M9 12h6M9 16h4" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M5 4h12l2 2v14H5z" />
      <path d="M8 4v6h8V4M8 16h8" />
    </svg>
  );
}

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
      return "Justificada";
    case "LATE":
      return "Atraso";
    case "PARTIAL":
      return "Parcial";
    default:
      return "Pendente";
  }
}

function statusIcon(status: AttendanceStatus) {
  switch (status) {
    case "PRESENT":
      return "check";
    case "LATE":
      return "late";
    case "PARTIAL":
      return "partial";
    case "ABSENT":
      return "absent";
    case "JUSTIFIED_ABSENCE":
      return "justified";
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

function sessionStateCopy(status?: SessionStatus | null) {
  switch (status) {
    case "IN_PROGRESS":
      return {
        label: "Treino em andamento",
        tone: "active",
      };
    case "COMPLETED":
      return {
        label: "Treino finalizado",
        tone: "completed",
      };
    case "CANCELLED":
      return {
        label: "Treino cancelado",
        tone: "cancelled",
      };
    case "ARCHIVED":
      return {
        label: "Treino arquivado",
        tone: "archived",
      };
    default:
      return {
        label: "Aguardando início",
        tone: "scheduled",
      };
  }
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
        (row) =>
          row.status === "JUSTIFIED_ABSENCE",
      ).length,
      late: rows.filter(
        (row) => row.status === "LATE",
      ).length,
      partial: rows.filter(
        (row) => row.status === "PARTIAL",
      ).length,
      unrecorded: rows.filter(
        (row) => row.status === null,
      ).length,
    }),
    [rows],
  );

  const persistedRecordedCount = useMemo(
    () =>
      athletes.filter(
        (athlete) => athlete.status !== null,
      ).length,
    [athletes],
  );

  const persistedAttendanceComplete =
    athletes.length > 0 &&
    persistedRecordedCount === athletes.length;

  const currentSelectionComplete =
    rows.length > 0 &&
    rows.every((row) => row.status !== null);

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

  const stateCopy = sessionStateCopy(sessionStatus);

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

  function updateArrival(id: string, value: string) {
    setIsDirty(true);
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, arrivalTime: value }
          : row,
      ),
    );
  }

  function updateExit(id: string, value: string) {
    setIsDirty(true);
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, exitTime: value }
          : row,
      ),
    );
  }

  function updateJustification(
    id: string,
    value: string,
  ) {
    setIsDirty(true);
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, justification: value }
          : row,
      ),
    );
  }

  return (
    <div className="attendance-v8">
      {sessionStatus !== undefined ? (
        <section className="attendance-v8-session">
          <div className="attendance-v8-session-copy">
            <span className="attendance-v8-eyebrow">
              TEMPO REAL DO TREINO
            </span>

            <div className="attendance-v8-session-title">
              <h3>{stateCopy.label}</h3>
              <span
                className={`attendance-v8-session-status ${stateCopy.tone}`}
              >
                {sessionStatus === "IN_PROGRESS"
                  ? "AO VIVO"
                  : sessionStatus === "COMPLETED"
                    ? "ENCERRADO"
                    : sessionStatus === "CANCELLED"
                      ? "CANCELADO"
                      : sessionStatus === "ARCHIVED"
                        ? "ARQUIVADO"
                        : "AGUARDANDO"}
              </span>
            </div>

            <p>
              O aproveitamento individual usa a duração real do
              treino quando início e fim forem registrados.
            </p>
          </div>

          <div className="attendance-v8-time-summary">
            <div>
              <span>INÍCIO REAL</span>
              <strong>{actualStartTime || "—"}</strong>
            </div>

            <div>
              <span>FIM REAL</span>
              <strong>{actualEndTime || "—"}</strong>
            </div>

            <div>
              <span>DURAÇÃO</span>
              <strong>
                {sessionDurationMinutes !== null &&
                sessionDurationMinutes !== undefined
                  ? `${sessionDurationMinutes} min`
                  : "—"}
              </strong>
            </div>
          </div>

          {canOperateSession &&
          sessionStatus !== "IN_PROGRESS" ? (
            <form
              className="attendance-v8-session-action"
              action={startTrainingSession}
            >
              <input
                type="hidden"
                name="scheduleId"
                value={scheduleId}
              />

              <label>
                <span>Hora que começou</span>
                <input
                  type="time"
                  name="actualStartTime"
                  defaultValue={actualStartTime}
                  required
                />
              </label>

              <PendingButton
                className="attendance-v8-start"
                pendingText="Iniciando..."
                disabled={isDirty}
              >
                <Icon name="play" size={17} />
                Iniciar treino
              </PendingButton>
            </form>
          ) : null}

          {canOperateSession &&
          sessionStatus === "IN_PROGRESS" ? (
            <form
              className="attendance-v8-session-action"
              action={completeTrainingSession}
            >
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
                <span>Hora que terminou</span>
                <input
                  type="time"
                  name="actualEndTime"
                  defaultValue={actualEndTime}
                  required
                />
              </label>

              <PendingButton
                className="attendance-v8-finish"
                pendingText="Finalizando..."
                disabled={
                  !canFinalizePersistedAttendance
                }
              >
                <Icon name="stop" size={17} />
                Finalizar treino
              </PendingButton>
            </form>
          ) : null}

          {canOperateSession && isDirty ? (
            <div className="attendance-v8-session-warning">
              Salve a chamada antes de iniciar ou finalizar o
              treino.
            </div>
          ) : null}

          {canOperateSession &&
          sessionStatus === "IN_PROGRESS" &&
          !persistedAttendanceComplete ? (
            <div className="attendance-v8-session-warning">
              Finalização bloqueada até todos os atletas terem
              a chamada salva.
            </div>
          ) : null}
        </section>
      ) : null}

      {!isHistoricalReadOnly ? (
        <section className="attendance-v8-toolbar">
          <div className="attendance-v8-counters">
            <span className="present">
              <b>{counts.present}</b> presentes
            </span>
            <span className="late">
              <b>{counts.late}</b> atrasos
            </span>
            <span className="partial">
              <b>{counts.partial}</b> parciais
            </span>
            <span className="absent">
              <b>{counts.absent}</b> faltas
            </span>
            <span className="justified">
              <b>{counts.justified}</b> justificadas
            </span>
            <span className="pending">
              <b>{counts.unrecorded}</b> pendentes
            </span>
          </div>

          {canEdit ? (
            <button
              type="button"
              className="attendance-v8-mark-all"
              onClick={markAllPresent}
            >
              <Icon name="check" size={16} />
              Marcar todos presentes
            </button>
          ) : null}
        </section>
      ) : null}

      {!isHistoricalReadOnly ? (
        <div
          className={`attendance-v8-save-state ${
            isDirty
              ? "dirty"
              : persistedAttendanceComplete
                ? "saved"
                : "pending"
          }`}
        >
          {isDirty ? (
            <>
              <strong>Alterações não salvas.</strong>
              <span>
                Salve a chamada para atualizar os cálculos do
                treino.
              </span>
            </>
          ) : persistedAttendanceComplete ? (
            <>
              <strong>Chamada salva.</strong>
              <span>
                {persistedRecordedCount} de {athletes.length} atletas
                registrados.
              </span>
            </>
          ) : (
            <>
              <strong>Chamada pendente.</strong>
              <span>
                Nenhum atleta é considerado presente
                automaticamente.
              </span>
            </>
          )}
        </div>
      ) : null}

      {isHistoricalReadOnly ? (
        <section className="attendance-v8-history">
          <div className="attendance-v8-history-head">
            <span>ATLETA</span>
            <span>STATUS</span>
            <span>MINUTOS</span>
            <span>APROVEITAMENTO</span>
          </div>

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
                className="attendance-v8-history-row"
                key={athlete.id}
              >
                <div className="attendance-v8-athlete">
                  {athlete.photoUrl ? (
                    <img
                      src={athlete.photoUrl}
                      alt=""
                    />
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

                <div className="attendance-v8-history-status">
                  <span
                    className={`attendance-v8-status-pill ${statusTone(
                      athlete.status,
                    )}`}
                  >
                    {statusLabel(athlete.status)}
                  </span>

                  {athlete.status === "LATE" &&
                  athlete.arrivalTime ? (
                    <small>
                      Chegou {athlete.arrivalTime}
                    </small>
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

                  {athlete.status ===
                    "JUSTIFIED_ABSENCE" &&
                  athlete.justification ? (
                    <small>
                      {athlete.justification}
                    </small>
                  ) : null}
                </div>

                <div className="attendance-v8-history-metric">
                  <strong>
                    {effectiveMinutes !== null
                      ? `${effectiveMinutes} min`
                      : "—"}
                  </strong>
                </div>

                <div className="attendance-v8-history-metric">
                  <strong
                    className={`attendance-v8-percentage ${percentageTone(
                      percentage,
                    )}`}
                  >
                    {percentage !== null
                      ? `${percentage.toLocaleString(
                          "pt-BR",
                          {
                            maximumFractionDigits: 1,
                          },
                        )}%`
                      : "—"}
                  </strong>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <form
          action={saveTrainingAttendance}
          className="attendance-v8-form"
        >
          <input
            type="hidden"
            name="scheduleId"
            value={scheduleId}
          />

          <div className="attendance-v8-list">
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
                  className="attendance-v8-row"
                  key={athlete.id}
                >
                  <div className="attendance-v8-athlete">
                    {athlete.photoUrl ? (
                      <img
                        src={athlete.photoUrl}
                        alt=""
                      />
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

                  <div
                    className="attendance-v8-options"
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
                            ? `selected ${statusTone(status)}`
                            : statusTone(status)
                        }
                        key={status}
                        title={statusLabel(status)}
                      >
                        <input
                          type="radio"
                          name={`status_${athlete.id}`}
                          value={status}
                          checked={
                            athlete.status === status
                          }
                          required
                          disabled={!canEdit}
                          onChange={() =>
                            updateStatus(
                              athlete.id,
                              status,
                            )
                          }
                        />

                        <Icon
                          name={statusIcon(status)}
                          size={15}
                        />
                        <span>
                          {statusLabel(status)}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="attendance-v8-result">
                    <span>MIN / %</span>
                    <strong>
                      {effectiveMinutes !== null
                        ? `${effectiveMinutes} min`
                        : "—"}
                    </strong>
                    <small
                      className={`attendance-v8-percentage ${percentageTone(
                        percentage,
                      )}`}
                    >
                      {percentage !== null
                        ? `${percentage.toLocaleString(
                            "pt-BR",
                            {
                              maximumFractionDigits: 1,
                            },
                          )}%`
                        : "—"}
                    </small>
                  </div>

                  {athlete.status === "LATE" ? (
                    <div className="attendance-v8-exception">
                      <label>
                        <span>Hora de chegada</span>
                        <input
                          type="time"
                          name={`arrival_${athlete.id}`}
                          value={athlete.arrivalTime}
                          required
                          disabled={!canEdit}
                          onChange={(event) =>
                            updateArrival(
                              athlete.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}

                  {athlete.status === "PARTIAL" ? (
                    <div className="attendance-v8-exception two">
                      <label>
                        <span>Entrada</span>
                        <input
                          type="time"
                          name={`arrival_${athlete.id}`}
                          value={athlete.arrivalTime}
                          disabled={!canEdit}
                          onChange={(event) =>
                            updateArrival(
                              athlete.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <label>
                        <span>Saída</span>
                        <input
                          type="time"
                          name={`exit_${athlete.id}`}
                          value={athlete.exitTime}
                          disabled={!canEdit}
                          onChange={(event) =>
                            updateExit(
                              athlete.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>

                      <small>
                        Informe ao menos entrada ou saída.
                      </small>
                    </div>
                  ) : null}

                  {athlete.status ===
                  "JUSTIFIED_ABSENCE" ? (
                    <div className="attendance-v8-exception">
                      <label>
                        <span>Justificativa</span>
                        <input
                          type="text"
                          name={`justification_${athlete.id}`}
                          value={athlete.justification}
                          placeholder="Motivo informado"
                          disabled={!canEdit}
                          onChange={(event) =>
                            updateJustification(
                              athlete.id,
                              event.target.value,
                            )
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {canEdit ? (
            <div className="attendance-v8-savebar">
              <div>
                <strong>
                  {currentSelectionComplete
                    ? "Chamada pronta para salvar"
                    : `${counts.unrecorded} atleta(s) pendente(s)`}
                </strong>
                <span>
                  Faltas, inclusive justificadas, contam 0 minuto
                  no aproveitamento.
                </span>
              </div>

              <PendingButton
                className="attendance-v8-save"
                pendingText="Salvando chamada..."
                disabled={!currentSelectionComplete}
              >
                <Icon name="save" size={17} />
                Salvar chamada
              </PendingButton>
            </div>
          ) : null}
        </form>
      )}
    </div>
  );
}
