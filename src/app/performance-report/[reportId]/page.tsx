import Link from "next/link";
import { notFound } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { getEffectiveClubRole } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";
import { whoHeightPercentiles, type GrowthReferenceSex } from "@/lib/who2007-height-lms";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function textValue(value: unknown, fallback = "—") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function dateValue(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR");
}

function formatDate(date: Date | null | undefined) {
  return date ? date.toLocaleDateString("pt-BR") : "—";
}

function typeLabel(type: string) {
  if (type === "TRAINING") return "Treino";
  if (type === "MATCH") return "Jogo";
  if (type === "GPS") return "GPS";
  if (type === "EVALUATION") return "Avaliação profissional";
  if (type === "TECHNICAL_RECORD") return "Registro técnico";
  if (type === "CONSOLIDATED") return "Consolidado";
  if (type === "MEASUREMENTS") return "Evolução corporal";
  if (type === "DOCUMENTS") return "Documentos";
  if (type === "GROWTH") return "Crescimento e projeções";
  return type;
}

function sportLabel(value: unknown) {
  if (value === "FOOTBALL") return "Campo";
  if (value === "FUTSAL") return "Futsal";
  if (value === "BOTH") return "Mista / não definida";
  return "Não informada";
}

function athleteInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "";
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : parts[0].slice(0, 2);
  return initials.toLocaleUpperCase("pt-BR");
}

function technicalTopicLabel(value: unknown) {
  const labels: Record<string, string> = {
    TECHNICAL: "Técnico",
    TACTICAL: "Tático",
    PHYSICAL: "Físico",
    COGNITIVE: "Cognitivo",
    EMOTIONAL: "Emocional",
    BEHAVIORAL: "Comportamental",
    OCCURRENCE: "Ocorrência",
    GENERAL: "Geral",
  };
  const key = typeof value === "string" ? value : "";
  return labels[key] || "Geral";
}

function technicalSourceLabel(value: unknown) {
  const labels: Record<string, string> = {
    TRAINING: "Treino",
    MATCH: "Jogo",
    EVALUATION: "Avaliação",
    GPS: "GPS",
    CATEGORY_CHANGE: "Mudança de categoria",
    REPORT: "Relatório",
    MANUAL: "Registro manual",
  };
  const key = typeof value === "string" ? value : "";
  return labels[key] || "Registro da comissão";
}

function trainingStatusLabel(status: unknown) {
  const labels: Record<string, string> = {
    PRESENT: "Presente",
    ABSENT: "Falta",
    JUSTIFIED_ABSENCE: "Falta justificada",
    INJURED: "Lesionado",
    EXCUSED: "Dispensado",
    LATE: "Atraso",
    PARTIAL: "Parcial",
    PENDING: "Pendente",
    NOT_DISCLOSED: "Indisponível (motivo reservado)",
  };
  const key = typeof status === "string" ? status : "";
  return labels[key] || textValue(status);
}

function lineupLabel(value: unknown) {
  const labels: Record<string, string> = {
    STARTER: "Titular",
    SUBSTITUTE: "Reserva",
    DID_NOT_PLAY: "Não atuou",
  };
  const key = typeof value === "string" ? value : "";
  return labels[key] || textValue(value);
}

function contextLabel(value: unknown) {
  if (value === "TRAINING") return "Treino";
  if (value === "MATCH") return "Jogo";
  return textValue(value);
}

function areaLabel(value: unknown) {
  const labels: Record<string, string> = {
    PHYSICAL: "Física",
    TECHNICAL: "Técnica",
    TACTICAL: "Tática",
    COGNITIVE: "Cognitiva",
    EMOTIONAL: "Emocional",
    BEHAVIORAL: "Comportamental",
    COMPETITIVE: "Competitiva",
  };
  const key = typeof value === "string" ? value : "";
  return labels[key] || textValue(value);
}

function scoreAverage(records: unknown[]) {
  const values = records
    .map((item) => numberValue(asRecord(item).score, 0))
    .filter((value) => value > 0);

  if (!values.length) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function SummaryCard({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="report-kpi">
      <span>{label}</span>
      <strong>
        {value}
        {suffix ? <small>{suffix}</small> : null}
      </strong>
    </div>
  );
}

function MeasurementTrendChart({ records, metric, title }: {
  records: unknown[];
  metric: "heightCm" | "weightKg";
  title: string;
}) {
  const values = records.map(asRecord).filter((item) =>
    typeof item[metric] === "number" && Number.isFinite(Number(item[metric])),
  );
  if (!values.length) return null;
  const numbers = values.map((item) => Number(item[metric]));
  const minimum = Math.min(...numbers);
  const maximum = Math.max(...numbers);
  const range = Math.max(maximum - minimum, 1);
  const points = numbers.map((value, index) => {
    const x = numbers.length === 1 ? 152 : 12 + (index * 280) / (numbers.length - 1);
    const y = 66 - ((value - minimum) / range) * 50;
    return { x, y };
  });
  return <div className="dossier-chart">
    <strong>{title}</strong>
    <svg viewBox="0 0 304 82" role="img" aria-label={`Evolução: ${title}`}>
      <path d="M12 66H292" stroke="#dce4e7" strokeWidth="1" fill="none"/>
      <polyline points={points.map((point) => `${point.x},${point.y}`).join(" ")}
        stroke="#729b0a" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      {points.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r="3.5" fill="#729b0a"/>)}
    </svg>
    <span>{numbers[0].toLocaleString("pt-BR")} → {numbers[numbers.length - 1].toLocaleString("pt-BR")}</span>
  </div>;
}


function growthSex(value: unknown): GrowthReferenceSex | null {
  return value === "BOY" || value === "GIRL" ? value : null;
}

function boneMethodLabel(value: unknown) {
  if (value === "GREULICH_PYLE") return "Greulich-Pyle";
  if (value === "TANNER_WHITEHOUSE") return "Tanner-Whitehouse";
  return "Outro";
}

function growthNumber(value: unknown, digits = 1) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-BR", { maximumFractionDigits: digits })
    : "—";
}

