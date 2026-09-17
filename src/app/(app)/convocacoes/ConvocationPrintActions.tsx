"use client";

import { useState } from "react";
import { toPng } from "html-to-image";

async function waitForPosterImages(poster: HTMLElement) {
  const images = Array.from(poster.querySelectorAll("img"));
  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) return resolve();
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
  // Lets SafeAvatar swap a failed image for initials before html-to-image reads it.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export default function ConvocationPrintActions() {
  const [generating, setGenerating] = useState(false);

  async function renderPoster() {
    const poster = document.getElementById("convocation-poster");
    if (!poster) throw new Error("Poster não encontrado.");

    await document.fonts?.ready;
    await waitForPosterImages(poster);
    return toPng(poster, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#061018",
      width: 940,
      height: 1329,
      canvasWidth: 1880,
      canvasHeight: 2658,
      style: {
        width: "940px",
        height: "1329px",
        minHeight: "1329px",
        maxWidth: "none",
        margin: "0",
        transform: "none",
      },
    });
  }

  async function downloadImage() {
    setGenerating(true);
    try {
      const dataUrl = await renderPoster();
      const link = document.createElement("a");
      link.download = "convocacao-onzeup.png";
      link.href = dataUrl;
      link.click();
    } catch {
      window.alert("Não foi possível gerar a imagem. Atualize a página e tente novamente.");
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
      const dataUrl = await renderPoster();
      printWindow.opener = null;
      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>Convocação oficial</title>
<style>@page { size: A4 portrait; margin: 0; } html, body { margin: 0; width: 210mm; height: 297mm; background: #061018; overflow: hidden; } img { display: block; width: 210mm; height: 297mm; object-fit: fill; }</style>
</head><body><img src="${dataUrl}" alt="Convocação oficial" />
<script>document.querySelector("img").addEventListener("load", () => setTimeout(() => window.print(), 250));<\/script>
</body></html>`);
      printWindow.document.close();
    } catch {
      printWindow.close();
      window.alert("Não foi possível preparar o PDF. Atualize a página e tente novamente.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="actions convocation-no-print">
      <button className="btn" type="button" onClick={downloadImage} disabled={generating}>
        {generating ? "Gerando imagem..." : "Baixar imagem (PNG)"}
      </button>
      <button className="btn btn-secondary" type="button" onClick={printPoster} disabled={generating}>
        {generating ? "Preparando arte..." : "Gerar PDF / imprimir"}
      </button>
    </div>
  );
}
