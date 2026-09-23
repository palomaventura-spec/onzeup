import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date | null) {
  if (!value) {
    return "Não informada";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function statusLabel(
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "WITHDRAWN"
) {
  switch (status) {
    case "APPROVED":
      return "Aprovado";

    case "PENDING":
      return "Pendente";

    case "REJECTED":
      return "Rejeitado";

    case "WITHDRAWN":
      return "Retirado";

    default:
      return status;
  }
}

function sourceLabel(
  source: "MANUAL" | "CLUB_SHARED"
) {
  return source === "CLUB_SHARED"
    ? "Compartilhado pelo OnzeUp Club"
    : "Cadastro manual";
}

export default async function CompetitionAthletePage({
  params,
}: {
  params: Promise<{
    id: string;
    categoryId: string;
    teamId: string;
    athleteId: string;
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
    athleteId,
  } = await params;

  const athlete =
    await prisma.competitionAthlete.findFirst({
      where: {
        id: athleteId,
        teamId,

        team: {
          categoryId,
          competitionId: id,

          competition: {
            organizationId:
              user.organizationId,
          },
        },
      },

      include: {
        team: {
          include: {
            competition: true,
            category: true,
          },
        },

        sourceAthlete: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            organizationId: true,
          },
        },
      },
    });

  if (!athlete) {
    notFound();
  }

  const team = athlete.team;
  const competition = team.competition;
  const category = team.category;

  const athleteHref =
    `/organizador/competicoes/${competition.id}` +
    `/categorias/${category.id}` +
    `/equipes/${team.id}` +
    `/atletas/${athlete.id}`;

  const teamHref =
    `/organizador/competicoes/${competition.id}` +
    `/categorias/${category.id}` +
    `/equipes/${team.id}`;

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ONZEUP ORGANIZAÇÃO ·{" "}
            {competition.name} ·{" "}
            {category.name}
          </span>

          <h1>{athlete.name}</h1>

          <p className="od-date">
            {team.name} · Perfil do atleta
          </p>
        </div>

        <Link
          href={teamHref}
          className="card"
          style={{
            padding: "11px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Voltar à equipe
        </Link>
      </header>

      <section
        className="card od-panel"
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(130px, 170px) minmax(0, 1fr)",
          gap: 28,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            borderRadius: 20,
            overflow: "hidden",
            display: "grid",
            placeItems: "center",
            background:
              "var(--club-lime-soft, #eef7df)",
            border:
              "1px solid var(--line)",
            fontSize: 34,
            fontWeight: 900,
          }}
        >
          {athlete.photoUrl ? (
            <img
              src={athlete.photoUrl}
              alt={athlete.name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <span>
              {initials(athlete.name)}
            </span>
          )}
        </div>

        <div>
          <span className="od-eyebrow">
            ATLETA INSCRITO
          </span>

          <h2
            style={{
              marginTop: 6,
              marginBottom: 8,
              fontSize: 30,
            }}
          >
            {athlete.name}
          </h2>

          <p
            className="muted"
            style={{
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            {team.name} · {category.name}
            {athlete.jerseyNumber !== null
              ? ` · Nº ${athlete.jerseyNumber}`
              : ""}
            {athlete.position
              ? ` · ${athlete.position}`
              : ""}
          </p>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <span className="badge">
              {statusLabel(
                athlete.status
              )}
            </span>

            <span className="badge">
              {sourceLabel(
                athlete.source
              )}
            </span>
          </div>
        </div>
      </section>

      <section
        className="od-kpis"
        aria-label="Dados do atleta"
        style={{
          marginTop: 18,
        }}
      >
        <Link href={athleteHref}>
          <span className="od-kpi-icon">
            ◎
          </span>

          <small>NASCIMENTO</small>

          <strong
            style={{
              fontSize: 20,
            }}
          >
            {formatDate(
              athlete.birthDate
            )}
          </strong>

          <em>Data registrada</em>
        </Link>

        <Link href={teamHref}>
          <span className="od-kpi-icon">
            ◉
          </span>

          <small>EQUIPE</small>

          <strong
            style={{
              fontSize: 20,
            }}
          >
            {team.shortName ||
              team.name}
          </strong>

          <em>{team.name}</em>
        </Link>

        <Link
          href={`/organizador/competicoes/${competition.id}/categorias/${category.id}`}
        >
          <span className="od-kpi-icon">
            ◇
          </span>

          <small>CATEGORIA</small>

          <strong
            style={{
              fontSize: 20,
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
          href={`/organizador/competicoes/${competition.id}`}
        >
          <span className="od-kpi-icon">
            ◈
          </span>

          <small>COMPETIÇÃO</small>

          <strong
            style={{
              fontSize: 18,
            }}
          >
            {competition.name}
          </strong>

          <em>Ver competição →</em>
        </Link>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(310px, 1fr))",
          gap: 18,
          marginTop: 18,
        }}
      >
        <section className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                INSCRIÇÃO
              </span>

              <h2>
                Dados esportivos
              </h2>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: 18,
              marginTop: 22,
            }}
          >
            <div>
              <small className="muted">
                NOME
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 4,
                }}
              >
                {athlete.name}
              </strong>
            </div>

            <div>
              <small className="muted">
                NÚMERO
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 4,
                }}
              >
                {athlete.jerseyNumber ??
                  "Não informado"}
              </strong>
            </div>

            <div>
              <small className="muted">
                POSIÇÃO
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 4,
                }}
              >
                {athlete.position ||
                  "Não informada"}
              </strong>
            </div>

            <div>
              <small className="muted">
                ORIGEM
              </small>

              <strong
                style={{
                  display: "block",
                  marginTop: 4,
                }}
              >
                {sourceLabel(
                  athlete.source
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                CREDENCIAL
              </span>

              <h2>
                Carteirinha da competição
              </h2>
            </div>

            <span className="badge">
              EM PREPARAÇÃO
            </span>
          </div>

          <div
            style={{
              marginTop: 22,
              padding: 22,
              borderRadius: 16,
              border:
                "1px dashed var(--line)",
            }}
          >
            <strong
              style={{
                display: "block",
                marginBottom: 8,
              }}
            >
              Credencial ainda não emitida
            </strong>

            <p
              className="muted"
              style={{
                margin: 0,
                lineHeight: 1.7,
              }}
            >
              A carteirinha será liberada
              após a futura etapa de
              conferência documental da
              inscrição.
            </p>
          </div>
        </section>
      </div>

      {athlete.source ===
        "CLUB_SHARED" && (
        <section
          className="card od-panel"
          style={{
            marginTop: 18,
          }}
        >
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                ONZEUP CLUB
              </span>

              <h2>
                Cadastro vinculado
              </h2>
            </div>

            <span className="badge">
              VINCULADO
            </span>
          </div>

          <p
            className="muted"
            style={{
              marginTop: 16,
              lineHeight: 1.7,
            }}
          >
            Este atleta foi compartilhado
            por um clube que utiliza o
            ecossistema OnzeUp. Os dados
            desta inscrição permanecem
            registrados separadamente para
            preservar o histórico oficial
            da competição.
          </p>
        </section>
      )}

      <footer className="od-footer">
        <span>
          ONZEUP ORGANIZAÇÃO
        </span>

        <small>
          Perfil de atleta inscrito.
        </small>
      </footer>
    </div>
  );
}