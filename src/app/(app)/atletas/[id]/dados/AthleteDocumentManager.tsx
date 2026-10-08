"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DocumentItem = {
  id: string;
  title: string;
  originalFileName: string;
  categoryLabel: string;
  subjectLabel: string;
  subject: "ATHLETE" | "GUARDIAN";
  requirementId: string | null;
  requirementLabelSnapshot: string | null;
  status: string;
  sizeLabel: string;
  createdAtLabel: string;
  issuedAt: string;
  expiresAt: string;
  rejectionReason: string | null;
};

type DocumentRequirementOption = {
  id: string;
  label: string;
  subject: "ATHLETE" | "GUARDIAN";
  status: string;
};

const statusLabels: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Rejeitado",
  EXPIRED: "Vencido",
  ARCHIVED: "Arquivado",
};

export default function AthleteDocumentManager({
  documents,
  documentRequirements,
}: {
  documents: DocumentItem[];
  documentRequirements: DocumentRequirementOption[];
}) {
  const router = useRouter();

  const [dates, setDates] = useState<
    Record<string, { issuedAt: string; expiresAt: string }>
  >(
    Object.fromEntries(
      documents.map((item) => [
        item.id,
        {
          issuedAt: item.issuedAt,
          expiresAt: item.expiresAt,
        },
      ])
    )
  );

  const [requirementSelections, setRequirementSelections] = useState<
    Record<string, string>
  >(
    Object.fromEntries(
      documents.map((document) => [
        document.id,
        document.requirementId ?? "",
      ])
    )
  );

  const [linkingDocumentId, setLinkingDocumentId] =
    useState<string | null>(null);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function update(
    documentId: string,
    action: string,
    rejectionReason?: string
  ) {
    setBusy(documentId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/athlete-documents/${documentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            ...dates[documentId],
            rejectionReason,
          }),
        }
      );

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível atualizar."
        );
      }

      const successMessages: Record<string, string> = {
        UPDATE_DATES:
          "Datas do documento atualizadas com sucesso.",
        APPROVE:
          "Documento aprovado com sucesso.",
        REJECT:
          "Documento rejeitado. O motivo foi registrado.",
        ARCHIVE:
          "Documento arquivado com sucesso.",
      };

      setMessage(
        successMessages[action] ||
          "Documento atualizado com sucesso."
      );

      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível atualizar."
      );
    } finally {
      setBusy(null);
    }
  }

  async function linkRequirement(documentId: string) {
    const requirementId =
      requirementSelections[documentId] ?? "";

    if (!requirementId) {
      setError(
        "Selecione um documento obrigatório para vincular."
      );
      setMessage("");
      return;
    }

    setBusy(documentId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/athlete-documents/${documentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "LINK_REQUIREMENT",
            requirementId,
          }),
        }
      );

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Não foi possível vincular o documento."
        );
      }

      setMessage(
        "Documento vinculado ao requisito obrigatório com sucesso."
      );

      setLinkingDocumentId(null);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível vincular o documento."
      );
    } finally {
      setBusy(null);
    }
  }

  async function reject(documentId: string) {
    const reason = window
      .prompt("Informe o motivo da rejeição:")
      ?.trim();

    if (reason) {
      await update(documentId, "REJECT", reason);
    }
  }

  async function remove(documentId: string) {
    if (
      !window.confirm(
        "Excluir definitivamente este arquivo privado? Esta ação não poderá ser desfeita."
      )
    ) {
      return;
    }

    setBusy(documentId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/athlete-documents/${documentId}`,
        {
          method: "DELETE",
        }
      );

      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          result.error || "Não foi possível excluir."
        );
      }

      setMessage("Documento excluído com sucesso.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível excluir."
      );
    } finally {
      setBusy(null);
    }
  }

  if (!documents.length) {
    return (
      <p
        className="muted"
        style={{
          marginTop: 18,
        }}
      >
        Nenhum documento ou exame anexado.
      </p>
    );
  }

  return (
    <div
      className="stack"
      style={{
        marginTop: 22,
      }}
    >
      {message ? (
        <div
          className="form-success"
          role="status"
          style={{
            padding: 14,
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          ✓ {message}
        </div>
      ) : null}

      {error ? (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {documents.map((document) => {
        const isApproved =
          document.status === "APPROVED";

        const isBusy =
          busy === document.id;

        return (
          <article
            key={document.id}
            style={{
              border: isApproved
                ? "1px solid rgba(34, 197, 94, 0.28)"
                : "1px solid var(--line)",
              borderRadius: 16,
              padding: 18,
              background: "#fff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  minWidth: 0,
                  flex: 1,
                }}
              >
                <strong
                  style={{
                    display: "block",
                    fontSize: 18,
                    marginBottom: 8,
                  }}
                >
                  {document.title}
                </strong>

                <a
                  href={`/api/athlete-documents/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir arquivo anexado"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 9,
                    maxWidth: "100%",
                    padding: "9px 12px",
                    borderRadius: 10,
                    border:
                      "1px solid rgba(7, 19, 29, 0.12)",
                    background: "#f5f8f9",
                    color: "#07131d",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: 18,
                      lineHeight: 1,
                    }}
                  >
                    📎
                  </span>

                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {document.originalFileName}
                  </span>

                  <span
                    style={{
                      flexShrink: 0,
                      color: "#70808b",
                      fontWeight: 600,
                    }}
                  >
                    · {document.sizeLabel}
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                    }}
                  >
                    ↗
                  </span>
                </a>

                <span
                  className="help"
                  style={{
                    display: "block",
                    marginTop: 8,
                  }}
                >
                  {document.subjectLabel}
                  {" • "}
                  {document.categoryLabel}
                  {" • "}
                  Enviado em {document.createdAtLabel}
                </span>
              </div>

              <span
                className="badge"
                style={{
                  minWidth: 100,
                  justifyContent: "center",
                  ...(isApproved
                    ? {
                        border:
                          "1px solid rgba(34, 197, 94, 0.35)",
                        background:
                          "rgba(34, 197, 94, 0.09)",
                        color: "#16733b",
                        fontWeight: 800,
                      }
                    : {}),
                }}
              >
                {isApproved ? "✓ " : ""}
                {statusLabels[document.status] ||
                  document.status}
              </span>
            </div>

            {document.rejectionReason ? (
              <p className="form-error">
                Motivo: {document.rejectionReason}
              </p>
            ) : null}

            <div
              style={{
                marginTop: 16,
                padding: 12,
                border: document.requirementId
                  ? "1px solid rgba(34, 197, 94, 0.24)"
                  : "1px solid rgba(245, 158, 11, 0.28)",
                borderRadius: 12,
                background: document.requirementId
                  ? "rgba(34, 197, 94, 0.05)"
                  : "rgba(245, 158, 11, 0.06)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div>
                  {document.requirementLabelSnapshot ? (
                    <>
                      <strong
                        style={{
                          display: "block",
                          color: "#16733b",
                        }}
                      >
                        ✓ Requisito:{" "}
                        {document.requirementLabelSnapshot}
                      </strong>

                      <span className="help">
                        Documento já integrado ao checklist da categoria.
                      </span>
                    </>
                  ) : (
                    <>
                      <strong
                        style={{
                          display: "block",
                        }}
                      >
                        ⚠ Documento antigo sem vínculo
                      </strong>

                      <span className="help">
                        Vincule este documento apenas para integrar o histórico
                        aos novos requisitos da categoria.
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isBusy}
                  onClick={() =>
                    setLinkingDocumentId(
                      linkingDocumentId === document.id
                        ? null
                        : document.id
                    )
                  }
                >
                  {linkingDocumentId === document.id
                    ? "Cancelar"
                    : document.requirementId
                      ? "Alterar vínculo"
                      : "Vincular"}
                </button>
              </div>

              {linkingDocumentId === document.id ? (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-end",
                    flexWrap: "wrap",
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--line)",
                  }}
                >
                  <label
                    style={{
                      flex: "1 1 280px",
                      margin: 0,
                    }}
                  >
                    Requisito da categoria

                    <select
                      value={
                        requirementSelections[document.id] ??
                        ""
                      }
                      onChange={(event) =>
                        setRequirementSelections(
                          (current) => ({
                            ...current,
                            [document.id]:
                              event.currentTarget.value,
                          })
                        )
                      }
                    >
                      <option value="">
                        Selecione
                      </option>

                      {documentRequirements
                        .filter(
                          (requirement) =>
                            requirement.subject ===
                            document.subject
                        )
                        .map((requirement) => (
                          <option
                            key={requirement.id}
                            value={requirement.id}
                          >
                            {requirement.label}
                            {requirement.status ===
                            "APPROVED"
                              ? " — já atendido"
                              : requirement.status ===
                                  "PENDING"
                                ? " — pendente"
                                : requirement.status ===
                                    "EXPIRED"
                                  ? " — vencido"
                                  : " — faltando"}
                          </option>
                        ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    disabled={
                      isBusy ||
                      !requirementSelections[
                        document.id
                      ]
                    }
                    onClick={() =>
                      linkRequirement(document.id)
                    }
                  >
                    Salvar vínculo
                  </button>
                </div>
              ) : null}
            </div>

            <div
              className="form-grid-2"
              style={{
                marginTop: 16,
              }}
            >
              <label>
                Data de emissão

                <input
                  type="date"
                  value={
                    dates[document.id]?.issuedAt || ""
                  }
                  onChange={(event) =>
                    setDates((current) => ({
                      ...current,
                      [document.id]: {
                        ...current[document.id],
                        issuedAt:
                          event.target.value,
                      },
                    }))
                  }
                />
              </label>

              <label>
                Data de validade

                <input
                  type="date"
                  value={
                    dates[document.id]?.expiresAt || ""
                  }
                  onChange={(event) =>
                    setDates((current) => ({
                      ...current,
                      [document.id]: {
                        ...current[document.id],
                        expiresAt:
                          event.target.value,
                      },
                    }))
                  }
                />
              </label>
            </div>

            <div
              className="actions"
              style={{
                marginTop: 14,
                flexWrap: "wrap",
              }}
            >
              <a
                className="btn"
                href={`/api/athlete-documents/${document.id}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span aria-hidden="true">
                  👁
                </span>

                Ver arquivo
              </a>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isBusy}
                onClick={() =>
                  update(
                    document.id,
                    "UPDATE_DATES"
                  )
                }
              >
                Salvar datas
              </button>

              {isApproved ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled
                  aria-label="Documento já aprovado"
                  style={{
                    cursor: "default",
                    opacity: 1,
                    border:
                      "1px solid rgba(34, 197, 94, 0.35)",
                    background:
                      "rgba(34, 197, 94, 0.09)",
                    color: "#16733b",
                    fontWeight: 800,
                  }}
                >
                  ✓ Aprovado
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() =>
                    update(
                      document.id,
                      "APPROVE"
                    )
                  }
                >
                  Aprovar
                </button>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isBusy}
                onClick={() =>
                  reject(document.id)
                }
              >
                Rejeitar
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isBusy}
                onClick={() =>
                  update(
                    document.id,
                    "ARCHIVE"
                  )
                }
              >
                Arquivar
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={isBusy}
                onClick={() =>
                  remove(document.id)
                }
              >
                Excluir
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
