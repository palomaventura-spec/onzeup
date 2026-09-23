import ImageUpload from "@/components/ImageUpload";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import Link from "next/link";
import { notFound } from "next/navigation";

import { createCompetitionAthlete } from "../actions";

export default async function NewCompetitionAthletePage({
  params,
}: {
  params: Promise<{
    id: string;
    categoryId: string;
    teamId: string;
  }>;
}) {
  const user =
    await requireOrganizationUser();

  if (!user.organizationId) {
    notFound();
  }

  const {
    id,
    categoryId,
    teamId,
  } = await params;

  const team =
    await prisma.competitionTeam.findFirst({
      where: {
        id: teamId,
        competitionId: id,
        categoryId,

        competition: {
          organizationId:
            user.organizationId,
        },
      },

      include: {
        competition: {
          select: {
            id: true,
            name: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            code: true,
            rosterLimit: true,
            birthYearFrom: true,
            birthYearTo: true,
          },
        },

        _count: {
          select: {
            athletes: true,
          },
        },
      },
    });

  if (!team) {
    notFound();
  }

  const createAction =
    createCompetitionAthlete.bind(
      null,
      team.competition.id,
      team.category.id,
      team.id
    );

  const athleteCount =
    team._count.athletes;

  const availableSpots =
    team.category.rosterLimit !== null
      ? Math.max(
          team.category.rosterLimit -
            athleteCount,
          0
        )
      : null;

  const rosterFull =
    team.category.rosterLimit !== null &&
    athleteCount >=
      team.category.rosterLimit;

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ONZEUP ORGANIZAÇÃO ·{" "}
            {team.competition.name} ·{" "}
            {team.category.name}
          </span>

          <h1>Novo atleta</h1>

          <p className="od-date">
            {team.name} · Cadastro no elenco
            da competição
          </p>
        </div>

        <Link
          href={`/organizador/competicoes/${team.competition.id}/categorias/${team.category.id}/equipes/${team.id}`}
          className="card"
          style={{
            padding: "11px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← {team.name}
        </Link>
      </header>

      <section
        className="od-kpis"
        aria-label="Situação do elenco"
      >
        <Link
          href={`/organizador/competicoes/${team.competition.id}/categorias/${team.category.id}/equipes/${team.id}`}
        >
          <span className="od-kpi-icon">
            ◎
          </span>

          <small>ATLETAS</small>

          <strong>
            {athleteCount}
          </strong>

          <em>Inscritos</em>
        </Link>

        <Link
          href={`/organizador/competicoes/${team.competition.id}/categorias/${team.category.id}/equipes/${team.id}`}
        >
          <span className="od-kpi-icon">
            ◉
          </span>

          <small>VAGAS</small>

          <strong>
            {availableSpots === null
              ? "∞"
              : availableSpots}
          </strong>

          <em>
            {team.category.rosterLimit
              ? `Limite de ${team.category.rosterLimit}`
              : "Sem limite definido"}
          </em>
        </Link>

        <Link
          href={`/organizador/competicoes/${team.competition.id}/categorias/${team.category.id}`}
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
            {team.category.name}
          </strong>

          <em>
            {team.category.code ||
              "Sem código"}
          </em>
        </Link>

        <Link
          href={`/organizador/competicoes/${team.competition.id}`}
        >
          <span className="od-kpi-icon">
            ◈
          </span>

          <small>EQUIPE</small>

          <strong
            style={{
              fontSize: 20,
            }}
          >
            {team.name}
          </strong>

          <em>
            {team.shortName ||
              "Participante"}
          </em>
        </Link>
      </section>

      {rosterFull ? (
        <section
          className="card od-panel"
          style={{
            marginTop: 24,
          }}
        >
          <div className="od-empty">
            <strong>
              Limite de atletas atingido
            </strong>

            <span>
              A equipe {team.name} já possui
              o máximo de{" "}
              {team.category.rosterLimit}{" "}
              atletas permitidos nesta
              categoria.
            </span>

            <Link
              href={`/organizador/competicoes/${team.competition.id}/categorias/${team.category.id}/equipes/${team.id}`}
            >
              Voltar à equipe
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
          {/* FOTO */}
          <section className="card od-panel">
            <div className="od-panel-head">
              <div>
                <span className="od-eyebrow">
                  IDENTIFICAÇÃO VISUAL
                </span>

                <h2>Foto do atleta</h2>
              </div>

              <span className="muted">
                Usada na credencial
              </span>
            </div>

            <div
              style={{
                marginTop: 22,
                maxWidth: 420,
              }}
            >
              <ImageUpload
                name="photoUrl"
                label="Foto do atleta (JPEG/PNG/WEBP)"
              />

              <p
                className="muted"
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
              >
                Essa imagem poderá ser usada
                posteriormente na carteirinha
                oficial da competição e nas
                telas de identificação do
                atleta.
              </p>
            </div>
          </section>

          {/* DADOS DO ATLETA */}
          <section className="card od-panel">
            <div className="od-panel-head">
              <div>
                <span className="od-eyebrow">
                  IDENTIFICAÇÃO
                </span>

                <h2>Dados do atleta</h2>
              </div>

              <span className="muted">
                {team.name}
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
                  Nome completo *
                </strong>

                <input
                  name="name"
                  required
                  minLength={3}
                  autoFocus
                  placeholder="Ex.: Nome do atleta"
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
                  Data de nascimento
                </strong>

                <input
                  name="birthDate"
                  type="date"
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
                  O sistema verificará o
                  enquadramento na categoria.
                </span>
              </label>

              <label
                style={{
                  display: "grid",
                  gap: 7,
                }}
              >
                <strong>
                  Número da camisa
                </strong>

                <input
                  name="jerseyNumber"
                  type="number"
                  min="0"
                  max="999"
                  placeholder="Ex.: 9"
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
                <strong>Posição</strong>

                <select
                  name="position"
                  defaultValue=""
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
                >
                  <option value="">
                    Não informada
                  </option>

                  <option value="Goleiro">
                    Goleiro
                  </option>

                  <option value="Fixo">
                    Fixo
                  </option>

                  <option value="Ala">
                    Ala
                  </option>

                  <option value="Pivô">
                    Pivô
                  </option>

                  <option value="Defensor">
                    Defensor
                  </option>

                  <option value="Meio-campista">
                    Meio-campista
                  </option>

                  <option value="Atacante">
                    Atacante
                  </option>
                </select>
              </label>
            </div>
          </section>

          {/* CATEGORIA */}
          <section className="card od-panel">
            <div className="od-panel-head">
              <div>
                <span className="od-eyebrow">
                  ENQUADRAMENTO
                </span>

                <h2>
                  Categoria do atleta
                </h2>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 20,
                marginTop: 22,
              }}
            >
              <div>
                <small className="muted">
                  CATEGORIA
                </small>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {team.category.name}
                </strong>
              </div>

              <div>
                <small className="muted">
                  ANO INICIAL
                </small>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {team.category
                    .birthYearFrom ?? "—"}
                </strong>
              </div>

              <div>
                <small className="muted">
                  ANO FINAL
                </small>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {team.category
                    .birthYearTo ?? "—"}
                </strong>
              </div>

              <div>
                <small className="muted">
                  LIMITE DO ELENCO
                </small>

                <strong
                  style={{
                    display: "block",
                    marginTop: 5,
                  }}
                >
                  {team.category
                    .rosterLimit ??
                    "Sem limite"}
                </strong>
              </div>
            </div>
          </section>

          {/* INFORMAÇÃO FUTURA CLUB */}
          <section className="card od-panel">
            <div className="od-panel-head">
              <div>
                <span className="od-eyebrow">
                  ORIGEM DA INSCRIÇÃO
                </span>

                <h2>
                  Cadastro manual
                </h2>
              </div>

              <span className="badge">
                MANUAL
              </span>
            </div>

            <p
              className="muted"
              style={{
                marginTop: 16,
                maxWidth: 760,
                lineHeight: 1.7,
              }}
            >
              Este atleta será cadastrado
              diretamente pelo organizador.
              Futuramente, clubes que utilizam
              o OnzeUp Club poderão selecionar
              atletas do próprio elenco e
              compartilhar os dados autorizados
              com esta competição.
            </p>
          </section>

          {/* AÇÃO */}
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
                Adicionar ao elenco
              </strong>

              <span
                className="muted"
                style={{
                  display: "block",
                  marginTop: 4,
                }}
              >
                O atleta será vinculado
                diretamente à equipe{" "}
                {team.name}.
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
                href={`/organizador/competicoes/${team.competition.id}/categorias/${team.category.id}/equipes/${team.id}`}
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
                Criar atleta
              </button>
            </div>
          </section>
        </form>
      )}

      <footer className="od-footer">
        <span>
          ONZEUP ORGANIZAÇÃO
        </span>

        <small>
          Cadastro de atleta da competição.
        </small>
      </footer>
    </div>
  );
}