import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function yearRange(
  from: number | null,
  to: number | null
) {
  if (!from && !to) {
    return "Ano de nascimento não definido";
  }

  if (from && to && from === to) {
    return `Nascidos em ${from}`;
  }

  if (from && to) {
    return `Nascidos entre ${from} e ${to}`;
  }

  if (from) {
    return `A partir de ${from}`;
  }

  return `Até ${to}`;
}

function teamStatusLabel(status: string) {
  if (status === "APPROVED") return "Aprovada";
  if (status === "REJECTED") return "Rejeitada";
  if (status === "WITHDRAWN") return "Desistiu";

  return "Pendente";
}

export default async function CompetitionCategoryPage({
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
        competition: true,

        teams: {
          orderBy: {
            name: "asc",
          },
        },
      },
    });

  if (!category) {
    notFound();
  }

  const teamCount = category.teams.length;

  const availableSpots =
    category.maxTeams !== null
      ? Math.max(
          category.maxTeams - teamCount,
          0
        )
      : null;

  const operationalWindow =
    category.matchDurationMinutes +
    category.transitionMinutes;

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ORGANIZAÇÃO ·{" "}
            {category.competition.name}
          </span>

          <h1>{category.name}</h1>

          <p className="od-date">
            {yearRange(
              category.birthYearFrom,
              category.birthYearTo
            )}
          </p>
        </div>

        <Link
          href={`/organizador/competicoes/${id}/categorias`}
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

      <nav
        className="od-quick-actions"
        aria-label="Ações da categoria"
      >
        <Link
          className="od-action-primary"
          href={`/organizador/competicoes/${id}/categorias/${category.id}/equipes/nova`}
        >
          ＋ Adicionar equipe
        </Link>

        <Link
          href={`/organizador/competicoes/${id}/categorias`}
        >
          Ver categorias
        </Link>
      </nav>

      <section
        className="od-kpis"
        aria-label="Indicadores da categoria"
      >
        <Link
          href={`/organizador/competicoes/${id}/categorias/${category.id}`}
        >
          <span className="od-kpi-icon">
            ◎
          </span>

          <small>EQUIPES</small>

          <strong>{teamCount}</strong>

          <em>Cadastradas</em>
        </Link>

        <Link
          href={`/organizador/competicoes/${id}/categorias/${category.id}`}
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
            {category.maxTeams
              ? `de ${category.maxTeams} equipes`
              : "Sem limite definido"}
          </em>
        </Link>

        <Link
          href={`/organizador/competicoes/${id}/categorias/${category.id}`}
        >
          <span className="od-kpi-icon">
            ◇
          </span>

          <small>ELENCO</small>

          <strong>
            {category.rosterLimit ?? "—"}
          </strong>

          <em>
            {category.rosterLimit
              ? "Atletas por equipe"
              : "Sem limite definido"}
          </em>
        </Link>

        <Link
          href={`/organizador/competicoes/${id}/categorias/${category.id}`}
        >
          <span className="od-kpi-icon">
            ◈
          </span>

          <small>JANELA DE JOGO</small>

          <strong>
            {operationalWindow} min
          </strong>

          <em>
            {category.matchDurationMinutes} +{" "}
            {category.transitionMinutes}
          </em>
        </Link>
      </section>

      <section
        className="card od-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="od-panel-head">
          <div>
            <span className="od-eyebrow">
              EQUIPES
            </span>

            <h2>
              Equipes cadastradas
            </h2>
          </div>

          <span className="muted">
            {teamCount} equipe
            {teamCount === 1 ? "" : "s"}
          </span>
        </div>

        {category.teams.length ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 20,
            }}
          >
            {category.teams.map(
              (team, index) => (
                <Link
                  key={team.id}
                  href={`/organizador/competicoes/${id}/categorias/${category.id}/equipes/${team.id}`}
                  className="card"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "52px minmax(220px, 1fr) 160px 180px 120px 90px",
                    gap: 18,
                    alignItems: "center",
                    padding: 18,
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      background:
                        "rgba(157, 219, 22, .14)",
                    }}
                  >
                    {index + 1}
                  </div>

                  <div>
                    <strong
                      style={{
                        display: "block",
                        fontSize: 18,
                      }}
                    >
                      {team.name}
                    </strong>

                    <span
                      className="muted"
                      style={{
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      {team.shortName ||
                        "Sigla não informada"}
                    </span>
                  </div>

                  <div>
                    <small className="muted">
                      LOCALIDADE
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      {team.city || "—"}
                      {team.state
                        ? ` / ${team.state}`
                        : ""}
                    </strong>
                  </div>

                  <div>
                    <small className="muted">
                      RESPONSÁVEL
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      {team.responsibleName ||
                        "Não informado"}
                    </strong>
                  </div>

                  <div>
                    <small className="muted">
                      STATUS
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 4,
                      }}
                    >
                      {teamStatusLabel(
                        team.status
                      )}
                    </strong>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Abrir →
                  </div>
                </Link>
              )
            )}
          </div>
        ) : (
          <div className="od-empty">
            <strong>
              Nenhuma equipe cadastrada
            </strong>

            <span>
              Esta categoria ainda não possui
              equipes inscritas.
            </span>

            <Link
              href={`/organizador/competicoes/${id}/categorias/${category.id}/equipes/nova`}
            >
              Adicionar primeira equipe
            </Link>
          </div>
        )}
      </section>

      <section
        className="card od-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div className="od-panel-head">
          <div>
            <span className="od-eyebrow">
              CONFIGURAÇÃO
            </span>

            <h2>
              Dados da categoria
            </h2>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 20,
            marginTop: 22,
          }}
        >
          <div>
            <small className="muted">
              CÓDIGO
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {category.code || "—"}
            </strong>
          </div>

          <div>
            <small className="muted">
              NASCIMENTO
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {yearRange(
                category.birthYearFrom,
                category.birthYearTo
              )}
            </strong>
          </div>

          <div>
            <small className="muted">
              LIMITE DE EQUIPES
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {category.maxTeams ??
                "Sem limite"}
            </strong>
          </div>

          <div>
            <small className="muted">
              ATLETAS / EQUIPE
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {category.rosterLimit ??
                "Sem limite"}
            </strong>
          </div>

          <div>
            <small className="muted">
              DURAÇÃO
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {category.matchDurationMinutes} min
            </strong>
          </div>

          <div>
            <small className="muted">
              TRANSIÇÃO
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {category.transitionMinutes} min
            </strong>
          </div>
        </div>
      </section>

      <footer className="od-footer">
        <Image
          src="/brand/11up/logos/11up-logo-transparent-dark.svg"
          alt="11UP"
          width={82}
          height={32}
        />

        <small>
          Gestão da categoria e equipes.
        </small>
      </footer>
    </div>
  );
}