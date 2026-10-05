"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type GrowthChartRow = {
  ageMonths: number;
  p3?: number | null;
  p15?: number | null;
  p50?: number | null;
  p85?: number | null;
  p97?: number | null;
  whoZMinus3?: number | null;
  whoZMinus2?: number | null;
  whoZMinus1?: number | null;
  whoZ0?: number | null;
  whoZPlus1?: number | null;
  whoZPlus2?: number | null;
  whoZPlus3?: number | null;
  whoHeightZ?: number | null;
  athleteHeight?: number | null;
  athleteWeight?: number | null;
  athleteBmi?: number | null;
  measurementId?: string;
  date?: string;
  ageLabel?: string;
  growthDeltaCm?: number | null;
  growthVelocityCmPerYear?: number | null;
};

export type BoneAgeMarker = {
  id: string;
  ageMonthsAtExam: number;
  dateLabel: string;
  label: string;
};

export type AdultProjection = {
  ageMonths: number;
  centralCm: number;
  lowCm: number;
  highCm: number;
  method: string;
};

export type FamilyTarget = {
  ageMonths: number;
  centerCm: number;
  lowCm: number;
  highCm: number;
};

type Tab = "height" | "weight" | "bmi";
type ReferenceMode = "z" | "percentiles";
type HeightView = "current" | "to18";

const ADULT_VIEW_MONTHS = 216;

function ageTick(value: number) {
  const completedMonths = Math.round(value);
  const years = Math.floor(completedMonths / 12);
  const months = completedMonths % 12;
  return months ? `${years}a ${months}m` : `${years}a`;
}

