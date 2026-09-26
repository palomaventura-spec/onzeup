import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

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

function teamStatusLabel(
  status:
    | "PENDING"
    | "APPROVED"
    | "REJECTED"
    | "WITHDRAWN"
) {
  switch (status) {
    case "APPROVED":
      return "Aprovada";

    case "PENDING":
      return "Pendente";

    case "REJECTED":
      return "Rejeitada";

    case "WITHDRAWN":
      return "Retirada";

    default:
      return status;
  }
}

function athleteStatusLabel(
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

function athleteSourceLabel(
  source: "MANUAL" | "CLUB_SHARED"
) {
  return source === "CLUB_SHARED"
    ? "11UP Club"
    : "Manual";
}

export default async function CompetitionTeamPage({
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
        competition: true,
        category: true,

        athletes: {
          orderBy: {
            name: "asc",
          },
        },
      },
    });

  if (!team) {
    notFound();
  }

  const athleteCount =
    team.athletes.length;

  const rosterLimit =
    team.category.rosterLimit;

  const availableSpots =
    rosterLimit !== null
      ? Math.max(
          rosterLimit - athleteCount,
          0
        )
      : null;

  const categoryHref =
    `/organizador/competicoes/${team.competition.id}` +
    `/categorias/${team.category.id}`;

  const teamHref =
    `${categoryHref}/equipes/${team.id}`;

  const newAthleteHref =
    `${teamHref}/atletas/nova`;

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ORGANIZAÇÃO ·{" "}
            {team.competition.name} ·{" "}
            {team.category.name}
          </span>

          <h1>{team.name}</h1>

          <p className="od-date">
            Gestão da equipe participante
          </p>
        </div>

        <Link
          href={categoryHref}
          className="card"
          style={{
            padding: "11px 16px",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Voltar à categoria
        </Link>
      </header>

      <section
        className="od-kpis"
        aria-label="Indicadores da equipe"
      >
        <Link href={teamHref}>
          <span className="od-kpi-icon">
            ◎
          </span>

          <small>ATLETAS</small>

          <strong>
            {athleteCount}
          </strong>

          <em>
            Inscritos na equipe
          </em>
        </Link>

        <Link href={teamHref}>
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
            {rosterLimit !== null
              ? `Limite de ${rosterLimit}`
              : "Sem limite definido"}
          </em>
        </Link>

        <Link href={categoryHref}>
          <span className="od-kpi-icon">
            ◇
          </span>

          <small>CATEGORIA</small>

          <strong
            style={{
              fontSize: 20,
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

          <small>STATUS</small>

          <strong
            style={{
              fontSize: 20,
            }}
          >
            {teamStatusLabel(
              team.status
            )}
          </strong>

          <em>
            Inscrição da equipe
          </em>
        </Link>
      </section>

      {/* NOVO CADASTRO */}
      <section
        className="card od-panel"
        style={{
          marginTop: 24,
        }}
      >
        <div
          className="od-panel-head"
          style={{
            alignItems: "center",
          }}
        >
          <div>
            <span className="od-eyebrow">
              NOVO CADASTRO
            </span>

            <h2>
              Adicionar atleta
            </h2>

            <p
              className="muted"
              style={{
                marginTop: 7,
                marginBottom: 0,
              }}
            >
              Cadastre um atleta no elenco
              desta equipe participante.
            </p>
          </div>

          {rosterLimit === null ||
          athleteCount < rosterLimit ? (
            <Link
              href={newAthleteHref}
              className="od-action-primary"
              style={{
                padding: "12px 18px",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              + Adicionar atleta
            </Link>
          ) : (
            <span className="badge">
              ELENCO COMPLETO
            </span>
          )}
        </div>
      </section>

      {/* ATLETAS */}
      <section
        className="card od-panel"
        style={{
          marginTop: 18,
        }}
      >
        <div className="od-panel-head">
          <div>
            <span className="od-eyebrow">
              ELENCO
            </span>

            <h2>
              Atletas inscritos
            </h2>
          </div>

          <span className="muted">
            {athleteCount}
            {rosterLimit !== null
              ? ` / ${rosterLimit}`
              : ""}{" "}
            {athleteCount === 1
              ? "atleta"
              : "atletas"}
          </span>
        </div>

        {team.athletes.length ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              marginTop: 24,
            }}
          >
            {team.athletes.map(
              (athlete, index) => {
                const athleteHref =
                  `${teamHref}/atletas/${athlete.id}`;

                return (
                  <Link
                    key={athlete.id}
                    href={athleteHref}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "64px minmax(180px, 1.6fr) minmax(120px, .85fr) minmax(70px, .55fr) minmax(100px, .8fr) minmax(100px, .8fr) minmax(90px, .7fr) auto",
                      alignItems: "center",
                      gap: 18,
                      padding: "16px 18px",
                      border:
                        "1px solid var(--line)",
                      borderRadius: 16,
                      textDecoration: "none",
                      color: "inherit",
                      background:
                        "var(--surface, #fff)",
                    }}
                  >
                    {/* FOTO */}
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 14,
                        overflow: "hidden",
                        display: "grid",
                        placeItems: "center",
                        background:
                          "var(--club-lime-soft, #eef7df)",
                        fontWeight: 900,
                      }}
                    >
                      {athlete.photoUrl ? (
                        <img
                          src={
                            athlete.photoUrl
                          }
                          alt={
                            athlete.name
                          }
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit:
                              "cover",
                          }}
                        />
                      ) : (
                        <span>
                          {initials(
                            athlete.name
                          )}
                        </span>
                      )}
                    </div>

                    {/* NOME */}
                    <div>
                      <strong
                        style={{
                          display:
                            "block",
                          fontSize: 16,
                        }}
                      >
                        {athlete.name}
                      </strong>

                      <span
                        className="muted"
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                          fontSize: 12,
                        }}
                      >
                        Atleta{" "}
                        {index + 1}
                      </span>
                    </div>

                    {/* NASCIMENTO */}
                    <div>
                      <small className="muted">
                        NASCIMENTO
                      </small>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                        }}
                      >
                        {formatDate(
                          athlete.birthDate
                        )}
                      </strong>
                    </div>

                    {/* NÚMERO */}
                    <div>
                      <small className="muted">
                        Nº
                      </small>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                        }}
                      >
                        {athlete.jerseyNumber ??
                          "—"}
                      </strong>
                    </div>

                    {/* POSIÇÃO */}
                    <div>
                      <small className="muted">
                        POSIÇÃO
                      </small>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                        }}
                      >
                        {athlete.position ||
                          "—"}
                      </strong>
                    </div>

                    {/* ORIGEM */}
                    <div>
                      <small className="muted">
                        ORIGEM
                      </small>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                        }}
                      >
                        {athleteSourceLabel(
                          athlete.source
                        )}
                      </strong>
                    </div>

                    {/* STATUS */}
                    <div>
                      <small className="muted">
                        STATUS
                      </small>

                      <strong
                        style={{
                          display:
                            "block",
                          marginTop: 4,
                        }}
                      >
                        {athleteStatusLabel(
                          athlete.status
                        )}
                      </strong>
                    </div>

                    <strong
                      style={{
                        whiteSpace:
                          "nowrap",
                      }}
                    >
                      Abrir →
                    </strong>
                  </Link>
                );
              }
            )}
          </div>
        ) : (
          <div
            className="od-empty"
            style={{
              marginTop: 22,
            }}
          >
            <strong>
              Nenhum atleta cadastrado
            </strong>

            <span>
              Adicione o primeiro atleta ao
              elenco desta equipe.
            </span>

            <Link
              href={newAthleteHref}
            >
              + Adicionar atleta
            </Link>
          </div>
        )}
      </section>

      {/* DADOS DA EQUIPE */}
      <section
        className="card od-panel"
        style={{
          marginTop: 18,
        }}
      >
        <div className="od-panel-head">
          <div>
            <span className="od-eyebrow">
              EQUIPE
            </span>

            <h2>
              Dados da inscrição
            </h2>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 24,
            marginTop: 24,
          }}
        >
          <div>
            <small className="muted">
              NOME
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {team.name}
            </strong>
          </div>

          <div>
            <small className="muted">
              SIGLA
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {team.shortName ||
                "Não informada"}
            </strong>
          </div>

          <div>
            <small className="muted">
              LOCALIDADE
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {[
                team.city,
                team.state,
              ]
                .filter(Boolean)
                .join(" / ") ||
                "Não informada"}
            </strong>
          </div>

          <div>
            <small className="muted">
              RESPONSÁVEL
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {team.responsibleName ||
                "Não informado"}
            </strong>
          </div>

          <div>
            <small className="muted">
              CONTATO
            </small>

            <strong
              style={{
                display: "block",
                marginTop: 5,
              }}
            >
              {team.responsiblePhone ||
                team.responsibleEmail ||
                "Não informado"}
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
          Gestão da equipe participante.
        </small>
      </footer>
    </div>
  );
}