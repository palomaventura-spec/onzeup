"use client";

import { useMemo, useState } from "react";
import { saveQtr } from "@/app/(app)/qtr/actions";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type EventType = "TRAINING" | "MATCH" | "FRIENDLY" | "EVENT" | "OTHER";

type QtrEvent = {
  type: EventType;
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
};

type QtrRow = {
  category: string;
  birthYear?: number | null;
  mon: QtrEvent[];
  tue: QtrEvent[];
  wed: QtrEvent[];
  thu: QtrEvent[];
  fri: QtrEvent[];
  sat: QtrEvent[];
  sun: QtrEvent[];
};

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "SEG" },
  { key: "tue", label: "TER" },
  { key: "wed", label: "QUA" },
  { key: "thu", label: "QUI" },
  { key: "fri", label: "SEX" },
  { key: "sat", label: "SÁB" },
  { key: "sun", label: "DOM" },
];

const EVENT_LABELS: Record<EventType, string> = {
  TRAINING: "Treino",
  MATCH: "Jogo",
  FRIENDLY: "Amistoso",
  EVENT: "Evento",
  OTHER: "Outro",
};

function blankRow(): QtrRow {
  return {
    category: "",
    birthYear: null,
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
}

function dateForDay(weekStart: string, offset: number) {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + offset);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export default function QtrEditor({
  initialRows,
  weekStart,
  categories,
}: {
  initialRows: QtrRow[];
  weekStart: string;
  categories: { id: string; name: string; birthYear: number | null }[];
}) {
  const [rows, setRows] = useState<QtrRow[]>(
    initialRows.length ? initialRows : [blankRow()]
  );

  const [editing, setEditing] = useState<{
    rowIndex: number;
    day: DayKey;
    eventIndex: number | null;
  } | null>(null);

  const currentEvent = useMemo(() => {
    if (!editing) return null;
    const events = rows[editing.rowIndex]?.[editing.day] || [];
    return editing.eventIndex === null
      ? {
          type: "TRAINING" as EventType,
          title: "Treino",
          startTime: "",
          endTime: "",
          location: "",
          notes: "",
        }
      : events[editing.eventIndex];
  }, [editing, rows]);

  function addRow() {
    setRows((current) => [...current, blankRow()]);
  }

  function removeRow(index: number) {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
  }

  function saveEvent(formData: FormData) {
    if (!editing) return;

    const event: QtrEvent = {
      type: String(formData.get("type") || "OTHER") as EventType,
      title: String(formData.get("title") || "").trim(),
      startTime: String(formData.get("startTime") || "").trim() || undefined,
      endTime: String(formData.get("endTime") || "").trim() || undefined,
      location: String(formData.get("location") || "").trim() || undefined,
      notes: String(formData.get("notes") || "").trim() || undefined,
    };

    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== editing.rowIndex) return row;
        const events = [...row[editing.day]];
        if (editing.eventIndex === null) events.push(event);
        else events[editing.eventIndex] = event;
        return { ...row, [editing.day]: events };
      })
    );

    setEditing(null);
  }

  function deleteEvent() {
    if (!editing || editing.eventIndex === null) return;

    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== editing.rowIndex) return row;
        const events = row[editing.day].filter(
          (_, index) => index !== editing.eventIndex
        );
        return { ...row, [editing.day]: events };
      })
    );

    setEditing(null);
  }

  return (
    <>
      <form action={saveQtr}>
        <input type="hidden" name="weekStart" value={weekStart} />
        <input type="hidden" name="qtrData" value={JSON.stringify(rows)} />

        <div className="qtr-board">
          <div className="qtr-grid qtr-grid-head">
            <div className="qtr-category-head">CATEGORIA</div>
            {DAYS.map((day, index) => (
              <div className="qtr-day-head" key={day.key}>
                <strong>{day.label}</strong>
                <span>{dateForDay(weekStart, index)}</span>
              </div>
            ))}
            <div className="qtr-row-action-head" />
          </div>

          {rows.map((row, rowIndex) => (
            <div className="qtr-grid qtr-row" key={rowIndex}>
              <div className="qtr-category-cell">
                <select
                  aria-label={`Categoria ${rowIndex + 1}`}
                  value={row.category}
                  onChange={(event) => {
                    const selected = categories.find((category) => category.name === event.target.value);
                    setRows((current) =>
                      current.map((currentRow, currentIndex) =>
                        currentIndex === rowIndex
                          ? { ...currentRow, category: event.target.value, birthYear: selected?.birthYear ?? null }
                          : currentRow
                      )
                    );
                  }}
                >
                  <option value="">Selecione a categoria</option>
                  {row.category && !categories.some((category) => category.name === row.category) ? (
                    <option value={row.category}>{row.category}</option>
                  ) : null}
                  {categories.map((category) => (
                    <option key={category.id} value={category.name}>
                      {category.name}{category.birthYear ? ` (${category.birthYear})` : ""}
                    </option>
                  ))}
                </select>
                {row.birthYear ? <small>Ano-base: {row.birthYear}</small> : null}
              </div>

              {DAYS.map((day) => {
                const events = row[day.key] || [];
                return (
                  <div className="qtr-day-cell" key={day.key}>
                    {events.length === 0 ? (
                      <button
                        className="qtr-empty-slot"
                        type="button"
                        onClick={() =>
                          setEditing({
                            rowIndex,
                            day: day.key,
                            eventIndex: null,
                          })
                        }
                      >
                        <span>—</span>
                        <small>Adicionar</small>
                      </button>
                    ) : (
                      <>
                        {events.map((event, eventIndex) => (
                          <button
                            key={eventIndex}
                            type="button"
                            className={`qtr-event qtr-event-${event.type.toLowerCase()}`}
                            onClick={() =>
                              setEditing({
                                rowIndex,
                                day: day.key,
                                eventIndex,
                              })
                            }
                          >
                            <strong>
                              {event.title || EVENT_LABELS[event.type]}
                            </strong>

                            {(event.startTime || event.endTime) && (
                              <span className="qtr-event-time">
                                {event.startTime || "—"}
                                {event.endTime ? ` – ${event.endTime}` : ""}
                              </span>
                            )}

                            {event.location ? (
                              <span className="qtr-event-location">
                                {event.location}
                              </span>
                            ) : null}

                            {event.notes ? (
                              <small>{event.notes}</small>
                            ) : null}
                          </button>
                        ))}

                        <button
                          type="button"
                          className="qtr-add-small"
                          onClick={() =>
                            setEditing({
                              rowIndex,
                              day: day.key,
                              eventIndex: null,
                            })
                          }
                        >
                          + atividade
                        </button>
                      </>
                    )}
                  </div>
                );
              })}

              <div className="qtr-row-action">
                <button
                  className="btn-danger btn-small"
                  type="button"
                  onClick={() => removeRow(rowIndex)}
                  title="Remover linha"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="qtr-legend">
          <span><i className="legend-training" /> Treino</span>
          <span><i className="legend-match" /> Jogo</span>
          <span><i className="legend-friendly" /> Amistoso</span>
          <span><i className="legend-event" /> Evento</span>
          <span><i className="legend-empty" /> Sem atividade</span>
        </div>

        <div className="qtr-bottom-actions">
          <button type="button" className="btn-secondary" onClick={addRow}>
            + Adicionar categoria
          </button>
          <button type="submit">Salvar alterações</button>
          <button type="button" className="btn-secondary" onClick={() => window.print()}>
            Baixar / Imprimir PDF
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({
                  title: "QTR semanal",
                  text: "QTR semanal da organização",
                  url: window.location.href,
                });
              } else {
                await navigator.clipboard.writeText(window.location.href);
                alert("Link copiado. Você pode colar no WhatsApp.");
              }
            }}
          >
            Compartilhar
          </button>
        </div>
      </form>

      {editing && currentEvent ? (
        <div className="qtr-modal-backdrop" onClick={() => setEditing(null)}>
          <div className="qtr-modal" onClick={(event) => event.stopPropagation()}>
            <div className="page-head compact">
              <div>
                <span className="public-kicker">EDITAR ATIVIDADE</span>
                <h2>
                  {rows[editing.rowIndex]?.category || "Categoria"} •{" "}
                  {DAYS.find((day) => day.key === editing.day)?.label}
                </h2>
              </div>
              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() => setEditing(null)}
              >
                Fechar
              </button>
            </div>

            <form
              className="form qtr-event-form"
              action={(formData) => saveEvent(formData)}
            >
              <label>
                Tipo
                <select name="type" defaultValue={currentEvent.type}>
                  <option value="TRAINING">Treino</option>
                  <option value="MATCH">Jogo</option>
                  <option value="FRIENDLY">Amistoso</option>
                  <option value="EVENT">Evento</option>
                  <option value="OTHER">Outro</option>
                </select>
              </label>

              <label>
                Título
                <input
                  name="title"
                  defaultValue={currentEvent.title}
                  placeholder="Ex.: Treino / Taça Edilson Silva"
                />
              </label>

              <div className="qtr-time-fields">
                <label>
                  Início
                  <input
                    name="startTime"
                    type="time"
                    defaultValue={currentEvent.startTime || ""}
                  />
                </label>

                <label>
                  Fim
                  <input
                    name="endTime"
                    type="time"
                    defaultValue={currentEvent.endTime || ""}
                  />
                </label>
              </div>

              <label>
                Local
                <input
                  name="location"
                  defaultValue={currentEvent.location || ""}
                  placeholder="Ex.: Arena Onze / Campo Principal"
                />
              </label>

              <label>
                Observação
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={currentEvent.notes || ""}
                  placeholder="Ex.: A confirmar / uniforme branco"
                />
              </label>

              <div className="actions">
                <button type="submit">Salvar atividade</button>
                {editing.eventIndex !== null ? (
                  <button
                    className="btn-danger"
                    type="button"
                    onClick={deleteEvent}
                  >
                    Excluir atividade
                  </button>
                ) : null}
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
