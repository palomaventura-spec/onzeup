/** Aparece durante o carregamento da ficha da categoria (App Router). */
export default function CategoryLoading() {
  return (
    <main
      role="status"
      aria-live="polite"
      style={{
        minWidth: 0,
        minHeight: "55vh",
        padding: "28px clamp(16px, 3vw, 34px)",
        background: "#f4f7f8",
      }}
    >
      <section
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "28px",
          borderRadius: 20,
          background: "#fff",
          border: "1px solid #dfe6ea",
          color: "#07131d",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 27,
            height: 27,
            flex: "0 0 27px",
            borderRadius: "50%",
            border: "3px solid #dce5e9",
            borderTopColor: "#76b900",
            animation: "category-page-loading-spin 0.7s linear infinite",
          }}
        />
        <div>
          <strong style={{ display: "block", fontSize: 17 }}>Abrindo categoria…</strong>
          <span style={{ color: "#607381", fontSize: 13 }}>
            Carregando os dados e o elenco da categoria.
          </span>
        </div>
      </section>
      <style>{`@keyframes category-page-loading-spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
