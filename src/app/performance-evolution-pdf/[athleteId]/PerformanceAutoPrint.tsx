"use client";

import { useEffect } from "react";

export default function PerformanceAutoPrint() {
  useEffect(() => {
    const timer = window.setTimeout(() => window.print(), 450);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="performance-print-actions no-print">
      <button type="button" onClick={() => window.print()}>
        Imprimir ou salvar em PDF
      </button>
    </div>
  );
}
