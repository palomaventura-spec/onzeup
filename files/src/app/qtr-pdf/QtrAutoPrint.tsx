"use client";

import { useEffect } from "react";

export default function QtrAutoPrint() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="qtr-print-actions no-print">
      <button type="button" onClick={() => window.print()}>
        Imprimir / Salvar como PDF
      </button>
      <button type="button" className="secondary" onClick={() => window.close()}>
        Fechar
      </button>
    </div>
  );
}
