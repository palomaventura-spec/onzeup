"use client";

import { useState } from "react";

export default function SumulaMinuteInputs({
  athleteId,
  athleteName,
  initialEntry,
  initialExit,
  initialMinutes,
  editable,
}: {
  athleteId: string;
  athleteName: string;
  initialEntry: number | null;
  initialExit: number | null;
  initialMinutes: number | null;
  editable: boolean;
}) {
  const [entry, setEntry] = useState(initialEntry == null ? "" : String(initialEntry));
  const [exit, setExit] = useState(initialExit == null ? "" : String(initialExit));
  const [manual, setManual] = useState(initialMinutes == null ? "" : String(initialMinutes));

  const from = entry.trim() === "" ? null : Number(entry);
  const to = exit.trim() === "" ? null : Number(exit);
  const both = from !== null && to !== null && Number.isInteger(from) && Number.isInteger(to);
  const invalid = both && to! < from!;
  const automatic = both && !invalid ? to! - from! : null;

  return (
    <>
      <td>
        <input
          className="sheet-number"
          type="number"
          min="0"
          name={`enteredAtMinute_${athleteId}`}
          value={entry}
          onChange={(event) => setEntry(event.target.value)}
          disabled={!editable}
          aria-label={`Entrada (minuto) de ${athleteName}`}
          title="Minuto em que o atleta entrou no jogo"
        />
      </td>
      <td>
        <input
          className="sheet-number"
          type="number"
          min={from !== null && Number.isFinite(from) && from >= 0 ? from : 0}
          name={`leftAtMinute_${athleteId}`}
          value={exit}
          onChange={(event) => setExit(event.target.value)}
          disabled={!editable}
          aria-label={`Saída (minuto) de ${athleteName}`}
          title="Minuto em que o atleta saiu do jogo"
          aria-invalid={invalid}
        />
      </td>
      <td>
        <input
          className="sheet-number"
          type="number"
          min="0"
          name={`minutesPlayed_${athleteId}`}
          value={automatic !== null ? String(automatic) : manual}
          onChange={(event) => setManual(event.target.value)}
          readOnly={automatic !== null}
          disabled={!editable}
          aria-label={`Minutos jogados por ${athleteName}`}
          title={automatic !== null ? "Calculado automaticamente: saída − entrada" : "Informe manualmente até preencher entrada e saída"}
          style={automatic !== null ? { background: "#edf7e6", fontWeight: 800 } : undefined}
        />
      </td>
    </>
  );
}
