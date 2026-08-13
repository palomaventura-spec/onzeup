"use client";

import { useState } from "react";

export default function PlayerActions({ url, enabled }: { url: string; enabled: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!enabled) return;
    const absolute = new URL(url, window.location.origin).toString();
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function share() {
    if (!enabled) return;
    const absolute = new URL(url, window.location.origin).toString();
    if (navigator.share) {
      await navigator.share({ title: "ONZE Player", url: absolute });
      return;
    }
    await navigator.clipboard.writeText(absolute);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="player-quick-actions">
      {enabled ? <a className="btn-secondary" target="_blank" href={url}>Ver página ↗</a> : <button className="btn-secondary" disabled>Ver página</button>}
      <button type="button" className="btn-secondary" onClick={copy} disabled={!enabled}>{copied ? "Link copiado!" : "Copiar link"}</button>
      <button type="button" className="btn-secondary" onClick={share} disabled={!enabled}>Compartilhar</button>
    </div>
  );
}
