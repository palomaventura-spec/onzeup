"use client";

import { useFormStatus } from "react-dom";

export default function PendingSubmitButton({
  children,
  pendingText = "Processando...",
  className,
}: {
  children: React.ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? (
        <span className="pending-button-content">
          <i className="pending-button-spinner" />
          {pendingText}
        </span>
      ) : children}
    </button>
  );
}