function GrowthSnapshotChart({ growth }: { growth: JsonRecord }) {
  const sex = growthSex(growth.referenceSex);
  const measurements = asArray(growth.measurements)
    .map(asRecord)
    .filter((item) => nullableNumber(item.ageMonths) != null && nullableNumber(item.heightCm) != null);

  if (!sex || !measurements.length) {
    return <p className="technical-empty">Curva OMS indisponível: faltam sexo de referência ou medições válidas.</p>;
  }

  const whoRows: Array<{ ageMonths: number; p3: number; p15: number; p50: number; p85: number; p97: number }> = [];
  for (let month = 61; month <= 216; month += 3) {
    const row = whoHeightPercentiles(month, sex);
    if (
      row &&
      row.p3 !== null &&
      row.p15 !== null &&
      row.p50 !== null &&
      row.p85 !== null &&
      row.p97 !== null
    ) {
      whoRows.push({
        ageMonths: month,
        p3: row.p3,
        p15: row.p15,
        p50: row.p50,
        p85: row.p85,
        p97: row.p97,
      });
    }
  }

  const projection = asRecord(growth.khamisRoche);
  const target = asRecord(growth.targetHeight);
  const measuredAges = measurements.map((item) => numberValue(item.ageMonths));
  const measuredHeights = measurements.map((item) => numberValue(item.heightCm));
  const yValues = [
    ...measuredHeights,
    ...whoRows.flatMap((row) => [row.p3, row.p15, row.p50, row.p85, row.p97]),
  ];
  const projectionLow = nullableNumber(projection.lowCm);
  const projectionCenter = nullableNumber(projection.centralCm);
  const projectionHigh = nullableNumber(projection.highCm);
  const targetCenter = nullableNumber(target.centerCm);
  if (projectionLow != null) yValues.push(projectionLow);
  if (projectionCenter != null) yValues.push(projectionCenter);
  if (projectionHigh != null) yValues.push(projectionHigh);
  if (targetCenter != null) yValues.push(targetCenter);

  const width = 760;
  const height = 310;
  const left = 46;
  const right = 88;
  const top = 20;
  const bottom = 38;
  const minAge = Math.min(60, ...measuredAges);
  const maxAge = 216;
  const yMin = Math.floor(Math.min(...yValues) - 5);
  const yMax = Math.ceil(Math.max(...yValues) + 5);
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const x = (age: number) => left + ((age - minAge) / Math.max(1, maxAge - minAge)) * plotW;
  const y = (cm: number) => top + ((yMax - cm) / Math.max(1, yMax - yMin)) * plotH;
  const line = (items: Array<{ ageMonths: number; value: number }>) =>
    items.map((item) => `${x(item.ageMonths).toFixed(1)},${y(item.value).toFixed(1)}`).join(" ");
  const whoLine = (key: "p3" | "p15" | "p50" | "p85" | "p97") =>
    line(whoRows.map((row) => ({ ageMonths: row.ageMonths, value: row[key] })));
  const athleteLine = line(measurements.map((item) => ({
    ageMonths: numberValue(item.ageMonths),
    value: numberValue(item.heightCm),
  })));
  const xTicks = [60, 84, 108, 132, 156, 180, 204, 216].filter((age) => age >= minAge);
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4);

  return (
    <div className="growth-print-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Curva de altura por idade OMS 2007 até 18 anos">
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
            <line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#dbe3e6" strokeWidth="1" strokeDasharray="4 4" />
            <text x={left - 7} y={y(tick) + 4} textAnchor="end" fontSize="10" fill="#60717c">{Math.round(tick)} cm</text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={`x-${tick}`}>
            <line x1={x(tick)} x2={x(tick)} y1={top} y2={height - bottom} stroke="#eef2f3" strokeWidth="1" />
            <text x={x(tick)} y={height - 16} textAnchor="middle" fontSize="10" fill="#60717c">
              {tick === 216 ? "18a" : `${Math.floor(tick / 12)}a`}
            </text>
          </g>
        ))}

        <polyline points={whoLine("p3")} fill="none" stroke="#b7c5cc" strokeWidth="1.2" strokeDasharray="5 5" />
        <polyline points={whoLine("p15")} fill="none" stroke="#c8d3d8" strokeWidth="1.2" strokeDasharray="4 4" />
        <polyline points={whoLine("p50")} fill="none" stroke="#607984" strokeWidth="2" />
        <polyline points={whoLine("p85")} fill="none" stroke="#c8d3d8" strokeWidth="1.2" strokeDasharray="4 4" />
        <polyline points={whoLine("p97")} fill="none" stroke="#b7c5cc" strokeWidth="1.2" strokeDasharray="5 5" />

        {athleteLine ? <polyline points={athleteLine} fill="none" stroke="#79aa00" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /> : null}
        {measurements.map((item, index) => (
          <circle key={`m-${index}`} cx={x(numberValue(item.ageMonths))} cy={y(numberValue(item.heightCm))} r="4" fill="#99e600" stroke="#274000" strokeWidth="1.5" />
        ))}

        {projectionCenter != null ? (
          <g>
            {projectionLow != null && projectionHigh != null ? (
              <>
                <line x1={x(216)} x2={x(216)} y1={y(projectionHigh)} y2={y(projectionLow)} stroke="#7357c8" strokeWidth="5" strokeLinecap="round" opacity=".4" />
                <line x1={x(216) - 7} x2={x(216) + 7} y1={y(projectionHigh)} y2={y(projectionHigh)} stroke="#7357c8" strokeWidth="1.5" />
                <line x1={x(216) - 7} x2={x(216) + 7} y1={y(projectionLow)} y2={y(projectionLow)} stroke="#7357c8" strokeWidth="1.5" />
              </>
            ) : null}
            <circle cx={x(216)} cy={y(projectionCenter)} r="5" fill="#7357c8" />
            <text x={x(216) - 8} y={Math.max(14, y(projectionCenter) - 9)} textAnchor="end" fontSize="10" fontWeight="700" fill="#5f45ad">
              K-R {growthNumber(projectionCenter)} cm
            </text>
          </g>
        ) : null}

        {targetCenter != null ? (
          <g>
            <rect x={x(216) - 4} y={y(targetCenter) - 4} width="8" height="8" fill="#243a45" />
            <text x={x(216) - 8} y={y(targetCenter) + 15} textAnchor="end" fontSize="9" fill="#243a45">
              alvo familiar {growthNumber(targetCenter)} cm
            </text>
          </g>
        ) : null}

        {(() => {
          const last = whoRows[whoRows.length - 1];
          if (!last) return null;
          return (
            <>
              <text x={width - right + 12} y={y(last.p97) + 3} fontSize="9" fill="#7a8991">OMS P97</text>
              <text x={width - right + 12} y={y(last.p85) + 3} fontSize="9" fill="#8b9ba3">OMS P85</text>
              <text x={width - right + 12} y={y(last.p50) + 3} fontSize="9" fill="#526b77">OMS P50</text>
              <text x={width - right + 12} y={y(last.p15) + 3} fontSize="9" fill="#8b9ba3">OMS P15</text>
              <text x={width - right + 12} y={y(last.p3) + 3} fontSize="9" fill="#7a8991">OMS P3</text>
            </>
          );
        })()}
      </svg>
      <div className="growth-chart-legend">
        <span><i className="athlete-dot" />Medições reais</span>
        <span><i className="who-line" />Referência OMS 2007</span>
        <span><i className="projection-dot" />Projeção adulta Khamis-Roche</span>
      </div>
      <p className="growth-chart-note">
        O ponto aos 18 anos representa uma estimativa de estatura adulta, não uma medição futura.
      </p>
    </div>
  );
}

