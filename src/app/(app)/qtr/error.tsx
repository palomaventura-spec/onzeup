"use client";

import { useEffect } from "react";

export default function QtrError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Falha ao carregar QTS:", error);
  }, [error]);

  return (
    <main className="qts-v11">
      <section style={{ maxWidth: 720, margin: "48px auto", padding: 28, border: "1px solid #e1e7eb", borderRadius: 18, background: "#ffffff", boxShadow: "0 8px 28px rgba(15, 23, 32, 0.08)" }}>
        <span className="qts-v11-eyebrow">QTS · CONEXÃO</span>
        <h1 style={{ margin: "8px 0 10px", fontSize: 26 }}>Não foi possível carregar o QTS</h1>
        <p style={{ margin: 0, color: "#667585", lineHeight: 1.6 }}>
          Houve uma falha temporária ao consultar os dados. Você pode tentar novamente sem perder nenhuma informação.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
          <button type="button" onClick={() => reset()} style={{ minHeight: 42, padding: "0 18px", border: 0, borderRadius: 10, background: "#98e600", color: "#0d1800", fontWeight: 800, cursor: "pointer" }}>
            Tentar novamente
          </button>
          <button type="button" onClick={() => { window.location.href = "/dashboard"; }} style={{ minHeight: 42, padding: "0 18px", border: "1px solid #d7dfe6", borderRadius: 10, background: "#ffffff", color: "#34434c", fontWeight: 700, cursor: "pointer" }}>
            Voltar à visão geral
          </button>
        </div>
        {error.digest ? <small style={{ display: "block", marginTop: 18, color: "#97a3ad" }}>Referência: {error.digest}</small> : null}
      </section>
    </main>
  );
}
