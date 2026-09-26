"use client";

import { useEffect, useState } from "react";
import styles from "./PwaInstallPrompt.module.css";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

export default function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (
        window.navigator as Navigator & {
          standalone?: boolean;
        }
      ).standalone === true;

    if (standalone) return;

    const dismissed =
      window.sessionStorage.getItem("11UP-install-dismissed") === "1";

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();

      if (dismissed) return;

      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    }

    function handleInstalled() {
      setInstallEvent(null);
      setVisible(false);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function install() {
    if (!installEvent) return;

    await installEvent.prompt();
    const choice = await installEvent.userChoice;

    if (choice.outcome === "accepted") {
      setVisible(false);
      setInstallEvent(null);
    }
  }

  function dismiss() {
    window.sessionStorage.setItem("11UP-install-dismissed", "1");
    setVisible(false);
  }

  if (!visible || !installEvent) return null;

  return (
    <aside
      className={`${styles.prompt} no-print`}
      aria-label="Instalar aplicativo 11UP"
    >
      <img
        src="/pwa-icon-192.png"
        alt=""
        className={styles.icon}
      />

      <div className={styles.copy}>
        <strong>Instale o 11UP</strong>
        <span>
          Acesse Club, Player e Coach direto da tela inicial.
        </span>
      </div>

      <button
        type="button"
        className={styles.install}
        onClick={install}
      >
        Instalar
      </button>

      <button
        type="button"
        className={styles.close}
        onClick={dismiss}
        aria-label="Fechar aviso de instalação"
      >
        ×
      </button>
    </aside>
  );
}
