"use client";

import { useEffect, useState } from "react";
import { toPng } from "html-to-image";

const MOBILE_BREAKPOINT = 900;
const IMAGE_WAIT_TIMEOUT_MS = 4500;
const FONT_WAIT_TIMEOUT_MS = 3500;

function isMobileViewport() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ||
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}

function waitWithTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Tempo limite excedido durante a geração da arte.")),
        timeoutMs,
      );
    }),
  ]);
}

async function waitForPosterImages(poster: HTMLElement) {
  const images = Array.from(poster.querySelectorAll("img"));

  await Promise.all(
    images.map(async (image) => {
      if (image.complete && image.naturalWidth > 0) return;

      await Promise.race([
        new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
        new Promise<void>((resolve) => {
          window.setTimeout(resolve, IMAGE_WAIT_TIMEOUT_MS);
        }),
      ]);
    }),
  );

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}

async function waitForPosterFonts() {
  if (!document.fonts?.ready) return;

  try {
    await waitWithTimeout(document.fonts.ready, FONT_WAIT_TIMEOUT_MS);
  } catch {
    // segue mesmo sem travar
  }
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error || new Error("Não foi possível converter a imagem."));

    reader.readAsDataURL(blob);
  });
}

async function inlinePosterImages(poster: HTMLElement) {
  const images = Array.from(poster.querySelectorAll("img"));
  const restore: Array<() => void> = [];

  await Promise.all(
    images.map(async (image) => {
      const originalAttribute = image.getAttribute("src");
      const source = image.currentSrc || image.src;

      if (!source || source.startsWith("data:")) return;

      try {
        const response = await fetch(source, {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Falha ao carregar imagem (${response.status}).`);
        }

        const blob = await response.blob();

        if (!blob.type.startsWith("image/")) {
          throw new Error("O recurso carregado não é uma imagem.");
        }

        const dataUrl = await blobToDataUrl(blob);

        restore.push(() => {
          if (originalAttribute == null) {
            image.removeAttribute("src");
          } else {
            image.setAttribute("src", originalAttribute);
          }
        });

        image.src = dataUrl;

        try {
          await image.decode();
        } catch {
          await new Promise<void>((resolve) =>
            window.setTimeout(resolve, 80),
          );
        }
      } catch (error) {
        console.warn("CONVOCATION_IMAGE_INLINE_FAILED", source, error);
      }
    }),
  );

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );

  return () => {
    restore.forEach((restoreImage) => restoreImage());
  };
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return new File([blob], fileName, {
    type: blob.type || "image/png",
  });
}

export default function ConvocationPrintActions() {
  const [generating, setGenerating] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const update = () => setMobile(isMobileViewport());
    update();

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  async function renderPoster(options?: { mobile?: boolean }) {
    const poster = document.getElementById("convocation-poster");
    if (!poster) throw new Error("Poster não encontrado.");

    const mobileRender = options?.mobile ?? isMobileViewport();

    await waitForPosterFonts();
    await waitForPosterImages(poster);

    const restoreImages = await inlinePosterImages(poster);

    try {
      const pixelRatio = mobileRender ? 1 : 2;

      return await waitWithTimeout(
        toPng(poster, {
          cacheBust: false,
          pixelRatio,
          backgroundColor: "#061018",
          width: 940,
          height: 1329,
          canvasWidth: 940 * pixelRatio,
          canvasHeight: 1329 * pixelRatio,
          style: {
            width: "940px",
            height: "1329px",
            minHeight: "1329px",
            maxWidth: "none",
            margin: "0",
            transform: "none",
          },
        }),
        mobileRender ? 20000 : 30000,
      );
    } finally {
      restoreImages();
    }
  }

  async function saveOrShareImage() {
    setGenerating(true);

    try {
      const mobileRender = isMobileViewport();
      const dataUrl = await renderPoster({ mobile: mobileRender });
      const fileName = "convocacao-onzeup.png";

      if (mobileRender && navigator.share) {
        const file = await dataUrlToFile(dataUrl, fileName);

        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Convocação ONZEUP",
              text: "Arte oficial da convocação.",
            });
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
              return;
            }

            console.warn("MOBILE_SHARE_FAILED", error);
          }
        }
      }

      downloadDataUrl(dataUrl, fileName);
    } catch (error) {
      console.error("CONVOCATION_IMAGE_GENERATION_ERROR", error);
      window.alert(
        "Não foi possível gerar a arte neste dispositivo. Atualize a página e tente novamente.",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function printPoster() {
    const printWindow = window.open("", "_blank", "width=900,height=1100");

    if (!printWindow) {
      window.alert("Libere as janelas pop-up para gerar o PDF.");
      return;
    }

    setGenerating(true);

    try {
      const dataUrl = await renderPoster({
        mobile: isMobileViewport(),
      });

      printWindow.opener = null;
      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Convocação oficial</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    html, body {
      margin: 0;
      width: 210mm;
      height: 297mm;
      background: #061018;
      overflow: hidden;
    }
    img {
      display: block;
      width: 210mm;
      height: 297mm;
      object-fit: fill;
    }
  </style>
</head>
<body>
  <img src="${dataUrl}" alt="Convocação oficial" />
  <script>
    document.querySelector("img").addEventListener("load", () => {
      setTimeout(() => window.print(), 350);
    });
  <\/script>
</body>
</html>`);
      printWindow.document.close();
    } catch (error) {
      console.error("CONVOCATION_PDF_GENERATION_ERROR", error);
      printWindow.close();
      window.alert(
        "Não foi possível preparar o PDF neste dispositivo. Tente gerar a imagem e compartilhar pelo celular.",
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="actions convocation-no-print">
      <button
        className="btn"
        type="button"
        onClick={saveOrShareImage}
        disabled={generating}
      >
        {generating
          ? "Gerando arte..."
          : mobile
            ? "Compartilhar / salvar arte"
            : "Baixar imagem (PNG)"}
      </button>

      <button
        className="btn btn-secondary"
        type="button"
        onClick={printPoster}
        disabled={generating}
      >
        {generating ? "Preparando arte..." : "Gerar PDF / imprimir"}
      </button>

      {mobile ? (
        <small className="help" style={{ width: "100%" }}>
          No iPhone/iPad: toque em “Compartilhar / salvar arte” e escolha
          “Salvar Imagem” para gravar na Fototeca.
        </small>
      ) : null}
    </div>
  );
}