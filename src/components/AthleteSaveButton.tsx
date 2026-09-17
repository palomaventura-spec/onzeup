"use client";

import { useFormStatus } from "react-dom";

export default function AthleteSaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      <span role="status" aria-live="polite">
        {pending ? "Salvando… Aguarde" : "Salvar alterações"}
      </span>
    </button>
  );
}
