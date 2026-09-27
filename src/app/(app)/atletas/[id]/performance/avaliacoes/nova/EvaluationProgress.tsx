"use client";

import { useEffect, useRef, useState } from "react";

export default function EvaluationProgress({
  totalCriteria,
}: {
  totalCriteria: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;

    const updateProgress = () => {
      const checked = form.querySelectorAll<HTMLInputElement>(
        'input[type="radio"][name^="score_"]:checked',
      );
      setCompleted(checked.length);
    };

    updateProgress();
    form.addEventListener("change", updateProgress);

    return () => {
      form.removeEventListener("change", updateProgress);
    };
  }, []);

  const percent = totalCriteria
    ? Math.min(100, Math.round((completed / totalCriteria) * 100))
    : 0;

  return (
    <div className="new-evaluation-v7-progress" ref={rootRef}>
      <div className="new-evaluation-v7-progress-copy">
        <span>PROGRESSO</span>
        <strong>
          {completed} de {totalCriteria} avaliados
        </strong>
      </div>
      <div
        className="new-evaluation-v7-progress-track"
        role="progressbar"
        aria-label="Progresso da avaliação"
        aria-valuemin={0}
        aria-valuemax={totalCriteria}
        aria-valuenow={completed}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
