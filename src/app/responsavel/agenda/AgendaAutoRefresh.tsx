"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Sincroniza a agenda de forma discreta ao retornar à página ou após 60s. */
export default function AgendaAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastRefresh = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const tag = document.activeElement?.tagName;
      // Não interromper o preenchimento de justificativas de ausência.
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (Date.now() - lastRefresh < 30_000) return;
      lastRefresh = Date.now();
      router.refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = window.setInterval(refresh, 60_000);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
}
