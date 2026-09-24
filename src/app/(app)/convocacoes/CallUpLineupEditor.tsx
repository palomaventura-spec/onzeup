"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { saveCallUpLineup } from "./actions";
import SafeConvocationImage from "./SafeConvocationImage";

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

type FormationSlot = {
  code: string;
  label: string;
  slotType: string;
  x: number;
  y: number;
  sortOrder: number;
};

function safeImageUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("/") || value.startsWith("data:")) return value;
  return `/api/image-proxy?url=${encodeURIComponent(value)}`;
}

export default function CallUpLineupEditor({
  matchId,
  athletes,
  canEdit,
  sport,
  squadLimit,
  formationName,
  starterCount,
  reserveCount,
  slots,
}: {
  matchId: string;
  athletes: AthleteLineup[];
  canEdit: boolean;
  sport: "FOOTBALL" | "FUTSAL";
  squadLimit: number;
  formationName: string;
  starterCount: number;
  reserveCount: number;
  slots: FormationSlot[];
}) {
  const router = useRouter();

  const slotCodes = useMemo(
    () => new Set(slots.map((slot) => slot.code)),
    [slots],
  );

  const [rows, setRows] = useState(() =>
    athletes.map((athlete) => ({
      ...athlete,
      slot: slotCodes.has(athlete.slot)
        ? athlete.slot
        : "SUBSTITUTE",
    })),
  );

  const [captainId, setCaptainId] = useState(
    athletes.find(
      (athlete) =>
        athlete.isCaptain &&
        slotCodes.has(athlete.slot),
    )?.id || "",
  );

  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const starters = useMemo(
    () =>
      rows.filter((athlete) =>
        slotCodes.has(athlete.slot),
      ),
    [rows, slotCodes],
  );

  const complete = useMemo(
    () =>
      slots.every((slot) =>
        rows.some(
          (athlete) => athlete.slot === slot.code,
        ),
      ),
    [rows, slots],
  );

  const sortedSlots = useMemo(
    () => [...slots].sort((a, b) => a.sortOrder - b.sortOrder),
    [slots],
  );

  function updateSlot(id: string, slot: string) {
    setSaved(false);

    setRows((current) =>
      current.map((athlete) => {
        if (athlete.id === id) {
          return {
            ...athlete,
            slot,
          };
        }

        if (
          slot !== "SUBSTITUTE" &&
          athlete.slot === slot
        ) {
          return {
            ...athlete,
            slot: "SUBSTITUTE",
          };
        }

        return athlete;
      }),
    );

    if (
      slot === "SUBSTITUTE" &&
      captainId === id
    ) {
      setCaptainId("");
    }
  }

  function submitLineup(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const formData = new FormData(
      event.currentTarget,
    );

    startTransition(async () => {
      await saveCallUpLineup(formData);

      if (complete) {
        router.push(
          `/convocacoes/${matchId}/arte`,
        );
        return;
      }

      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      className="card lineup-editor"
      onSubmit={submitLineup}
    >
      <input
        type="hidden"
        name="matchId"
        value={matchId}
      />

      <input
        type="hidden"
        name="captainId"
        value={captainId}
      />

      <div className="page-head compact">
        <div>
          <span className="page-eyebrow">
            {sport === "FUTSAL"
              ? "FUTSAL"
              : "CAMPO"}{" "}
            • FORMAÇÃO {formationName}
          </span>

          <h2>Montar escalação</h2>

          <p className="muted">
            {starterCount} titulares •{" "}
            {reserveCount} reservas •{" "}
            {squadLimit} convocados.
          </p>
        </div>

        <span
          className={`status ${
            complete
              ? "status-confirmed"
              : "status-pending"
          }`}
        >
          {starters.length}/{starterCount} posições
        </span>
      </div>

      {!slots.length ? (
        <div className="notice error">
          Salve a configuração da convocação antes
          de montar a escalação.
        </div>
      ) : (
        <div className="lineup-layout">
          <div
            className="mini-pitch"
            aria-label={`Prévia da formação ${formationName}`}
            style={{
              position: "relative",
              minHeight: 520,
              overflow: "hidden",
            }}
          >
            {sortedSlots.map((slot) => {
              const athlete = rows.find(
                (item) =>
                  item.slot === slot.code,
              );

              const displayName = athlete
                ? athlete.nickname || athlete.name
                : slot.label;

              return (
                <div
                  className="pitch-slot"
                  key={slot.code}
                  style={{
                    position: "absolute",
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    transform:
                      "translate(-50%, -50%)",
                    zIndex: 3,
                  }}
                >
                  <SafeConvocationImage
                    src={safeImageUrl(
                      athlete?.photoUrl || null,
                    )}
                    alt={displayName}
                    fallback={
                      athlete
                        ? (
                            athlete.nickname ||
                            athlete.name
                          )
                            .slice(0, 2)
                            .toUpperCase()
                        : "+"
                    }
                  />

                  <small>
                    {displayName}
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
                      <strong>
                        {athlete.nickname ||
                          athlete.name}
                      </strong>
                    </td>

                    <td>
                      <select
                        name={`slot_${athlete.id}`}
                        value={athlete.slot}
                        disabled={!canEdit}
                        onChange={(event) =>
                          updateSlot(
                            athlete.id,
                            event.target.value,
                          )
                        }
                      >
                        <option value="SUBSTITUTE">
                          Reserva
                        </option>

                        {sortedSlots.map((slot) => (
                          <option
                            value={slot.code}
                            key={slot.code}
                          >
                            {slot.label}
                            {slot.slotType ===
                            "GOALKEEPER"
                              ? " • goleiro"
                              : ""}
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
                          athlete.jerseyNumber ??
                          athlete.defaultNumber ??
                          ""
                        }
                        disabled={!canEdit}
                      />
                    </td>

                    <td>
                      <input
                        type="radio"
                        name="captainVisual"
                        checked={
                          captainId === athlete.id
                        }
                        disabled={
                          !canEdit ||
                          !slotCodes.has(
                            athlete.slot,
                          )
                        }
                        onChange={() =>
                          setCaptainId(athlete.id)
                        }
                        aria-label={`Marcar ${athlete.name} como capitão`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canEdit && slots.length ? (
        <button
          className="btn"
          type="submit"
          disabled={isPending}
        >
          {isPending
            ? "Salvando..."
            : "Salvar escalação"}
        </button>
      ) : null}

      {saved ? (
        <p className="success-message">
          Escalação salva com sucesso.
        </p>
      ) : null}

      {!complete && slots.length ? (
        <p className="help">
          Preencha todas as {starterCount} posições
          titulares para liberar a arte da convocação.
        </p>
      ) : null}
    </form>
  );
}
