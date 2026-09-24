"use client";

import { useMemo, useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { saveCallUpConfiguration } from "./actions";

type Props = {
  matchId: string;
  competitionLabel: string | null;
  categoryName: string;
  initialGoalkeepers: number;
  initialOutfield: number;
  initialReserves: number;
  initialFormation: string;
  currentCallUps: number;
  isActive: boolean;
  defaultRuleSummary?: string | null;
};

function formationTotal(value: string) {
  const normalized = value
    .trim()
    .replace(/[–—×xX]/g, "-")
    .replace(/\s+/g, "");

  if (!normalized) return 0;

  const numbers = normalized
    .split("-")
    .filter(Boolean)
    .map(Number);

  if (
    !numbers.length ||
    numbers.some((item) => !Number.isInteger(item) || item <= 0)
  ) {
    return -1;
  }

  return numbers.reduce((sum, item) => sum + item, 0);
}

export default function CallUpConfigurationForm({
  matchId,
  competitionLabel,
  categoryName,
  initialGoalkeepers,
  initialOutfield,
  initialReserves,
  initialFormation,
  currentCallUps,
  isActive,
  defaultRuleSummary,
}: Props) {
  const router = useRouter();

  const [goalkeepers, setGoalkeepers] = useState(initialGoalkeepers);
  const [outfield, setOutfield] = useState(initialOutfield);
  const [reserves, setReserves] = useState(initialReserves);
  const [formation, setFormation] = useState(initialFormation);
  const [formationName, setFormationName] = useState(initialFormation);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();

  const starters = goalkeepers + outfield;
  const total = starters + reserves;

  const currentFormationTotal = useMemo(
    () => formationTotal(formation),
    [formation],
  );

  const formationMatches =
    currentFormationTotal === outfield;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    if (!formationMatches) {
      setFeedback({
        type: "error",
        text:
          currentFormationTotal < 0
            ? "Use um esquema no formato 2-2-3, 3-2-3, 4-3-3 etc."
            : `O esquema informado soma ${currentFormationTotal} jogadores de linha, mas esta convocação está configurada para ${outfield}.`,
      });
      return;
    }

    if (total < currentCallUps) {
      setFeedback({
        type: "error",
        text: `Já existem ${currentCallUps} atletas convocados. O total não pode ser reduzido para ${total}.`,
      });
      return;
    }

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      try {
        const result = await saveCallUpConfiguration(formData);

        if (!result?.ok) {
          setFeedback({
            type: "error",
            text:
              result?.error ||
              "Não foi possível salvar a configuração.",
          });
          return;
        }

        const savedStarters = result.totalStarters ?? starters;
        const savedTotal = result.totalCalled ?? total;
        const savedFormation = result.formationName ?? formationName ?? formation;

        setFeedback({
          type: "success",
          text: `Configuração salva: ${savedStarters} titulares, ${savedTotal - savedStarters} reservas • formação ${savedFormation}.`,
        });

        router.refresh();
      } catch (error) {
        console.error("CALLUP_CONFIGURATION_SAVE_ERROR", error);

        setFeedback({
          type: "error",
          text: "Ocorreu um erro ao salvar. Tente novamente.",
        });
      }
    });
  }

  return (
    <section
      className="card"
      style={{
        marginTop: 16,
        border: "1px solid rgba(157, 219, 22, .22)",
      }}
    >
      <div className="page-head compact">
        <div>
          <span className="page-eyebrow">
            REGRA DA CONVOCAÇÃO
          </span>

          <h2>Configuração de titulares e reservas</h2>

          <p className="muted">
            Defina a quantidade usada nesta competição e o esquema que será
            aplicado na escalação e na arte.
          </p>
        </div>

        <span
          className={`status ${
            isActive
              ? "status-confirmed"
              : "status-pending"
          }`}
        >
          {isActive
            ? "Configuração ativa"
            : "Modelo antigo"}
        </span>
      </div>

      <form
        className="form"
        onSubmit={submit}
        style={{ marginTop: 18 }}
      >
        <input
          type="hidden"
          name="matchId"
          value={matchId}
        />

        <label>
          Goleiros titulares
          <input
            name="starterGoalkeeperCount"
            type="number"
            min="1"
            max="3"
            value={goalkeepers}
            onChange={(event) =>
              setGoalkeepers(Number(event.target.value))
            }
            required
          />
          <small className="help">
            Normalmente 1. Use mais apenas quando o regulamento exigir.
          </small>
        </label>

        <label>
          Jogadores de linha titulares
          <input
            name="starterOutfieldCount"
            type="number"
            min="1"
            max="20"
            value={outfield}
            onChange={(event) =>
              setOutfield(Number(event.target.value))
            }
            required
          />
        </label>

        <label>
          Reservas
          <input
            name="reserveCount"
            type="number"
            min="0"
            max="30"
            value={reserves}
            onChange={(event) =>
              setReserves(Number(event.target.value))
            }
            required
          />
        </label>

        <label>
          Esquema de jogo
          <input
            name="formationPattern"
            value={formation}
            onChange={(event) =>
              setFormation(event.target.value)
            }
            placeholder="Ex.: 2-2-3"
            required
          />

          <small
            className="help"
            style={{
              color: formationMatches
                ? undefined
                : "#b42318",
            }}
          >
            {formationMatches
              ? `Esquema válido: ${outfield} jogadores de linha + ${goalkeepers} goleiro(s).`
              : `O esquema deve somar exatamente ${outfield} jogadores de linha.`}
          </small>
        </label>

        <label>
          Nome da formação
          <input
            name="formationName"
            value={formationName}
            onChange={(event) =>
              setFormationName(event.target.value)
            }
            placeholder="Ex.: 2-2-3"
          />
        </label>

        <label
          style={{
            gridColumn: "1 / -1",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            marginTop: 2,
            border: "1px solid #dbe3e8",
            borderRadius: 14,
            background: "#f8fafb",
            cursor: "pointer",
          }}
        >
          <input
            name="saveAsDefault"
            type="checkbox"
            style={{
              width: 18,
              height: 18,
              margin: "2px 0 0",
              flex: "0 0 auto",
            }}
          />

          <span
            style={{
              minWidth: 0,
              display: "grid",
              gap: 4,
              lineHeight: 1.35,
            }}
          >
            <strong>
              Salvar como padrão desta{" "}
              {competitionLabel
                ? "competição/categoria"
                : "categoria"}
            </strong>

            <small
              style={{
                color: "#64748b",
                fontWeight: 500,
              }}
            >
              {competitionLabel
                ? `Aplicar também aos próximos jogos de ${competitionLabel} / ${categoryName}.`
                : `Aplicar também aos próximos jogos de ${categoryName} nesta modalidade.`}
            </small>
          </span>
        </label>

        <div
          style={{
            gridColumn: "1 / -1",
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 10,
            padding: 14,
            borderRadius: 14,
            background: "rgba(157, 219, 22, .07)",
          }}
        >
          <div>
            <span className="help">
              Titulares
            </span>
            <strong
              style={{
                display: "block",
                marginTop: 3,
                fontSize: 22,
              }}
            >
              {starters}
            </strong>
          </div>

          <div>
            <span className="help">
              Reservas
            </span>
            <strong
              style={{
                display: "block",
                marginTop: 3,
                fontSize: 22,
              }}
            >
              {reserves}
            </strong>
          </div>

          <div>
            <span className="help">
              Total convocados
            </span>
            <strong
              style={{
                display: "block",
                marginTop: 3,
                fontSize: 22,
              }}
            >
              {total}
            </strong>
          </div>
        </div>

        {feedback ? (
          <div
            className={`notice ${
              feedback.type === "error"
                ? "error"
                : ""
            }`}
            style={{
              gridColumn: "1 / -1",
              margin: 0,
            }}
          >
            {feedback.text}
          </div>
        ) : null}

        {defaultRuleSummary ? (
          <div
            className="help"
            style={{
              gridColumn: "1 / -1",
              padding: "0 2px",
            }}
          >
            Padrão atual: {defaultRuleSummary}
          </div>
        ) : null}

        <button
          className="btn"
          type="submit"
          disabled={isPending || !formationMatches}
          style={{
            gridColumn: "1 / -1",
            minHeight: 48,
          }}
        >
          {isPending
            ? "Salvando configuração..."
            : "Salvar configuração da convocação"}
        </button>
      </form>
    </section>
  );
}
