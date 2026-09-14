"use client";

import { useRouter } from "next/navigation";

export default function PublicProfileBackButton() {
  const router = useRouter();

  function goBack() {
    const referrer = document.referrer;

    if (referrer) {
      try {
        const previousUrl = new URL(referrer);

        if (previousUrl.pathname.startsWith("/responsavel")) {
          window.location.href = "/responsavel";
          return;
        }

        if (
          previousUrl.pathname === "/players" ||
          previousUrl.hostname === "players.onzeup.com.br"
        ) {
          router.back();
          return;
        }
      } catch {
        // Continua para o catálogo caso a origem não seja reconhecida.
      }
    }

    router.push("/players");
  }

  return (
    <button
      type="button"
      className="public-profile-back"
      onClick={goBack}
      aria-label="Voltar"
    >
      <span aria-hidden="true">←</span>
      Voltar
    </button>
  );
}