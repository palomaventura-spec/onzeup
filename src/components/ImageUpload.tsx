"use client";

import { useState } from "react";

export default function ImageUpload({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue?: string | null;
  label: string;
}) {
  const [url, setUrl] = useState(defaultValue || "");
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setStatus("uploading");
    setMessage("");

    try {
      const form = new FormData();
      form.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: form,
      });
      const json = await response.json();

      if (!response.ok || !json.url) {
        setStatus("error");
        setMessage(json.error || "Não foi possível enviar a imagem.");
        return;
      }

      setUrl(json.url);
      setStatus("idle");
      setMessage("Imagem carregada com sucesso.");
    } catch {
      setStatus("error");
      setMessage("Falha de conexão durante o upload.");
    }
  }

  return (
    <label className="image-upload-field">
      {label}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={status === "uploading"}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <input type="hidden" name={name} value={url} />
      {status === "uploading" ? <small className="help">Enviando imagem…</small> : null}
      {message ? <small className={status === "error" ? "form-error" : "form-success"}>{message}</small> : null}
      {url ? <small className="help">Arquivo pronto para salvar.</small> : null}
    </label>
  );
}
