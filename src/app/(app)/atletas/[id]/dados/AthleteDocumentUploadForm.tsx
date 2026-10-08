"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type GuardianOption = {
  id: string;
  name: string;
};

type DocumentRequirementOption = {
  id: string;
  label: string;
  documentCategory: string;
  subject: "ATHLETE" | "GUARDIAN";
  requiresExpiry: boolean;
  instructions: string | null;
  status: string;
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_FILE_SIZE_LABEL = "4 MB";

function fileSizeInMb(size: number) {
  return (size / (1024 * 1024)).toFixed(1).replace(".", ",");
}

export default function AthleteDocumentUploadForm({
  athleteId,
  athleteName,
  guardians,
  documentRequirements,
}: {
  athleteId: string;
  athleteName: string;
  guardians: GuardianOption[];
  documentRequirements: DocumentRequirementOption[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedRequirementId, setSelectedRequirementId] =
    useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("");

  const [selectedGuardianId, setSelectedGuardianId] =
    useState("");

  const selectedRequirement =
    documentRequirements.find(
      (requirement) =>
        requirement.id === selectedRequirementId
    ) ?? null;

  function validateSelectedFile(file: File | null) {
    setMessage("");

    if (!file) {
      setError("");
      return true;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `Arquivo muito grande. O arquivo selecionado possui ${fileSizeInMb(
          file.size
        )} MB e o limite permitido é de ${MAX_FILE_SIZE_LABEL}. Escolha um arquivo menor.`
      );

      return false;
    }

    setError("");
    return true;
  }

  function handleRequirementChange(
    requirementId: string
  ) {
    setSelectedRequirementId(requirementId);

    const requirement =
      documentRequirements.find(
        (item) => item.id === requirementId
      ) ?? null;

    if (!requirement) {
      setSelectedCategory("");
      setSelectedGuardianId("");
      return;
    }

    setSelectedCategory(
      requirement.documentCategory
    );

    if (requirement.subject === "ATHLETE") {
      setSelectedGuardianId("");
    }
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setError("");

    const formData = new FormData(
      event.currentTarget
    );

    const selectedFile =
      formData.get("file");

    if (
      !(selectedFile instanceof File) ||
      selectedFile.size <= 0
    ) {
      setError(
        "Selecione um arquivo para anexar."
      );

      return;
    }

    if (!validateSelectedFile(selectedFile)) {
      return;
    }

    setSending(true);

    try {
      const response = await fetch(
        "/api/athlete-documents/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      let result: { error?: string } = {};

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        result = (await response.json()) as {
          error?: string;
        };
      } else {
        const rawText =
          await response.text();

        if (!response.ok) {
          if (
            response.status === 413 ||
            /request entity too large/i.test(
              rawText
            )
          ) {
            throw new Error(
              `Arquivo muito grande. O limite permitido é de ${MAX_FILE_SIZE_LABEL}. Escolha um arquivo menor.`
            );
          }

          throw new Error(
            "Não foi possível anexar o arquivo. Tente novamente."
          );
        }
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Não foi possível anexar o arquivo."
        );
      }

      formRef.current?.reset();

      setSelectedRequirementId("");
      setSelectedCategory("");
      setSelectedGuardianId("");

      setMessage(
        "Documento anexado com segurança."
      );

      setError("");

      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível anexar o arquivo."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="form"
      style={{
        width: "100%",
        maxWidth: "none",
        marginTop: 18,
      }}
    >
      <input
        type="hidden"
        name="athleteId"
        value={athleteId}
      />

      <div className="form-grid-2">
        <label>
          Documento exigido

          <select
            name="requirementId"
            value={selectedRequirementId}
            onChange={(event) =>
              handleRequirementChange(
                event.currentTarget.value
              )
            }
          >
            <option value="">
              Outro documento / sem requisito específico
            </option>

            {documentRequirements.map(
              (requirement) => (
                <option
                  key={requirement.id}
                  value={requirement.id}
                >
                  {requirement.label}
                  {requirement.status ===
                  "APPROVED"
                    ? " — já aprovado"
                    : requirement.status ===
                        "PENDING"
                      ? " — pendente"
                      : requirement.status ===
                          "EXPIRED"
                        ? " — vencido"
                        : " — faltando"}
                </option>
              )
            )}
          </select>

          <span className="help">
            Selecione o documento obrigatório ao qual este arquivo corresponde.
          </span>
        </label>

        <label>
          Título do documento

          <input
            name="title"
            required
            defaultValue=""
            placeholder={
              selectedRequirement
                ? selectedRequirement.label
                : "Ex.: Atestado médico 2026"
            }
          />
        </label>

        <label>
          Categoria

          <select
            name="category"
            required={!selectedRequirement}
            value={selectedCategory}
            disabled={Boolean(
              selectedRequirement
            )}
            onChange={(event) =>
              setSelectedCategory(
                event.currentTarget.value
              )
            }
          >
            <option
              value=""
              disabled
            >
              Selecione
            </option>

            <option value="IDENTITY">
              Documento de identificação
            </option>

            <option value="MEDICAL_EXAM">
              Exame médico
            </option>

            <option value="MEDICAL_CLEARANCE">
              Atestado / liberação médica
            </option>

            <option value="ELECTROCARDIOGRAM">
              Eletrocardiograma
            </option>

            <option value="ECHOCARDIOGRAM">
              Ecocardiograma
            </option>

            <option value="AUTHORIZATION">
              Autorização
            </option>

            <option value="SPORTS_REGISTRATION">
              Registro esportivo
            </option>

            <option value="SCHOOL">
              Documento escolar
            </option>

            <option value="SCHOOL_DECLARATION">
              Declaração escolar
            </option>

            <option value="OTHER">
              Outro
            </option>
          </select>

          {selectedRequirement ? (
            <span className="help">
              Categoria definida automaticamente pelo requisito.
            </span>
          ) : null}
        </label>

        <label>
          Documento referente a

          <select
            name="guardianId"
            value={selectedGuardianId}
            required={
              selectedRequirement?.subject ===
              "GUARDIAN"
            }
            disabled={
              selectedRequirement?.subject ===
              "ATHLETE"
            }
            onChange={(event) =>
              setSelectedGuardianId(
                event.currentTarget.value
              )
            }
          >
            <option value="">
              {selectedRequirement?.subject ===
              "GUARDIAN"
                ? "Selecione o responsável"
                : `Atleta: ${athleteName}`}
            </option>

            {guardians.map((guardian) => (
              <option
                key={guardian.id}
                value={guardian.id}
              >
                Responsável: {guardian.name}
              </option>
            ))}
          </select>

          {selectedRequirement ? (
            <span className="help">
              {selectedRequirement.subject ===
              "GUARDIAN"
                ? "Este documento deve ser vinculado a um responsável."
                : "Este documento pertence ao atleta."}
            </span>
          ) : null}
        </label>

        <label>
          Arquivo privado

          <input
            type="file"
            name="file"
            required
            accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
            onChange={(event) =>
              validateSelectedFile(
                event.currentTarget.files?.[0] ??
                  null
              )
            }
          />

          <span className="help">
            PDF, JPG ou PNG. Tamanho máximo permitido:{" "}
            <strong>
              {MAX_FILE_SIZE_LABEL}
            </strong>
            .
          </span>
        </label>

        <label>
          Data de emissão

          <input
            type="date"
            name="issuedAt"
          />
        </label>

        <label>
          Data de validade
          {selectedRequirement?.requiresExpiry
            ? " *"
            : ""}

          <input
            type="date"
            name="expiresAt"
            required={
              selectedRequirement?.requiresExpiry ??
              false
            }
          />

          {selectedRequirement?.requiresExpiry ? (
            <span className="help">
              Obrigatória para este documento.
            </span>
          ) : null}
        </label>
      </div>

      {selectedRequirement?.instructions ? (
        <div
          className="card"
          style={{
            marginTop: 14,
            padding: 14,
          }}
        >
          <strong>
            Orientação para este documento
          </strong>

          <p
            className="muted"
            style={{ margin: "6px 0 0" }}
          >
            {selectedRequirement.instructions}
          </p>
        </div>
      ) : null}

      {message ? (
        <p
          className="form-success"
          role="status"
        >
          {message}
        </p>
      ) : null}

      {error ? (
        <p
          className="form-error"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
      >
        {sending
          ? "Enviando arquivo..."
          : "Anexar documento privado"}
      </button>
    </form>
  );
}