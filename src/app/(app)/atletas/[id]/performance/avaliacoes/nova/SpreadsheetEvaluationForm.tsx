"use client";

import { useMemo, useState } from "react";
import styles from "./SpreadsheetEvaluationForm.module.css";

type Criterion = {
  id: string;
  label: string;
  levels: { score: number }[];
};

type Group = {
  key: string;
  title: string;
  criteria: Criterion[];
};

/**
 * A planilha original só traz critérios e a escala de 1 a 4, sem rubricas
 * comportamentais individuais. Por isso esta visualização é uma matriz de
 * pontuação e não reproduz as rubricas emprestadas do modelo profissional.
 *
 * Os nomes score_ID e notes_ID são idênticos aos esperados pela ação existente.
 */
export default function SpreadsheetEvaluationForm({
  groups,
  urgencyMax,
  attentionMax,
}: {
  groups: Group[];
  urgencyMax: number | null;
  attentionMax: number | null;
}) {
  const [grades, setGrades] = useState<Record<string, number>>({});
  const allCriteria = useMemo(() => groups.flatMap((group) => group.criteria), [groups]);
  const total = allCriteria.length;
  const answered = allCriteria.filter((criterion) => grades[criterion.id] !== undefined).length;
  const complete = total > 0 && answered === total;
  const percent = complete
    ? Math.round(
        (allCriteria.reduce((sum, criterion) => sum + grades[criterion.id], 0) / (total * 4)) * 1000,
      ) / 10
    : null;
  const stage = percent === null || urgencyMax === null || attentionMax === null
    ? null
    : percent <= urgencyMax
      ? "Estágio 1 · Nível de Urgência"
      : percent <= attentionMax
        ? "Estágio 2 · Nível de Atenção"
        : "Estágio 3 · Requisitos cumpridos com êxito";

  return (
    <section className={styles.root} aria-label="Pontuação da avaliação Técnico-Tática">
      <div className={styles.intro}>
        <div>
          <span className={styles.eyebrow}>MODELO 2 · AVALIAÇÃO TÉCNICO-TÁTICA</span>
          <h2>Planilha de pontuação</h2>
          <p>
            Atribua uma nota de 1 a 4 em cada critério. As quatro opções representam
            a escala de atingimento usada na planilha original; este modelo não utiliza
            as descrições detalhadas da Avaliação 11UP.
          </p>
        </div>
        <div className={styles.progress} aria-live="polite">
          <span>Critérios preenchidos</span>
          <strong>{answered} / {total}</strong>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${total ? (answered / total) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.scoreGuide}>
        <strong>Escala:</strong> <span>1 · Menor atingimento</span>
        <span>2</span><span>3</span><span>4 · Máximo atingimento</span>
      </div>

      {groups.map((group) => (
        <section className={styles.area} key={group.key} aria-label={group.title}>
          <div className={styles.areaHeading}>
            <h3>{group.title}</h3>
            <span>{group.criteria.length} critérios</span>
          </div>
          <div className={styles.rows}>
            {group.criteria.map((criterion, index) => (
              <div className={styles.row} key={criterion.id}>
                <div className={styles.criterionName}>
                  <span className={styles.index}>{index + 1}</span>{criterion.label}
                </div>
                <div className={styles.scoreOptions} role="group" aria-label={`Nota para ${criterion.label}`}>
                  {[1, 2, 3, 4].map((score) => (
                    <label
                      className={`${styles.scoreOption} ${grades[criterion.id] === score ? styles.selected : ""}`}
                      key={score}
                    >
                      <input
                        className={styles.scoreInput}
                        type="radio"
                        name={`score_${criterion.id}`}
                        value={score}
                        checked={grades[criterion.id] === score}
                        onChange={() => setGrades((current) => ({ ...current, [criterion.id]: score }))}
                        aria-label={`Nota ${score} para ${criterion.label}`}
                      />
                      <span>{score}</span>
                    </label>
                  ))}
                </div>
                <details className={styles.notes}>
                  <summary>Observação (opcional)</summary>
                  <textarea
                    name={`notes_${criterion.id}`}
                    rows={2}
                    placeholder="Registre uma observação sobre este critério."
                  />
                </details>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div className={styles.result} aria-live="polite">
        <div>
          <span>Resultado da planilha</span>
          <strong>{percent === null ? "Aguardando preenchimento" : `${percent.toLocaleString("pt-BR")}%`}</strong>
          {stage ? <p>{stage}</p> : (
            <p>
              {complete
                ? "Este modelo não possui faixas de classificação habilitadas."
                : `Preencha os ${total} critérios para calcular a classificação final.`}
            </p>
          )}
        </div>
        {urgencyMax !== null && attentionMax !== null ? (
          <div className={styles.thresholds}>
            Estágio 1: até {urgencyMax}% · Estágio 2: até {attentionMax}% · Estágio 3: acima de {attentionMax}%
          </div>
        ) : null}
      </div>
    </section>
  );
}
