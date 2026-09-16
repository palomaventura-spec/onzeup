"use client";

export default function SumulaPrintButton() {
  return (
    <button
      className="btn btn-secondary"
      type="button"
      onClick={() => window.print()}
    >
      Imprimir / PDF
    </button>
  );
}
