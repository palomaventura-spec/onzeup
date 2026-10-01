"use client";
import Link from "next/link";

import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

import {
  completeTrainingSession,
  saveTrainingAttendanceItem,
  startTrainingSession,
} from "./actions";

import AthleteTrainingHistoryButton from "./AthleteTrainingHistoryButton";

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
  rosterType: "ROSTER" | "EVALUATION";
  categoryAccentColor: string;
  status: AttendanceStatus | null;
  arrivalTime: string;
  exitTime?: string;
  justification?: string;
  minutesPresent?: number | null;
  evaluationId: string | null;
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
  canCreateHistory = false,
}: {
  scheduleId: string;
  athletes: AthleteRow[];
  canEdit: boolean;
  sessionStatus?: SessionStatus | null;
  actualStartTime?: string;
  actualEndTime?: string;
  sessionDurationMinutes?: number | null;
  canCreateHistory?: boolean;
}) {

  const [rows, setRows] = useState(() =>
    makeEditableRows(athletes),
  );
  const [savingIds, setSavingIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [saveErrors, setSaveErrors] = useState<
    Record<string, string>
  >({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRows(makeEditableRows(athletes));
    setSavingIds(new Set());
    setSaveErrors({});
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

  const recordedCount = useMemo(
    () =>
      rows.filter(
        (athlete) => athlete.status !== null,
      ).length,
    [rows],
  );

  const attendanceComplete =
    rows.length > 0 &&
    rows.every((row) => row.status !== null) &&
    savingIds.size === 0 &&
    Object.keys(saveErrors).length === 0;

  const canOperateSession =
    canEdit &&
    sessionStatus !== "COMPLETED" &&
    sessionStatus !== "CANCELLED" &&
    sessionStatus !== "ARCHIVED";

  /*
   * Fluxo de campo/iPad:
   * iniciar treino -> tocar presença -> autosave -> avaliar -> finalizar.
   */
  const canEditAttendance =
    canEdit && sessionStatus === "IN_PROGRESS";

  const isHistoricalReadOnly =
    !canEdit &&
    (sessionStatus === "COMPLETED" ||
      sessionStatus === "CANCELLED" ||
      sessionStatus === "ARCHIVED");

  const canFinalizePersistedAttendance =
    attendanceComplete && !isPending;

  const stateCopy = sessionStateCopy(sessionStatus);

  function setSaving(id: string, saving: boolean) {
    setSavingIds((current) => {
      const next = new Set(current);
      if (saving) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function autosave(
    row: AthleteRow,
    overrides: Partial<{
      status: AttendanceStatus;
      arrivalTime: string;
      exitTime: string;
      justification: string;
    }> = {},
  ) {
    const status = overrides.status ?? row.status;

    if (!status || sessionStatus !== "IN_PROGRESS") {
      return;
    }

    const next = {
      status,
      arrivalTime:
        overrides.arrivalTime ?? row.arrivalTime ?? "",
      exitTime:
        overrides.exitTime ?? row.exitTime ?? "",
      justification:
        overrides.justification ??
        row.justification ??
        "",
    };

    setSaving(row.id, true);
    setSaveErrors((current) => {
      const copy = { ...current };
      delete copy[row.id];
      return copy;
    });

    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("scheduleId", scheduleId);
        data.set("athleteId", row.id);
        data.set("status", next.status);
        data.set("arrivalTime", next.arrivalTime);
        data.set("exitTime", next.exitTime);
        data.set("justification", next.justification);

        const result =
          await saveTrainingAttendanceItem(data);

        setRows((current) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  minutesPresent:
                    result?.minutesPresent ??
                    item.minutesPresent,
                }
              : item,
          ),
        );
      } catch (error) {
        setSaveErrors((current) => ({
          ...current,
          [row.id]:
            error instanceof Error
              ? error.message
              : "Não foi possível salvar.",
        }));
      } finally {
        setSaving(row.id, false);
      }
    });
  }

  function updateStatus(
    id: string,
    status: AttendanceStatus,
  ) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    const nextRow = {
      ...row,
      status,
      arrivalTime:
        status === "LATE" ||
        status === "PARTIAL"
          ? row.arrivalTime
          : "",
      exitTime:
        status === "PARTIAL"
          ? row.exitTime ?? ""
          : "",
      justification:
        status === "JUSTIFIED_ABSENCE"
          ? row.justification ?? ""
          : "",
    };

    setRows((current) =>
      current.map((item) =>
        item.id === id ? nextRow : item,
      ),
    );

    autosave(nextRow);
  }

  function markAllPresent() {
    const nextRows = rows.map((row) => ({
      ...row,
      status: "PRESENT" as AttendanceStatus,
      arrivalTime: "",
      exitTime: "",
      justification: "",
    }));

    setRows(nextRows);

    for (const row of nextRows) {
      autosave(row);
    }
  }

  function updateArrival(id: string, value: string) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    const nextRow = {
      ...row,
      arrivalTime: value,
    };

    setRows((current) =>
      current.map((item) =>
        item.id === id ? nextRow : item,
      ),
    );

    autosave(nextRow, { arrivalTime: value });
  }

  function updateExit(id: string, value: string) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;

    const nextRow = {
      ...row,
      exitTime: value,
    };

    setRows((current) =>
      current.map((item) =>
        item.id === id ? nextRow : item,
      ),
    );

    autosave(nextRow, { exitTime: value });
  }

  function updateJustification(
    id: string,
    value: string,
  ) {
    setRows((current) =>
      current.map((row) =>
        row.id === id
          ? { ...row, justification: value }
          : row,
      ),
    );
  }

  function saveJustification(id: string) {
    const row = rows.find((item) => item.id === id);
    if (!row) return;
    autosave(row);
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

          {canOperateSession &&
          sessionStatus === "IN_PROGRESS" &&
          !attendanceComplete ? (
            <div className="attendance-v8-session-warning">
              Finalização bloqueada até todos os atletas terem
              uma presença definida e salva automaticamente.
            </div>
          ) : null}
        </section>
      ) : null}

      {canEdit && sessionStatus === "SCHEDULED" ? (
        <div className="attendance-v8-session-warning">
          Informe a hora real de início e clique em <strong>Iniciar treino</strong>.
          A presença e as avaliações serão liberadas depois.
        </div>
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

          {canEditAttendance ? (
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
            savingIds.size > 0
              ? "dirty"
              : Object.keys(saveErrors).length > 0
                ? "dirty"
                : attendanceComplete
                  ? "saved"
                  : "pending"
          }`}
        >
          {savingIds.size > 0 ? (
            <>
              <strong>Salvando automaticamente…</strong>
              <span>
                Pode continuar a chamada; não é necessário clicar
                em salvar.
              </span>
            </>
          ) : Object.keys(saveErrors).length > 0 ? (
            <>
              <strong>Falha ao salvar uma presença.</strong>
              <span>
                Toque novamente no status do atleta indicado.
              </span>
            </>
          ) : attendanceComplete ? (
            <>
              <strong>Presenças salvas ✓</strong>
              <span>
                {recordedCount} de {rows.length} atletas registrados.
              </span>
            </>
          ) : (
            <>
              <strong>
                {counts.unrecorded} atleta(s) sem presença definida
              </strong>
              <span>
                Cada toque é salvo automaticamente.
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
                    style={{
  border: `3px solid ${athlete.categoryAccentColor}`,
  boxSizing: "border-box",
}} />
                  ) : (
                    <span
  style={{
    border: `3px solid ${athlete.categoryAccentColor}`,
    boxSizing: "border-box",
    borderRadius: "50%",
  }}
>
  {(athlete.nickname || athlete.name)
    .slice(0, 2)
    .toUpperCase()}
</span>
                  )}

                  <div>
                    <strong
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 7,
                      }}
                    >
                      {athlete.nickname || athlete.name}
                    </strong>
                    <small>
                      {athlete.jerseyNumber
                        ? `Camisa ${athlete.jerseyNumber}`
                        : athlete.name}
                    </small>
                    <AthleteTrainingHistoryButton
                      scheduleId={scheduleId}
                      athleteId={athlete.id}
                      athleteName={
                        athlete.nickname || athlete.name
                      }
                      canCreate={canCreateHistory}
                    />
                    {athlete.evaluationId ? (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      marginLeft: 8,
      flexWrap: "wrap",
    }}
  >
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 30,
        padding: "0 10px",
        borderRadius: 8,
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
        color: "#15803d",
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      ✓ Avaliação concluída
    </span>

    <Link
      href={`/atletas/${athlete.id}/performance/avaliacoes/${athlete.evaluationId}`}
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: "#15803d",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      Ver avaliação
    </Link>
  </div>
) : null}
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
        <div className="attendance-v8-form">

          <div className="attendance-v8-list">
            {[
  {
    key: "ROSTER",
    title: "ELENCO",
    athletes: rows
      .filter(
        (athlete) =>
          athlete.rosterType === "ROSTER",
      )
      .sort((a, b) =>
        (a.nickname || a.name).localeCompare(
          b.nickname || b.name,
          "pt-BR",
        ),
      ),
  },
  {
    key: "EVALUATION",
    title: "AVALIAÇÃO",
    athletes: rows
      .filter(
        (athlete) =>
          athlete.rosterType === "EVALUATION",
      )
      .sort((a, b) =>
        (a.nickname || a.name).localeCompare(
          b.nickname || b.name,
          "pt-BR",
        ),
      ),
  },
]
  .filter(
    (group) =>
      group.athletes.length > 0,
  )
  .map((group) => (
    <div key={group.key}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 4px 10px",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.12em",
          color: "#667585",
        }}
      >
        <span>{group.title}</span>

        <span
          style={{
            minWidth: 22,
            height: 22,
            padding: "0 7px",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: "#f1f5f9",
            color: "#475569",
            fontSize: 11,
            letterSpacing: 0,
          }}
        >
          {group.athletes.length}
        </span>
      </div>

      {group.athletes.map((athlete) => {
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
                      style={{
  border: `3px solid ${athlete.categoryAccentColor}`,
  boxSizing: "border-box",
}} />
                    ) : (
                      <span
  style={{
    border: `3px solid ${athlete.categoryAccentColor}`,
    boxSizing: "border-box",
    borderRadius: "50%",
  }}
>
  {(athlete.nickname || athlete.name)
    .slice(0, 2)
    .toUpperCase()}
</span>
                    )}

                    <div>
                      <strong
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 7,
                        }}
                      >
                        {athlete.nickname || athlete.name}
                      </strong>
                      <small>
                        {athlete.jerseyNumber
                          ? `Camisa ${athlete.jerseyNumber}`
                          : athlete.name}
                      </small>
                    <AthleteTrainingHistoryButton
                      scheduleId={scheduleId}
                      athleteId={athlete.id}
                      athleteName={
                        athlete.nickname || athlete.name
                      }
                      canCreate={canCreateHistory}
                    />
                    {athlete.evaluationId ? (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 8,
      marginLeft: 8,
      flexWrap: "wrap",
    }}
  >
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 30,
        padding: "0 10px",
        borderRadius: 8,
        border: "1px solid #bbf7d0",
        background: "#f0fdf4",
        color: "#15803d",
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      ✓ Avaliação concluída
    </span>

    <Link
      href={`/atletas/${athlete.id}/performance/avaliacoes/${athlete.evaluationId}`}
      style={{
        fontSize: 11,
        fontWeight: 800,
        color: "#15803d",
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      Ver avaliação
    </Link>
  </div>
) : (
  sessionStatus !== "IN_PROGRESS" ? (
    <span
      style={{
        marginLeft: 8,
        fontSize: 10,
        fontWeight: 800,
        color: "#7b8790",
        whiteSpace: "nowrap",
      }}
    >
      Inicie o treino
    </span>
  ) : athlete.status === null ? (
    <span
      style={{
        marginLeft: 8,
        fontSize: 10,
        fontWeight: 800,
        color: "#b45309",
        whiteSpace: "nowrap",
      }}
    >
      Defina a presença
    </span>
  ) : savingIds.has(athlete.id) ? (
    <span
      style={{
        marginLeft: 8,
        fontSize: 10,
        fontWeight: 800,
        color: "#64748b",
        whiteSpace: "nowrap",
      }}
    >
      Salvando…
    </span>
  ) : athlete.status === "ABSENT" ||
      athlete.status === "JUSTIFIED_ABSENCE" ? (
    <span
      style={{
        marginLeft: 8,
        fontSize: 10,
        fontWeight: 800,
        color: "#b91c1c",
        whiteSpace: "nowrap",
      }}
    >
      Atleta ausente
    </span>
  ) : (
    <Link
      href={`/atletas/${athlete.id}/performance/avaliacoes/nova?trainingScheduleId=${encodeURIComponent(scheduleId)}&returnTo=${encodeURIComponent(`/treinos/${scheduleId}`)}`}
      title={`Avaliar ${athlete.nickname || athlete.name}`}
      aria-label={`Avaliar ${athlete.nickname || athlete.name}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 30,
        padding: "0 10px",
        marginLeft: 8,
        borderRadius: 8,
        border: "1px solid #99e600",
        background: "#99e600",
        color: "#10200a",
        fontSize: 11,
        fontWeight: 800,
        lineHeight: 1,
        textDecoration: "none",
        whiteSpace: "nowrap",
        flex: "0 0 auto",
      }}
    >
      Avaliar
    </Link>
  )
)}
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
                          disabled={!canEditAttendance}
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

                  {savingIds.has(athlete.id) ? (
                    <small
                      style={{
                        color: "#64748b",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Salvando…
                    </small>
                  ) : saveErrors[athlete.id] ? (
                    <small
                      style={{
                        color: "#b91c1c",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                      title={saveErrors[athlete.id]}
                    >
                      Erro ao salvar
                    </small>
                  ) : athlete.status ? (
                    <small
                      style={{
                        color: "#15803d",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Salvo ✓
                    </small>
                  ) : null}

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
                          disabled={!canEditAttendance}
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
                          disabled={!canEditAttendance}
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
                          disabled={!canEditAttendance}
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
                          disabled={!canEditAttendance}
                          onChange={(event) =>
                            updateJustification(
                              athlete.id,
                              event.target.value,
                            )
                          }
                          onBlur={() =>
                            saveJustification(athlete.id)
                          }
                        />
                      </label>
                    </div>
                  ) : null}
                </article>
              );
                  })}
                </div>
              ))}
          </div>

          {canEditAttendance ? (
            <div className="attendance-v8-savebar">
              <div>
                <strong>
                  {counts.unrecorded === 0
                    ? "Chamada completa"
                    : `${counts.unrecorded} atleta(s) sem presença`}
                </strong>
                <span>
                  Autosave ativo · cada alteração é salva na hora.
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
