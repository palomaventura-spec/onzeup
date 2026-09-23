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

export default async function CompetitionCategoriesPage({
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

    include: {
      categories: {
        include: {
          _count: {
            select: {
              teams: true,
            },
          },
        },

        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            name: "asc",
          },
        ],
      },
    },
  });

  if (!competition) {
    notFound();
  }

  const totalTeams = competition.categories.reduce(
    (total, category) =>
      total + category._count.teams,
    0
  );

  const activeCategories =
    competition.categories.filter(
      (category) => category.active
    ).length;

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ONZEUP ORGANIZAÇÃO ·{" "}
            {competition.name}
          </span>

          <h1>Categorias</h1>

          <p className="od-date">
            Organize as categorias esportivas da competição.
          </p>
        </div>

        <Link
          href={`/organizador/competicoes/${competition.id}`}
          className="card"
          style={{
            padding: "11px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Voltar à competição
        </Link>
      </header>

      <section
        className="od-kpis"
        aria-label="Indicadores das categorias"
      >
        <Link
          href={`/organizador/competicoes/${competition.id}/categorias`}
        >
          <span className="od-kpi-icon">
            ◎
          </span>

          <small>CATEGORIAS</small>

          <strong>
            {competition.categories.length}
          </strong>

          <em>Cadastradas</em>
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}/equipes`}
        >
          <span className="od-kpi-icon">
            ◉
          </span>

          <small>EQUIPES</small>

          <strong>{totalTeams}</strong>

          <em>Inscritas na competição</em>
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}/categorias`}
        >
          <span className="od-kpi-icon">
            ◇
          </span>

          <small>ATIVAS</small>

          <strong>
            {activeCategories}
          </strong>

          <em>Disponíveis</em>
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}`}
        >
          <span className="od-kpi-icon">
            ◈
          </span>

          <small>MODALIDADE</small>

          <strong
            style={{
              fontSize: 20,
            }}
          >
            {competition.sport === "FUTSAL"
              ? "Futsal"
              : competition.sport === "FOOTBALL"
                ? "Futebol"
                : "Ambos"}
          </strong>

          <em>Competição atual</em>
        </Link>
      </section>

      <section
        className="card od-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
            padding: "4px 20px",
          }}
        >
          <div>
            <span className="od-eyebrow">
              NOVO CADASTRO
            </span>

            <h2
              style={{
                marginTop: 8,
                marginBottom: 6,
              }}
            >
              Adicionar categoria
            </h2>

            <p
              className="muted"
              style={{
                margin: 0,
              }}
            >
              Cadastre uma nova categoria,
              defina faixa etária, limite de
              equipes e configuração das partidas.
            </p>
          </div>

          <Link
            href={`/organizador/competicoes/${competition.id}/categorias/nova`}
            className="od-action-primary"
            style={{
              textDecoration: "none",
              padding: "14px 22px",
              whiteSpace: "nowrap",
              fontWeight: 800,
            }}
          >
            ＋ Nova categoria
          </Link>
        </div>
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
              CATEGORIAS
            </span>

            <h2>
              Categorias cadastradas
            </h2>
          </div>

          <span className="muted">
            {competition.categories.length}{" "}
            categoria
            {competition.categories.length === 1
              ? ""
              : "s"}
          </span>
        </div>

        {competition.categories.length ? (
          <div
            style={{
              display: "grid",
              gap: 14,
              marginTop: 20,
            }}
          >
            {competition.categories.map(
              (category, index) => (
                <Link
                  key={category.id}
                  href={`/organizador/competicoes/${competition.id}/categorias/${category.id}`}
                  className="card"
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "52px minmax(240px, 1.4fr) minmax(150px, .6fr) 110px",
                    gap: 20,
                    alignItems: "center",
                    padding: 20,
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
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
                    <small
                      className="od-eyebrow"
                      style={{
                        display: "block",
                        marginBottom: 5,
                      }}
                    >
                      {category.code ||
                        "CATEGORIA"}
                    </small>

                    <strong
                      style={{
                        display: "block",
                        fontSize: 20,
                      }}
                    >
                      {category.name}
                    </strong>

                    <span
                      className="muted"
                      style={{
                        display: "block",
                        marginTop: 5,
                      }}
                    >
                      {yearRange(
                        category.birthYearFrom,
                        category.birthYearTo
                      )}
                    </span>
                  </div>

                  <div>
                    <small className="muted">
                      EQUIPES CADASTRADAS
                    </small>

                    <strong
                      style={{
                        display: "block",
                        fontSize: 25,
                        marginTop: 5,
                      }}
                    >
                      {category._count.teams}
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
              Nenhuma categoria cadastrada
            </strong>

            <span>
              Crie a primeira categoria para
              começar a organizar as equipes da
              competição.
            </span>

            <Link
              href={`/organizador/competicoes/${competition.id}/categorias/nova`}
            >
              Criar primeira categoria
            </Link>
          </div>
        )}
      </section>

      <footer className="od-footer">
        <span>ONZEUP ORGANIZAÇÃO</span>

        <small>
          Estrutura esportiva da competição.
        </small>
      </footer>
    </div>
  );
}