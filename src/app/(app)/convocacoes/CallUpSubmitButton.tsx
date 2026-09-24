"use client";

import type { PropsWithChildren } from "react";
import { useFormStatus } from "react-dom";

type Props = PropsWithChildren<{
  pendingText: string;
  className?: string;
}>;

export default function CallUpSubmitButton({
  children,
  pendingText,
  className,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingText : children}
    </button>
  );
}
