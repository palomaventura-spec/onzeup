"use client";

import { useMemo, useState } from "react";

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

const EVENT_COLORS: Record<
  EventType,
  { background: string; border: string; color: string }
> = {
  TRAINING: {
    background: "#2b9d47",
    border: "#23813a",
    color: "#ffffff",
  },
  MATCH: {
    background: "#d4aa18",
    border: "#b58e0f",
    color: "#1f1a00",
  },
  FRIENDLY: {
    background: "#3377a5",
    border: "#286489",
    color: "#ffffff",
  },
  EVENT: {
    background: "#76539a",
    border: "#624382",
    color: "#ffffff",
  },
  OTHER: {
    background: "#29333d",
    border: "#202832",
    color: "#ffffff",
  },
};

function dateForDay(weekStart: string, offset: number) {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + offset);

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function periodLabel(weekStart: string) {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(start);

  end.setDate(end.getDate() + 6);

  const format = (date: Date) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

  return `${format(start)} a ${format(end)}`;
}

export default function QtrEditor({
  initialRows,
  weekStart,
  qtrId,
  categories,
  initialCategory,
  saveAction,
  canEdit,
}: {
  initialRows: QtrRow[];
  weekStart: string;
  qtrId: string | null;
  categories: {
    id: string;
    name: string;
    birthYear: number | null;
  }[];
  initialCategory: string;
  saveAction: (formData: FormData) => Promise<void>;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<QtrRow[]>(initialRows);
  const [selectedCategory, setSelectedCategory] =
    useState(initialCategory);

  const [editing, setEditing] = useState<{
    rowIndex: number;
    day: DayKey;
    eventIndex: number | null;
  } | null>(null);

  const visibleRows = useMemo(
    () =>
      rows
        .map((row, rowIndex) => ({
          row,
          rowIndex,
        }))
        .filter(
          ({ row }) =>
            selectedCategory === "__all__" ||
            row.category === selectedCategory
        ),
    [rows, selectedCategory]
  );

  const currentEvent = useMemo(() => {
    if (!editing) return null;

    const events =
      rows[editing.rowIndex]?.[editing.day] || [];

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

  function changeCategory(category: string) {
    setSelectedCategory(category);
    setEditing(null);

    const query = new URLSearchParams({
      week: weekStart,
      category,
    });

    window.location.assign(
      `/qtr?${query.toString()}`
    );
  }

  function saveEvent(formData: FormData) {
    if (!canEdit || !editing) return;

    const event: QtrEvent = {
      type: String(
        formData.get("type") || "OTHER"
      ) as EventType,

      title: String(
        formData.get("title") || ""
      ).trim(),

      startTime:
        String(
          formData.get("startTime") || ""
        ).trim() || undefined,

      endTime:
        String(
          formData.get("endTime") || ""
        ).trim() || undefined,

      location:
        String(
          formData.get("location") || ""
        ).trim() || undefined,

      notes:
        String(
          formData.get("notes") || ""
        ).trim() || undefined,
    };

    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== editing.rowIndex) {
          return row;
        }

        const events = [
          ...row[editing.day],
        ];

        if (editing.eventIndex === null) {
          events.push(event);
        } else {
          events[editing.eventIndex] =
            event;
        }

        return {
          ...row,
          [editing.day]: events,
        };
      })
    );

    setEditing(null);
  }

  function deleteEvent() {
    if (
      !canEdit ||
      !editing ||
      editing.eventIndex === null
    ) {
      return;
    }

    setRows((current) =>
      current.map((row, rowIndex) => {
        if (rowIndex !== editing.rowIndex) {
          return row;
        }

        const events = row[
          editing.day
        ].filter(
          (_, index) =>
            index !== editing.eventIndex
        );

        return {
          ...row,
          [editing.day]: events,
        };
      })
    );

    setEditing(null);
  }

  const hasSpecificCategory =
    selectedCategory !== "__all__";

  function openCategoryPdf() {
    if (!hasSpecificCategory) return;

    const url =
      `/qtr-pdf?week=${encodeURIComponent(
        weekStart
      )}&category=${encodeURIComponent(
        selectedCategory
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function publicQtrUrl() {
    if (
      !qtrId ||
      !hasSpecificCategory
    ) {
      return null;
    }

    return `${window.location.origin}/qtr-public/${encodeURIComponent(
      qtrId
    )}?category=${encodeURIComponent(
      selectedCategory
    )}`;
  }

  function openPublicQtr() {
    const url = publicQtrUrl();

    if (!url) {
      window.alert(
        "Atualize ou salve o QTR antes de gerar o link público."
      );

      return;
    }

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function sendCategoryWhatsApp() {
    if (!hasSpecificCategory) return;

    const publicUrl = publicQtrUrl();

    if (!publicUrl) {
      window.alert(
        "Atualize ou salve o QTR antes de enviar pelo WhatsApp."
      );

      return;
    }

    const message =
      `⚽ QTR SEMANAL — ${selectedCategory}\n\n` +
      `Período: ${periodLabel(
        weekStart
      )}\n\n` +
      `Confira o QTR da categoria ${selectedCategory}:\n${publicUrl}`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        message
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "end",
          justifyContent:
            "space-between",
          gap: 16,
          flexWrap: "wrap",
          margin: "0 0 14px",
        }}
      >
        <label
          style={{
            display: "grid",
            gap: 6,
            minWidth: 260,
          }}
        >
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: "#667585",
              letterSpacing: ".04em",
            }}
          >
            CATEGORIA
          </span>

          <select
            value={selectedCategory}
            onChange={(event) =>
              changeCategory(
                event.target.value
              )
            }
            style={{
              minHeight: 42,
              border:
                "1px solid #d7dfe6",
              borderRadius: 10,
              background: "#fff",
              padding: "0 12px",
              fontWeight: 700,
            }}
          >
            <option value="__all__">
              Todas as categorias
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.name}
                >
                  {category.name}
                </option>
              )
            )}
          </select>
        </label>

        <div
          style={{
            color: "#6b7785",
            fontSize: 13,
          }}
        >
          {hasSpecificCategory
            ? canEdit
              ? `Você está editando apenas o QTR de ${selectedCategory}.`
              : `Visualizando o QTR de ${selectedCategory}.`
            : canEdit
              ? "Visão geral da coordenação. Selecione uma categoria para compartilhar."
              : "Visão geral do QTR. Selecione uma categoria para visualizar ou compartilhar."}
        </div>
      </div>

      <form action={saveAction}>
        <input
          type="hidden"
          name="weekStart"
          value={weekStart}
        />

        <input
          type="hidden"
          name="category"
          value={selectedCategory}
        />

        <input
          type="hidden"
          name="qtrData"
          value={JSON.stringify(rows)}
        />

        <div className="qtr-board">
          <div className="qtr-grid qtr-grid-head">
            <div className="qtr-category-head">
              CATEGORIA
            </div>

            {DAYS.map(
              (day, index) => (
                <div
                  className="qtr-day-head"
                  key={day.key}
                >
                  <strong>
                    {day.label}
                  </strong>

                  <span>
                    {dateForDay(
                      weekStart,
                      index
                    )}
                  </span>
                </div>
              )
            )}

            <div className="qtr-row-action-head" />
          </div>

          {visibleRows.map(
            ({ row, rowIndex }) => (
              <div
                className="qtr-grid qtr-row"
                key={`${row.category}-${rowIndex}`}
              >
                <div className="qtr-category-cell">
                  <strong
                    style={{
                      fontSize: 15,
                    }}
                  >
                    {row.category}
                  </strong>

                  {row.birthYear ? (
                    <small>
                      Ano-base:{" "}
                      {row.birthYear}
                    </small>
                  ) : null}
                </div>

                {DAYS.map((day) => {
                  const events =
                    row[day.key] || [];

                  return (
                    <div
                      className="qtr-day-cell"
                      key={day.key}
                    >
                      {events.length ===
                      0 ? (
                        canEdit ? (
                          <button
                            className="qtr-empty-slot"
                            type="button"
                            onClick={() =>
                              setEditing({
                                rowIndex,
                                day: day.key,
                                eventIndex:
                                  null,
                              })
                            }
                          >
                            <span>—</span>

                            <small>
                              Adicionar
                            </small>
                          </button>
                        ) : (
                          <div
                            className="qtr-empty-slot"
                            style={{
                              cursor:
                                "default",
                            }}
                          >
                            <span>—</span>
                          </div>
                        )
                      ) : (
                        <>
                          {events.map(
                            (
                              event,
                              eventIndex
                            ) => {
                              const colors =
                                EVENT_COLORS[
                                  event.type
                                ] ||
                                EVENT_COLORS.OTHER;

                              return (
                                <button
                                  key={
                                    eventIndex
                                  }
                                  type="button"
                                  className={`qtr-event qtr-event-${event.type.toLowerCase()}`}
                                  style={{
                                    background:
                                      colors.background,
                                    borderColor:
                                      colors.border,
                                    color:
                                      colors.color,
                                    cursor:
                                      canEdit
                                        ? "pointer"
                                        : "default",
                                  }}
                                  onClick={() => {
                                    if (
                                      canEdit
                                    ) {
                                      setEditing(
                                        {
                                          rowIndex,
                                          day: day.key,
                                          eventIndex,
                                        }
                                      );
                                    }
                                  }}
                                >
                                  <strong>
                                    {event.title ||
                                      EVENT_LABELS[
                                        event
                                          .type
                                      ]}
                                  </strong>

                                  {(event.startTime ||
                                    event.endTime) && (
                                    <span className="qtr-event-time">
                                      {event.startTime ||
                                        "—"}

                                      {event.endTime
                                        ? ` – ${event.endTime}`
                                        : ""}
                                    </span>
                                  )}

                                  {event.location ? (
                                    <span className="qtr-event-location">
                                      {
                                        event.location
                                      }
                                    </span>
                                  ) : null}

                                  {event.notes ? (
                                    <small>
                                      {
                                        event.notes
                                      }
                                    </small>
                                  ) : null}
                                </button>
                              );
                            }
                          )}

                          {canEdit ? (
                            <button
                              type="button"
                              className="qtr-add-small"
                              onClick={() =>
                                setEditing(
                                  {
                                    rowIndex,
                                    day: day.key,
                                    eventIndex:
                                      null,
                                  }
                                )
                              }
                            >
                              + atividade
                            </button>
                          ) : null}
                        </>
                      )}
                    </div>
                  );
                })}

                <div className="qtr-row-action" />
              </div>
            )
          )}
        </div>

        <div className="qtr-legend">
          <span>
            <i
              style={{
                background:
                  EVENT_COLORS.TRAINING
                    .background,
              }}
            />{" "}
            Treino
          </span>

          <span>
            <i
              style={{
                background:
                  EVENT_COLORS.MATCH
                    .background,
              }}
            />{" "}
            Jogo
          </span>

          <span>
            <i
              style={{
                background:
                  EVENT_COLORS.FRIENDLY
                    .background,
              }}
            />{" "}
            Amistoso
          </span>

          <span>
            <i
              style={{
                background:
                  EVENT_COLORS.EVENT
                    .background,
              }}
            />{" "}
            Evento
          </span>

          <span>
            <i
              style={{
                background:
                  EVENT_COLORS.OTHER
                    .background,
              }}
            />{" "}
            Sem atividade
          </span>
        </div>

        {canEdit ? (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              border:
                "1px solid #e1e7eb",
              borderRadius: 10,
              background: "#f8fafb",
              color: "#5f6d75",
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <strong
              style={{
                color: "#34434c",
              }}
            >
              Dica:
            </strong>{" "}
            altere Treinos/Jogos na Agenda
            quando a mudança for oficial.
            Use a edição abaixo apenas para
            um ajuste específico deste QTS.
          </div>
        ) : null}

        <div className="qtr-bottom-actions">
          {canEdit ? (
            <button type="submit">
              Salvar alterações
            </button>
          ) : null}

          {hasSpecificCategory ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={openCategoryPdf}
              >
                Gerar PDF —{" "}
                {selectedCategory}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={openPublicQtr}
              >
                Abrir link público —{" "}
                {selectedCategory}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={
                  sendCategoryWhatsApp
                }
              >
                Enviar {selectedCategory}{" "}
                pelo WhatsApp
              </button>
            </>
          ) : null}
        </div>
      </form>

      {canEdit &&
      editing &&
      currentEvent ? (
        <div
          className="qtr-modal-backdrop"
          onClick={() =>
            setEditing(null)
          }
        >
          <div
            className="qtr-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="page-head compact">
              <div>
                <span className="public-kicker">
                  EDITAR ATIVIDADE
                </span>

                <h2>
                  {rows[
                    editing.rowIndex
                  ]?.category ||
                    "Categoria"}{" "}
                  •{" "}
                  {
                    DAYS.find(
                      (day) =>
                        day.key ===
                        editing.day
                    )?.label
                  }
                </h2>
              </div>

              <button
                type="button"
                className="btn-secondary btn-small"
                onClick={() =>
                  setEditing(null)
                }
              >
                Fechar
              </button>
            </div>

            <form
              className="form qtr-event-form"
              action={(formData) =>
                saveEvent(formData)
              }
            >
              <label>
                Tipo

                <select
                  name="type"
                  defaultValue={
                    currentEvent.type
                  }
                >
                  <option value="TRAINING">
                    Treino
                  </option>

                  <option value="MATCH">
                    Jogo
                  </option>

                  <option value="FRIENDLY">
                    Amistoso
                  </option>

                  <option value="EVENT">
                    Evento
                  </option>

                  <option value="OTHER">
                    Outro
                  </option>
                </select>
              </label>

              <label>
                Título

                <input
                  name="title"
                  defaultValue={
                    currentEvent.title
                  }
                  placeholder="Ex.: Treino / Taça Edilson Silva"
                />
              </label>

              <div className="qtr-time-fields">
                <label>
                  Início

                  <input
                    name="startTime"
                    type="time"
                    defaultValue={
                      currentEvent.startTime ||
                      ""
                    }
                  />
                </label>

                <label>
                  Fim

                  <input
                    name="endTime"
                    type="time"
                    defaultValue={
                      currentEvent.endTime ||
                      ""
                    }
                  />
                </label>
              </div>

              <label>
                Local

                <input
                  name="location"
                  defaultValue={
                    currentEvent.location ||
                    ""
                  }
                  placeholder="Ex.: Arena Onze / Campo Principal"
                />
              </label>

              <label>
                Observação

                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={
                    currentEvent.notes ||
                    ""
                  }
                  placeholder="Ex.: A confirmar / uniforme branco"
                />
              </label>

              <div className="actions">
                <button type="submit">
                  Salvar atividade
                </button>

                {editing.eventIndex !==
                null ? (
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