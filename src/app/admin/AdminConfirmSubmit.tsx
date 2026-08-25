"use client";

import { useFormStatus } from "react-dom";

export default function AdminConfirmSubmit({
  label,
  confirmText,
  className = "btn-secondary btn-small",
}: {
  label: string;
  confirmText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        const confirmed = window.confirm(confirmText);

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      {pending ? "Processando..." : label}
    </button>
  );
}