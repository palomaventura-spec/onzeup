"use client";

export default function QtrPublicActions() {
  return (
    <div className="no-print" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
      <button
        type="button"
        onClick={() => window.print()}
        style={{
          minHeight: 42,
          border: 0,
          borderRadius: 10,
          padding: "0 16px",
          background: "#101820",
          color: "#fff",
          fontWeight: 800,
          cursor: "pointer",
        }}
      >
        Imprimir / salvar PDF
      </button>
    </div>
  );
}
