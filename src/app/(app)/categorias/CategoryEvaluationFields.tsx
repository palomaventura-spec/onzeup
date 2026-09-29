"use client";

import { useMemo, useState } from "react";

type CategoryOption = {
  id: string;
  name: string;
  type: "STANDARD" | "EVALUATION";
  sport: "FOOTBALL" | "FUTSAL" | "BOTH";
  active: boolean;
  accentColor: string;
};

type CategoryType = "STANDARD" | "EVALUATION";
type CategorySport = "" | "FOOTBALL" | "FUTSAL" | "BOTH";

export default function CategoryEvaluationFields({
  categories,
  defaultType = "STANDARD",
  defaultSport = "",
  defaultTargetIds = [],
}: {
  categories: CategoryOption[];
  defaultType?: CategoryType;
  defaultSport?: CategorySport;
  defaultTargetIds?: string[];
}) {
  const [type, setType] =
    useState<CategoryType>(defaultType);

  const [sport, setSport] =
    useState<CategorySport>(defaultSport);

  const [selectedId, setSelectedId] = useState(
    defaultTargetIds[0] ?? "",
  );

  const availableTargets = useMemo(() => {
    return categories.filter((category) => {
      if (!category.active) return false;
      if (category.type !== "STANDARD") return false;

      if (
        sport === "FOOTBALL" ||
        sport === "FUTSAL"
      ) {
        return category.sport === sport;
      }

      return false;
    });
  }, [categories, sport]);

  function changeSport(value: CategorySport) {
    setSport(value);

    if (
      value !== "FOOTBALL" &&
      value !== "FUTSAL"
    ) {
      setSelectedId("");
      return;
    }

    const selectedStillValid =
      categories.some(
        (category) =>
          category.id === selectedId &&
          category.type === "STANDARD" &&
          category.active &&
          category.sport === value,
      );

    if (!selectedStillValid) {
      setSelectedId("");
    }
  }

  return (
    <>
      <label>
        Tipo da categoria

        <select
          name="type"
          value={type}
          onChange={(event) =>
            setType(
              event.target.value as CategoryType,
            )
          }
        >
          <option value="STANDARD">
            Categoria do elenco
          </option>

          <option value="EVALUATION">
            Avaliação
          </option>
        </select>
      </label>

      <label>
        Modalidade

        <select
          name="sport"
          value={sport}
          onChange={(event) =>
            changeSport(
              event.target.value as CategorySport,
            )
          }
          required
        >
          <option value="" disabled>
            Selecione
          </option>

          {defaultSport === "BOTH" ? (
            <option value="BOTH" disabled>
              Definir modalidade
            </option>
          ) : null}

          <option value="FOOTBALL">
            Futebol
          </option>

          <option value="FUTSAL">
            Futsal
          </option>
        </select>
      </label>

      {type === "EVALUATION" ? (
        <fieldset
          style={{
            gridColumn: "1 / -1",
            border: "1px solid #dfe5ea",
            borderRadius: 14,
            padding: 16,
            margin: 0,
            background: "#f8fafb",
          }}
        >
          <legend
            style={{
              padding: "0 8px",
              fontWeight: 800,
            }}
          >
            Destino se aprovado
          </legend>

          <p
            style={{
              margin: "0 0 14px",
              color: "#667585",
              fontSize: 13,
            }}
          >
            Escolha a categoria oficial do elenco
            para onde os atletas deste grupo serão
            enviados quando forem aprovados.
          </p>

          {availableTargets.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 10,
              }}
            >
              {availableTargets.map(
                (category) => {
                  const checked =
                    selectedId === category.id;

                  return (
                    <label
                      key={category.id}
                      style={{
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        minHeight: 62,
                        padding: "12px 14px",
                        border: checked
                          ? `1.5px solid ${category.accentColor}`
                          : "1px solid #dbe3ea",
                        borderRadius: 14,
                        background: checked
                          ? "#fbfff7"
                          : "#ffffff",
                        boxShadow: checked
                          ? `0 0 0 3px ${category.accentColor}18`
                          : "0 1px 2px rgba(15, 23, 42, 0.03)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="evaluationTargetIds"
                        value={category.id}
                        checked={checked}
                        onChange={() =>
                          setSelectedId(
                            category.id,
                          )
                        }
                        style={{
                          position: "absolute",
                          opacity: 0,
                          pointerEvents: "none",
                        }}
                      />

                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background:
                              category.accentColor,
                            flex: "0 0 auto",
                          }}
                        />

                        <span>
                          <strong>
                            {category.name}
                          </strong>

                          <small
                            style={{
                              display: "block",
                              marginTop: 3,
                              color: "#667585",
                            }}
                          >
                            Categoria do elenco
                          </small>
                        </span>
                      </span>

                      <span
                        aria-hidden="true"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          border: checked
                            ? `1px solid ${category.accentColor}`
                            : "1px solid #cbd5e1",
                          background: checked
                            ? category.accentColor
                            : "#ffffff",
                          color: checked
                            ? "#ffffff"
                            : "transparent",
                          fontWeight: 900,
                        }}
                      >
                        ✓
                      </span>
                    </label>
                  );
                },
              )}
            </div>
          ) : (
            <div
              style={{
                padding: 12,
                borderRadius: 10,
                background: "#ffffff",
                color: "#667585",
                fontSize: 13,
              }}
            >
              {sport === "FOOTBALL" ||
              sport === "FUTSAL"
                ? "Nenhuma categoria oficial desta modalidade foi encontrada."
                : "Selecione primeiro a modalidade."}
            </div>
          )}
        </fieldset>
      ) : null}
    </>
  );
}