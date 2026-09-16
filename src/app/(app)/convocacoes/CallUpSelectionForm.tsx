"use client";

import { useMemo, useState } from "react";

import { createCallUps } from "./actions";

type AthleteOption = {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
  jerseyNumber: number | null;
};

export default function CallUpSelectionForm({
  matchId,
  athletes,
  currentCount,
  squadLimit,
}: {
  matchId: string;
  athletes: AthleteOption[];
  currentCount: number;
  squadLimit: number;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const remaining = Math.max(0, squadLimit - currentCount);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= remaining) return current;
      return [...current, id];
    });
  }

  return (
    <form className="form" action={createCallUps}>
      <input type="hidden" name="matchId" value={matchId} />
      <div className="callup-limit">
        <strong>
          {currentCount + selected.length} de {squadLimit} atletas
        </strong>
        <span>{remaining - selected.length} vaga(s) disponível(is)</span>
      </div>
      <div className="stack">
        {athletes.map((athlete) => {
          const checked = selectedSet.has(athlete.id);
          const disabled = !checked && selected.length >= remaining;
          return (
            <label
              className={`check athlete-check${disabled ? " is-disabled" : ""}`}
              key={athlete.id}
            >
              <input
                type="checkbox"
                name="athleteIds"
                value={athlete.id}
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(athlete.id)}
              />
              <span>
                <strong>{athlete.nickname || athlete.name}</strong>
                <small>
                  {athlete.position || "Atleta"}
                  {athlete.jerseyNumber != null
                    ? ` • #${athlete.jerseyNumber}`
                    : ""}
                </small>
              </span>
            </label>
          );
        })}
      </div>
      <button className="btn" type="submit" disabled={selected.length === 0}>
        Adicionar {selected.length || ""} atleta(s)
      </button>
    </form>
  );
}
