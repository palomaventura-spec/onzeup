"use client";

import { useState } from "react";

const MAX_IMAGE_SIDE = 2200;

async function sanitizeImage(file: File): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Imagem inválida."));
    img.src = dataUrl;
  });

  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem.");
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => (value ? resolve(value) : reject(new Error("Não foi possível processar a imagem."))),
      "image/webp",
      0.88
    );
  });

  // O reprocessamento via canvas remove metadados EXIF (incluindo GPS) antes do upload.
  return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "imagem"}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

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
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setStatus("error");
        setMessage("Formato não permitido. Use JPEG, PNG ou WEBP.");
        return;
      }

      if (file.size <= 0 || file.size > 4 * 1024 * 1024) {
        setStatus("error");
        setMessage("A imagem original deve ter até 4 MB.");
        return;
      }

      const safeFile = await sanitizeImage(file);
      const form = new FormData();
      form.append("file", safeFile);
      form.append("purpose", purpose || name);

      const response = await fetch("/api/upload", { method: "POST", body: form });
      const text = await response.text();
      let json: any = {};
      try {
        json = JSON.parse(text);
      } catch {
        json = {};
      }

      if (!response.ok || !json.url) {
        setStatus("error");
        setMessage(json.error || `Falha no upload (HTTP ${response.status}).`);
        return;
      }

      setUrl(json.url);
      setStatus("success");
      setMessage("Imagem enviada. Agora salve as configurações.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível processar ou enviar a imagem.");
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
