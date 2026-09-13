"use client";

import { useFormStatus } from "react-dom";

export default function QtrGenerateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (pending) return;
        const confirmed = window.confirm(
          "Atualizar com a agenda vai recriar o QTR desta semana com os treinos e jogos cadastrados. Ajustes manuais feitos somente no QTR podem ser substituídos. Deseja continuar?"
        );
        if (!confirmed) event.preventDefault();
      }}
      style={{
        minWidth: 180,
        minHeight: 42,
        padding: "0 18px",
        border: 0,
        borderRadius: 10,
        background: pending ? "#b8df46" : "#98e600",
        color: "#0d1800",
        fontSize: 14,
        fontWeight: 800,
        cursor: pending ? "wait" : "pointer",
        boxShadow: "0 3px 10px rgba(122, 184, 0, 0.18)",
        opacity: pending ? 0.85 : 1,
      }}
    >
      {pending ? "Atualizando..." : "Atualizar com agenda"}
    </button>
  );
}
