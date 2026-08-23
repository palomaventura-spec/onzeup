"use client";

import { useFormStatus } from "react-dom";

export default function CallUpSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Adicionando..." : "Adicionar convocados"}
    </button>
  );
}
