"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const createItems = [
  { href: "/treinos", label: "Novo treino" },
  { href: "/jogos", label: "Novo jogo" },
  { href: "/convocacoes", label: "Nova convocação" },
  { href: "/comunicacao", label: "Novo comunicado" },
  { href: "/atletas", label: "Novo atleta" },
] as const;

export default function MobileCreateMenu() {
  const pathname = usePathname();
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const details = detailsRef.current;

      if (
        details?.open &&
        event.target instanceof Node &&
        !details.contains(event.target)
      ) {
        closeMenu();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, []);

  return (
    <details
      ref={detailsRef}
      className="club-mobile-create-menu"
    >
      <summary>＋ Criar</summary>

      <div>
        {createItems.map((item) => (
          <Link
            href={item.href}
            key={item.href}
            onClick={closeMenu}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
