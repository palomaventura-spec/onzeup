/** Rótulos da aba MODELO da planilha recebida. O arquivo original não é modificado. */
/** Marca exibida ao usuário. Chaves internas e dados históricos não são renomeados. */
export function format11UPName(value: string | null | undefined): string {
  return (value ?? "").replace(/\bONZEUP\b/gi, "11UP");
}

export const SPREADSHEET_MODEL = {
  "LINE_PLAYER": {
    "key": "PLANILHA_LINHA",
    "name": "Avaliação Técnico-Tática — Jogador de linha",
    "labels": [
      "AGILIDADE E MUDANÇA DE DIREÇÃO",
      "VELOCIDADE DE REAÇÃO",
      "RESISTÊNCIA GERAL",
      "EQUILÍBRIO ESTÁTICO",
      "FORÇA EXPLOSIVA",
      "CONTROLE E DOMÍNIO",
      "CONDUÇÃO DE BOLA",
      "PRECISÃO DE PASSE",
      "FINALIZAÇÃO E CHUTE",
      "DESARME",
      "NOÇÃO ESPACIAL E ALVO",
      "DISPERSÃO COM A BOLA",
      "RECOMPOSIÇÃO SEM A BOLA",
      "LEITURA DE LINHAS DE PASSE",
      "OCUPAÇÃO DE FUNÇOES",
      "VELOCIDADE NAS TOMADAS DE DECISÃO",
      "ATENÇÃO E FOCO SUSTENTADO",
      "LEITURA (VISÃO) DE JOGO",
      "RESOLUÇÃO DE PROBLEMAS",
      "MEMÓRIA DE JOGO",
      "TOLERÂNCIA À FRUSTAÇÃO",
      "AUTOCONFIANÇA E INICIATIVA",
      "RESPEITO E ESPÍRITO DE EQUIPE",
      "GESTÃO DE ESTRESSE",
      "MOTIVAÇÃO E ENGANJAMENTO"
    ]
  },
  "GOALKEEPER": {
    "key": "PLANILHA_GOLEIRO",
    "name": "Avaliação Técnico-Tática — Goleiro",
    "labels": [
      "TEMPO DE REAÇÃO MANUAL",
      "AGILIDADE NO SOLO",
      "COORDENAÇÃO OCULAR / MANUAL",
      "IMPULSÃO E SALTO",
      "FLEXIBILIDADE E ELASTICIDADE",
      "PEGA E ENCAIXE",
      "REPOSIÇÃO COM AS MÃOS",
      "JOGO COM OS PÉS (PASSE E CHUTE)",
      "ESPALMADA E DESVIO",
      "POSICIONAMENTO BASE",
      "NOÇÃO DE BALIZA/GOL",
      "PARTICIPAÇÃO NO ATAQUE",
      "COBERTURA DEFENSIVA",
      "ORIENTAÇÃO VERBAL",
      "TRANSIÇÃO OFENSIVA RÁPIDA",
      "LEITURA DA TRAJETÓRIA",
      "DECISÃO DE SAÍDA DE GOL",
      "ATENÇÃO PERIFÉRICA",
      "FOCO SUSTENTADO",
      "ADAPTAÇÃO À SUPERFÍCIE",
      "REAÇÃO PÓS GOL",
      "CORAGEM E INICIATIVA",
      "LIDERANÇA POSITIVA",
      "AUTOCONTROLE SOB PRESSÃO",
      "CONFIANÇA NAS AÇOES"
    ]
  }
} as const;

export const SPREADSHEET_CLASSIFICATION = {
  kind: "THREE_STAGES",
  urgencyMax: 35,
  attentionMax: 70,
} as const;

export type PerformanceClassificationConfig = {
  kind: "THREE_STAGES";
  urgencyMax: number;
  attentionMax: number;
};

export function parsePerformanceClassification(raw: string | null | undefined): PerformanceClassificationConfig | null {
  if (!raw) return null;
  try {
    const item: unknown = JSON.parse(raw);
    if (!item || typeof item !== "object") return null;
    const config = item as Record<string, unknown>;
    if (config.kind !== "THREE_STAGES") return null;
    const urgencyMax = Number(config.urgencyMax);
    const attentionMax = Number(config.attentionMax);
    if (!Number.isFinite(urgencyMax) || !Number.isFinite(attentionMax) ||
        urgencyMax < 0 || urgencyMax >= attentionMax || attentionMax > 100) return null;
    return { kind: "THREE_STAGES", urgencyMax, attentionMax };
  } catch { return null; }
}

/** Proporção do máximo (25 itens × 4 pontos = 100 na planilha original). */
export function performanceScorePercentage(scores: {score: number}[]): number | null {
  if (!scores.length) return null;
  return Math.round((scores.reduce((sum, item) => sum + item.score, 0) / (scores.length * 4)) * 1000) / 10;
}

export function performanceStage(percent: number | null, config: PerformanceClassificationConfig | null): string | null {
  if (percent === null || !config) return null;
  if (percent <= config.urgencyMax) return "Estágio 1 — Nível de Urgência";
  if (percent <= config.attentionMax) return "Estágio 2 — Nível de Atenção";
  return "Estágio 3 — Requisitos cumpridos com êxito";
}
