"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remaining = Math.max(0, squadLimit - currentCount);
  const selectedSet = useMemo(
    () => new Set(selected),
    [selected],
  );

  function toggle(id: string) {
    setFeedback(null);

    setSelected((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      if (current.length >= remaining) {
        return current;
      }

      return [...current, id];
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selected.length || isPending) {
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        await createCallUps(formData);
        setSelected([]);
        setFeedback("Atleta(s) adicionado(s) à convocação.");
        router.refresh();
      } catch (error) {
        console.error("CALLUP_ADD_ATHLETES_ERROR", error);
        setFeedback(
          "Não foi possível adicionar os atletas. Tente novamente.",
        );
      }
    });
  }

  return (
    <form className="form" onSubmit={submit}>
      <input
        type="hidden"
        name="matchId"
        value={matchId}
      />

      <div className="callup-limit">
        <strong>
          {currentCount + selected.length} de{" "}
          {squadLimit} atletas
        </strong>

        <span>
          {remaining - selected.length} vaga(s) disponível(is)
        </span>
      </div>

      <div className="stack">
        {athletes.map((athlete) => {
          const checked = selectedSet.has(athlete.id);
          const disabled =
            !checked &&
            selected.length >= remaining;

          return (
            <label
              className={`check athlete-check${
                disabled
                  ? " is-disabled"
                  : ""
              }`}
              key={athlete.id}
            >
              <input
                type="checkbox"
                name="athleteIds"
                value={athlete.id}
                checked={checked}
                disabled={disabled || isPending}
                onChange={() =>
                  toggle(athlete.id)
                }
              />

              <span>
                <strong>
                  {athlete.nickname ||
                    athlete.name}
                </strong>

                <small>
                  {athlete.position ||
                    "Atleta"}

                  {athlete.jerseyNumber != null
                    ? ` • #${athlete.jerseyNumber}`
                    : ""}
                </small>
              </span>
            </label>
          );
        })}
      </div>

      {feedback ? (
        <p
          className="help"
          style={{ margin: 0 }}
        >
          {feedback}
        </p>
      ) : null}

      <button
        className="btn"
        type="submit"
        disabled={
          selected.length === 0 ||
          isPending
        }
      >
        {isPending
          ? "Adicionando atletas..."
          : `Adicionar ${
              selected.length || ""
            } atleta(s)`}
      </button>
    </form>
  );
}
