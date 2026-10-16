"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type PendingSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
};

export default function PendingSubmitButton({
  children,
  pendingText = "Processando...",
  className,
  disabled,
  type = "submit",
  ...rest
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...rest}
      className={className}
      type={type}
      disabled={Boolean(disabled) || pending}
      aria-busy={pending}
    >
      {pending ? (
        <span className="pending-button-content" role="status" aria-live="polite">
          <i className="pending-button-spinner" aria-hidden="true" />
          {pendingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