function GrowthReportSections({ growth }: { growth: JsonRecord }) {
  const latest = asRecord(growth.latest);
  const projection = asRecord(growth.khamisRoche);
  const target = asRecord(growth.targetHeight);
  const measurements = asArray(growth.measurements).map(asRecord);
  const boneAges = asArray(growth.boneAgeAssessments).map(asRecord);

  return (
    <>
      <section className="report-section growth-private-section">
        <div className="report-section-title">
          <span>CRESCIMENTO E DESENVOLVIMENTO FÍSICO · PRIVADO</span>
          <h3>Situação atual e projeções</h3>
        </div>
        <div className="report-kpis four">
          <SummaryCard label="ALTURA ATUAL" value={growthNumber(latest.heightCm)} suffix=" cm" />
          <SummaryCard label="PESO ATUAL" value={growthNumber(latest.weightKg)} suffix=" kg" />
          <SummaryCard label="IMC" value={growthNumber(latest.bmi)} />
          <SummaryCard label="VELOCIDADE" value={growthNumber(latest.growthVelocityCmPerYear, 2)} suffix=" cm/ano" />
        </div>
        <div className="growth-projection-grid">
          <div className="growth-projection-card">
            <span>PROJEÇÃO KHAMIS-ROCHE</span>
            <strong>{nullableNumber(projection.centralCm) == null ? "—" : `${growthNumber(projection.centralCm)} cm`}</strong>
            <small>{nullableNumber(projection.lowCm) != null && nullableNumber(projection.highCm) != null
              ? `Faixa aproximada: ${growthNumber(projection.lowCm)} a ${growthNumber(projection.highCm)} cm`
              : "Dados insuficientes para projeção."}</small>
          </div>
          <div className="growth-projection-card">
            <span>ALTURA-ALVO FAMILIAR</span>
            <strong>{nullableNumber(target.centerCm) == null ? "—" : `${growthNumber(target.centerCm)} cm`}</strong>
            <small>{nullableNumber(target.lowCm) != null && nullableNumber(target.highCm) != null
              ? `Faixa de referência: ${growthNumber(target.lowCm)} a ${growthNumber(target.highCm)} cm`
              : "Alturas parentais não informadas."}</small>
          </div>
        </div>
        <p className="technical-disclosure">Idade na última medição: {textValue(latest.ageLabel)} · Referência: {textValue(growth.whoReference, "OMS 2007")}. A projeção é uma estimativa estatística e não representa altura garantida.</p>
      </section>

      <section className="report-section growth-chart-section">
        <div className="report-section-title"><span>CURVA OMS 2007</span><h3>Altura por idade até 18 anos</h3></div>
        <GrowthSnapshotChart growth={growth} />
      </section>

      <section className="report-section">
        <div className="report-section-title"><span>HISTÓRICO</span><h3>Medições de crescimento</h3></div>
        <table className="report-table">
          <thead><tr><th>Data</th><th>Idade</th><th>Altura</th><th>Peso</th><th>IMC</th><th>Crescimento</th><th>Velocidade</th></tr></thead>
          <tbody>
            {measurements.length ? measurements.map((item, index) => (
              <tr key={textValue(item.id, String(index))}>
                <td>{dateValue(item.date)}</td><td>{textValue(item.ageLabel)}</td>
                <td>{growthNumber(item.heightCm)} cm</td><td>{growthNumber(item.weightKg)} kg</td><td>{growthNumber(item.bmi)}</td>
                <td>{nullableNumber(item.growthDeltaCm) == null ? "—" : `${growthNumber(item.growthDeltaCm)} cm`}</td>
                <td>{nullableNumber(item.growthVelocityCmPerYear) == null ? "—" : `${growthNumber(item.growthVelocityCmPerYear, 2)} cm/ano`}</td>
              </tr>
            )) : <tr><td colSpan={7}>Nenhuma medição disponível.</td></tr>}
          </tbody>
        </table>
      </section>

      {boneAges.length ? (
        <section className="report-section">
          <div className="report-section-title"><span>IDADE ÓSSEA · INFORMAÇÃO COMPLEMENTAR</span><h3>Exames registrados</h3></div>
          <table className="report-table"><thead><tr><th>Data</th><th>Idade óssea informada</th><th>Método</th></tr></thead><tbody>
            {boneAges.map((item, index) => <tr key={textValue(item.id, String(index))}><td>{dateValue(item.date)}</td><td>{Math.floor(numberValue(item.boneAgeMonths) / 12)}a {numberValue(item.boneAgeMonths) % 12}m</td><td>{boneMethodLabel(item.method)}</td></tr>)}
          </tbody></table>
          <p className="technical-disclosure">A idade óssea é exibida como referência do exame cadastrado e não altera automaticamente a projeção Khamis-Roche.</p>
        </section>
      ) : null}

      <section className="growth-report-disclaimer">
        {textValue(growth.disclaimer, "Informação de acompanhamento esportivo. Não substitui avaliação pediátrica, endocrinológica ou nutricional.")}
      </section>
    </>
  );
}

