"use client";

import { useMemo, useState } from "react";
import { saveTrainingAttendance } from "./actions";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE";
type AthleteRow = {
  id: string;
  name: string;
  nickname: string | null;
  jerseyNumber: number | null;
  photoUrl: string | null;
  status: AttendanceStatus | null;
  arrivalTime: string;
};

export default function TrainingAttendanceForm({
  scheduleId,
  athletes,
  canEdit,
}: {
  scheduleId: string;
  athletes: AthleteRow[];
  canEdit: boolean;
}) {
  const [rows, setRows] = useState(() => athletes.map((athlete) => ({ ...athlete, status: athlete.status ?? "PRESENT" as AttendanceStatus })));
  const counts = useMemo(() => ({
    present: rows.filter((row) => row.status === "PRESENT").length,
    absent: rows.filter((row) => row.status === "ABSENT").length,
    late: rows.filter((row) => row.status === "LATE").length,
  }), [rows]);

  function updateStatus(id: string, status: AttendanceStatus) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, status, arrivalTime: status === "LATE" ? row.arrivalTime : "" } : row));
  }

  return (
    <form action={saveTrainingAttendance} className="attendance-form">
      <input type="hidden" name="scheduleId" value={scheduleId} />
      <div className="attendance-toolbar">
        <div className="attendance-counters">
          <span className="is-present"><b>{counts.present}</b> presentes</span>
          <span className="is-absent"><b>{counts.absent}</b> ausentes</span>
          <span className="is-late"><b>{counts.late}</b> atrasados</span>
        </div>
        {canEdit ? <button type="button" className="btn btn-secondary btn-small" onClick={() => setRows((current) => current.map((row) => ({ ...row, status: "PRESENT", arrivalTime: "" })))}>Marcar todos presentes</button> : null}
      </div>

      <div className="attendance-list">
        {rows.map((athlete) => (
          <article className="attendance-athlete" key={athlete.id}>
            <div className="attendance-athlete-id">
              {athlete.photoUrl ? <img src={athlete.photoUrl} alt="" /> : <span>{(athlete.nickname || athlete.name).slice(0, 2).toUpperCase()}</span>}
              <div><strong>{athlete.nickname || athlete.name}</strong><small>{athlete.jerseyNumber ? `Camisa ${athlete.jerseyNumber}` : athlete.name}</small></div>
            </div>

            <div className="attendance-options" role="group" aria-label={`Presença de ${athlete.name}`}>
              {(["PRESENT", "ABSENT", "LATE"] as AttendanceStatus[]).map((status) => (
                <label className={athlete.status === status ? `selected ${status.toLowerCase()}` : ""} key={status}>
                  <input type="radio" name={`status_${athlete.id}`} value={status} checked={athlete.status === status} disabled={!canEdit} onChange={() => updateStatus(athlete.id, status)} />
                  {status === "PRESENT" ? "Presente" : status === "ABSENT" ? "Ausente" : "Atrasado"}
                </label>
              ))}
            </div>

            <label className={`attendance-arrival ${athlete.status === "LATE" ? "visible" : ""}`}>
              <span>Hora que chegou</span>
              <input type="time" name={`arrival_${athlete.id}`} value={athlete.arrivalTime} required={athlete.status === "LATE"} disabled={!canEdit || athlete.status !== "LATE"} onChange={(event) => setRows((current) => current.map((row) => row.id === athlete.id ? { ...row, arrivalTime: event.target.value } : row))} />
            </label>
          </article>
        ))}
      </div>

      {canEdit ? <button className="attendance-submit" type="submit">Salvar lista de presença</button> : null}
    </form>
  );
}
