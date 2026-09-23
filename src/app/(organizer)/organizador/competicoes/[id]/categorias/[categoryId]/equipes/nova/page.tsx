import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createCompetitionTeam } from "../actions";

export default async function NewCompetitionTeamPage({
  params,
}: {
  params: Promise<{
    id: string;
    categoryId: string;
  }>;
}) {
  const user = await requireOrganizationUser();

  if (!user.organizationId) {
    notFound();
  }

  const { id, categoryId } = await params;

  const category =
    await prisma.competitionCategory.findFirst({
      where: {
        id: categoryId,
        competitionId: id,

        competition: {
          organizationId: user.organizationId,
        },
      },

      include: {
        competition: {
          select: {
            id: true,
            name: true,
          },
        },

        _count: {
          select: {
            teams: true,
          },
        },
      },
    });

  if (!category) {
    notFound();
  }

  const createAction =
    createCompetitionTeam.bind(
      null,
      category.competition.id,
      category.id
    );

  const availableSpots =
    category.maxTeams !== null
      ? Math.max(
          category.maxTeams -
            category._count.teams,
          0
        )
      : null;

  const categoryFull =
    category.maxTeams !== null &&
    category._count.teams >=
      category.maxTeams;

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ONZEUP ORGANIZAÇÃO ·{" "}
            {category.competition.name}
          </span>

          <h1>Nova equipe</h1>

          <p className="od-date">
            {category.name} · Cadastro de
            participante
          </p>
        </div>

        <Link
          href={`/organizador/competicoes/${category.competition.id}/categorias/${category.id}`}
          className="card"
          style={{
            padding: "11px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← {category.name}
        </Link>
      </header>

      <section
        className="od-kpis"
        aria-label="Situação da categoria"
      >
        <Link
          href={`/organizador/competicoes/${category.competition.id}/categorias/${category.id}`}
        >
          <span className="od-kpi-icon">
            ◎
          </span>

          <small>EQUIPES</small>

          <strong>
            {category._count.teams}
          </strong>

          <em>Cadastradas</em>
        </Link>

        <Link
          href={`/organizador/competicoes/${category.competition.id}/categorias/${category.id}`}
        >
          <span className="od-kpi-icon">
            ◉
          </span>

          <small>VAGAS DISPONÍVEIS</small>

          <strong>
            {availableSpots === null
              ? "∞"
              : availableSpots}
          </strong>

          <em>
            {category.maxTeams
              ? `Limite de ${category.maxTeams}`
              : "Sem limite definido"}
          </em>
        </Link>

        <Link
          href={`/organizador/competicoes/${category.competition.id}/categorias/${category.id}`}
        >
          <span className="od-kpi-icon">
            ◇
          </span>

          <small>CATEGORIA</small>

          <strong
            style={{
              fontSize: 21,
            }}
          >
            {category.name}
          </strong>

          <em>
            {category.code ||
              "Sem código"}
          </em>
        </Link>

        <Link
          href={`/organizador/competicoes/${category.competition.id}`}
        >
          <span className="od-kpi-icon">
            ◈
          </span>

          <small>COMPETIÇÃO</small>

          <strong
            style={{
              fontSize: 17,
            }}
          >
            {category.competition.name}
          </strong>

          <em>Competição atual</em>
        </Link>
      </section>

      {categoryFull ? (
        <section
          className="card od-panel"
          style={{
            marginTop: 24,
          }}
        >
          <div className="od-empty">
            <strong>
              Limite de equipes atingido
            </strong>

            <span>
              A categoria {category.name} já
              possui o máximo de{" "}
              {category.maxTeams} equipes.
            </span>

            <Link
              href={`/organizador/competicoes/${category.competition.id}/categorias/${category.id}`}
            >
              Voltar à categoria
            </Link>
          </div>
        </section>
      ) : (
        <form
          action={createAction}
          style={{
            display: "grid",
            gap: 24,
            marginTop: 24,
          }}
        >
          <section className="card od-panel">
            <div className="od-panel-head">
              <div>
                <span className="od-eyebrow">
                  IDENTIFICAÇÃO
                </span>

                <h2>Dados da equipe</h2>
              </div>

              <span className="muted">
                {category.name}
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
                  gridColumn: "1 / -1",
                }}
              >
                <strong>
                  Nome da equipe *
                </strong>

                <input
                  name="name"
                  required
                  minLength={2}
                  autoFocus
                  placeholder="Ex.: Botafogo"
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    background:
                      "var(--surface, #fff)",
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
                <strong>
                  Sigla / nome curto
                </strong>

                <input
                  name="shortName"
                  placeholder="Ex.: BFR"
                  maxLength={20}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    background:
                      "var(--surface, #fff)",
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
                <strong>Logo</strong>

                <input
                  name="logoUrl"
                  type="url"
                  placeholder="https://..."
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    background:
                      "var(--surface, #fff)",
                    font: "inherit",
                  }}
                />

                <span className="muted">
                  Por enquanto use a URL do
                  escudo. Depois incluiremos
                  upload direto.
                </span>
              </label>
            </div>
          </section>

          <section className="card od-panel">
            <div className="od-panel-head">
              <div>
                <span className="od-eyebrow">
                  LOCALIZAÇÃO
                </span>

                <h2>Cidade da equipe</h2>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(240px, 1fr) minmax(140px, .35fr)",
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
                <strong>Cidade</strong>

                <input
                  name="city"
                  placeholder="Ex.: Rio de Janeiro"
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    background:
                      "var(--surface, #fff)",
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
                <strong>UF</strong>

                <input
                  name="state"
                  placeholder="RJ"
                  maxLength={2}
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    textTransform:
                      "uppercase",
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    background:
                      "var(--surface, #fff)",
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
                  RESPONSÁVEL
                </span>

                <h2>Contato da equipe</h2>
              </div>

              <span className="muted">
                Organização / comissão
              </span>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(230px, 1fr))",
                gap: 18,
                marginTop: 22,
              }}
            >
              <label
                style={{
                  display: "grid",
                  gap: 7,
                  gridColumn: "1 / -1",
                }}
              >
                <strong>
                  Nome do responsável
                </strong>

                <input
                  name="responsibleName"
                  placeholder="Nome completo"
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    background:
                      "var(--surface, #fff)",
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
                <strong>
                  WhatsApp / telefone
                </strong>

                <input
                  name="responsiblePhone"
                  type="tel"
                  placeholder="(21) 99999-9999"
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    background:
                      "var(--surface, #fff)",
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
                <strong>E-mail</strong>

                <input
                  name="responsibleEmail"
                  type="email"
                  placeholder="contato@clube.com.br"
                  style={{
                    width: "100%",
                    minHeight: 46,
                    padding: "0 14px",
                    borderRadius: 10,
                    border:
                      "1px solid var(--line)",
                    background:
                      "var(--surface, #fff)",
                    font: "inherit",
                  }}
                />
              </label>
            </div>
          </section>

          <section
            className="card"
            style={{
              padding: 20,
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
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
                Adicionar à {category.name}
              </strong>

              <span
                className="muted"
                style={{
                  display: "block",
                  marginTop: 4,
                }}
              >
                A equipe cadastrada manualmente
                pelo organizador será aprovada
                automaticamente.
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
                href={`/organizador/competicoes/${category.competition.id}/categorias/${category.id}`}
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
                Criar equipe
              </button>
            </div>
          </section>
        </form>
      )}

      <footer className="od-footer">
        <span>ONZEUP ORGANIZAÇÃO</span>

        <small>
          Cadastro de equipe participante.
        </small>
      </footer>
    </div>
  );
}