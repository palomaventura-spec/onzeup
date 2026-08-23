"use client";

import { useEffect } from "react";

export default function CommercialUX() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("button.btn-danger") as HTMLButtonElement | null;
      if (!button) return;

      const message = "Confirma esta exclusão? Esta ação pode remover vínculos e não deve ser feita por engano.";

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
