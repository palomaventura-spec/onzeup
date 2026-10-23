"use client";

import { useMemo, useState } from "react";

function numeric(value: string) {
  if (!value.trim()) return 0;

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumeric(value: string) {
  if (!value.trim()) return null;

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function format(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "—";

  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function percentageDifference(
  value: number | null,
  average: number | null,
) {
  if (
    value === null ||
    average === null ||
    average <= 0
  ) {
    return null;
  }

  return ((value - average) / average) * 100;
}

type AthleteOption = {
  id: string;
  name: string;
  nickname: string | null;
  categoryName: string | null;
};

export default function GpsSessionPrototype({
  athletes,
}: {
  athletes: AthleteOption[];
}) {
  const [sport, setSport] =
    useState<"FOOTBALL" | "FUTSAL">("FOOTBALL");

  const [context, setContext] =
    useState<"TRAINING" | "MATCH">("TRAINING");

  const [athleteName, setAthleteName] = useState("");
  const [athleteId, setAthleteId] = useState("");
  const [athleteSearch, setAthleteSearch] = useState("");
  const [category, setCategory] = useState("");
  const [sessionName, setSessionName] = useState("");
  const [location, setLocation] = useState("");

  const [activityDate, setActivityDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [sessionStartTime, setSessionStartTime] = useState("");
  const [sessionEndTime, setSessionEndTime] = useState("");

  const [values, setValues] = useState<
    Record<string, string>
  >({
    durationMinutes: "",
    distanceMeters: "",
    maxSpeedKmh: "",
    averageSpeedKmh: "",
    sprintCount: "",
    sprintDistanceMeters: "",
    highIntensityDistanceMeters: "",
    accelerations: "",
    decelerations: "",
    highIntensityAccelerations: "",
    highIntensityDecelerations: "",
    peakAccelerationMps2: "",
    peakDecelerationMps2: "",
    playerLoad: "",
    averageHeartRateBpm: "",
    maxHeartRateBpm: "",
    sessionRpe: "",
  });

  /*
   * Faixas reproduzidas do relatório-modelo:
   * Z1 0–6
   * Z2 6–12
   * Z3 12–18
   * Z4 18–20
   * Z5 >21
   *
   * Mantemos configurável porque outros equipamentos
   * podem utilizar limites diferentes.
   */
  const [zoneRanges, setZoneRanges] = useState([
    { name: "Z1", min: "0", max: "6" },
    { name: "Z2", min: "6", max: "12" },
    { name: "Z3", min: "12", max: "18" },
    { name: "Z4", min: "18", max: "20" },
    { name: "Z5", min: "21", max: "" },
  ]);

  const [zoneMeters, setZoneMeters] = useState([
    "",
    "",
    "",
    "",
    "",
  ]);

  const [hsrThreshold, setHsrThreshold] =
    useState("18");

  const [sprintThreshold, setSprintThreshold] =
    useState("21");

  const [timeBlocks, setTimeBlocks] = useState([
    { label: "0–5", value: "" },
    { label: "5–10", value: "" },
    { label: "10–15", value: "" },
    { label: "15–20", value: "" },
    { label: "20–25", value: "" },
    { label: "25–30", value: "" },
    { label: "30–35", value: "" },
    { label: "35–40", value: "" },
    { label: "40–45", value: "" },
    { label: "45–50", value: "" },
  ]);

  const [teamAverage, setTeamAverage] = useState<
    Record<string, string>
  >({
    distanceMeters: "",
    distancePerMinute: "",
    maxSpeedKmh: "",
    highIntensityAccelerations: "",
    highIntensityDecelerations: "",
  });

  const [manualConclusion, setManualConclusion] =
    useState("");

  const filteredAthletes = useMemo(() => {
    const query = athleteSearch.trim().toLocaleLowerCase("pt-BR");

    if (!query) {
      return athletes.slice(0, 8);
    }

    return athletes
      .filter((athlete) => {
        const searchable = [
          athlete.name,
          athlete.nickname || "",
          athlete.categoryName || "",
        ]
          .join(" ")
          .toLocaleLowerCase("pt-BR");

        return searchable.includes(query);
      })
      .slice(0, 8);
  }, [athleteSearch, athletes]);

  const selectAthlete = (athlete: AthleteOption) => {
    const displayName = athlete.nickname || athlete.name;

    setAthleteId(athlete.id);
    setAthleteName(athlete.name);
    setAthleteSearch(displayName);

    if (athlete.categoryName) {
      setCategory(athlete.categoryName);
    }
  };
  const sessionDurationMinutes = useMemo(() => {
    if (!sessionStartTime || !sessionEndTime) return null;

    const [startHour, startMinute] = sessionStartTime
      .split(":")
      .map(Number);

    const [endHour, endMinute] = sessionEndTime
      .split(":")
      .map(Number);

    if (
      !Number.isFinite(startHour) ||
      !Number.isFinite(startMinute) ||
      !Number.isFinite(endHour) ||
      !Number.isFinite(endMinute)
    ) {
      return null;
    }

    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;

    if (end <= start) return null;

    return end - start;
  }, [sessionStartTime, sessionEndTime]);
  const derived = useMemo(() => {
    const duration = optionalNumeric(
      values.durationMinutes,
    );

    const distance = optionalNumeric(
      values.distanceMeters,
    );

    const load = optionalNumeric(values.playerLoad);

    const hsr = optionalNumeric(
      values.highIntensityDistanceMeters,
    );

    const sprint = optionalNumeric(
      values.sprintDistanceMeters,
    );

    return {
      distancePerMinute:
        duration !== null &&
        duration > 0 &&
        distance !== null
          ? distance / duration
          : null,

      playerLoadPerMinute:
        duration !== null &&
        duration > 0 &&
        load !== null
          ? load / duration
          : null,

      hsrPercent:
        distance !== null &&
        distance > 0 &&
        hsr !== null
          ? (hsr / distance) * 100
          : null,

      sprintPercent:
        distance !== null &&
        distance > 0 &&
        sprint !== null
          ? (sprint / distance) * 100
          : null,
    };
  }, [values]);

  const zoneTotal = useMemo(
    () =>
      zoneMeters.reduce(
        (total, value) => total + numeric(value),
        0,
      ),
    [zoneMeters],
  );

  const comparisons = useMemo(() => {
    const athlete = {
      distanceMeters: optionalNumeric(
        values.distanceMeters,
      ),

      distancePerMinute: derived.distancePerMinute,

      maxSpeedKmh: optionalNumeric(
        values.maxSpeedKmh,
      ),

      highIntensityAccelerations:
        optionalNumeric(
          values.highIntensityAccelerations,
        ),

      highIntensityDecelerations:
        optionalNumeric(
          values.highIntensityDecelerations,
        ),
    };

    const averages = {
      distanceMeters: optionalNumeric(
        teamAverage.distanceMeters,
      ),

      distancePerMinute: optionalNumeric(
        teamAverage.distancePerMinute,
      ),

      maxSpeedKmh: optionalNumeric(
        teamAverage.maxSpeedKmh,
      ),

      highIntensityAccelerations:
        optionalNumeric(
          teamAverage.highIntensityAccelerations,
        ),

      highIntensityDecelerations:
        optionalNumeric(
          teamAverage.highIntensityDecelerations,
        ),
    };

    return [
      {
        key: "distanceMeters",
        label: "Distância total",
        value: athlete.distanceMeters,
        average: averages.distanceMeters,
        unit: " m",
      },
      {
        key: "distancePerMinute",
        label: "Distância/min",
        value: athlete.distancePerMinute,
        average: averages.distancePerMinute,
        unit: " m/min",
      },
      {
        key: "maxSpeedKmh",
        label: "Velocidade máxima",
        value: athlete.maxSpeedKmh,
        average: averages.maxSpeedKmh,
        unit: " km/h",
      },
      {
        key: "highIntensityAccelerations",
        label: "Acelerações HI",
        value:
          athlete.highIntensityAccelerations,
        average:
          averages.highIntensityAccelerations,
        unit: "",
      },
      {
        key: "highIntensityDecelerations",
        label: "Desacelerações HI",
        value:
          athlete.highIntensityDecelerations,
        average:
          averages.highIntensityDecelerations,
        unit: "",
      },
    ];
  }, [derived.distancePerMinute, teamAverage, values]);

  const highlights = useMemo(() => {
    return comparisons
      .map((item) => {
        const difference = percentageDifference(
          item.value,
          item.average,
        );

        if (difference === null) return null;

        if (Math.abs(difference) < 2) {
          return `${item.label} próxima da média da sessão.`;
        }

        if (difference > 0) {
          return `${item.label} ${format(
            Math.abs(difference),
          )}% acima da média da sessão.`;
        }

        return `${item.label} ${format(
          Math.abs(difference),
        )}% abaixo da média da sessão.`;
      })
      .filter(
        (item): item is string => item !== null,
      );
  }, [comparisons]);

  const automaticConclusion = useMemo(() => {
    const valid = comparisons
      .map((item) => {
        const difference = percentageDifference(
          item.value,
          item.average,
        );

        return difference;
      })
      .filter(
        (difference): difference is number =>
          difference !== null,
      );

    if (valid.length === 0) {
      return "Preencha as médias da sessão para gerar uma conclusão comparativa objetiva.";
    }

    const above = valid.filter(
      (difference) => difference > 2,
    ).length;

    const similar = valid.filter(
      (difference) =>
        Math.abs(difference) <= 2,
    ).length;

    const below = valid.filter(
      (difference) => difference < -2,
    ).length;

    return `Comparação objetiva com a sessão: ${above} indicador(es) acima da média, ${similar} próximo(s) da média e ${below} abaixo da média.`;
  }, [comparisons]);

  const updateValue = (
    key: string,
    value: string,
  ) => {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const inputStyle = {
    width: "100%",
    minHeight: 42,
    border: "1px solid #dfe5df",
    borderRadius: 10,
    padding: "9px 11px",
    background: "#fff",
    fontSize: 14,
  } as const;

  const labelStyle = {
    display: "grid",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#4b544c",
  } as const;

  const cardStyle = {
    background: "#fff",
    border: "1px solid #e1e7e1",
    borderRadius: 16,
    padding: 18,
  } as const;

  const gridStyle = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
  } as const;

  const metrics = [
    ["durationMinutes", "Tempo monitorado GPS", "min"],
    ["distanceMeters", "Distância total", "m"],
    [
      "maxSpeedKmh",
      "Velocidade máxima",
      "km/h",
    ],
    [
      "averageSpeedKmh",
      "Velocidade média",
      "km/h",
    ],
    ["sprintCount", "Sprints", ""],
    [
      "sprintDistanceMeters",
      "Distância em sprint",
      "m",
    ],
    [
      "highIntensityDistanceMeters",
      "HSR / alta intensidade",
      "m",
    ],
    ["accelerations", "Acelerações", ""],
    ["decelerations", "Desacelerações", ""],
    [
      "highIntensityAccelerations",
      "Acelerações de alta intensidade",
      "",
    ],
    [
      "highIntensityDecelerations",
      "Desacelerações de alta intensidade",
      "",
    ],
    [
      "peakAccelerationMps2",
      "Pico de aceleração",
      "m/s²",
    ],
    [
      "peakDecelerationMps2",
      "Pico de desaceleração",
      "m/s²",
    ],
    ["playerLoad", "Player Load", ""],
    [
      "averageHeartRateBpm",
      "FC média",
      "bpm",
    ],
    [
      "maxHeartRateBpm",
      "FC máxima",
      "bpm",
    ],
    ["sessionRpe", "RPE", "1–10"],
  ] as const;

  return (
    <section
      style={{
        display: "grid",
        gap: 16,
        marginTop: 18,
      }}
    >
      <div style={cardStyle}>
        <div style={{ marginBottom: 16 }}>
          <small
            style={{
              fontWeight: 800,
              letterSpacing: ".08em",
              color: "#687168",
            }}
          >
            PROTÓTIPO LOCAL · NÃO SALVA NO BANCO
          </small>

          <h2 style={{ margin: "5px 0 4px" }}>
            Nova sessão GPS
          </h2>

          <p
            style={{
              margin: 0,
              color: "#687168",
            }}
          >
            Validação das métricas e cálculos antes
            da ativação no Neon.
          </p>
        </div>

        <div style={gridStyle}>
          <label style={labelStyle}>
            Modalidade
            <select
              value={sport}
              onChange={(event) =>
                setSport(
                  event.target.value as
                    | "FOOTBALL"
                    | "FUTSAL",
                )
              }
              style={inputStyle}
            >
              <option value="FOOTBALL">
                Futebol
              </option>
              <option value="FUTSAL">
                Futsal
              </option>
            </select>
          </label>

          <label style={labelStyle}>
            Contexto
            <select
              value={context}
              onChange={(event) =>
                setContext(
                  event.target.value as
                    | "TRAINING"
                    | "MATCH",
                )
              }
              style={inputStyle}
            >
              <option value="TRAINING">
                Treino
              </option>
              <option value="MATCH">
                Jogo
              </option>
            </select>
          </label>

          <label style={labelStyle}>
            Data
            <input
              type="date"
              value={activityDate}
              onChange={(event) =>
                setActivityDate(
                  event.target.value,
                )
              }
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Horário inicial da sessão
            <input
              type="time"
              value={sessionStartTime}
              onChange={(event) =>
                setSessionStartTime(event.target.value)
              }
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Horário final da sessão
            <input
              type="time"
              value={sessionEndTime}
              onChange={(event) =>
                setSessionEndTime(event.target.value)
              }
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Duração da sessão
            <div
              style={{
                ...inputStyle,
                display: "flex",
                alignItems: "center",
                color: "#4f5850",
                background: "#f7f9f7",
              }}
            >
              {sessionDurationMinutes === null
                ? "Calculada pelos horários"
                : `${sessionDurationMinutes} min`}
            </div>
          </label>
          <label style={labelStyle}>
            Categoria
            <input
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              placeholder="Ex.: Sub-8"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Sessão
            <input
              value={sessionName}
              onChange={(event) =>
                setSessionName(
                  event.target.value,
                )
              }
              placeholder="Ex.: Treino de campo com GPS"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Local
            <input
              value={location}
              onChange={(event) =>
                setLocation(event.target.value)
              }
              placeholder="Local da atividade"
              style={inputStyle}
            />
          </label>

          <div
            style={{
              ...labelStyle,
              position: "relative",
            }}
          >
            <span>Atleta</span>

            <input
              value={athleteSearch}
              onChange={(event) => {
                const value = event.target.value;

                setAthleteSearch(value);
                setAthleteName(value);
                setAthleteId("");
              }}
              placeholder="Digite para buscar no 11UP"
              style={inputStyle}
            />

            {athleteSearch.trim() && !athleteId ? (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  marginTop: 4,
                  background: "#fff",
                  border: "1px solid #dfe5df",
                  borderRadius: 10,
                  boxShadow: "0 10px 30px rgba(0,0,0,.10)",
                  overflow: "hidden",
                  maxHeight: 260,
                  overflowY: "auto",
                }}
              >
                {filteredAthletes.length ? (
                  filteredAthletes.map((athlete) => (
                    <button
                      key={athlete.id}
                      type="button"
                      onClick={() => selectAthlete(athlete)}
                      style={{
                        width: "100%",
                        border: 0,
                        borderBottom: "1px solid #edf0ed",
                        background: "#fff",
                        padding: "10px 12px",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                    >
                      <strong
                        style={{
                          display: "block",
                          fontSize: 14,
                        }}
                      >
                        {athlete.nickname || athlete.name}
                      </strong>

                      <small
                        style={{
                          color: "#687168",
                        }}
                      >
                        {athlete.nickname &&
                        athlete.nickname !== athlete.name
                          ? `${athlete.name} · `
                          : ""}
                        {athlete.categoryName || "Sem categoria"}
                      </small>
                    </button>
                  ))
                ) : (
                  <div
                    style={{
                      padding: 12,
                      color: "#687168",
                      fontSize: 13,
                    }}
                  >
                    Nenhum atleta cadastrado encontrado.
                    O nome poderá permanecer como lançamento manual.
                  </div>
                )}
              </div>
            ) : null}

            {athleteId ? (
              <small
                style={{
                  color: "#4f7d16",
                  fontWeight: 800,
                }}
              >
                ✓ Vinculado ao atleta do 11UP
              </small>
            ) : athleteSearch.trim() ? (
              <small
                style={{
                  color: "#8a6d1d",
                }}
              >
                Nome manual · selecione um resultado para vincular ao cadastro.
              </small>
            ) : (
              <small
                style={{
                  color: "#687168",
                }}
              >
                Busque um atleta cadastrado ou informe um nome manual.
              </small>
            )}
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <small
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#687168",
          }}
        >
          MÉTRICAS DO EQUIPAMENTO
        </small>

        <h3 style={{ margin: "5px 0 14px" }}>
          Dados individuais
        </h3>

        <div style={gridStyle}>
          {metrics.map(
            ([key, label, unit]) => (
              <label
                key={key}
                style={labelStyle}
              >
                {label}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: unit
                      ? "1fr auto"
                      : "1fr",
                    gap: 8,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={values[key]}
                    onChange={(event) =>
                      updateValue(
                        key,
                        event.target.value,
                      )
                    }
                    style={inputStyle}
                  />

                  {unit ? (
                    <span
                      style={{
                        fontSize: 12,
                        color: "#687168",
                      }}
                    >
                      {unit}
                    </span>
                  ) : null}
                </div>
              </label>
            ),
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <small
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#687168",
          }}
        >
          CÁLCULOS 11UP
        </small>

        <h3 style={{ margin: "5px 0 14px" }}>
          Calculados automaticamente
        </h3>

        <div style={gridStyle}>
          {[
            [
              "Distância/min",
              derived.distancePerMinute,
              " m/min",
            ],
            [
              "Player Load/min",
              derived.playerLoadPerMinute,
              "",
            ],
            [
              "HSR",
              derived.hsrPercent,
              "%",
            ],
            [
              "Sprint",
              derived.sprintPercent,
              "%",
            ],
          ].map(
            ([label, value, suffix]) => (
              <article
                key={String(label)}
                style={{
                  border:
                    "1px solid #e5e9e5",
                  borderRadius: 13,
                  padding: 14,
                }}
              >
                <small
                  style={{
                    display: "block",
                    color: "#687168",
                    marginBottom: 5,
                  }}
                >
                  {String(label)}
                </small>

                <strong
                  style={{ fontSize: 22 }}
                >
                  {format(
                    value as number | null,
                  )}
                  {value !== null
                    ? String(suffix)
                    : ""}
                </strong>
              </article>
            ),
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <small
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#687168",
          }}
        >
          ZONAS CONFIGURÁVEIS
        </small>

        <h3 style={{ margin: "5px 0 4px" }}>
          Zonas de velocidade
        </h3>

        <p
          style={{
            margin: "0 0 16px",
            color: "#687168",
          }}
        >
          Valores iniciais reproduzem o
          relatório-modelo. O perfil do GPS
          poderá utilizar outros limites.
        </p>

        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {zoneRanges.map(
            (zone, index) => {
              const meters = numeric(
                zoneMeters[index],
              );

              const percent =
                zoneTotal > 0
                  ? (meters / zoneTotal) * 100
                  : null;

              return (
                <div
                  key={zone.name}
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "60px minmax(100px, 140px) 30px minmax(100px, 140px) minmax(110px, 160px) 90px",
                    gap: 10,
                    alignItems: "center",
                    borderBottom:
                      "1px solid #edf0ed",
                    padding: "10px 0",
                  }}
                >
                  <strong>{zone.name}</strong>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={zone.min}
                    onChange={(event) => {
                      const next = [
                        ...zoneRanges,
                      ];

                      next[index] = {
                        ...next[index],
                        min: event.target.value,
                      };

                      setZoneRanges(next);
                    }}
                    style={inputStyle}
                  />

                  <span>–</span>

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={zone.max}
                    placeholder={
                      index === 4
                        ? "sem limite"
                        : ""
                    }
                    onChange={(event) => {
                      const next = [
                        ...zoneRanges,
                      ];

                      next[index] = {
                        ...next[index],
                        max: event.target.value,
                      };

                      setZoneRanges(next);
                    }}
                    style={inputStyle}
                  />

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={zoneMeters[index]}
                    placeholder="metros"
                    onChange={(event) => {
                      const next = [
                        ...zoneMeters,
                      ];

                      next[index] =
                        event.target.value;

                      setZoneMeters(next);
                    }}
                    style={inputStyle}
                  />

                  <strong>
                    {percent === null
                      ? "—"
                      : `${format(percent)}%`}
                  </strong>
                </div>
              );
            },
          )}
        </div>

        <div
          style={{
            ...gridStyle,
            marginTop: 18,
          }}
        >
          <label style={labelStyle}>
            HSR acima de
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                type="number"
                min="0"
                step="0.1"
                value={hsrThreshold}
                onChange={(event) =>
                  setHsrThreshold(
                    event.target.value,
                  )
                }
                style={inputStyle}
              />
              <span>km/h</span>
            </div>
          </label>

          <label style={labelStyle}>
            Sprint acima de
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "1fr auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <input
                type="number"
                min="0"
                step="0.1"
                value={sprintThreshold}
                onChange={(event) =>
                  setSprintThreshold(
                    event.target.value,
                  )
                }
                style={inputStyle}
              />
              <span>km/h</span>
            </div>
          </label>
        </div>

        <p
          style={{
            margin: "14px 0 0",
            color: "#687168",
            fontSize: 13,
          }}
        >
          Referência atual: HSR &gt;{" "}
          {hsrThreshold || "—"} km/h · Sprint
          &gt; {sprintThreshold || "—"} km/h.
        </p>
      </div>

      <div style={cardStyle}>
        <small
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#687168",
          }}
        >
          EVOLUÇÃO DENTRO DA ATIVIDADE
        </small>

        <h3 style={{ margin: "5px 0 4px" }}>
          Distância por minuto
        </h3>

        <p
          style={{
            margin: "0 0 14px",
            color: "#687168",
          }}
        >
          m/min em cada bloco de 5 minutos.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
          }}
        >
          {timeBlocks.map(
            (block, index) => (
              <label
                key={block.label}
                style={labelStyle}
              >
                {block.label} min

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr auto",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={block.value}
                    onChange={(event) => {
                      const next = [
                        ...timeBlocks,
                      ];

                      next[index] = {
                        ...next[index],
                        value:
                          event.target.value,
                      };

                      setTimeBlocks(next);
                    }}
                    style={inputStyle}
                  />

                  <span
                    style={{
                      fontSize: 12,
                      color: "#687168",
                    }}
                  >
                    m/min
                  </span>
                </div>
              </label>
            ),
          )}
        </div>
      </div>

      <div style={cardStyle}>
        <small
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#687168",
          }}
        >
          COMPARATIVO
        </small>

        <h3 style={{ margin: "5px 0 4px" }}>
          Atleta × média da sessão
        </h3>

        <p
          style={{
            margin: "0 0 14px",
            color: "#687168",
          }}
        >
          No protótipo, informe a média
          manualmente. Na versão final ela será
          calculada pelos atletas da mesma sessão.
        </p>

        <div
          style={{
            display: "grid",
            gap: 8,
          }}
        >
          {comparisons.map((item) => {
            const teamKey = item.key;

            const difference =
              percentageDifference(
                item.value,
                item.average,
              );

            return (
              <div
                key={item.key}
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "minmax(170px, 1fr) minmax(120px, 160px) minmax(120px, 160px) minmax(100px, 140px)",
                  gap: 10,
                  alignItems: "end",
                  borderBottom:
                    "1px solid #edf0ed",
                  padding: "10px 0",
                }}
              >
                <div>
                  <strong>
                    {item.label}
                  </strong>

                  <div
                    style={{
                      marginTop: 5,
                      color: "#687168",
                      fontSize: 13,
                    }}
                  >
                    Atleta:{" "}
                    {format(item.value)}
                    {item.value !== null
                      ? item.unit
                      : ""}
                  </div>
                </div>

                <label style={labelStyle}>
                  Média da equipe
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      teamAverage[
                        teamKey
                      ] ?? ""
                    }
                    onChange={(event) =>
                      setTeamAverage(
                        (current) => ({
                          ...current,
                          [teamKey]:
                            event.target
                              .value,
                        }),
                      )
                    }
                    style={inputStyle}
                  />
                </label>

                <div
                  style={{
                    paddingBottom: 10,
                    color: "#687168",
                  }}
                >
                  {item.average !== null
                    ? `${format(
                        item.average,
                      )}${item.unit}`
                    : "—"}
                </div>

                <strong
                  style={{
                    paddingBottom: 10,
                  }}
                >
                  {difference === null
                    ? "—"
                    : `${difference >= 0 ? "+" : ""}${format(
                        difference,
                      )}%`}
                </strong>
              </div>
            );
          })}
        </div>
      </div>

      <div style={cardStyle}>
        <small
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#687168",
          }}
        >
          PRINCIPAIS DESTAQUES
        </small>

        <h3 style={{ margin: "5px 0 12px" }}>
          Leitura objetiva dos dados
        </h3>

        {highlights.length > 0 ? (
          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              display: "grid",
              gap: 8,
            }}
          >
            {highlights.map(
              (highlight) => (
                <li key={highlight}>
                  {highlight}
                </li>
              ),
            )}
          </ul>
        ) : (
          <p
            style={{
              margin: 0,
              color: "#687168",
            }}
          >
            Informe os dados do atleta e as médias
            da sessão para gerar os destaques.
          </p>
        )}
      </div>

      <div style={cardStyle}>
        <small
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#687168",
          }}
        >
          CONCLUSÃO
        </small>

        <h3 style={{ margin: "5px 0 12px" }}>
          Síntese da atividade
        </h3>

        <div
          style={{
            padding: 14,
            border:
              "1px solid #e5e9e5",
            borderRadius: 12,
            marginBottom: 14,
            color: "#4f5850",
          }}
        >
          {automaticConclusion}
        </div>

        <label style={labelStyle}>
          Conclusão do profissional
          <textarea
            rows={5}
            value={manualConclusion}
            onChange={(event) =>
              setManualConclusion(
                event.target.value,
              )
            }
            placeholder="Complemento ou conclusão editada pelo profissional..."
            style={{
              ...inputStyle,
              resize: "vertical",
            }}
          />
        </label>
      </div>

      <div style={cardStyle}>
        <small
          style={{
            fontWeight: 800,
            letterSpacing: ".08em",
            color: "#687168",
          }}
        >
          RESUMO DA SESSÃO
        </small>

        <h3 style={{ margin: "5px 0 12px" }}>
          {athleteName ||
            "Atleta não selecionado"}
        </h3>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            color: "#4f5850",
          }}
        >
          <span>
            {sport === "FOOTBALL"
              ? "Futebol"
              : "Futsal"}
          </span>

          <span>·</span>

          <span>
            {context === "TRAINING"
              ? "Treino"
              : "Jogo"}
          </span>

          <span>·</span>
          <span>{activityDate}</span>

          {sessionStartTime && sessionEndTime ? (
            <>
              <span>·</span>
              <span>
                Sessão: {sessionStartTime}–{sessionEndTime}
              </span>
              {sessionDurationMinutes !== null ? (
                <>
                  <span>·</span>
                  <span>{sessionDurationMinutes} min</span>
                </>
              ) : null}
            </>
          ) : null}
          {category ? (
            <>
              <span>·</span>
              <span>{category}</span>
            </>
          ) : null}

          {sessionName ? (
            <>
              <span>·</span>
              <span>{sessionName}</span>
            </>
          ) : null}

          {location ? (
            <>
              <span>·</span>
              <span>{location}</span>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}