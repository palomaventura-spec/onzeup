"use client";

import { useState } from "react";

export default function AdminConfirmSubmit({
  label,
  confirmText,
  className = "btn-secondary btn-small",
}: {
  label: string;
  confirmText: string;
  className?: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(confirmText)) {
          event.preventDefault();
          return;
        }
        setPending(true);
      }}
    >
      {pending ? "Processando..." : label}
    </button>
  );
}
