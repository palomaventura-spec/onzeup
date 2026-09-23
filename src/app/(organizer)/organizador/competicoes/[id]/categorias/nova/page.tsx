import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createCompetitionCategory } from "../actions";

export default async function NewCompetitionCategoryPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user = await requireOrganizationUser();

  if (!user.organizationId) {
    notFound();
  }

  const { id } = await params;

  const competition = await prisma.competition.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },

    select: {
      id: true,
      name: true,
      sport: true,
    },
  });

  if (!competition) {
    notFound();
  }

  const createAction = createCompetitionCategory.bind(
    null,
    competition.id
  );

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ONZEUP ORGANIZAÇÃO · {competition.name}
          </span>

          <h1>Nova categoria</h1>

          <p className="od-date">
            Configure a categoria esportiva e os limites para
            participação.
          </p>
        </div>

        <Link
          href={`/organizador/competicoes/${competition.id}/categorias`}
          className="card"
          style={{
            padding: "11px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Categorias
        </Link>
      </header>

      <form
        action={createAction}
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

              <h2>Dados da categoria</h2>
            </div>

            <span className="muted">
              {competition.sport === "FUTSAL"
                ? "Futsal"
                : competition.sport === "FOOTBALL"
                  ? "Futebol"
                  : "Futebol + Futsal"}
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
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Nome da categoria *</strong>

              <input
                name="name"
                required
                minLength={2}
                placeholder="Ex.: Sub-8"
                autoFocus
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
              <strong>Código</strong>

              <input
                name="code"
                placeholder="Ex.: SUB08"
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
                FAIXA ETÁRIA
              </span>

              <h2>Ano de nascimento</h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
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
              <strong>Ano inicial</strong>

              <input
                name="birthYearFrom"
                type="number"
                min="1990"
                max="2100"
                placeholder="Ex.: 2019"
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
              <strong>Ano final</strong>

              <input
                name="birthYearTo"
                type="number"
                min="1990"
                max="2100"
                placeholder="Ex.: 2019"
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

          <p
            className="muted"
            style={{
              marginTop: 14,
              marginBottom: 0,
            }}
          >
            Para uma categoria de ano único, informe o mesmo
            ano nos dois campos.
          </p>
        </section>

        <section className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                PARTICIPAÇÃO
              </span>

              <h2>Equipes e atletas</h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
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
              <strong>Máximo de equipes</strong>

              <input
                name="maxTeams"
                type="number"
                min="1"
                placeholder="Ex.: 8"
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

              <span className="muted">
                Total de equipes permitidas nesta categoria.
              </span>
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Atletas por equipe</strong>

              <input
                name="rosterLimit"
                type="number"
                min="1"
                placeholder="Ex.: 18"
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

              <span className="muted">
                Limite máximo do elenco inscrito.
              </span>
            </label>
          </div>
        </section>

        <section className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                PARTIDAS
              </span>

              <h2>Tempo operacional</h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(220px, 1fr))",
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
              <strong>Duração do jogo</strong>

              <input
                name="matchDurationMinutes"
                type="number"
                min="1"
                defaultValue={20}
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

              <span className="muted">
                Em minutos.
              </span>
            </label>

            <label
              style={{
                display: "grid",
                gap: 7,
              }}
            >
              <strong>Tempo de transição</strong>

              <input
                name="transitionMinutes"
                type="number"
                min="1"
                defaultValue={5}
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

              <span className="muted">
                Intervalo operacional entre partidas.
              </span>
            </label>
          </div>

          <div
            className="card"
            style={{
              marginTop: 20,
              padding: 18,
            }}
          >
            <span className="od-eyebrow">
              EXEMPLO
            </span>

            <strong
              style={{
                display: "block",
                marginTop: 6,
              }}
            >
              20 minutos de jogo + 5 minutos de transição
            </strong>

            <span
              className="muted"
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              Isso representa uma janela operacional de 25
              minutos para a futura geração da tabela.
            </span>
          </div>
        </section>

        <section
          className="card"
          style={{
            padding: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
          }}
        >
          <div>
            <strong
              style={{
                display: "block",
              }}
            >
              Adicionar à competição
            </strong>

            <span
              className="muted"
              style={{
                display: "block",
                marginTop: 4,
              }}
            >
              Depois você poderá acessar a categoria e
              cadastrar suas equipes.
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
              href={`/organizador/competicoes/${competition.id}/categorias`}
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
                padding: "13px 22px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              Criar categoria
            </button>
          </div>
        </section>
      </form>

      <footer className="od-footer">
        <span>ONZEUP ORGANIZAÇÃO</span>

        <small>
          Cadastro de categoria da competição.
        </small>
      </footer>
    </div>
  );
}