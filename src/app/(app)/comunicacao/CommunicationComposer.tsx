"use client";

import { useEffect, useState } from "react";

import PendingSubmitButton from "@/components/PendingSubmitButton";

import {
  searchCommunicationAthletes,
  sendClubCommunication,
} from "./actions";

type AudienceType =
  | "ATHLETE"
  | "CATEGORY"
  | "MODALITY"
  | "ALL";

type CategoryOption = {
  id: string;
  name: string;
  sport: string;
};

type AthleteResult = {
  id: string;
  name: string;
  nickname: string | null;
  details: string[];
};

export default function CommunicationComposer({
  categories,
}: {
  categories: CategoryOption[];
}) {
  const [audienceType, setAudienceType] =
    useState<AudienceType>("CATEGORY");

  const [athleteQuery, setAthleteQuery] =
    useState("");

  const [athleteResults, setAthleteResults] =
    useState<AthleteResult[]>([]);

  const [selectedAthlete, setSelectedAthlete] =
    useState<AthleteResult | null>(null);

  const [searchingAthlete, setSearchingAthlete] =
    useState(false);

  useEffect(() => {
    function handleTrainingCommunication(event: Event) {
      const detail = (
        event as CustomEvent<{
          categoryId: string;
          title: string;
          body: string;
        }>
      ).detail;

      setAudienceType("CATEGORY");
      setSelectedAthlete(null);
      setAthleteQuery("");
      setAthleteResults([]);

      window.setTimeout(() => {
        const root =
          document.getElementById(
            "communication-composer",
          );

        const category =
          root?.querySelector<HTMLSelectElement>(
            'select[name="categoryId"]',
          );

        const title =
          root?.querySelector<HTMLInputElement>(
            'input[name="title"]',
          );

        const body =
          root?.querySelector<HTMLTextAreaElement>(
            'textarea[name="body"]',
          );

        if (category) {
          category.value = detail.categoryId;
        }

        if (title) {
          title.value = detail.title;
        }

        if (body) {
          body.value = detail.body;
        }

        root?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 0);
    }

    window.addEventListener(
      "11up:training-communication",
      handleTrainingCommunication,
    );

    return () => {
      window.removeEventListener(
        "11up:training-communication",
        handleTrainingCommunication,
      );
    };
  }, []);
  useEffect(() => {
    if (audienceType !== "ATHLETE") {
      return;
    }

    const term = athleteQuery.trim();

    if (selectedAthlete || term.length < 2) {
      setAthleteResults([]);
      setSearchingAthlete(false);
      return;
    }

    let active = true;

    const timer = window.setTimeout(async () => {
      setSearchingAthlete(true);

      try {
        const results =
          await searchCommunicationAthletes(term);

        if (active) {
          setAthleteResults(results);
        }
      } finally {
        if (active) {
          setSearchingAthlete(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    athleteQuery,
    audienceType,
    selectedAthlete,
  ]);

  function clearAthlete() {
    setSelectedAthlete(null);
    setAthleteQuery("");
    setAthleteResults([]);
  }

  return (
    <section id="communication-composer" className="card communication-composer">
      <div className="section-title-row">
        <div>
          <span className="page-eyebrow">
            COMUNICADO 11UP
          </span>

          <h2>Novo comunicado</h2>
        </div>

        <span className="muted">
          Canal oficial para Players e responsáveis
        </span>
      </div>

      <form
        action={sendClubCommunication}
        style={{
          display: "grid",
          gap: 16,
        }}
      >
        <label>
          <span>Público</span>

          <select
            name="audienceType"
            value={audienceType}
            onChange={(event) => {
              const next =
                event.target.value as AudienceType;

              setAudienceType(next);

              if (next !== "ATHLETE") {
                clearAthlete();
              }
            }}
            required
          >
            <option value="ATHLETE">
              Atleta específico
            </option>

            <option value="CATEGORY">
              Categoria
            </option>

            <option value="MODALITY">
              Modalidade
            </option>

            <option value="ALL">
              Todos os Players vinculados
            </option>
          </select>
        </label>

        {audienceType === "ATHLETE" ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              position: "relative",
            }}
          >
            <label>
              <span>Atleta</span>

              <input
                type="search"
                value={athleteQuery}
                autoComplete="off"
                placeholder="Digite pelo menos 2 letras do nome..."
                onChange={(event) => {
                  setSelectedAthlete(null);
                  setAthleteQuery(
                    event.target.value,
                  );
                }}
              />
            </label>

            <input
              type="hidden"
              name="targetAthleteId"
              value={selectedAthlete?.id ?? ""}
            />

            {searchingAthlete ? (
              <small className="muted">
                Buscando atletas...
              </small>
            ) : null}

            {!selectedAthlete &&
            athleteQuery.trim().length >= 2 &&
            !searchingAthlete &&
            athleteResults.length === 0 ? (
              <small className="muted">
                Nenhum atleta encontrado.
              </small>
            ) : null}

            {!selectedAthlete &&
            athleteResults.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gap: 6,
                  padding: 8,
                  border:
                    "1px solid var(--border, #dfe3e8)",
                  borderRadius: 12,
                  background:
                    "var(--surface, #fff)",
                  maxHeight: 320,
                  overflowY: "auto",
                }}
              >
                {athleteResults.map((athlete) => (
                  <button
                    key={athlete.id}
                    type="button"
                    onClick={() => {
                      setSelectedAthlete(athlete);
                      setAthleteQuery(
                        athlete.nickname
                          ? `${athlete.nickname} — ${athlete.name}`
                          : athlete.name,
                      );
                      setAthleteResults([]);
                    }}
                    style={{
                      display: "grid",
                      gap: 3,
                      textAlign: "left",
                      padding: 12,
                      border: 0,
                      borderRadius: 10,
                      cursor: "pointer",
                      background:
                        "var(--surface-soft, #f7f8f9)",
                    }}
                  >
                    <strong>
                      {athlete.nickname
                        ? `${athlete.nickname} — ${athlete.name}`
                        : athlete.name}
                    </strong>

                    {athlete.details.length > 0 ? (
                      <small className="muted">
                        {athlete.details.join(" | ")}
                      </small>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            {selectedAthlete ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  padding: 12,
                  border:
                    "1px solid var(--border, #dfe3e8)",
                  borderRadius: 12,
                }}
              >
                <div>
                  <strong>
                    {selectedAthlete.name}
                  </strong>

                  {selectedAthlete.details.length >
                  0 ? (
                    <div className="muted">
                      {selectedAthlete.details.join(
                        " | ",
                      )}
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={clearAthlete}
                >
                  Trocar
                </button>
              </div>
            ) : null}
          </div>
        ) : null}

        {audienceType === "CATEGORY" ? (
          <label>
            <span>Categoria</span>

            <select
              name="categoryId"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Selecione a categoria
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                  {category.sport !== "BOTH"
                    ? ` · ${
                        category.sport ===
                        "FOOTBALL"
                          ? "Futebol"
                          : "Futsal"
                      }`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {audienceType === "MODALITY" ? (
          <label>
            <span>Modalidade</span>

            <select
              name="sport"
              required
              defaultValue=""
            >
              <option value="" disabled>
                Selecione a modalidade
              </option>

              <option value="FOOTBALL">
                Futebol
              </option>

              <option value="FUTSAL">
                Futsal
              </option>
            </select>
          </label>
        ) : null}

        <label>
          <span>Título</span>

          <input
            type="text"
            name="title"
            maxLength={120}
            placeholder="Ex.: Alteração no horário do treino"
            required
          />
        </label>

        <label>
          <span>Mensagem</span>

          <textarea
            name="body"
            rows={7}
            maxLength={5000}
            placeholder="Escreva o comunicado que será enviado aos responsáveis..."
            required
          />
        </label>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <small className="muted">
            Somente Players com vínculo verificado
            receberão o comunicado dentro do 11UP.
          </small>

          <PendingSubmitButton
            className="btn"
            pendingText="Enviando..."
          >
            Enviar comunicado
          </PendingSubmitButton>
        </div>
      </form>
    </section>
  );
}