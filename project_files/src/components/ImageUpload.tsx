"use client";

import { useState } from "react";

export default function ImageUpload({
  name,
  defaultValue,
  label,
  purpose,
  recommended,
}: {
  name: string;
  defaultValue?: string | null;
  label: string;
  purpose?: "logo" | "cover" | "site";
  recommended?: string;
}) {
  const [url, setUrl] = useState(defaultValue || "");
  const [status, setStatus] = useState<"idle" | "uploading" | "error" | "success">("idle");
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setStatus("uploading");
    setMessage("");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", purpose || name);

      const response = await fetch("/api/upload", { method: "POST", body: form });
      const text = await response.text();
      let json: any = {};
      try { json = JSON.parse(text); } catch { json = {}; }

      if (!response.ok || !json.url) {
        setStatus("error");
        setMessage(json.error || `Falha no upload (HTTP ${response.status}).`);
        return;
      }

      setUrl(json.url);
      setStatus("success");
      setMessage("Imagem enviada. Agora salve as configurações.");
    } catch (error) {
      setStatus("error");
      setMessage("Não foi possível conectar ao serviço de upload.");
    }
  }

  const previewClass = purpose === "cover" ? "image-upload-preview cover" : "image-upload-preview logo";

  return (
    <div className="image-upload-field">
      <label>{label}</label>
      {recommended ? <small className="help">{recommended}</small> : null}
      {url ? (
        <div className={previewClass}>
          <img src={url} alt="Pré-visualização" />
        </div>
      ) : (
        <div className={`${previewClass} empty`}>Nenhuma imagem definida</div>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={status === "uploading"}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <input type="hidden" name={name} value={url} />
      {status === "uploading" ? (
        <small className="uploading-line"><i className="pending-button-spinner" /> Enviando imagem...</small>
      ) : null}
      {message ? <small className={status === "error" ? "form-error" : "form-success"}>{message}</small> : null}
    </div>
  );
}
