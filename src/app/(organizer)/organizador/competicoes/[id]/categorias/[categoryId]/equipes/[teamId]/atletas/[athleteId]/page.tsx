import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DocumentUpload from "@/components/DocumentUpload";
import {
  reviewCompetitionAthleteDocument,
  submitCompetitionAthleteDocument,
} from "./actions";

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
    ? "Compartilhado pelo 11UP Club"
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
  const [
    documentRequirements,
    athleteDocuments,
    credential,
  ] = await Promise.all([
    prisma.competitionDocumentRequirement.findMany({
      where: {
        competitionId: competition.id,
        active: true,
      },

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    }),

    prisma.competitionAthleteDocument.findMany({
      where: {
        athleteId: athlete.id,

        requirement: {
          competitionId: competition.id,
        },
      },

      orderBy: [
        {
          submittedAt: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    }),

    prisma.competitionAthleteCredential.findUnique({
      where: {
        athleteId: athlete.id,
      },
    }),
  ]);

  const latestDocuments =
    new Map<
      string,
      (typeof athleteDocuments)[number]
    >();

  for (const document of athleteDocuments) {
    if (
      !latestDocuments.has(
        document.requirementId,
      )
    ) {
      latestDocuments.set(
        document.requirementId,
        document,
      );
    }
  }

  const requiredRequirements =
    documentRequirements.filter(
      (requirement) =>
        requirement.required,
    );

  const approvedRequiredCount =
    requiredRequirements.filter(
      (requirement) =>
        athleteDocuments.some(
          (document) =>
            document.requirementId ===
              requirement.id &&
            document.status ===
              "APPROVED",
        ),
    ).length;

  const documentationComplete =
    requiredRequirements.length === 0 ||
    approvedRequiredCount ===
      requiredRequirements.length;

  const documentStatusLabel = (
    status:
      | "PENDING"
      | "UNDER_REVIEW"
      | "APPROVED"
      | "REJECTED",
  ) => {
    switch (status) {
      case "PENDING":
        return "Pendente";

      case "UNDER_REVIEW":
        return "Em análise";

      case "APPROVED":
        return "Aprovado";

      case "REJECTED":
        return "Rejeitado";

      default:
        return status;
    }
  };

  const credentialStatusLabel = (
    status:
      | "DRAFT"
      | "ACTIVE"
      | "SUSPENDED"
      | "EXPIRED"
      | "REVOKED",
  ) => {
    switch (status) {
      case "DRAFT":
        return "Em preparação";

      case "ACTIVE":
        return "Liberada";

      case "SUSPENDED":
        return "Suspensa";

      case "EXPIRED":
        return "Expirada";

      case "REVOKED":
        return "Revogada";

      default:
        return status;
    }
  };

  const documentScope = {
    competitionId: competition.id,
    categoryId: category.id,
    teamId: team.id,
    athleteId: athlete.id,
  };

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
            ORGANIZAÇÃO ·{" "}
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
                DOCUMENTAÇÃO
              </span>

              <h2>
                Conferência documental
              </h2>
            </div>

            <span className="badge">
              {approvedRequiredCount}/
              {requiredRequirements.length} obrigatórios
            </span>
          </div>

          {documentRequirements.length ? (
            <div
              style={{
                display: "grid",
                gap: 14,
                marginTop: 22,
              }}
            >
              {documentRequirements.map(
                (requirement) => {
                  const latestDocument =
                    latestDocuments.get(
                      requirement.id,
                    );

                  return (
                    <div
                      key={requirement.id}
                      className="card"
                      style={{
                        padding: 16,
                        display: "grid",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems:
                            "flex-start",
                          gap: 14,
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div
                            style={{
                              display: "flex",
                              gap: 7,
                              flexWrap: "wrap",
                              marginBottom: 6,
                            }}
                          >
                            <span className="badge">
                              {requirement.required
                                ? "Obrigatório"
                                : "Opcional"}
                            </span>

                            {latestDocument ? (
                              <span className="badge">
                                {documentStatusLabel(
                                  latestDocument.status,
                                )}
                              </span>
                            ) : (
                              <span className="badge">
                                Não enviado
                              </span>
                            )}
                          </div>

                          <strong>
                            {requirement.name}
                          </strong>

                          {requirement.description ? (
                            <p
                              className="muted"
                              style={{
                                margin:
                                  "5px 0 0",
                                lineHeight: 1.5,
                              }}
                            >
                              {
                                requirement.description
                              }
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {latestDocument ? (
                        <div
                          style={{
                            display: "grid",
                            gap: 12,
                            borderTop:
                              "1px solid var(--line)",
                            paddingTop: 13,
                          }}
                        >
                          <div>
                            <small className="muted">
                              ÚLTIMO ENVIO
                            </small>

                            <strong
                              style={{
                                display: "block",
                                marginTop: 4,
                              }}
                            >
                              {latestDocument.fileName ||
                                "Documento"}
                            </strong>
                          </div>

                          <a
                            href={`/api/document-file?id=${latestDocument.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary"
                            style={{
                              textDecoration: "none",
                              width: "fit-content",
                            }}
                          >
                            Abrir documento
                          </a>

                          {latestDocument.reviewNotes ? (
                            <div
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border:
                                  "1px solid var(--line)",
                              }}
                            >
                              <small className="muted">
                                OBSERVAÇÃO DA ANÁLISE
                              </small>

                              <p
                                style={{
                                  margin:
                                    "5px 0 0",
                                }}
                              >
                                {
                                  latestDocument.reviewNotes
                                }
                              </p>
                            </div>
                          ) : null}

                          <form
                            action={reviewCompetitionAthleteDocument.bind(
                              null,
                              documentScope,
                              latestDocument.id,
                            )}
                            style={{
                              display: "grid",
                              gap: 10,
                            }}
                          >
                            <label
                              style={{
                                display: "grid",
                                gap: 6,
                              }}
                            >
                              <strong>
                                Situação
                              </strong>

                              <select
                                name="status"
                                defaultValue={
                                  latestDocument.status ===
                                  "PENDING"
                                    ? "UNDER_REVIEW"
                                    : latestDocument.status
                                }
                              >
                                <option value="UNDER_REVIEW">
                                  Em análise
                                </option>

                                <option value="APPROVED">
                                  Aprovar
                                </option>

                                <option value="REJECTED">
                                  Rejeitar
                                </option>
                              </select>
                            </label>

                            <label
                              style={{
                                display: "grid",
                                gap: 6,
                              }}
                            >
                              <strong>
                                Observação
                              </strong>

                              <textarea
                                name="reviewNotes"
                                rows={3}
                                defaultValue={
                                  latestDocument.reviewNotes ||
                                  ""
                                }
                                placeholder="Observação da conferência"
                              />
                            </label>

                            <button
                              type="submit"
                              className="od-action-primary"
                            >
                              Salvar análise
                            </button>
                          </form>
                        </div>
                      ) : null}

                      <form
                        action={submitCompetitionAthleteDocument.bind(
                          null,
                          documentScope,
                          requirement.id,
                        )}
                        style={{
                          display: "grid",
                          gap: 12,
                          borderTop:
                            "1px solid var(--line)",
                          paddingTop: 13,
                        }}
                      >
                        <DocumentUpload
                          name="fileUrl"
                          pathnameName="pathname"
                          fileNameName="fileName"
                          mimeTypeName="mimeType"
                          label={
                            latestDocument
                              ? "Enviar nova versão"
                              : "Enviar documento"
                          }
                          purpose="competition-athlete-document"
                        />

                        <button
                          type="submit"
                          className="od-action-primary"
                        >
                          {latestDocument
                            ? "Enviar nova versão"
                            : "Salvar documento"}
                        </button>
                      </form>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="od-empty">
              <strong>
                Nenhum requisito documental configurado
              </strong>

              <span>
                Configure primeiro os documentos exigidos
                nesta competição.
              </span>

              <Link
                href={`/organizador/competicoes/${competition.id}/documentos`}
              >
                Configurar documentos
              </Link>
            </div>
          )}
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
              {credential
                ? credentialStatusLabel(
                    credential.status,
                  )
                : documentationComplete
                  ? "Aguardando emissão"
                  : "Documentação pendente"}
            </span>
          </div>

          <div
            style={{
              marginTop: 22,
              padding: 22,
              borderRadius: 16,
              border:
                credential?.status === "ACTIVE"
                  ? "1px solid var(--line)"
                  : "1px dashed var(--line)",
            }}
          >
            {credential?.status ===
            "ACTIVE" ? (
              <div
                style={{
                  display: "grid",
                  gap: 16,
                }}
              >
                <div>
                  <small className="muted">
                    CÓDIGO DA CREDENCIAL
                  </small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 5,
                      fontSize: 20,
                    }}
                  >
                    {credential.code ||
                      "Código não informado"}
                  </strong>
                </div>

                <div>
                  <small className="muted">
                    EMITIDA EM
                  </small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: 5,
                    }}
                  >
                    {credential.issuedAt
                      ? formatDate(
                          credential.issuedAt,
                        )
                      : "Não informada"}
                  </strong>
                </div>

                <p
                  className="muted"
                  style={{
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  Documentação obrigatória aprovada.
                  A credencial está liberada para uso
                  interno da competição.
                </p>
              </div>
            ) : (
              <div>
                <strong
                  style={{
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  {requiredRequirements.length === 0
                    ? "Sem documentos obrigatórios pendentes"
                    : `${approvedRequiredCount} de ${requiredRequirements.length} documentos obrigatórios aprovados`}
                </strong>

                <p
                  className="muted"
                  style={{
                    margin: 0,
                    lineHeight: 1.7,
                  }}
                >
                  {documentationComplete
                    ? "A documentação obrigatória está completa. A credencial será preparada pelo fluxo de emissão."
                    : "A carteirinha será liberada automaticamente quando todos os documentos obrigatórios ativos forem aprovados."}
                </p>
              </div>
            )}
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
                11UP CLUB
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
            ecossistema 11UP. Os dados
            desta inscrição permanecem
            registrados separadamente para
            preservar o histórico oficial
            da competição.
          </p>
        </section>
      )}

      <footer className="od-footer">
        <Image
          src="/brand/11up/logos/11up-logo-transparent-dark.svg"
          alt="11UP"
          width={82}
          height={32}
        />

        <small>
          Perfil de atleta inscrito.
        </small>
      </footer>
    </div>
  );
}