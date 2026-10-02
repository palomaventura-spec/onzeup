"use client";

import Link, { useLinkStatus } from "next/link";

function CategoryOpenLabel() {
  const { pending } = useLinkStatus();

  return (
    <>
      {pending ? "Abrindo…" : "Abrir categoria"}{" "}
      <span aria-hidden="true">{pending ? "⌛" : "→"}</span>
    </>
  );
}

/** Feedback imediato enquanto a navegação para a ficha está pendente. */
export default function CategoryOpenLink({ href }: { href: string }) {
  return (
    <Link className="category-v2-primary" href={href} aria-live="polite">
      <CategoryOpenLabel />
    </Link>
  );
}
