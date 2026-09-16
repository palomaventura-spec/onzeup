"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { saveCallUpLineup } from "./actions";

type AthleteLineup = {
  id: string;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  defaultNumber: number | null;
  slot: string;
  jerseyNumber: number | null;
  isCaptain: boolean;
};

const FOOTBALL_SLOTS = [
  ["GOALKEEPER", "Goleiro"],
  ["DEFENDER_LEFT", "Zagueiro esquerdo"],
  ["DEFENDER_CENTER", "Zagueiro central"],
  ["DEFENDER_RIGHT", "Zagueiro direito"],
  ["MIDFIELDER_LEFT", "Meia esquerdo"],
  ["MIDFIELDER_CENTER", "Meia central"],
  ["MIDFIELDER_RIGHT", "Meia direito"],
  ["FORWARD_LEFT", "Atacante esquerdo"],
  ["FORWARD_RIGHT", "Atacante direito"],
] as const;

const FUTSAL_SLOTS = [
  ["GOALKEEPER", "Goleiro"],
  ["FIXO", "Fixo"],
  ["ALA_LEFT", "Ala esquerdo"],
  ["ALA_RIGHT", "Ala direito"],
  ["PIVO", "Pivô"],
] as const;

export default function CallUpLineupEditor({
  matchId,
  athletes,
  canEdit,
  sport,
  squadLimit,
}: {
  matchId: string;
  athletes: AthleteLineup[];
  canEdit: boolean;
  sport: "FOOTBALL" | "FUTSAL";
  squadLimit: number;
}) {
  const router = useRouter();
  const slots = sport === "FUTSAL" ? FUTSAL_SLOTS : FOOTBALL_SLOTS;
  const [rows, setRows] = useState(athletes);
  const [captainId, setCaptainId] = useState(
    athletes.find((athlete) => athlete.isCaptain)?.id || "",
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const starters = useMemo(
    () => rows.filter((athlete) => athlete.slot !== "SUBSTITUTE"),
    [rows],
  );
  const complete = slots.every(([slot]) =>
    rows.some((athlete) => athlete.slot === slot),
  );

  function updateSlot(id: string, slot: string) {
    setSaved(false);
    setRows((current) =>
      current.map((athlete) => {
        if (athlete.id === id) return { ...athlete, slot };
        if (slot !== "SUBSTITUTE" && athlete.slot === slot)
          return { ...athlete, slot: "SUBSTITUTE" };
        return athlete;
      }),
    );
    if (slot === "SUBSTITUTE" && captainId === id) setCaptainId("");
  }

  function submitLineup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      await saveCallUpLineup(formData);
      if (complete) {
        router.push(`/convocacoes/${matchId}/arte`);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form className="card lineup-editor" onSubmit={submitLineup}>
      <input type="hidden" name="matchId" value={matchId} />
      <input type="hidden" name="captainId" value={captainId} />
      <div className="page-head compact">
        <div>
          <span className="page-eyebrow">
            {sport === "FUTSAL"
              ? "FUTSAL • FORMAÇÃO 1–2–1"
              : "CAMPO • FORMAÇÃO 3–3–2"}
          </span>
          <h2>Montar escalação</h2>
          <p className="muted">
            {slots.length} titulares e {Math.max(0, squadLimit - slots.length)}{" "}
            reservas.
          </p>
        </div>
        <span
          className={`status ${complete ? "status-confirmed" : "status-pending"}`}
        >
          {starters.length}/{slots.length} posições
        </span>
      </div>

      <div className="lineup-layout">
        <div className="mini-pitch" aria-label="Prévia da formação">
          {slots.map(([slot, label]) => {
            const athlete = rows.find((item) => item.slot === slot);
            return (
              <div
                className={`pitch-slot pitch-${slot.toLowerCase()}`}
                key={slot}
              >
                {athlete?.photoUrl ? (
                  <img src={athlete.photoUrl} alt="" />
                ) : (
                  <span>
                    {athlete
                      ? (athlete.nickname || athlete.name)
                          .slice(0, 2)
                          .toUpperCase()
                      : "+"}
                  </span>
                )}
                <small>
                  {athlete ? athlete.nickname || athlete.name : label}
                </small>
              </div>
            );
          })}
        </div>

        <div className="lineup-table-wrap">
          <table className="table lineup-table">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Posição na arte</th>
                <th>Nº</th>
                <th>Capitão</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((athlete) => (
                <tr key={athlete.id}>
                  <td>
                    <strong>{athlete.nickname || athlete.name}</strong>
                  </td>
                  <td>
                    <select
                      name={`slot_${athlete.id}`}
                      value={athlete.slot}
                      disabled={!canEdit}
                      onChange={(event) =>
                        updateSlot(athlete.id, event.target.value)
                      }
                    >
                      <option value="SUBSTITUTE">Reserva</option>
                      {slots.map(([slot, label]) => (
                        <option value={slot} key={slot}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      name={`jersey_${athlete.id}`}
                      type="number"
                      min="0"
                      max="999"
                      defaultValue={
                        athlete.jerseyNumber ?? athlete.defaultNumber ?? ""
                      }
                      disabled={!canEdit}
                    />
                  </td>
                  <td>
                    <input
                      type="radio"
                      name="captainVisual"
                      checked={captainId === athlete.id}
                      disabled={!canEdit || athlete.slot === "SUBSTITUTE"}
                      onChange={() => setCaptainId(athlete.id)}
                      aria-label={`Marcar ${athlete.name} como capitão`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {canEdit ? (
        <button className="btn" type="submit" disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar escalação"}
        </button>
      ) : null}
      {saved ? (
        <p className="success-message">Escalação salva com sucesso.</p>
      ) : null}
      {!complete ? (
        <p className="help">
          Preencha todas as posições titulares para liberar a arte da
          convocação.
        </p>
      ) : null}
    </form>
  );
}
