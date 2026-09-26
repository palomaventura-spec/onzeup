import Image from "next/image";
import Link from "next/link";

import { createCompetition } from "../actions";

export default function NewCompetitionPage() {
  const suggestedSeason = String(
    new Date().getFullYear() + 1
  );

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ORGANIZAÇÃO · COMPETIÇÕES
          </span>

          <h1>Nova competição</h1>

          <p className="od-date">
            Configure as informações principais do campeonato ou torneio.
          </p>
        </div>

        <Link
          href="/organizador/competicoes"
          className="card"
          style={{
            padding: "11px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Voltar
        </Link>
      </header>

      <form
        action={createCompetition}
        style={{
          display: "grid",
          gap: 24,
          marginTop: 8,
        }}
      >
        <section className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                IDENTIFICAÇÃO
              </span>

              <h2>Informações da competição</h2>
            </div>

            <span className="muted">
              Campos principais
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 18,
              marginTop: 22,
            }}
          >
            <label
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Nome da competição *</strong>

              <input
                name="name"
                required
                minLength={3}
                placeholder="Ex.: Taça Edilson Silva 2027"
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Temporada</strong>

              <input
                name="season"
                defaultValue={suggestedSeason}
                placeholder="2027"
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Modalidade *</strong>

              <select
                name="sport"
                defaultValue="FOOTBALL"
                required
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              >
                <option value="FOOTBALL">
                  Futebol
                </option>

                <option value="FUTSAL">
                  Futsal
                </option>

                <option value="BOTH">
                  Futebol + Futsal
                </option>
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Formato *</strong>

              <select
                name="format"
                defaultValue="GROUP_STAGE_KNOCKOUT"
                required
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              >
                <option value="GROUP_STAGE_KNOCKOUT">
                  Grupos + eliminatórias
                </option>

                <option value="ROUND_ROBIN">
                  Pontos corridos
                </option>

                <option value="KNOCKOUT">
                  Eliminatória
                </option>

                <option value="CUSTOM">
                  Personalizado
                </option>
              </select>
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Máximo de equipes</strong>

              <input
                name="maxTeams"
                type="number"
                min="1"
                placeholder="Ex.: 56"
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              />
            </label>

            <label
              style={{
                gridColumn: "1 / -1",
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Descrição</strong>

              <textarea
                name="description"
                rows={5}
                placeholder="Apresente a competição, seu objetivo, público e principais informações."
                style={{
                  width: "100%",
                  padding: 14,
                  resize: "vertical",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              />
            </label>
          </div>
        </section>

        <section className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                CALENDÁRIO
              </span>

              <h2>Datas da competição</h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 18,
              marginTop: 22,
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Início da competição</strong>

              <input
                name="startDate"
                type="date"
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Fim da competição</strong>

              <input
                name="endDate"
                type="date"
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Início das inscrições</strong>

              <input
                name="registrationStart"
                type="date"
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Fim das inscrições</strong>

              <input
                name="registrationEnd"
                type="date"
                style={{
                  width: "100%",
                  minHeight: 46,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "var(--surface, #fff)",
                  font: "inherit",
                }}
              />
            </label>
          </div>
        </section>

        <section className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                PUBLICAÇÃO
              </span>

              <h2>Visibilidade</h2>
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              marginTop: 22,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              name="isPublic"
              style={{
                width: 18,
                height: 18,
                marginTop: 2,
              }}
            />

            <span>
              <strong
                style={{
                  display: "block",
                }}
              >
                Tornar competição pública
              </strong>

              <span
                className="muted"
                style={{
                  display: "block",
                  marginTop: 4,
                }}
              >
                Permite que posteriormente a competição
                possua página pública com jogos,
                classificação e informações.
              </span>
            </span>
          </label>
        </section>

        <section
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            padding: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong
              style={{
                display: "block",
              }}
            >
              Pronto para começar?
            </strong>

            <span
              className="muted"
              style={{
                display: "block",
                marginTop: 4,
              }}
            >
              Depois você poderá cadastrar categorias,
              equipes, campos e jogos.
            </span>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/organizador/competicoes"
              className="card"
              style={{
                padding: "12px 18px",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="od-action-primary"
              style={{
                border: 0,
                cursor: "pointer",
                padding: "13px 22px",
                fontWeight: 800,
              }}
            >
              Criar competição
            </button>
          </div>
        </section>
      </form>

      <footer className="od-footer">
        <Image
          src="/brand/11up/logos/11up-logo-transparent-dark.svg"
          alt="11UP"
          width={82}
          height={32}
        />

        <small>
          A estrutura da competição poderá ser configurada
          após a criação.
        </small>
      </footer>
    </div>
  );
}