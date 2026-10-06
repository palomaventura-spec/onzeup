"use client";

import { useFormStatus } from "react-dom";

export default function TrainingCreateButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      style={{
        cursor: pending ? "wait" : "pointer",
        opacity: pending ? 0.78 : 1,
      }}
    >
      {pending ? "Adicionando..." : "Adicionar treino"}
    </button>
  );
}
