"use client";

import { useState } from "react";

type PlayerActionsProps = {
  url: string;
  enabled: boolean;
};

export default function PlayerActions({
  url,
  enabled,
}: PlayerActionsProps) {
  const [copied, setCopied] = useState(false);

  function getDestinationUrl() {
    const target = new URL(url, window.location.origin);

    const isLocalDevelopment =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    /*
     * Em produção:
     * https://players.onzeup.com.br/slug
     *
     * No desenvolvimento local:
     * http://localhost:3000/player/slug
     */
    if (
      isLocalDevelopment &&
      target.hostname === "players.onzeup.com.br"
    ) {
      const productionPath = target.pathname.replace(/^\/+/, "");

      return new URL(
        `/player/${productionPath}${target.search}${target.hash}`,
        window.location.origin
      ).toString();
    }

    return target.toString();
  }

  function showCopiedMessage() {
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1600);
  }

  function openPublicPage() {
    if (!enabled) return;

    window.open(
      getDestinationUrl(),
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function copy() {
    if (!enabled) return;

    try {
      await navigator.clipboard.writeText(
        getDestinationUrl()
      );

      showCopiedMessage();
    } catch {
      window.alert(
        "Não foi possível copiar o link automaticamente."
      );
    }
  }

  async function share() {
    if (!enabled) return;

    const absolute = getDestinationUrl();

    try {
      if (navigator.share) {
        await navigator.share({
          title: "11 Player",
          url: absolute,
        });

        return;
      }

      await navigator.clipboard.writeText(absolute);
      showCopiedMessage();
    } catch (error) {
      /*
       * O navegador lança um erro quando a pessoa fecha
       * voluntariamente a janela de compartilhamento.
       */
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      window.alert(
        "Não foi possível compartilhar o perfil."
      );
    }
  }

  return (
    <div className="player-quick-actions">
      {enabled ? (
        <button
          className="btn-secondary"
          type="button"
          onClick={openPublicPage}
        >
          Ver página ↗
        </button>
      ) : (
        <button
          className="btn-secondary"
          type="button"
          disabled
        >
          Ver página
        </button>
      )}

      <button
        type="button"
        className="btn-secondary"
        onClick={copy}
        disabled={!enabled}
      >
        {copied ? "Link copiado!" : "Copiar link"}
      </button>

      <button
        type="button"
        className="btn-secondary"
        onClick={share}
        disabled={!enabled}
      >
        Compartilhar
      </button>
    </div>
  );
}