export default async function AthletePerformanceReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ print?: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { reportId } = await params;
  const query = await searchParams;

  const report = await prisma.performanceReport.findFirst({
    where: {
      id: reportId,
      organizationId: user.organizationId,
    },
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
          nickname: true,
          position: true,
          photoUrl: true,
          category: { select: { name: true } },
        },
      },
      organization: {
        select: {
          name: true,
          publicName: true,
          logoUrl: true,
        },
      },
      generatedBy: {
        select: { name: true },
      },
    },
  });

  if (!report) notFound();

  const snapshot = asRecord(report.snapshot);
  const isGrowthReport = report.reportType === "CONSOLIDATED" && snapshot.documentKind === "GROWTH_REPORT";
  const isDossier = report.reportType === "CONSOLIDATED" &&
    (snapshot.documentKind === "INTERNAL_DOSSIER" || snapshot.documentKind === "SHAREABLE_DOSSIER");
  const internalDossier = snapshot.documentKind === "INTERNAL_DOSSIER";
  if (report.reportType === "CONSOLIDATED" && !isDossier && !isGrowthReport) notFound();
  if ((internalDossier || isGrowthReport) && (user.role === "SUPER_ADMIN" || getEffectiveClubRole(user) !== "MANAGER")) {
    notFound();
  }
  // Defesa adicional: o prontuário compartilhável nunca pode carregar dados privados de crescimento.
  if (isDossier && !internalDossier && (asArray(snapshot.documents).length || snapshot.growth)) notFound();
  const summary = asRecord(snapshot.summary);
  const records = asArray(snapshot.records);
  const evaluation = asRecord(snapshot.evaluation);
  const evaluationScores = asArray(evaluation.scores);

  // O documento técnico só exibe registros explicitamente autorizados
  // para compartilhamento. A geração deve aplicar a mesma regra na origem.
  const isTechnicalRecord =
    snapshot.documentKind === "TECHNICAL_RECORD" ||
    String(report.reportType) === "TECHNICAL_RECORD";
  const technicalRecords = isTechnicalRecord
    ? records.map(asRecord).filter((item) => item.visibility === "SHAREABLE")
    : [];
  const technicalFollowUps = technicalRecords.filter(
    (item) => item.followUpRequired === true,
  );
  const technicalPending = technicalFollowUps.filter(
    (item) => !item.followUpResolvedAt,
  ).length;

  // O prontuário interno apresenta todos os registros do histórico congelado;
  // o compartilhável nunca apresenta registros sem autorização SHAREABLE.
  const dossierTechnicalRecords = isDossier
    ? asArray(snapshot.technicalRecords)
        .map(asRecord)
        .filter((item) => internalDossier || item.visibility === "SHAREABLE")
    : [];
  const dossierTechnicalFollowUps = dossierTechnicalRecords.filter(
    (item) => item.followUpRequired === true,
  );
  const dossierTechnicalPending = dossierTechnicalFollowUps.filter(
    (item) => !item.followUpResolvedAt,
  ).length;

  const dossierAthlete = asRecord(snapshot.athlete);
  const athleteName = isDossier
    ? textValue(dossierAthlete.nickname, textValue(dossierAthlete.name, report.athlete.name))
    : report.athlete.nickname || report.athlete.name;
  const clubName = report.organization.publicName || report.organization.name;
  const autoPrint = query.print === "1";

  const groupedScores = evaluationScores.reduce<Record<string, unknown[]>>(
    (groups, item) => {
      const area = textValue(asRecord(item).area, "OUTROS");
      if (!groups[area]) groups[area] = [];
      groups[area].push(item);
      return groups;
    },
    {},
  );

  return (
    <main className="performance-report-print">
      {autoPrint ? (
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("load",function(){window.setTimeout(function(){window.print();},350);});',
          }}
        />
      ) : null}

      <div className="report-actions no-print">
        <Link
          className="report-action secondary"
          href={`/atletas/${report.athlete.id}/performance/relatorios`}
        >
          ← Voltar aos relatórios
        </Link>

        <Link
          className="report-action primary"
          href={`/performance-report/${report.id}?print=1`}
          target="_blank"
        >
          Imprimir / Salvar PDF
        </Link>
      </div>

      <article className="report-sheet">
        <header className="report-header">
          <div className="report-brand">
            {(isDossier ? dossierAthlete.photoUrl : report.athlete.photoUrl) ? (
              <img
                className="report-athlete-avatar"
                src={textValue(isDossier ? dossierAthlete.photoUrl : report.athlete.photoUrl)}
                alt={`Foto de ${athleteName}`}
              />
            ) : athleteInitials(athleteName) ? (
              <div className="report-logo-fallback" aria-label={`Iniciais de ${athleteName}`}>
                {athleteInitials(athleteName)}
              </div>
            ) : report.organization.logoUrl ? (
              <img src={report.organization.logoUrl} alt={`Escudo de ${clubName}`} />
            ) : (
              <div className="report-logo-fallback" aria-label="11UP">UP</div>
            )}

            <div>
              <span className="report-overline">11UP PERFORMANCE · CLUB ELITE</span>
              <strong>{clubName}</strong>
            </div>
          </div>

          <div className="report-type">
            <span>{isGrowthReport ? "RELATÓRIO PRIVADO" : isDossier ? "PRONTUÁRIO ESPORTIVO" : "RELATÓRIO INDIVIDUAL"}</span>
            <h1>{isGrowthReport ? "Crescimento e desenvolvimento físico" : isDossier ? (internalDossier ? "Prontuário interno" : "Prontuário compartilhável") : isTechnicalRecord ? "Registro técnico" : typeLabel(report.reportType)}</h1>
          </div>
        </header>

        <section className="report-athlete">
          <div>
            <span className="report-eyebrow">ATLETA</span>
            <h2>{athleteName}</h2>
            <p>
              {isDossier ? textValue(dossierAthlete.name, report.athlete.name) : report.athlete.name}
              {textValue(asRecord(snapshot.athlete).categoryName, report.athlete.category?.name || "")
                ? ` · ${textValue(asRecord(snapshot.athlete).categoryName, report.athlete.category?.name || "")}`
                : ""}
              {(isDossier ? dossierAthlete.position : report.athlete.position)
                ? ` · ${textValue(isDossier ? dossierAthlete.position : report.athlete.position)}` : ""}
            </p>
          </div>

          <dl>
            <div>
              <dt>Período</dt>
              <dd>
                {report.periodStart && report.periodEnd
                  ? `${formatDate(report.periodStart)} – ${formatDate(report.periodEnd)}`
                  : report.reportType === "EVALUATION"
                    ? `${dateValue(evaluation.periodStart)} – ${dateValue(evaluation.periodEnd)}`
                    : "—"}
              </dd>
            </div>
            <div>
              <dt>Modalidade</dt>
              <dd>{isGrowthReport ? "Acompanhamento físico" : isDossier && report.sport === "BOTH" ? "Campo e futsal" : sportLabel(report.sport)}</dd>
            </div>
            <div>
              <dt>Gerado em</dt>
              <dd>{formatDate(report.createdAt)}</dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>{report.generatedBy?.name || "—"}</dd>
            </div>
          </dl>
        </section>

        {report.reportType === "TRAINING" ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>RESUMO</span>
                <h3>Desempenho nos treinos</h3>
              </div>

              <div className="report-kpis four">
                <SummaryCard label="TREINOS" value={numberValue(summary.sessions)} />
                <SummaryCard label="PRESENÇAS" value={numberValue(summary.present)} />
                <SummaryCard label="FREQUÊNCIA" value={numberValue(summary.attendanceRate)} suffix="%" />
                <SummaryCard label="MINUTAGEM" value={numberValue(summary.minutesPresent)} suffix=" min" />
              </div>
            </section>

            <section className="report-section">
              <div className="report-section-title">
                <span>HISTÓRICO</span>
                <h3>Treinos do período</h3>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Minutos</th>
                    <th>Local</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length ? (
                    records.map((raw, index) => {
                      const item = asRecord(raw);
                      const session = asRecord(item.session);
                      return (
                        <tr key={textValue(item.id, String(index))}>
                          <td>{dateValue(session.startsAt)}</td>
                          <td>{textValue(session.trainingType)}</td>
                          <td>{trainingStatusLabel(item.status)}</td>
                          <td>{textValue(item.minutesPresent, "0")}</td>
                          <td>{textValue(session.location)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5}>Nenhum treino encontrado no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        ) : null}

        {report.reportType === "MATCH" ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>RESUMO</span>
                <h3>Desempenho em jogos</h3>
              </div>

              <div className="report-kpis six">
                <SummaryCard label="JOGOS" value={numberValue(summary.matches)} />
                <SummaryCard label="MINUTOS" value={numberValue(summary.minutes)} />
                <SummaryCard label="GOLS" value={numberValue(summary.goals)} />
                <SummaryCard label="ASSISTÊNCIAS" value={numberValue(summary.assists)} />
                <SummaryCard label="AMARELOS" value={numberValue(summary.yellowCards)} />
                <SummaryCard label="VERMELHOS" value={numberValue(summary.redCards)} />
              </div>
            </section>

            <section className="report-section">
              <div className="report-section-title">
                <span>HISTÓRICO</span>
                <h3>Jogos do período</h3>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Adversário</th>
                    <th>Competição</th>
                    <th>Função</th>
                    <th>Min</th>
                    <th>G</th>
                    <th>A</th>
                    <th>Cartões</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length ? (
                    records.map((raw, index) => {
                      const item = asRecord(raw);
                      const match = asRecord(item.match);
                      return (
                        <tr key={textValue(item.id, String(index))}>
                          <td>{dateValue(match.startsAt)}</td>
                          <td>{textValue(match.opponent)}</td>
                          <td>{textValue(match.competition)}</td>
                          <td>{lineupLabel(item.lineupRole)}</td>
                          <td>{numberValue(item.minutesPlayed)}</td>
                          <td>{numberValue(item.goals)}</td>
                          <td>{numberValue(item.assists)}</td>
                          <td>
                            {numberValue(item.yellowCards)}A · {numberValue(item.redCards)}V
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>Nenhum jogo encontrado no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        ) : null}

        {report.reportType === "GPS" ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>RESUMO</span>
                <h3>Carga e métricas de GPS</h3>
              </div>

              <div className="report-kpis five">
                <SummaryCard label="SESSÕES" value={numberValue(summary.sessions)} />
                <SummaryCard
                  label="DISTÂNCIA"
                  value={Math.round(numberValue(summary.totalDistanceMeters))}
                  suffix=" m"
                />
                <SummaryCard
                  label="VEL. MÁX."
                  value={numberValue(summary.maxSpeedKmh)}
                  suffix=" km/h"
                />
                <SummaryCard
                  label="ALTA INTENSIDADE"
                  value={Math.round(numberValue(summary.totalHighIntensityDistanceMeters))}
                  suffix=" m"
                />
                <SummaryCard
                  label="PLAYER LOAD"
                  value={nullableNumber(summary.averagePlayerLoad) ?? "—"}
                />
              </div>
            </section>

            <section className="report-section">
              <div className="report-section-title">
                <span>HISTÓRICO</span>
                <h3>Sessões do período</h3>
              </div>

              <table className="report-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Contexto</th>
                    <th>Duração</th>
                    <th>Distância</th>
                    <th>Vel. máx.</th>
                    <th>Sprints</th>
                    <th>Alta intensidade</th>
                    <th>Load</th>
                  </tr>
                </thead>
                <tbody>
                  {records.length ? (
                    records.map((raw, index) => {
                      const item = asRecord(raw);
                      return (
                        <tr key={textValue(item.id, String(index))}>
                          <td>{dateValue(item.activityAt)}</td>
                          <td>{contextLabel(item.context)}</td>
                          <td>{numberValue(item.durationMinutes)} min</td>
                          <td>{numberValue(item.distanceMeters)} m</td>
                          <td>{numberValue(item.maxSpeedKmh)} km/h</td>
                          <td>{numberValue(item.sprintCount)}</td>
                          <td>{numberValue(item.highIntensityDistanceMeters)} m</td>
                          <td>{nullableNumber(item.playerLoad) ?? "—"}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8}>Nenhum registro de GPS encontrado no período.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </section>
          </>
        ) : null}

        {report.reportType === "EVALUATION" ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>AVALIAÇÃO PROFISSIONAL</span>
                <h3>{textValue(evaluation.title, textValue(evaluation.templateName, "Avaliação"))}</h3>
              </div>

              <div className="evaluation-meta">
                <div>
                  <span>Avaliador</span>
                  <strong>{textValue(evaluation.evaluatorName)}</strong>
                </div>
                <div>
                  <span>Temporada</span>
                  <strong>{textValue(evaluation.season)}</strong>
                </div>
                <div>
                  <span>Média geral</span>
                  <strong>{scoreAverage(evaluationScores).toFixed(1)} / 4</strong>
                </div>
              </div>
            </section>

            {Object.entries(groupedScores).map(([area, areaScores]) => (
              <section className="report-section evaluation-area" key={area}>
                <div className="report-section-title inline">
                  <div>
                    <span>ÁREA</span>
                    <h3>{areaLabel(area)}</h3>
                  </div>
                  <strong className="area-average">
                    {scoreAverage(areaScores).toFixed(1)} / 4
                  </strong>
                </div>

                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Critério</th>
                      <th>Nota</th>
                      <th>Nível</th>
                      <th>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {areaScores.map((raw, index) => {
                      const item = asRecord(raw);
                      return (
                        <tr key={`${area}-${textValue(item.metricCode, String(index))}`}>
                          <td>{textValue(item.metricLabel)}</td>
                          <td><strong>{numberValue(item.score)} / 4</strong></td>
                          <td>{textValue(item.ratingLabel)}</td>
                          <td>{textValue(item.ratingDescription)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            ))}

            <section className="report-section">
              <div className="report-section-title">
                <span>PARECER</span>
                <h3>Conclusão profissional</h3>
              </div>

              <div className="evaluation-conclusion">
                <div>
                  <span>Pontos fortes</span>
                  <p>{textValue(evaluation.strengths, "Não informado.")}</p>
                </div>
                <div>
                  <span>A desenvolver</span>
                  <p>{textValue(evaluation.developmentPoints, "Não informado.")}</p>
                </div>
                <div>
                  <span>Próximas metas</span>
                  <p>{textValue(evaluation.nextGoals, "Não informado.")}</p>
                </div>
                <div className="wide">
                  <span>Parecer</span>
                  <p>{textValue(evaluation.summary, "Não informado.")}</p>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {isTechnicalRecord ? (
          <>
            <section className="report-section">
              <div className="report-section-title">
                <span>REGISTRO TÉCNICO</span>
                <h3>Observações da comissão</h3>
              </div>
              <div className="report-kpis three">
                <SummaryCard label="REGISTROS COMPARTILHÁVEIS" value={technicalRecords.length} />
                <SummaryCard label="ACOMPANHAMENTOS" value={technicalFollowUps.length} />
                <SummaryCard label="PENDENTES" value={technicalPending} />
              </div>
              <p className="technical-disclosure">
                Este documento contém apenas observações classificadas como
                compartilháveis. Anotações internas e de gestão não são exibidas.
              </p>
            </section>

            <section className="report-section">
              <div className="report-section-title">
                <span>HISTÓRICO TÉCNICO</span>
                <h3>Registros do período</h3>
              </div>
              {technicalRecords.length ? (
                <div className="technical-record-list">
                  {technicalRecords.map((item, index) => (
                    <article className="technical-record" key={textValue(item.id, String(index))}>
                      <div className="technical-record-head">
                        <div>
                          <span className="technical-record-date">{dateValue(item.occurredAt)}</span>
                          <h4>{textValue(item.title, technicalTopicLabel(item.topic))}</h4>
                        </div>
                        <span className="technical-record-topic">{technicalTopicLabel(item.topic)}</span>
                      </div>
                      <div className="technical-record-meta">
                        <span><strong>Origem:</strong> {textValue(item.sourceLabelSnapshot, technicalSourceLabel(item.source))}</span>
                        <span><strong>Modalidade:</strong> {sportLabel(item.sportSnapshot)}</span>
                        <span><strong>Categoria:</strong> {textValue(item.categoryNameSnapshot, textValue(asRecord(snapshot.athlete).categoryName))}</span>
                        <span><strong>Responsável:</strong> {textValue(item.authorNameSnapshot)}</span>
                      </div>
                      <p className="technical-record-content">{textValue(item.content)}</p>
                      {item.followUpRequired === true ? (
                        <div className="technical-follow-up">
                          <strong>Acompanhamento:</strong>{" "}
                          {item.followUpResolvedAt
                            ? `Concluído em ${dateValue(item.followUpResolvedAt)}`
                            : "Pendente"}
                          {item.followUpResolvedAt && item.resolvedByNameSnapshot
                            ? ` · ${textValue(item.resolvedByNameSnapshot)}`
                            : ""}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="technical-empty">
                  Nenhum registro autorizado para compartilhamento neste documento.
                </p>
              )}
            </section>
          </>
        ) : null}


        {isGrowthReport ? <GrowthReportSections growth={asRecord(snapshot.growth)} /> : null}

        {isDossier ? (
          <>
            <section className="report-section">
              <div className="report-section-title"><span>VISÃO GERAL</span><h3>Histórico esportivo consolidado</h3></div>
              <p className="technical-disclosure">{internalDossier
                ? "Documento interno restrito ao gestor. Os anexos privados continuam protegidos na ficha do atleta e não são incorporados a este PDF."
                : "Documento externo: não contém documentos pessoais, anexos, anotações internas nem observações classificadas como restritas."}</p>
              <p className="technical-disclosure">Seções selecionadas: {asArray(snapshot.sections).map((part) => typeLabel(String(part))).join(" · ")}</p>
            </section>

            {asRecord(snapshot.training).records ? (() => {
              const data = asRecord(snapshot.training);
              const total = asRecord(data.summary);
              return <section className="report-section"><div className="report-section-title"><span>TREINOS</span><h3>Frequência e participação</h3></div>
                <div className="report-kpis three"><SummaryCard label="TREINOS" value={numberValue(total.sessions)}/><SummaryCard label="PRESENÇAS" value={numberValue(total.present)}/><SummaryCard label="FREQUÊNCIA" value={numberValue(total.attendanceRate)} suffix="%"/></div>
                <table className="report-table"><thead><tr><th>Data</th><th>Categoria</th><th>Tipo</th><th>Status</th><th>Minutos</th>{internalDossier ? <th>Observações</th> : null}</tr></thead><tbody>
                  {asArray(data.records).map((raw,i)=>{const item=asRecord(raw);return <tr key={i}><td>{dateValue(item.date)}</td><td>{textValue(item.category)}</td><td>{textValue(item.trainingType)}</td><td>{trainingStatusLabel(item.status)}</td><td>{textValue(item.minutesPresent,"0")}</td>{internalDossier ? <td>{textValue(item.notes, textValue(item.justification))}</td> : null}</tr>})}
                </tbody></table>
              </section>;
            })() : null}

            {asRecord(snapshot.matches).records ? (() => { const data=asRecord(snapshot.matches);const sum=asRecord(data.summary);
              return <section className="report-section"><div className="report-section-title"><span>JOGOS</span><h3>Participação competitiva</h3></div>
                <div className="report-kpis four"><SummaryCard label="JOGOS" value={numberValue(sum.matches)}/><SummaryCard label="MINUTOS" value={numberValue(sum.minutes)}/><SummaryCard label="GOLS" value={numberValue(sum.goals)}/><SummaryCard label="ASSISTÊNCIAS" value={numberValue(sum.assists)}/></div>
                <table className="report-table"><thead><tr><th>Data</th><th>Adversário</th><th>Competição</th><th>Min</th><th>G</th><th>A</th>{internalDossier ? <th>Observações</th> : null}</tr></thead><tbody>
                {asArray(data.records).map((raw,i)=>{const item=asRecord(raw);return <tr key={i}><td>{dateValue(item.date)}</td><td>{textValue(item.opponent)}</td><td>{textValue(item.competition)}</td><td>{numberValue(item.minutesPlayed)}</td><td>{numberValue(item.goals)}</td><td>{numberValue(item.assists)}</td>{internalDossier ? <td>{textValue(item.notes)}</td> : null}</tr>})}
                </tbody></table>
              </section>;
            })() : null}

            {asRecord(snapshot.gps).records ? (() => {const data=asRecord(snapshot.gps);const sum=asRecord(data.summary);
              return <section className="report-section"><div className="report-section-title"><span>GPS</span><h3>Desempenho físico</h3></div>
                <div className="report-kpis three"><SummaryCard label="SESSÕES" value={numberValue(sum.sessions)}/><SummaryCard label="DISTÂNCIA" value={Math.round(numberValue(sum.totalDistanceMeters))} suffix=" m"/><SummaryCard label="VEL. MÁX." value={numberValue(sum.maxSpeedKmh)} suffix=" km/h"/></div>
                <table className="report-table"><thead><tr><th>Data</th><th>Contexto</th><th>Minutos</th><th>Distância</th><th>Velocidade</th><th>Sprints</th>{internalDossier ? <th>Observações</th> : null}</tr></thead><tbody>
                {asArray(data.records).map((raw,i)=>{const item=asRecord(raw);return <tr key={i}><td>{dateValue(item.date)}</td><td>{contextLabel(item.context)}</td><td>{textValue(item.durationMinutes)}</td><td>{textValue(item.distanceMeters)} m</td><td>{textValue(item.maxSpeedKmh)} km/h</td><td>{textValue(item.sprintCount)}</td>{internalDossier ? <td>{textValue(item.notes)}</td> : null}</tr>})}
                </tbody></table>
              </section>;
            })() : null}

            {asArray(snapshot.evaluations).length ? asArray(snapshot.evaluations).map((raw,i)=>{const item=asRecord(raw);return <section className="report-section" key={`evaluation-${i}`}>
              <div className="report-section-title"><span>AVALIAÇÃO · {dateValue(item.date)}</span><h3>{textValue(item.title)}</h3></div>
              <p className="technical-disclosure">Modalidade: {sportLabel(item.sport)} · Avaliador: {textValue(item.evaluatorName)}</p>
              <table className="report-table"><thead><tr><th>Área</th><th>Critério</th><th>Nota</th><th>Nível</th><th>Descrição</th></tr></thead><tbody>
              {asArray(item.scores).map((rawScore,j)=>{const score=asRecord(rawScore);return <tr key={j}><td>{areaLabel(score.area)}</td><td>{textValue(score.criterion)}</td><td>{numberValue(score.score)} / 4</td><td>{textValue(score.level)}</td><td>{textValue(score.description)}</td></tr>})}
              </tbody></table>
              <div className="dossier-evaluation-notes"><p><strong>Pontos fortes:</strong> {textValue(item.strengths)}</p><p><strong>A desenvolver:</strong> {textValue(item.developmentPoints)}</p><p><strong>Metas:</strong> {textValue(item.nextGoals)}</p><p><strong>Parecer:</strong> {textValue(item.summary)}</p>
                {internalDossier && item.internalNotes ? <p><strong>Notas internas:</strong> {textValue(item.internalNotes)}</p> : null}
              </div>
              </section>}) : null}

            {snapshot.technicalRecords ? (
              <section className="report-section dossier-technical-report">
                <div className="report-section-title">
                  <span>{internalDossier ? "RELATÓRIO DE REGISTRO TÉCNICO · INTERNO" : "REGISTRO TÉCNICO COMPARTILHÁVEL"}</span>
                  <h3>Histórico técnico e acompanhamentos</h3>
                </div>

                <div className="report-kpis three">
                  <SummaryCard label="REGISTROS" value={dossierTechnicalRecords.length} />
                  <SummaryCard label="ACOMPANHAMENTOS" value={dossierTechnicalFollowUps.length} />
                  <SummaryCard label="PENDENTES" value={dossierTechnicalPending} />
                </div>

                <p className="technical-disclosure">
                  {internalDossier
                    ? "Histórico completo dos registros da comissão e da gestão, com suas classificações de acesso. Uso interno e restrito ao gestor."
                    : "Somente registros expressamente classificados como compartilháveis. Nenhuma anotação interna ou exclusiva da gestão é incluída."}
                </p>

                {dossierTechnicalRecords.length ? (
                  <div className="technical-record-list">
                    {dossierTechnicalRecords.map((item, index) => (
                      <article className="technical-record" key={textValue(item.id, String(index))}>
                        <div className="technical-record-head">
                          <div>
                            <span className="technical-record-date">{dateValue(item.date)}</span>
                            <h4>{textValue(item.title, technicalTopicLabel(item.topic))}</h4>
                          </div>
                          <span className="technical-record-topic">{technicalTopicLabel(item.topic)}</span>
                        </div>
                        <div className="technical-record-meta">
                          <span><strong>Origem:</strong> {textValue(item.sourceLabel, technicalSourceLabel(item.source))}</span>
                          <span><strong>Modalidade:</strong> {sportLabel(item.sport)}</span>
                          <span><strong>Categoria:</strong> {textValue(item.category)}</span>
                          <span><strong>Responsável:</strong> {textValue(item.author)}</span>
                          {internalDossier ? (
                            <span><strong>Acesso:</strong> {item.visibility === "MANAGEMENT"
                              ? "Exclusivo da gestão"
                              : item.visibility === "TECHNICAL_STAFF"
                                ? "Comissão técnica"
                                : item.visibility === "SHAREABLE"
                                  ? "Compartilhável"
                                  : "Não informado"}</span>
                          ) : null}
                        </div>
                        <p className="technical-record-content">{textValue(item.content)}</p>
                        {item.followUpRequired === true ? (
                          <div className="technical-follow-up">
                            <strong>Acompanhamento:</strong>{" "}
                            {item.followUpResolvedAt
                              ? `Concluído em ${dateValue(item.followUpResolvedAt)}`
                              : "Pendente"}
                            {item.followUpResolvedAt && item.resolvedByName
                              ? ` · ${textValue(item.resolvedByName)}`
                              : ""}
                          </div>
                        ) : null}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="technical-empty">
                    {internalDossier
                      ? "Não existem registros técnicos no período e na modalidade selecionados."
                      : "Não existem registros autorizados para compartilhamento neste período."}
                  </p>
                )}
              </section>
            ) : null}

            {internalDossier && snapshot.growth ? <GrowthReportSections growth={asRecord(snapshot.growth)} /> : null}

            {snapshot.measurements ? <section className="report-section"><div className="report-section-title"><span>EVOLUÇÃO CORPORAL</span><h3>Medidas registradas</h3></div>
              <div className="dossier-charts"><MeasurementTrendChart records={asArray(snapshot.measurements)} metric="heightCm" title="Altura (cm)"/><MeasurementTrendChart records={asArray(snapshot.measurements)} metric="weightKg" title="Peso (kg)"/></div>
              <table className="report-table"><thead><tr><th>Data</th><th>Altura</th><th>Peso</th><th>Envergadura</th>{internalDossier ? <><th>IMC</th><th>Gordura</th><th>Massa muscular</th><th>Observações</th></> : null}</tr></thead><tbody>
              {asArray(snapshot.measurements).map((raw,i)=>{const item=asRecord(raw);return <tr key={i}><td>{dateValue(item.date)}</td><td>{textValue(item.heightCm)} cm</td><td>{textValue(item.weightKg)} kg</td><td>{textValue(item.wingspanCm)} cm</td>{internalDossier ? <><td>{textValue(item.bmi)}</td><td>{textValue(item.bodyFatPercent)} %</td><td>{textValue(item.muscleMassKg)} kg</td><td>{textValue(item.notes)}</td></> : null}</tr>})}
              </tbody></table>
            </section> : null}

            {internalDossier && snapshot.documents ? <section className="report-section"><div className="report-section-title"><span>DOCUMENTAÇÃO PRIVADA</span><h3>Inventário de arquivos</h3></div>
              <p className="technical-disclosure">Os anexos permanecem no armazenamento privado. Esta cópia apresenta apenas a relação de arquivos e não contém os documentos originais.</p>
              <table className="report-table"><thead><tr><th>Documento</th><th>Arquivo</th><th>Categoria</th><th>Status</th><th>Cadastrado em</th></tr></thead><tbody>
              {asArray(snapshot.documents).map((raw,i)=>{const item=asRecord(raw);return <tr key={i}><td>{textValue(item.title)}</td><td>{textValue(item.originalFileName)}</td><td>{textValue(item.category)}</td><td>{textValue(item.status)}</td><td>{dateValue(item.createdAt)}</td></tr>})}
              </tbody></table>
            </section> : null}
          </>
        ) : null}

        <footer className="report-footer">
          <span>11UP · Gestão de performance esportiva</span>
          <span>Documento gerado em {formatDate(report.createdAt)}</span>
        </footer>
      </article>

      <style>{`
        *{box-sizing:border-box}
        body{margin:0;background:#eef2f4;color:#07131d}
        .performance-report-print{min-height:100vh;padding:28px;font-family:Arial,Helvetica,sans-serif}
        .report-actions{width:min(1120px,100%);margin:0 auto 18px;display:flex;justify-content:flex-end;gap:10px}
        .report-action{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border-radius:10px;font-weight:800;text-decoration:none;font-size:13px}
        .report-action.primary{background:#99e600;color:#08110a}
        .report-action.secondary{background:#fff;color:#21313c;border:1px solid #d9e0e4}
        .report-sheet{width:min(1120px,100%);margin:0 auto;background:#fff;border:1px solid #dfe6ea;border-radius:22px;box-shadow:0 24px 70px rgba(8,25,38,.08);overflow:hidden}
        .report-header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;padding:30px 34px;background:linear-gradient(115deg,#06111a,#0a1a17 58%,#204617);color:#fff}
        .report-brand{display:flex;align-items:center;gap:14px}
        .report-brand img,.report-logo-fallback{width:52px;height:52px;border-radius:13px;background:#fff;object-fit:contain;padding:5px}
        .report-logo-fallback{display:grid;place-items:center;background:#99e600;color:#07131d;font-weight:900;font-size:22px}
         .report-brand img.report-athlete-avatar{object-fit:cover;padding:0;background:#dfe7e8;border:1px solid rgba(255,255,255,.25)}
        .report-brand strong{display:block;margin-top:5px;font-size:19px}
        .report-overline,.report-type span,.report-eyebrow,.report-section-title>span,.report-section-title>div>span{font-size:10px;font-weight:900;letter-spacing:.14em;color:#99e600}
        .report-type{text-align:right}
        .report-type h1{margin:5px 0 0;font-size:30px;letter-spacing:-.04em}
        .report-athlete{display:flex;justify-content:space-between;gap:28px;padding:26px 34px;border-bottom:1px solid #e3e9ec}
        .report-athlete h2{margin:5px 0 4px;font-size:30px;letter-spacing:-.04em}
        .report-athlete p{margin:0;color:#6c7b85;font-size:13px}
        .report-athlete dl{display:grid;grid-template-columns:repeat(3,minmax(120px,1fr));gap:18px;margin:0}
        .report-athlete dl div{padding-left:16px;border-left:1px solid #dfe6ea}
        .report-athlete dt{font-size:9px;font-weight:900;letter-spacing:.12em;color:#788892;text-transform:uppercase}
        .report-athlete dd{margin:6px 0 0;font-size:12px;font-weight:800}
        .report-section{padding:26px 34px;border-bottom:1px solid #e8edef}
        .report-section-title{margin-bottom:16px}
        .report-section-title.inline{display:flex;align-items:end;justify-content:space-between;gap:16px}
        .report-section-title h3{margin:5px 0 0;font-size:20px;letter-spacing:-.025em}
        .report-kpis{display:grid;gap:10px}
        .report-kpis.three{grid-template-columns:repeat(3,1fr)}
        .report-kpis.four{grid-template-columns:repeat(4,1fr)}
        .report-kpis.five{grid-template-columns:repeat(5,1fr)}
        .report-kpis.six{grid-template-columns:repeat(6,1fr)}
        .report-kpi{padding:15px;border:1px solid #dfe7e8;border-radius:13px;background:#f8faf9}
        .report-kpi span{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;color:#72818b}
        .report-kpi strong{display:block;margin-top:7px;font-size:24px;letter-spacing:-.04em}
        .report-kpi strong small{font-size:10px;margin-left:3px;color:#6d7b85;letter-spacing:0}
        .report-table{width:100%;border-collapse:collapse;font-size:11px}
        .report-table th{padding:10px 9px;text-align:left;background:#f3f6f7;border-bottom:1px solid #dfe6e8;color:#657680;font-size:9px;letter-spacing:.08em;text-transform:uppercase}
        .report-table td{padding:10px 9px;border-bottom:1px solid #edf1f2;vertical-align:top}
        .evaluation-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .evaluation-meta div{padding:14px;border-radius:12px;background:#f4f8ea;border:1px solid #dfebc3}
        .evaluation-meta span,.evaluation-conclusion span{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;color:#708009;text-transform:uppercase}
        .evaluation-meta strong{display:block;margin-top:6px;font-size:14px}
        .area-average{font-size:18px;color:#6f9800}
        .evaluation-conclusion{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .evaluation-conclusion>div{padding:15px;border:1px solid #e1e7e9;border-radius:12px;background:#fafbfb}
        .evaluation-conclusion .wide{grid-column:1/-1}
        .evaluation-conclusion p{margin:7px 0 0;font-size:12px;line-height:1.55;color:#394a54;white-space:pre-wrap}
        .technical-disclosure{margin:14px 0 0;color:#677881;font-size:11px;line-height:1.5}
        .technical-record-list{display:grid;gap:12px}
        .technical-record{padding:17px;border:1px solid #e1e8e9;border-radius:13px;background:#fbfcfc;break-inside:avoid}
        .technical-record-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px}
        .technical-record-date{font-size:10px;color:#677881;font-weight:800}
        .technical-record-head h4{margin:5px 0 0;font-size:15px;letter-spacing:-.02em}
        .technical-record-topic{display:inline-flex;padding:5px 9px;border-radius:999px;background:#eff9d8;color:#4e7300;font-size:10px;font-weight:800}
        .technical-record-meta{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:13px;color:#52646e;font-size:10px}
        .technical-record-meta strong{color:#2d3c45}
        .technical-record-content{margin:14px 0 0;color:#25343e;font-size:12px;line-height:1.65;white-space:pre-wrap;overflow-wrap:anywhere}
        .technical-follow-up{margin-top:13px;padding:9px 11px;border-left:3px solid #99e600;background:#f2f8e8;color:#365600;font-size:11px}
        .technical-empty{margin:0;padding:16px;color:#677881;font-size:12px;background:#f8faf9;border:1px solid #e1e8e9;border-radius:12px}
        .dossier-charts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}
        .dossier-chart{padding:12px;border:1px solid #dfe6ea;border-radius:12px;break-inside:avoid}
        .dossier-chart strong,.dossier-chart span{display:block;font-size:11px;color:#34434d}
        .dossier-chart svg{display:block;width:100%;height:auto;max-height:110px}
        .growth-private-section{background:#fbfdf7}
        .growth-projection-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}
        .growth-projection-card{border:1px solid #dce7d0;border-radius:14px;padding:16px;background:#f8fcef;break-inside:avoid}
        .growth-projection-card span{display:block;color:#6c7c36;font-size:9px;font-weight:900;letter-spacing:.12em}
        .growth-projection-card strong{display:block;margin:7px 0 4px;font-size:25px;letter-spacing:-.03em;color:#14210d}
        .growth-projection-card small{font-size:10px;color:#60717c}
        .growth-print-chart{border:1px solid #dfe6ea;border-radius:14px;padding:10px;background:#fff;break-inside:avoid}
        .growth-print-chart svg{display:block;width:100%;height:auto}
        .growth-chart-legend{display:flex;flex-wrap:wrap;gap:14px;padding:3px 8px 6px;font-size:9px;color:#60717c}
        .growth-chart-legend span{display:inline-flex;align-items:center;gap:5px}
        .growth-chart-legend i{display:inline-block;width:16px;height:3px;border-radius:999px;background:#99e600}
        .growth-chart-legend .who-line{background:#607984}
        .growth-chart-legend .projection-dot{width:8px;height:8px;border-radius:50%;background:#7357c8}
        .growth-chart-note{margin:4px 8px 2px;font-size:9px;line-height:1.45;color:#697983}
        .growth-chart-section{break-inside:avoid;page-break-inside:avoid}
        .growth-report-disclaimer{margin:0 34px 24px;padding:12px 14px;border-radius:12px;border:1px solid #dfe8c9;background:#f7fbeF;font-size:10px;color:#58664f;break-inside:avoid}
        .dossier-evaluation-notes{font-size:11px;color:#34434d;line-height:1.5;white-space:pre-wrap}
        .dossier-evaluation-notes p{margin:8px 0}
        .report-footer{display:flex;justify-content:space-between;gap:20px;padding:18px 34px;color:#81909a;font-size:9px}
        @media(max-width:800px){
          .performance-report-print{padding:12px}
          .report-header,.report-athlete{display:block}
          .report-type{text-align:left;margin-top:20px}
          .report-athlete dl{grid-template-columns:1fr;margin-top:20px}
          .report-kpis.three,.report-kpis.four,.report-kpis.five,.report-kpis.six{grid-template-columns:repeat(2,1fr)}
          .evaluation-meta,.evaluation-conclusion{grid-template-columns:1fr}
          .report-table{min-width:720px}
          .report-section{overflow-x:auto}
        }
        @page{size:A4 portrait;margin:10mm}
        @media print{
          html,body{
            margin:0!important;
            padding:0!important;
            width:100%!important;
            min-height:0!important;
            background:#fff!important;
            overflow:visible!important;
          }
.performance-report-print{
            display:block!important;
            visibility:visible!important;
            opacity:1!important;
            position:static!important;
            width:100%!important;
            min-height:0!important;
            margin:0!important;
            padding:0!important;
            background:#fff!important;
            overflow:visible!important;
            transform:none!important;
          }

          .performance-report-print *{
            visibility:visible!important;
            opacity:1!important;
          }

          .no-print{
            display:none!important;
          }

          .report-sheet{
            display:block!important;
            width:100%!important;
            max-width:none!important;
            margin:0!important;
            border:0!important;
            border-radius:0!important;
            box-shadow:none!important;
            overflow:visible!important;
            background:#fff!important;
            color:#07131d!important;
          }

          .report-header{
            padding:18px 20px;
            -webkit-print-color-adjust:exact!important;
            print-color-adjust:exact!important;
          }

          .report-athlete,.report-section{padding:16px 20px}
          .report-footer{padding:14px 20px}
          .report-kpi,.technical-record,.dossier-chart,.growth-projection-card,.growth-print-chart{break-inside:avoid}
          .growth-chart-section{break-inside:avoid!important;page-break-inside:avoid!important}
          .growth-chart-section .report-section-title{break-after:avoid!important;page-break-after:avoid!important}
          .dossier-technical-report .report-section-title,
          .dossier-technical-report .report-kpis{break-after:avoid;page-break-after:avoid}
          .evaluation-area{break-inside:auto!important}
          .evaluation-area .report-section-title{break-after:avoid}
          .report-table thead{display:table-header-group}
          .evaluation-conclusion>div{break-inside:avoid}
          .report-table tr{break-inside:avoid}.report-section{overflow:visible!important}.report-table{min-width:0!important;width:100%!important}
        }
      `}</style>
    </main>
  );
}
