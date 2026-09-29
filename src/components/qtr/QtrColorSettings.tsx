"use client";

import { useState } from "react";

type QtrColors = {
  trainingColor: string;
  matchColor: string;
  friendlyColor: string;
  eventColor: string;
  otherColor: string;
};

const DEFAULT_COLORS: QtrColors = {
  trainingColor: "#2B9D47",
  matchColor: "#D4AA18",
  friendlyColor: "#3377A5",
  eventColor: "#76539A",
  otherColor: "#29333D",
};

const ITEMS: {
  key: keyof QtrColors;
  label: string;
}[] = [
  { key: "trainingColor", label: "Treino" },
  { key: "matchColor", label: "Jogo" },
  { key: "friendlyColor", label: "Amistoso" },
  { key: "eventColor", label: "Evento" },
  { key: "otherColor", label: "Outro" },
];

export default function QtrColorSettings({
  settings,
  saveAction,
}: {
  settings: QtrColors & { trainingUsesCategoryColor: boolean };
  saveAction: (formData: FormData) => Promise<void>;
}) {
  const [colors, setColors] =
    useState<QtrColors>(settings);

  const [useCategoryColor, setUseCategoryColor] =
    useState(settings.trainingUsesCategoryColor);

  function changeColor(
    key: keyof QtrColors,
    value: string,
  ) {
    setColors((current) => ({
      ...current,
      [key]: value.toUpperCase(),
    }));
  }

  function restoreDefaults() {
    setColors(DEFAULT_COLORS);
    setUseCategoryColor(false);
  }

  return (
    <section
      style={{
        marginBottom: 18,
        padding: "12px 14px",
        border: "1px solid #e2e8ef",
        borderRadius: 16,
        background: "#ffffff",
        boxShadow:
          "0 4px 14px rgba(15, 23, 32, 0.04)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 14,
            color: "#111923",
          }}
        >
          Personalização do QTS
        </h2>

        <p
          style={{
            margin: "5px 0 0",
            color: "#6b7785",
            fontSize: 12,
          }}
        >
          Escolha as cores usadas para identificar
          cada tipo de atividade.
        </p>
      </div>

      <form action={saveAction}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(135px, 1fr))",
            gap: 12,
          }}
        >
          {ITEMS.map((item) => (
            <label
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: "1px solid #e4e9ed",
                borderRadius: 12,
                background: "#fafbfc",
              }}
            >
              <input
                type="color"
                name={item.key}
                value={colors[item.key]}
                onChange={(event) =>
                  changeColor(
                    item.key,
                    event.target.value,
                  )
                }
                style={{
                  width: 34,
                  height: 34,
                  padding: 2,
                  border: "1px solid #d8e0e5",
                  borderRadius: 8,
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              />

              <span
                style={{
                  display: "grid",
                  gap: 2,
                }}
              >
                <strong
                  style={{
                    fontSize: 12,
                    color: "#17212b",
                  }}
                >
                  {item.label}
                </strong>

                <small
                  style={{
                    color: "#76838d",
                    fontFamily: "monospace",
                  }}
                >
                  {colors[item.key]}
                </small>
              </span>
            </label>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              width: "100%",
              fontSize: 12,
              fontWeight: 700,
              color: "#34434c",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              name="trainingUsesCategoryColor"
              checked={useCategoryColor}
              onChange={(event) =>
                setUseCategoryColor(
                  event.target.checked,
                )
              }
              style={{
                width: 16,
                height: 16,
              }}
            />

            Treinos seguem a cor da categoria
          </label>

          <button
            type="button"
            className="btn-secondary"
            onClick={restoreDefaults}
          >
            Restaurar padrão
          </button>

          <button type="submit">
            Salvar cores
          </button>
        </div>
      </form>
    </section>
  );
}