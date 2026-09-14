"use client";

import { useRouter } from "next/navigation";

export default function PublicProfileBackButton() {
  const router = useRouter();

  function goBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/responsavel");
  }

  return (
    <button
      type="button"
      className="public-profile-back"
      onClick={goBack}
      aria-label="Voltar para a página anterior"
    >
      <span aria-hidden="true">←</span>
      Voltar
    </button>
  );
}