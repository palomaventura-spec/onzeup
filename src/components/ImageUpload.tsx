"use client";

import { useEffect, useId, useRef, useState } from "react";

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
  const inputId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const blockedRef = useRef(false);
  const [failedPreview, setFailedPreview] = useState(false);

  useEffect(() => {
    const form = containerRef.current?.closest("form");
    if (!form) return;
    function guard(event: Event) {
      if (!blockedRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setMessage("A foto ainda não foi enviada. Aguarde ou cancele a tentativa antes de salvar.");
      fileRef.current?.focus();
    }
    form.addEventListener("submit", guard, true);
    return () => form.removeEventListener("submit", guard, true);
  }, []);

  function cancelAttempt() {
    blockedRef.current = false;
    setStatus("idle");
    setMessage("Tentativa cancelada. A foto anterior foi preservada.");
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto() {
    if (!window.confirm("Remover a foto do perfil ao salvar as alterações?")) return;
    setUrl("");
    setFailedPreview(false);
    blockedRef.current = false;
    setStatus("idle");
    setMessage("Foto removida da prévia. Salve para confirmar a remoção do perfil.");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function upload(file?: File) {
    if (!file) return;
    blockedRef.current = true;
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
      setFailedPreview(false);
      blockedRef.current = false;
      setStatus("success");
      setMessage("Foto enviada. Clique em Salvar para vinculá-la ao cadastro.");
    } catch {
      setStatus("error");
      setMessage("Não foi possível processar ou enviar a imagem.");
    }
  }

  const previewClass = purpose === "cover" ? "image-upload-preview cover" : "image-upload-preview logo";

  return (
    <div className="image-upload-field" ref={containerRef}>
      <label htmlFor={inputId}>{label}</label>
      {recommended ? <small className="help">{recommended}</small> : null}
      {url && !failedPreview ? (
        <div className={previewClass}>
          <img src={url} alt="Pré-visualização" onError={() => setFailedPreview(true)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </div>
      ) : (
        <div className={`${previewClass} empty`}>{url ? "Foto indisponível. Você pode selecionar outra abaixo." : "Nenhuma imagem definida"}</div>
      )}
      <input
        id={inputId}
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={status === "uploading"}
        onChange={(event) => upload(event.target.files?.[0])}
      />
      <input type="hidden" name={name} value={url} />
      {url ? <button type="button" className="btn-secondary" disabled={status === "uploading"} onClick={removePhoto}>Remover foto do perfil</button> : null}
      {status === "error" ? <button type="button" className="btn-secondary" onClick={cancelAttempt}>Cancelar tentativa e manter foto anterior</button> : null}
      {status === "uploading" ? (
        <small className="uploading-line"><i className="pending-button-spinner" /> Enviando imagem...</small>
      ) : null}
      {message ? <small role={status === "error" ? "alert" : "status"} className={status === "error" ? "form-error" : "form-success"}>{message}</small> : null}
    </div>
  );
}
