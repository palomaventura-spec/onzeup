"use client";

import { useState } from "react";

type HalfMinuteProps = {
  athleteId: string;
  athleteName: string;
  firstHalfEntry: number | null;
  firstHalfExit: number | null;
  secondHalfEntry: number | null;
  secondHalfExit: number | null;
  legacyMinutes: number | null;
  editable: boolean;
};

type PairResult = {
  minutes: number | null;
  invalid: boolean;
};

function toMinute(raw: string): number | null {
  if (raw.trim() === "") return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) && number >= 0 && number <= 180 ? number : null;
}

function computePair(from: string, to: string): PairResult {
  if (from === "" && to === "") return { minutes: null, invalid: false };
  const start = toMinute(from);
  const finish = toMinute(to);
  if (start === null || finish === null || finish < start) {
    return { minutes: null, invalid: true };
  }
  return { minutes: finish - start, invalid: false };
}

// 11UP_SUMULA_DOIS_TEMPOS_V1: cada tempo tem seu proprio minuto zero.
export default function SumulaHalfMinuteInputs({
  athleteId,
  athleteName,
  firstHalfEntry,
  firstHalfExit,
  secondHalfEntry,
  secondHalfExit,
  legacyMinutes,
  editable,
}: HalfMinuteProps) {
  const [firstEntry, setFirstEntry] = useState(firstHalfEntry === null ? "" : String(firstHalfEntry));
  const [firstExit, setFirstExit] = useState(firstHalfExit === null ? "" : String(firstHalfExit));
  const [secondEntry, setSecondEntry] = useState(secondHalfEntry === null ? "" : String(secondHalfEntry));
  const [secondExit, setSecondExit] = useState(secondHalfExit === null ? "" : String(secondHalfExit));

  const first = computePair(firstEntry, firstExit);
  const second = computePair(secondEntry, secondExit);
  const hasInput = [firstEntry, firstExit, secondEntry, secondExit].some((value) => value !== "");
  const hadHalfData = [firstHalfEntry, firstHalfExit, secondHalfEntry, secondHalfExit].some((value) => value !== null);
  const invalid = first.invalid || second.invalid;
  const total = hasInput && !invalid ? (first.minutes ?? 0) + (second.minutes ?? 0) : null;
  const shownTotal = total !== null ? `${total} min` : invalid ? "Corrigir" : !hadHalfData && legacyMinutes !== null ? `${legacyMinutes} min*` : "—";

  const cells = [
    { key: "firstHalfEntryMinute", label: "Entrada no primeiro tempo", value: firstEntry, set: setFirstEntry, pair: firstExit, pairStart: null as string | null },
    { key: "firstHalfExitMinute", label: "Saída no primeiro tempo", value: firstExit, set: setFirstExit, pair: firstEntry, pairStart: firstEntry },
    { key: "secondHalfEntryMinute", label: "Entrada no segundo tempo", value: secondEntry, set: setSecondEntry, pair: secondExit, pairStart: null as string | null },
    { key: "secondHalfExitMinute", label: "Saída no segundo tempo", value: secondExit, set: setSecondExit, pair: secondEntry, pairStart: secondEntry },
  ];

  return (
    <>
      {cells.map((cell) => (
        <td key={cell.key}>
          <input
            className="sheet-number"
            style={{ width: 56, maxWidth: 66 }}
            type="number"
            inputMode="numeric"
            step="1"
            min={cell.pairStart === null ? 0 : toMinute(cell.pairStart) ?? 0}
            max="180"
            name={`${cell.key}_${athleteId}`}
            value={cell.value}
            onChange={(event) => cell.set(event.target.value)}
            required={editable && (cell.value !== "" || cell.pair !== "")}
            disabled={!editable}
            aria-label={`${cell.label} de ${athleteName}`}
            title={`${cell.label} (minutos a partir de 0)`}
          />
        </td>
      ))}
      <td>
        <output
          aria-live="polite"
          aria-label={`Minutos totais de ${athleteName}`}
          title={invalid ? "Preencha cada par de entrada e saída; a saída não pode ser anterior à entrada" : "Soma dos minutos efetivos dos dois tempos. * = histórico anterior ao novo registro."}
          style={{ whiteSpace: "nowrap", fontWeight: 800, color: invalid ? "#b42318" : "inherit" }}
        >
          {shownTotal}
        </output>
      </td>
    </>
  );
}
