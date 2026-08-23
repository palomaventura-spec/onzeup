"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

export default function PlayerPublicActions({ name }: { name: string }) {
  const [qrOpen, setQrOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  async function copy() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function share() {
    if (navigator.share) {
      await navigator.share({
        title: `${name} • ONZEUP Player`,
        text: `Conheça o perfil esportivo de ${name}.`,
        url: window.location.href,
      });
      return;
    }
    await copy();
  }

  useEffect(() => {
    if (!qrOpen || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, window.location.href, {
      width: 220,
      margin: 1,
      color: { dark: "#071007", light: "#ffffff" },
    });
  }, [qrOpen]);

  return (
    <>
      <div className="player-public-actions">
        <button type="button" onClick={share}>Compartilhar perfil</button>
        <button type="button" onClick={copy}>{copied ? "Link copiado ✓" : "Copiar link"}</button>
        <button type="button" onClick={() => setQrOpen(true)}>QR Code</button>
      </div>

      {qrOpen ? (
        <div className="player-qr-backdrop" onClick={() => setQrOpen(false)}>
          <div className="player-qr-modal" onClick={(e) => e.stopPropagation()}>
            <span>ONZEUP PLAYER</span>
            <h3>{name}</h3>
            <canvas ref={canvasRef} />
            <p>Escaneie para abrir o perfil esportivo.</p>
            <button type="button" onClick={() => setQrOpen(false)}>Fechar</button>
          </div>
        </div>
      ) : null}
    </>
  );
}
