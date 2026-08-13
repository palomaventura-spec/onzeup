"use client";

import { useEffect } from "react";

export default function PilotUX() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button.btn-danger") as HTMLButtonElement | null;
      if (!button) return;

      const isDemo = Boolean(document.querySelector(".demo-environment-banner"));
      const message = isDemo
        ? "Você está no ambiente demo. Deseja realmente executar esta ação destrutiva?"
        : "Confirma esta exclusão? Esta ação pode remover vínculos e não deve ser feita por engano.";

      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  return null;
}