function formatNumber(value: unknown, suffix = "", maximumFractionDigits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString("pt-BR", { maximumFractionDigits })}${suffix}`
    : "—";
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: GrowthChartRow }> }) {
  if (!active || !payload?.length) return null;
  const row = payload.find((item) => item.payload?.measurementId)?.payload;
  if (!row) return null;
  return (
    <div className="growth-tooltip">
      <strong>{row.date ? new Date(row.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Medição"}</strong>
      <span>{row.ageLabel || "Idade não disponível"}</span>
      <span>Altura: {formatNumber(row.athleteHeight, " cm")}</span>
      {row.whoHeightZ != null ? <span>Escore-Z OMS (altura/idade): {formatNumber(row.whoHeightZ)}</span> : null}
      <span>Peso: {formatNumber(row.athleteWeight, " kg")}</span>
      <span>IMC: {formatNumber(row.athleteBmi)}</span>
      <span>Crescimento: {formatNumber(row.growthDeltaCm, " cm")}</span>
      <span>Velocidade anual: {formatNumber(row.growthVelocityCmPerYear, " cm/ano")}</span>
    </div>
  );
}

function extendedTicks(minAgeMonths: number, maxAgeMonths: number) {
  const firstWholeYear = Math.ceil(minAgeMonths / 12) * 12;
  const span = maxAgeMonths - minAgeMonths;
  const step = span > 120 ? 24 : 12;
  const ticks: number[] = [];
  for (let month = firstWholeYear; month <= maxAgeMonths; month += step) ticks.push(month);
  if (!ticks.includes(ADULT_VIEW_MONTHS) && ADULT_VIEW_MONTHS >= minAgeMonths && ADULT_VIEW_MONTHS <= maxAgeMonths) {
    ticks.push(ADULT_VIEW_MONTHS);
  }
  return ticks.sort((a, b) => a - b);
}

export default function GrowthCharts({
  rows,
  boneAgeMarkers = [],
  adultProjection = null,
  familyTarget = null,
}: {
  rows: GrowthChartRow[];
  boneAgeMarkers?: BoneAgeMarker[];
  adultProjection?: AdultProjection | null;
  familyTarget?: FamilyTarget | null;
}) {
  const [tab, setTab] = useState<Tab>("height");
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("percentiles");
  const [heightView, setHeightView] = useState<HeightView>("to18");
  const [selected, setSelected] = useState<GrowthChartRow | null>(null);

  const athleteRows = useMemo(() => rows.filter((row) => row.measurementId), [rows]);
  const hasWho = rows.some((row) => row.whoZ0 != null);

  const athleteAgeRange = useMemo(() => {
    const ages = athleteRows.map((row) => row.ageMonths).filter(Number.isFinite);
    if (!ages.length) return { min: 61, max: 61 };
    return { min: Math.min(...ages), max: Math.max(...ages) };
  }, [athleteRows]);

  const heightMaxAge = heightView === "to18"
    ? Math.max(ADULT_VIEW_MONTHS, athleteAgeRange.max)
    : athleteAgeRange.max;

  const visibleRows = useMemo(() => {
    if (tab !== "height") return athleteRows;
    return rows.filter((row) => row.ageMonths <= heightMaxAge + 0.001);
  }, [athleteRows, heightMaxAge, rows, tab]);

  const xDomain = useMemo<[number, number]>(() => {
    const ages = visibleRows.map((row) => row.ageMonths).filter(Number.isFinite);
    const min = ages.length ? Math.min(...ages) : athleteAgeRange.min;
    const max = tab === "height" ? heightMaxAge : (ages.length ? Math.max(...ages) : athleteAgeRange.max);
    return [min, Math.max(min + 1, max)];
  }, [athleteAgeRange, heightMaxAge, tab, visibleRows]);

  const xTicks = useMemo(
    () => tab === "height" && heightView === "to18" ? extendedTicks(xDomain[0], xDomain[1]) : undefined,
    [heightView, tab, xDomain],
  );

  const yDomain = useMemo(() => {
    const values: number[] = [];
    for (const row of visibleRows) {
      if (tab === "height") {
        const keys = referenceMode === "z"
          ? (["whoZMinus3", "whoZPlus3", "athleteHeight"] as const)
          : (["p3", "p97", "athleteHeight"] as const);
        for (const key of keys) if (typeof row[key] === "number") values.push(row[key] as number);
      } else if (tab === "weight" && typeof row.athleteWeight === "number") values.push(row.athleteWeight);
      else if (tab === "bmi" && typeof row.athleteBmi === "number") values.push(row.athleteBmi);
    }

    if (tab === "height" && heightView === "to18") {
      if (adultProjection) values.push(adultProjection.lowCm, adultProjection.centralCm, adultProjection.highCm);
      if (familyTarget) values.push(familyTarget.lowCm, familyTarget.centerCm, familyTarget.highCm);
    }

    if (!values.length) return ["auto", "auto"] as const;
    const min = Math.floor(Math.min(...values) - (tab === "height" ? 4 : 2));
    const max = Math.ceil(Math.max(...values) + (tab === "height" ? 4 : 2));
    return [min, max] as const;
  }, [adultProjection, familyTarget, heightView, referenceMode, tab, visibleRows]);

  const athleteKey = tab === "height" ? "athleteHeight" : tab === "weight" ? "athleteWeight" : "athleteBmi";
  const unit = tab === "height" ? "cm" : tab === "weight" ? "kg" : "IMC";
  const showProjection = tab === "height" && heightView === "to18" && adultProjection != null;
  const showFamilyTarget = tab === "height" && heightView === "to18" && familyTarget != null;

  return (
    <section className="growth-chart-card">
      <div className="growth-chart-tabs" role="tablist" aria-label="Gráficos de crescimento">
        <button type="button" className={tab === "height" ? "active" : ""} onClick={() => setTab("height")}>Altura</button>
        <button type="button" className={tab === "weight" ? "active" : ""} onClick={() => setTab("weight")}>Peso</button>
        <button type="button" className={tab === "bmi" ? "active" : ""} onClick={() => setTab("bmi")}>IMC</button>
      </div>

      {tab === "height" ? (
        <div className="growth-controls-row">
          {hasWho ? (
            <div className="growth-reference-modes" role="group" aria-label="Referência OMS 2007">
              <span>REFERÊNCIA OMS 2007</span>
              <button type="button" className={referenceMode === "z" ? "active" : ""} onClick={() => setReferenceMode("z")}>Escore-Z</button>
              <button type="button" className={referenceMode === "percentiles" ? "active" : ""} onClick={() => setReferenceMode("percentiles")}>Percentis</button>
            </div>
          ) : null}

          <div className="growth-view-modes" role="group" aria-label="Faixa de visualização">
            <span>VISUALIZAÇÃO</span>
            <button type="button" className={heightView === "current" ? "active" : ""} onClick={() => setHeightView("current")}>Até hoje</button>
            <button type="button" className={heightView === "to18" ? "active" : ""} onClick={() => setHeightView("to18")}>Até 18 anos</button>
          </div>
        </div>
      ) : null}

      <div className="growth-chart-wrap">
        <ResponsiveContainer width="100%" height={460}>
          <ComposedChart data={visibleRows} margin={{ top: 24, right: showProjection ? 88 : 24, left: 4, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="ageMonths"
              type="number"
              domain={xDomain}
              ticks={xTicks}
              tickFormatter={ageTick}
              tick={{ fontSize: 11 }}
              allowDataOverflow={false}
            />
            <YAxis domain={yDomain} tick={{ fontSize: 11 }} unit={tab === "height" ? " cm" : tab === "weight" ? " kg" : ""} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {tab === "height" && hasWho && referenceMode === "z" ? (
              <>
                <Line type="monotone" dataKey="whoZMinus3" name="OMS −3 Z" stroke="#adb9c0" dot={false} strokeDasharray="4 4" connectNulls />
                <Line type="monotone" dataKey="whoZMinus2" name="OMS −2 Z" stroke="#b5c0c6" dot={false} strokeDasharray="4 4" connectNulls />
                <Line type="monotone" dataKey="whoZMinus1" name="OMS −1 Z" stroke="#a8b5bd" dot={false} strokeDasharray="3 3" connectNulls />
                <Line type="monotone" dataKey="whoZ0" name="OMS mediana (0 Z)" stroke="#637783" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="whoZPlus1" name="OMS +1 Z" stroke="#a8b5bd" dot={false} strokeDasharray="3 3" connectNulls />
                <Line type="monotone" dataKey="whoZPlus2" name="OMS +2 Z" stroke="#b5c0c6" dot={false} strokeDasharray="4 4" connectNulls />
                <Line type="monotone" dataKey="whoZPlus3" name="OMS +3 Z" stroke="#adb9c0" dot={false} strokeDasharray="4 4" connectNulls />
              </>
            ) : null}

            {tab === "height" && hasWho && referenceMode === "percentiles" ? (
              <>
                <Line type="monotone" dataKey="p3" name="OMS P3" stroke="#aeb7bd" dot={false} strokeDasharray="4 4" connectNulls />
                <Line type="monotone" dataKey="p15" name="OMS P15" stroke="#c4ccd1" dot={false} strokeDasharray="3 3" connectNulls />
                <Line type="monotone" dataKey="p50" name="OMS P50" stroke="#637783" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="p85" name="OMS P85" stroke="#c4ccd1" dot={false} strokeDasharray="3 3" connectNulls />
                <Line type="monotone" dataKey="p97" name="OMS P97" stroke="#aeb7bd" dot={false} strokeDasharray="4 4" connectNulls />
              </>
            ) : null}

            {tab === "height" ? boneAgeMarkers
              .filter((marker) => marker.ageMonthsAtExam >= xDomain[0] && marker.ageMonthsAtExam <= xDomain[1])
              .map((marker) => (
                <ReferenceLine
                  key={marker.id}
                  x={marker.ageMonthsAtExam}
                  stroke="#8b5cf6"
                  strokeDasharray="2 4"
                  label={{ value: "Idade óssea", position: "insideTopRight", fontSize: 10 }}
                />
              )) : null}

            {showProjection ? (
              <>
                <ReferenceArea
                  x1={Math.max(xDomain[0], adultProjection.ageMonths - 2)}
                  x2={adultProjection.ageMonths}
                  y1={adultProjection.lowCm}
                  y2={adultProjection.highCm}
                  fill="#99e600"
                  fillOpacity={0.12}
                  strokeOpacity={0}
                  ifOverflow="extendDomain"
                />
                <ReferenceLine
                  segment={[
                    { x: adultProjection.ageMonths, y: adultProjection.lowCm },
                    { x: adultProjection.ageMonths, y: adultProjection.highCm },
                  ]}
                  stroke="#75a900"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  ifOverflow="extendDomain"
                />
                <ReferenceDot
                  x={adultProjection.ageMonths}
                  y={adultProjection.centralCm}
                  r={6}
                  fill="#99e600"
                  stroke="#203000"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                  label={{
                    value: `Projeção ${formatNumber(adultProjection.centralCm, " cm", 1)}`,
                    position: "top",
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                />
              </>
            ) : null}

            {showFamilyTarget ? (
              <ReferenceDot
                x={familyTarget.ageMonths}
                y={familyTarget.centerCm}
                r={4}
                fill="#ffffff"
                stroke="#637783"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
            ) : null}

            <Line
              type="monotone"
              dataKey={athleteKey}
              name={`Atleta (${unit})`}
              stroke="#75a900"
              strokeWidth={3}
              connectNulls
              dot={(props: { cx?: number; cy?: number; payload?: GrowthChartRow }) => {
                const row = props.payload;
                if (!row?.measurementId || props.cx == null || props.cy == null) return <g />;
                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={5}
                    fill="#99e600"
                    stroke="#203000"
                    strokeWidth={2}
                    role="button"
                    tabIndex={0}
                    aria-label={`Abrir medição de ${row.date || "data não informada"}`}
                    onClick={() => setSelected(row)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") setSelected(row); }}
                    style={{ cursor: "pointer" }}
                  />
                );
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {tab === "height" && heightView === "to18" && (adultProjection || familyTarget) ? (
        <div className="growth-projection-summary">
          {adultProjection ? (
            <article>
              <span className="projection-dot projection-dot-primary" />
              <div>
                <small>PROJEÇÃO ADULTA · {adultProjection.method.toUpperCase()}</small>
                <strong>{formatNumber(adultProjection.centralCm, " cm", 1)}</strong>
                <span>Faixa aproximada: {formatNumber(adultProjection.lowCm, " cm", 1)} a {formatNumber(adultProjection.highCm, " cm", 1)}</span>
              </div>
            </article>
          ) : null}
          {familyTarget ? (
            <article>
              <span className="projection-dot projection-dot-family" />
              <div>
                <small>ALTURA-ALVO FAMILIAR</small>
                <strong>{formatNumber(familyTarget.centerCm, " cm", 1)}</strong>
                <span>Faixa de referência: {formatNumber(familyTarget.lowCm, " cm", 1)} a {formatNumber(familyTarget.highCm, " cm", 1)}</span>
              </div>
            </article>
          ) : null}
        </div>
      ) : null}

      {selected ? (
        <div className="growth-selected-point">
          <div><small>MEDIÇÃO SELECIONADA</small><strong>{selected.date ? new Date(selected.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}</strong></div>
          <span>{selected.ageLabel}</span>
          <span>{formatNumber(selected.athleteHeight, " cm")}</span>
          <span>{formatNumber(selected.athleteWeight, " kg")}</span>
          <span>IMC {formatNumber(selected.athleteBmi)}</span>
          {selected.whoHeightZ != null ? <span>Escore-Z OMS (altura/idade): {formatNumber(selected.whoHeightZ)}</span> : null}
          <button type="button" onClick={() => setSelected(null)}>Fechar</button>
        </div>
      ) : null}

      <p className="growth-reference-note">
        Curvas de altura por idade OMS 2007: referências populacionais para 5–19 anos (61–228 meses), por sexo e idade cronológica.
        Nesta tela, a visão estendida utiliza as referências até 18 anos (216 meses). A opção Escore-Z mostra −3 a +3; Percentis mostra P3, P15, P50, P85 e P97.
        A projeção Khamis-Roche é exibida aos 18 anos apenas como estimativa de estatura adulta; não representa uma medição futura nem uma trajetória anual prevista.
        Os gráficos de peso e IMC exibem somente a evolução individual nesta versão. A idade óssea é indicada apenas pela data do exame e não altera as curvas ou a projeção.
        Informação de acompanhamento esportivo. Não substitui avaliação pediátrica, endocrinológica ou nutricional.
      </p>

      <style jsx>{`
        .growth-chart-card{padding:22px;border:1px solid #dfe6ea;border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(8,26,38,.04)}
        .growth-chart-tabs{display:flex;gap:6px;margin-bottom:14px;padding:5px;border-radius:12px;background:#eef2f4;width:max-content;max-width:100%}
        .growth-chart-tabs button{border:0;border-radius:9px;padding:9px 16px;background:transparent;font-weight:800;color:#62727c;cursor:pointer}
        .growth-chart-tabs button.active{background:#99e600;color:#0b1806}
        .growth-controls-row{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:-4px 0 12px}
        .growth-reference-modes,.growth-view-modes{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .growth-reference-modes span,.growth-view-modes span{margin-right:6px;color:#657682;font-size:10px;font-weight:900;letter-spacing:.08em}
        .growth-reference-modes button,.growth-view-modes button{border:1px solid #dfe6ea;border-radius:8px;padding:7px 12px;background:#fff;color:#4f646d;font-size:11px;font-weight:800;cursor:pointer}
        .growth-reference-modes button.active,.growth-view-modes button.active{background:#eaf7d2;border-color:#99e600;color:#263b08}
        .growth-chart-wrap{width:100%;overflow:hidden}
        .growth-tooltip{display:grid;gap:4px;padding:12px;border:1px solid #dfe6ea;border-radius:12px;background:#fff;box-shadow:0 12px 30px rgba(0,0,0,.12);font-size:11px}
        .growth-tooltip strong{font-size:12px}.growth-tooltip span{color:#53636d}
        .growth-projection-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}
        .growth-projection-summary article{display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:1px solid #e1e8dc;border-radius:12px;background:#fafcf6}
        .growth-projection-summary article div{display:grid;gap:2px}.growth-projection-summary small{font-size:8px;font-weight:900;letter-spacing:.08em;color:#63727b}.growth-projection-summary strong{font-size:17px;color:#18231e}.growth-projection-summary span{font-size:10px;color:#687780}
        .projection-dot{width:10px;height:10px;border-radius:999px;margin-top:4px;flex:0 0 auto}.projection-dot-primary{background:#99e600;border:2px solid #203000}.projection-dot-family{background:#fff;border:2px solid #637783}
        .growth-selected-point{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;margin-top:12px;padding:12px 14px;border-radius:12px;background:#f4f8ea;font-size:12px}
        .growth-selected-point div{display:grid}.growth-selected-point small{font-size:8px;font-weight:900;letter-spacing:.1em;color:#6f8e16}.growth-selected-point button{margin-left:auto;border:0;background:transparent;font-weight:800;cursor:pointer}
        .growth-reference-note{margin:12px 0 0;color:#72818b;font-size:10px;line-height:1.5}
        @media(max-width:900px){.growth-projection-summary{grid-template-columns:1fr}}
        @media(max-width:700px){.growth-chart-card{padding:14px}.growth-chart-tabs{width:100%}.growth-chart-tabs button{flex:1;padding:8px}.growth-controls-row{align-items:stretch}.growth-reference-modes,.growth-view-modes{width:100%}.growth-reference-modes span,.growth-view-modes span{width:100%}}
      `}</style>
    </section>
  );
}
