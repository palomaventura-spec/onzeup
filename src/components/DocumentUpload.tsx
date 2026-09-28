"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type UploadValue = {
  url: string;
  pathname: string;
  fileName: string;
  mimeType: string;
};

export default function DocumentUpload({
  name,
  pathnameName,
  fileNameName,
  mimeTypeName,
  label,
  purpose = "competition-document",
}: {
  name: string;
  pathnameName?: string;
  fileNameName: string;
  mimeTypeName: string;
  label: string;
  purpose?: string;
}) {
  const [
    value,
    setValue,
  ] =
    useState<UploadValue>({
      url: "",
      pathname: "",
      fileName: "",
      mimeType: "",
    });

  const [
    status,
    setStatus,
  ] =
    useState<
      | "idle"
      | "uploading"
      | "error"
      | "success"
    >("idle");

  const [
    message,
    setMessage,
  ] = useState("");

  const inputId =
    useId();

  const containerRef =
    useRef<HTMLDivElement>(
      null,
    );

  const fileRef =
    useRef<HTMLInputElement>(
      null,
    );

  const blockedRef =
    useRef(false);

  useEffect(() => {
    const form =
      containerRef.current?.closest(
        "form",
      );

    if (!form) {
      return;
    }

    function guard(
      event: Event,
    ) {
      if (
        !blockedRef.current
      ) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();

      setMessage(
        "O documento ainda está sendo enviado. Aguarde antes de salvar.",
      );

      fileRef.current?.focus();
    }

    form.addEventListener(
      "submit",
      guard,
      true,
    );

    return () =>
      form.removeEventListener(
        "submit",
        guard,
        true,
      );
  }, []);

  async function upload(
    file?: File,
  ) {
    if (!file) {
      return;
    }

    blockedRef.current =
      true;

    setStatus(
      "uploading",
    );

    setMessage("");

    try {
      const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
      ];

      if (
        !allowed.includes(
          file.type,
        )
      ) {
        blockedRef.current =
          false;

        setStatus(
          "error",
        );

        setMessage(
          "Formato não permitido. Use PDF, JPEG, PNG ou WEBP.",
        );

        return;
      }

      if (
        file.size <= 0 ||
        file.size >
          10 * 1024 * 1024
      ) {
        blockedRef.current =
          false;

        setStatus(
          "error",
        );

        setMessage(
          "O documento deve ter até 10 MB.",
        );

        return;
      }

      const form =
        new FormData();

      form.append(
        "file",
        file,
      );

      form.append(
        "purpose",
        purpose,
      );

      const response =
        await fetch(
          "/api/document-upload",
          {
            method: "POST",
            body: form,
          },
        );

      const text =
        await response.text();

      let json: any = {};

      try {
        json =
          JSON.parse(text);
      } catch {
        json = {};
      }

      if (
        !response.ok ||
        !json.url ||
        !json.pathname
      ) {
        blockedRef.current =
          false;

        setStatus(
          "error",
        );

        setMessage(
          json.error ||
            `Falha no upload (HTTP ${response.status}).`,
        );

        return;
      }

      setValue({
        url: json.url,
        pathname:
          json.pathname,
        fileName:
          json.fileName ||
          file.name,
        mimeType:
          json.mimeType ||
          file.type,
      });

      blockedRef.current =
        false;

      setStatus(
        "success",
      );

      setMessage(
        "Documento enviado. Salve para vinculá-lo à inscrição.",
      );
    } catch {
      blockedRef.current =
        false;

      setStatus(
        "error",
      );

      setMessage(
        "Não foi possível enviar o documento.",
      );
    }
  }

  function removeFile() {
    setValue({
      url: "",
      pathname: "",
      fileName: "",
      mimeType: "",
    });

    setStatus("idle");

    setMessage(
      "Documento removido da seleção.",
    );

    if (
      fileRef.current
    ) {
      fileRef.current.value =
        "";
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        display: "grid",
        gap: 8,
      }}
    >
      <label
        htmlFor={inputId}
      >
        <strong>
          {label}
        </strong>
      </label>

      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        disabled={
          status ===
          "uploading"
        }
        onChange={(
          event,
        ) =>
          upload(
            event.target
              .files?.[0],
          )
        }
      />

      <input
        type="hidden"
        name={name}
        value={value.url}
      />

      {pathnameName ? (
        <input
          type="hidden"
          name={
            pathnameName
          }
          value={
            value.pathname
          }
        />
      ) : null}

      <input
        type="hidden"
        name={
          fileNameName
        }
        value={
          value.fileName
        }
      />

      <input
        type="hidden"
        name={
          mimeTypeName
        }
        value={
          value.mimeType
        }
      />

      {value.fileName ? (
        <div
          className="card"
          style={{
            padding: 12,
          }}
        >
          <strong>
            {
              value.fileName
            }
          </strong>

          <small
            className="muted"
            style={{
              display:
                "block",
              marginTop: 4,
            }}
          >
            Documento enviado
            com armazenamento
            privado.
          </small>
        </div>
      ) : null}

      {value.url ? (
        <button
          type="button"
          className="btn-secondary"
          onClick={
            removeFile
          }
          disabled={
            status ===
            "uploading"
          }
        >
          Remover documento
        </button>
      ) : null}

      {status ===
      "uploading" ? (
        <small className="uploading-line">
          <i className="pending-button-spinner" />{" "}
          Enviando documento...
        </small>
      ) : null}

      {message ? (
        <small
          role={
            status ===
            "error"
              ? "alert"
              : "status"
          }
          className={
            status ===
            "error"
              ? "form-error"
              : "form-success"
          }
        >
          {message}
        </small>
      ) : null}
    </div>
  );
}