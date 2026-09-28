import Link from "next/link";
import { notFound } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  createCompetitionDocumentRequirement,
  deleteCompetitionDocumentRequirement,
  toggleCompetitionDocumentRequirement,
} from "./actions";

export default async function CompetitionDocumentsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const user =
    await requireOrganizationUser();

  if (!user.organizationId) {
    notFound();
  }

  const { id } = await params;

  const competition =
    await prisma.competition.findFirst({
      where: {
        id,
        organizationId:
          user.organizationId,
      },

      include: {
        documentRequirements: {
          orderBy: [
            {
              sortOrder: "asc",
            },
            {
              name: "asc",
            },
          ],

          include: {
            _count: {
              select: {
                documents: true,
              },
            },
          },
        },
      },
    });

  if (!competition) {
    notFound();
  }

  const requirements =
    competition.documentRequirements;

  const activeCount =
    requirements.filter(
      (item) => item.active,
    ).length;

  const requiredCount =
    requirements.filter(
      (item) =>
        item.active &&
        item.required,
    ).length;

  const optionalCount =
    requirements.filter(
      (item) =>
        item.active &&
        !item.required,
    ).length;

  const documentsReceived =
    requirements.reduce(
      (total, item) =>
        total +
        item._count.documents,
      0,
    );

  return (
    <div className="od-dashboard">
      <header className="od-header">
        <div>
          <span className="od-eyebrow">
            ORGANIZAÇÃO · DOCUMENTAÇÃO
          </span>

          <h1>
            Documentos da competição
          </h1>

          <p className="od-date">
            {competition.name}
            {" · "}
            Defina os documentos exigidos
            para inscrição dos atletas.
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
          ← Competição
        </Link>
      </header>

      <section className="od-kpis">
        <article className="card">
          <small className="muted">
            CONFIGURADOS
          </small>

          <strong>
            {requirements.length}
          </strong>

          <span className="muted">
            requisitos documentais
          </span>
        </article>

        <article className="card">
          <small className="muted">
            ATIVOS
          </small>

          <strong>
            {activeCount}
          </strong>

          <span className="muted">
            em uso
          </span>
        </article>

        <article className="card">
          <small className="muted">
            OBRIGATÓRIOS
          </small>

          <strong>
            {requiredCount}
          </strong>

          <span className="muted">
            {optionalCount} opcional
            {optionalCount === 1
              ? ""
              : "is"}
          </span>
        </article>

        <article className="card">
          <small className="muted">
            RECEBIDOS
          </small>

          <strong>
            {documentsReceived}
          </strong>

          <span className="muted">
            arquivos vinculados
          </span>
        </article>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns:
            "minmax(0, 0.9fr) minmax(0, 1.4fr)",
          gap: 18,
          alignItems: "start",
        }}
      >
        <article className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                NOVO CADASTRO
              </span>

              <h2>
                Adicionar documento
              </h2>
            </div>
          </div>

          <p
            className="muted"
            style={{
              marginTop: 8,
              lineHeight: 1.55,
            }}
          >
            Cadastre um documento previsto
            pelo regulamento ou exigido para
            validar a inscrição do atleta.
          </p>

          <form
            action={createCompetitionDocumentRequirement.bind(
              null,
              competition.id,
            )}
            style={{
              display: "grid",
              gap: 14,
              marginTop: 22,
            }}
          >
            <label
              style={{
                display: "grid",
                gap: 6,
              }}
            >
              <strong>
                Nome do documento
              </strong>

              <input
                name="name"
                required
                minLength={2}
                placeholder="Nome do documento"
              />
            </label>

            <label
              style={{
                display: "grid",
                gap: 6,
              }}
            >
              <strong>
                Orientações
              </strong>

              <textarea
                name="description"
                rows={4}
                placeholder="Orientações para envio e validação"
              />
            </label>

            <label
              className="card"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 13,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                name="required"
                defaultChecked
              />

              <span>
                <strong
                  style={{
                    display: "block",
                  }}
                >
                  Documento obrigatório
                </strong>

                <small className="muted">
                  A inscrição ficará
                  documentalmente incompleta
                  enquanto ele não for
                  aprovado.
                </small>
              </span>
            </label>

            <button
              type="submit"
              className="od-action-primary"
            >
              Adicionar documento
            </button>
          </form>
        </article>

        <article className="card od-panel">
          <div className="od-panel-head">
            <div>
              <span className="od-eyebrow">
                REQUISITOS
              </span>

              <h2>
                Documentação exigida
              </h2>
            </div>

            <span className="badge">
              {requirements.length}
            </span>
          </div>

          {requirements.length ? (
            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 20,
              }}
            >
              {requirements.map(
                (requirement) => (
                  <div
                    key={
                      requirement.id
                    }
                    className="card"
                    style={{
                      padding: 16,
                      display: "grid",
                      gap: 13,
                      opacity:
                        requirement.active
                          ? 1
                          : 0.65,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 16,
                        alignItems:
                          "flex-start",
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
                          <span
                            className="badge"
                          >
                            {requirement.required
                              ? "Obrigatório"
                              : "Opcional"}
                          </span>

                          <span
                            className="badge"
                          >
                            {requirement.active
                              ? "Ativo"
                              : "Inativo"}
                          </span>
                        </div>

                        <strong
                          style={{
                            fontSize: 16,
                          }}
                        >
                          {
                            requirement.name
                          }
                        </strong>

                        {requirement.description ? (
                          <p
                            className="muted"
                            style={{
                              margin:
                                "6px 0 0",
                              lineHeight:
                                1.5,
                            }}
                          >
                            {
                              requirement.description
                            }
                          </p>
                        ) : null}
                      </div>

                      <strong>
                        {
                          requirement
                            ._count
                            .documents
                        }
                      </strong>
                    </div>

                    <div
                      style={{
                        borderTop:
                          "1px solid var(--line)",
                        paddingTop: 12,
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems:
                          "center",
                      }}
                    >
                      <small className="muted">
                        {
                          requirement
                            ._count
                            .documents
                        }{" "}
                        documento
                        {requirement
                          ._count
                          .documents === 1
                          ? ""
                          : "s"}{" "}
                        recebido
                        {requirement
                          ._count
                          .documents === 1
                          ? ""
                          : "s"}
                      </small>

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <form
                          action={toggleCompetitionDocumentRequirement.bind(
                            null,
                            competition.id,
                            requirement.id,
                          )}
                        >
                          <button
                            type="submit"
                          >
                            {requirement.active
                              ? "Desativar"
                              : "Ativar"}
                          </button>
                        </form>

                        {requirement
                          ._count
                          .documents ===
                        0 ? (
                          <form
                            action={deleteCompetitionDocumentRequirement.bind(
                              null,
                              competition.id,
                              requirement.id,
                            )}
                          >
                            <button
                              type="submit"
                            >
                              Excluir
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="od-empty">
              <strong>
                Nenhum documento configurado
              </strong>

              <span>
                Adicione os documentos que a
                competição exige para validar
                as inscrições dos atletas.
              </span>
            </div>
          )}
        </article>
      </section>

      <footer className="od-footer">
        <small>
          Requisitos documentais da
          competição.
        </small>
      </footer>
    </div>
  );
}