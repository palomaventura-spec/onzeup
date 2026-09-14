"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function PublicProfileBackButton() {
  const router = useRouter();
  const [standalone, setStandalone] =
    useState(false);

  useEffect(() => {
    const installedMode =
      window.matchMedia(
        "(display-mode: standalone)"
      ).matches ||
      (
        window.navigator as Navigator & {
          standalone?: boolean;
        }
      ).standalone === true;

    setStandalone(installedMode);
  }, []);

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/players");
  }

  if (!standalone) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Voltar"
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top) + 12px)",
        right: 16,
        zIndex: 500,
        minWidth: 72,
        minHeight: 40,
        padding: "8px 13px",
        border: "1px solid #334148",
        borderRadius: 999,
        background: "rgba(11, 17, 21, 0.92)",
        color: "#ffffff",
        boxShadow: "0 6px 20px rgba(0,0,0,.28)",
        backdropFilter: "blur(12px)",
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      ← Voltar
    </button>
  );
}