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
  sourceType?: "TRAINING" | "MATCH";
  sourceId?: string;
  hidden?: boolean;
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

const ENABLE_QTS_SHARING = false;

export default function QtrEditor({
  initialRows,
  weekStart,
  qtrId,
  categories,
  initialCategory,
  initialSelectedCategories,
  eventColors,
  trainingUsesCategoryColor,
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
    accentColor: string;
  }[];
  initialCategory: string;
  initialSelectedCategories: string[];
  eventColors: Record<EventType, string>;
  trainingUsesCategoryColor: boolean;
  saveAction: (formData: FormData) => Promise<void>;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<QtrRow[]>(initialRows);
  const [selectedCategory, setSelectedCategory] =
    useState(initialCategory);
  const [selectedCategories, setSelectedCategories] =
    useState<string[]>(initialSelectedCategories);

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
        .filter(({ row }) => {
          if (selectedCategory === "__all__") return true;

          if (selectedCategory === "__custom__") {
            return selectedCategories.includes(
              row.category,
            );
          }

          return row.category === selectedCategory;
        }),
    [rows, selectedCategory, selectedCategories],
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

    if (category === "__custom__") {
      if (!selectedCategories.length) {
        setSelectedCategories(
          categories
            .slice(0, Math.min(2, categories.length))
            .map((item) => item.name),
        );
      }

      return;
    }

    const query = new URLSearchParams({
      week: weekStart,
      category,
    });

    window.location.assign(
      `/qtr?${query.toString()}`,
    );
  }

  function toggleCustomCategory(category: string) {
    setSelectedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  }

  function applyCustomSelection() {
    if (!selectedCategories.length) {
      window.alert(
        "Marque pelo menos uma categoria para visualizar.",
      );
      return;
    }

    const query = new URLSearchParams({
      week: weekStart,
      category: "__custom__",
      categories: selectedCategories.join("|"),
    });

    window.location.assign(
      `/qtr?${query.toString()}`,
    );
  }

  function saveEvent(formData: FormData) {
    if (!canEdit || !editing) return;

    const existingEvent =
      editing.eventIndex === null
        ? null
        : rows[editing.rowIndex]?.[
            editing.day
          ]?.[editing.eventIndex] ?? null;

    const event: QtrEvent = {
      type: String(
        formData.get("type") || "OTHER",
      ) as EventType,

      title: String(
        formData.get("title") || "",
      ).trim(),

      startTime:
        String(
          formData.get("startTime") || "",
        ).trim() || undefined,

      endTime:
        String(
          formData.get("endTime") || "",
        ).trim() || undefined,

      location:
        String(
          formData.get("location") || "",
        ).trim() || undefined,

      notes:
        String(
          formData.get("notes") || "",
        ).trim() || undefined,

      sourceType:
        existingEvent?.sourceType,

      sourceId:
        existingEvent?.sourceId,

      hidden:
        existingEvent?.hidden === true,
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

  function removeOrHideEvent() {
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

        const events = [
          ...row[editing.day],
        ];

        const currentEvent =
          events[editing.eventIndex!];

        if (!currentEvent) return row;

        const synchronizedLike =
          Boolean(
            currentEvent.sourceType &&
              currentEvent.sourceId,
          ) ||
          currentEvent.type === "TRAINING" ||
          currentEvent.type === "MATCH" ||
          currentEvent.type === "FRIENDLY";

        if (synchronizedLike) {
          events[editing.eventIndex!] = {
            ...currentEvent,
            hidden: true,
          };
        } else {
          events.splice(
            editing.eventIndex!,
            1,
          );
        }

        return {
          ...row,
          [editing.day]: events,
        };
      }),
    );

    setEditing(null);
  }

  function restoreHiddenEvent(
    rowIndex: number,
    day: DayKey,
    eventIndex: number,
  ) {
    setRows((current) =>
      current.map((row, currentRowIndex) => {
        if (currentRowIndex !== rowIndex) {
          return row;
        }

        const events = [...row[day]];
        const event = events[eventIndex];

        if (!event) return row;

        events[eventIndex] = {
          ...event,
          hidden: false,
        };

        return {
          ...row,
          [day]: events,
        };
      }),
    );
  }


  const hasSpecificCategory =
    selectedCategory !== "__all__" &&
    selectedCategory !== "__custom__";

  const hasCustomSelection =
    selectedCategory === "__custom__";

  const customSelectionLabel =
    selectedCategories.length === 1
      ? selectedCategories[0]
      : `${selectedCategories.length} categorias`;

  const hiddenEvents = useMemo(
    () =>
      rows.flatMap((row, rowIndex) =>
        DAYS.flatMap((day) =>
          row[day.key]
            .map((event, eventIndex) => ({
              row,
              rowIndex,
              day: day.key,
              dayLabel: day.label,
              event,
              eventIndex,
            }))
            .filter(({ event }) => event.hidden),
        ),
      ),
    [rows],
  );

  function openCategoryPdf() {
    const query = new URLSearchParams({
      week: weekStart,
    });

    if (hasCustomSelection) {
      if (!selectedCategories.length) {
        window.alert(
          "Marque pelo menos uma categoria para gerar o PDF.",
        );
        return;
      }

      query.set(
        "categories",
        selectedCategories.join("|"),
      );
    } else if (hasSpecificCategory) {
      query.set(
        "category",
        selectedCategory,
      );
    }

    window.location.href =
      `/api/qts/pdf?${query.toString()}`;
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
        "Atualize ou salve o QTS antes de gerar o link público."
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
        "Atualize ou salve o QTS antes de enviar pelo WhatsApp."
      );

      return;
    }

    const message =
      `⚽ QTS SEMANAL — ${selectedCategory}\n\n` +
      `Período: ${periodLabel(
        weekStart
      )}\n\n` +
      `Confira o QTS da categoria ${selectedCategory}:\n${publicUrl}`;

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
            minWidth: 280,
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
            CATEGORIAS NO QTS
          </span>

          <select
            value={selectedCategory}
            onChange={(event) =>
              changeCategory(
                event.target.value,
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

            <option value="__custom__">
              Selecionar categorias...
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.name}
                >
                  {category.name}
                </option>
              ),
            )}
          </select>
        </label>

        <div
          style={{
            color: "#6b7785",
            fontSize: 13,
          }}
        >
          {hasCustomSelection
            ? `${selectedCategories.length} categoria(s) selecionada(s).`
            : hasSpecificCategory
              ? canEdit
                ? `Você está editando apenas o QTS de ${selectedCategory}.`
                : `Visualizando o QTS de ${selectedCategory}.`
              : canEdit
                ? "Visão geral da coordenação. Você também pode selecionar várias categorias."
                : "Visão geral do QTS. Você também pode selecionar várias categorias."}
        </div>
      </div>

      {hasCustomSelection ? (
        <section
          style={{
            margin: "0 0 16px",
            padding: 14,
            border: "1px solid #dfe6ea",
            borderRadius: 14,
            background: "#f8fafb",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 10,
            }}
          >
            <div>
              <strong
                style={{
                  display: "block",
                  color: "#26343c",
                }}
              >
                Seleção personalizada
              </strong>
              <span
                style={{
                  color: "#6b7785",
                  fontSize: 12,
                }}
              >
                Marque somente as categorias que deseja visualizar e levar para o PDF.
              </span>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={applyCustomSelection}
              style={{
                minHeight: 36,
                padding: "0 14px",
                borderRadius: 9,
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              Aplicar seleção
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(118px, 1fr))",
              gap: 7,
            }}
          >
            {categories.map((category) => (
              <label
                key={category.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  minHeight: 38,
                  padding: "6px 9px",
                  border: "1px solid #e0e6ea",
                  borderRadius: 9,
                  background: "#fff",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(
                    category.name,
                  )}
                  onChange={() =>
                    toggleCustomCategory(
                      category.name,
                    )
                  }
                  style={{
                    width: 18,
                    height: 18,
                    minWidth: 18,
                    minHeight: 18,
                    margin: 0,
                    padding: 0,
                    flex: "0 0 18px",
                  }}
                />
                <span style={{ lineHeight: 1.15 }}>{category.name}</span>
              </label>
            ))}
          </div>
        </section>
      ) : null}

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
          name="categories"
          value={
            hasCustomSelection
              ? selectedCategories.join("|")
              : ""
          }
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
                <div
                  className="qtr-category-cell"
                  style={{
                    borderColor:
                      categories.find(
                        (category) =>
                          category.name === row.category,
                      )?.accentColor ?? "#9DDB16",
                    borderWidth: 2,
                    borderStyle: "solid",
                    borderRadius: 16,
                  }}
                >
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
                    (row[day.key] || []).filter(
                      (event) => !event.hidden,
                    );

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
                              const categoryAccent =
                                categories.find(
                                  (category) =>
                                    category.name === row.category,
                                )?.accentColor;

                              const eventBackground =
                                event.type === "TRAINING" &&
                                trainingUsesCategoryColor &&
                                categoryAccent
                                  ? categoryAccent
                                  : eventColors[event.type] ??
                                    eventColors.OTHER ??
                                    EVENT_COLORS.OTHER.background;

                              const eventBorder =
                                eventBackground;

                              const hex =
                                eventBackground.replace("#", "");

                              const r = parseInt(hex.slice(0, 2), 16);
                              const g = parseInt(hex.slice(2, 4), 16);
                              const b = parseInt(hex.slice(4, 6), 16);

                              const luminance =
                                (r * 299 + g * 587 + b * 114) /
                                1000;

                              const eventTextColor = "#101820";

                              return (
                                <button
                                  key={
                                    eventIndex
                                  }
                                  type="button"
                                  className={`qtr-event qtr-event-${event.type.toLowerCase()}`}
                                  style={{
                                    background:
                                      eventBackground,
                                    borderColor:
                                      eventBorder,
                                    color:
                                      eventTextColor,
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
          {(
            [
              "TRAINING",
              "MATCH",
              "FRIENDLY",
              "EVENT",
              "OTHER",
            ] as EventType[]
          ).map((type) => (
            <span key={type}>
              <i
                style={{
                  background: eventColors[type],
                }}
              />{" "}
              {EVENT_LABELS[type]}
            </span>
          ))}
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

        {canEdit && hiddenEvents.length ? (
          <section
            style={{
              marginTop: 14,
              padding: 14,
              border: "1px dashed #c8d2d8",
              borderRadius: 12,
              background: "#fbfcfd",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: 8,
                color: "#34434c",
              }}
            >
              Ocultos do QTS ({hiddenEvents.length})
            </strong>

            <p
              style={{
                margin: "0 0 10px",
                color: "#6b7785",
                fontSize: 12,
              }}
            >
              Estes itens continuam cadastrados em Treinos/Jogos, mas não aparecem no quadro nem no PDF.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {hiddenEvents.map(
                ({
                  row,
                  rowIndex,
                  day,
                  dayLabel,
                  event,
                  eventIndex,
                }) => (
                  <button
                    key={`${rowIndex}-${day}-${eventIndex}`}
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      restoreHiddenEvent(
                        rowIndex,
                        day,
                        eventIndex,
                      )
                    }
                  >
                    Mostrar novamente · {row.category} · {dayLabel} · {event.title}
                  </button>
                ),
              )}
            </div>
          </section>
        ) : null}

        <div className="qtr-bottom-actions">
          {canEdit ? (
            <button type="submit">
              Salvar alterações
            </button>
          ) : null}

          <button
            type="button"
            className="btn-secondary"
            onClick={openCategoryPdf}
          >
            {hasCustomSelection
              ? `Gerar PDF — ${customSelectionLabel}`
              : hasSpecificCategory
                ? `Gerar PDF — ${selectedCategory}`
                : "Gerar PDF — todas as categorias"}
          </button>

          {ENABLE_QTS_SHARING && hasSpecificCategory ? (
            <>
              <button
                type="button"
                className="btn-secondary"
                onClick={openPublicQtr}
              >
                Abrir link público — {selectedCategory}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={sendCategoryWhatsApp}
              >
                Enviar {selectedCategory} pelo WhatsApp
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

              {editing.eventIndex !== null &&
              (currentEvent.sourceType ||
                currentEvent.type === "TRAINING" ||
                currentEvent.type === "MATCH" ||
                currentEvent.type === "FRIENDLY") ? (
                <div
                  style={{
                    padding: "9px 10px",
                    borderRadius: 9,
                    background: "#f4f7f8",
                    color: "#5f6d75",
                    fontSize: 12,
                  }}
                >
                  Se este treino ou jogo ainda estiver incerto, use <strong>Ocultar do QTS</strong>. O cadastro original continuará no sistema e poderá ser mostrado novamente depois.
                </div>
              ) : null}

              <div className="actions">
                <button type="submit">
                  Salvar atividade
                </button>

                {editing.eventIndex !==
                null ? (
                  <button
                    className="btn-danger"
                    type="button"
                    onClick={removeOrHideEvent}
                  >
                    {currentEvent.sourceType ||
                    currentEvent.type === "TRAINING" ||
                    currentEvent.type === "MATCH" ||
                    currentEvent.type === "FRIENDLY"
                      ? "Ocultar do QTS"
                      : "Excluir atividade"}
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