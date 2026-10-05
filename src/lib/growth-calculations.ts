import { whoHeightPercentiles, whoHeightZCurves, whoHeightZScore, type GrowthReferenceSex } from "@/lib/who2007-height-lms";

export const GROWTH_DISCLAIMER =
  "Informação de acompanhamento esportivo. Não substitui avaliação pediátrica, endocrinológica ou nutricional.";

const DAY_MS = 86_400_000;
const DAYS_PER_YEAR = 365.25;

export type MeasurementInput = {
  id: string;
  measuredAt: Date;
  heightCm: number | null;
  weightKg: number | null;
  bmi?: number | null;
  wingspanCm?: number | null;
  sittingHeightCm?: number | null;
};

export type ExactAge = {
  years: number;
  months: number;
  totalMonths: number;
  decimalYears: number;
  label: string;
};

function utcDateOnly(value: Date) {
  return Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
}

export function exactAgeAt(birthDate: Date | null | undefined, at: Date): ExactAge | null {
  if (!birthDate) return null;
  const birth = new Date(Date.UTC(birthDate.getUTCFullYear(), birthDate.getUTCMonth(), birthDate.getUTCDate()));
  const target = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  if (target < birth) return null;

  let years = target.getUTCFullYear() - birth.getUTCFullYear();
  let months = target.getUTCMonth() - birth.getUTCMonth();
  if (target.getUTCDate() < birth.getUTCDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const days = (utcDateOnly(target) - utcDateOnly(birth)) / DAY_MS;
  const decimalYears = days / DAYS_PER_YEAR;
  const totalMonths = decimalYears * 12;
  return {
    years,
    months,
    totalMonths,
    decimalYears,
    label: `${years} ano${years === 1 ? "" : "s"} e ${months} ${months === 1 ? "mês" : "meses"}`,
  };
}

export function calculateBmi(heightCm: number | null | undefined, weightKg: number | null | undefined) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const value = weightKg / Math.pow(heightCm / 100, 2);
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

export function calculateGrowthDelta(current: MeasurementInput, previous?: MeasurementInput | null) {
  if (!previous?.heightCm || !current.heightCm) return null;
  return Math.round((current.heightCm - previous.heightCm) * 100) / 100;
}

export function calculateGrowthVelocity(current: MeasurementInput, previous?: MeasurementInput | null) {
  if (!previous?.heightCm || !current.heightCm) return null;
  const days = (utcDateOnly(current.measuredAt) - utcDateOnly(previous.measuredAt)) / DAY_MS;
  if (!Number.isFinite(days) || days <= 0) return null;
  const value = ((current.heightCm - previous.heightCm) / days) * DAYS_PER_YEAR;
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

export function calculateWingspanRatio(heightCm: number | null | undefined, wingspanCm: number | null | undefined) {
  if (!heightCm || !wingspanCm || heightCm <= 0) return null;
  return Math.round((wingspanCm / heightCm) * 1000) / 1000;
}

export function familyTargetHeight(input: {
  sex: GrowthReferenceSex | null | undefined;
  fatherHeightCm: number | null | undefined;
  motherHeightCm: number | null | undefined;
}) {
  const { sex, fatherHeightCm, motherHeightCm } = input;
  if (!sex || !fatherHeightCm || !motherHeightCm) return null;
  const center = sex === "BOY"
    ? (fatherHeightCm + motherHeightCm + 13) / 2
    : (fatherHeightCm + motherHeightCm - 13) / 2;
  const rounded = Math.round(center * 10) / 10;
  return {
    centerCm: rounded,
    lowCm: Math.round((center - 8.5) * 10) / 10,
    highCm: Math.round((center + 8.5) * 10) / 10,
  };
}

type KhamisRow = { age: number; b0: number; b1: number; b2: number; b3: number };

// Erratum-corrected Khamis-Roche coefficients (ages 4.0–17.5 in half-year steps).
// Formula is defined in imperial units: in, lb, in.
const KHAMIS_BOYS: readonly KhamisRow[] = [
  [4,-10.2567,1.23812,-0.087235,0.50286],[4.5,-10.719,1.15964,-0.074454,0.52887],
  [5,-11.0213,1.10674,-0.064778,0.53919],[5.5,-11.1556,1.0748,-0.05776,0.53691],
  [6,-11.1138,1.05923,-0.052947,0.52513],[6.5,-11.0221,1.05542,-0.049892,0.50692],
  [7,-10.9984,1.05877,-0.048144,0.48538],[7.5,-11.0214,1.06467,-0.047256,0.46361],
  [8,-11.0696,1.06853,-0.046778,0.44469],[8.5,-11.122,1.06572,-0.046261,0.43171],
  [9,-11.1571,1.05166,-0.045254,0.42776],[9.5,-11.1405,1.02174,-0.043311,0.43593],
  [10,-11.038,0.97135,-0.039981,0.45932],[10.5,-10.8286,0.89589,-0.034814,0.50101],
  [11,-10.4917,0.81239,-0.02905,0.54781],[11.5,-10.0065,0.74134,-0.024167,0.58409],
  [12,-9.3522,0.68325,-0.020076,0.60927],[12.5,-8.6055,0.63869,-0.016681,0.62279],
  [13,-7.8632,0.60818,-0.013895,0.62407],[13.5,-7.1348,0.59228,-0.011624,0.61253],
  [14,-6.4299,0.59151,-0.009776,0.58762],[14.5,-5.7578,0.60643,-0.008261,0.54875],
  [15,-5.1282,0.63757,-0.006988,0.49536],[15.5,-4.5092,0.68548,-0.005863,0.42687],
  [16,-3.9292,0.75069,-0.004795,0.34271],[16.5,-3.4873,0.83375,-0.003695,0.24231],
  [17,-3.283,0.9352,-0.00247,0.1251],[17.5,-3.4156,1.05558,-0.001027,-0.0095],
].map(([age,b0,b1,b2,b3])=>({age,b0,b1,b2,b3}));

const KHAMIS_GIRLS: readonly KhamisRow[] = [
  [4,-8.1325,1.24768,-0.19435,0.44774],[4.5,-6.47656,1.22177,-0.18519,0.41381],
  [5,-5.13582,1.19932,-0.1753,0.38467],[5.5,-4.13791,1.1788,-0.16484,0.36039],
  [6,-3.51039,1.15866,-0.154,0.34105],[6.5,-3.14322,1.13737,-0.14294,0.32672],
  [7,-2.87645,1.11342,-0.13184,0.31748],[7.5,-2.66291,1.08525,-0.12086,0.3134],
  [8,-2.45559,1.05135,-0.11019,0.31457],[8.5,-2.20728,1.01018,-0.09999,0.32105],
  [9,-1.87098,0.9602,-0.09044,0.33291],[9.5,-1.0633,0.89989,-0.08171,0.35025],
  [10,0.33468,0.82771,-0.07397,0.37312],[10.5,1.97366,0.74213,-0.06739,0.40161],
  [11,3.50436,0.67173,-0.06136,0.42042],[11.5,4.57747,0.6415,-0.05518,0.41686],
  [12,4.84365,0.64452,-0.04894,0.3949],[12.5,4.27869,0.67386,-0.04272,0.3585],
  [13,3.21417,0.7226,-0.03661,0.31163],[13.5,1.83456,0.78383,-0.03067,0.25826],
  [14,0.32425,0.85062,-0.025,0.20235],[14.5,-1.13224,0.91605,-0.01967,0.14787],
  [15,-2.35055,0.97319,-0.01477,0.0988],[15.5,-3.10326,1.01514,-0.01037,0.05909],
  [16,-3.17885,1.03496,-0.00655,0.03272],[16.5,-2.41657,1.02573,-0.0034,0.02364],
  [17,-0.65579,0.98054,-0.001,0.03584],[17.5,2.26429,0.89246,0.00057,0.07327],
].map(([age,b0,b1,b2,b3])=>({age,b0,b1,b2,b3}));

function interpolateKhamis(age: number, sex: GrowthReferenceSex) {
  const table = sex === "BOY" ? KHAMIS_BOYS : KHAMIS_GIRLS;
  if (age < 4 || age > 17.5) return null;
  const lowIndex = Math.max(0, Math.min(table.length - 1, Math.floor((age - 4) / 0.5)));
  const low = table[lowIndex];
  const high = table[Math.min(table.length - 1, lowIndex + 1)];
  if (high.age === low.age || age <= low.age) return low;
  const t = (age - low.age) / (high.age - low.age);
  return {
    age,
    b0: low.b0 + (high.b0 - low.b0) * t,
    b1: low.b1 + (high.b1 - low.b1) * t,
    b2: low.b2 + (high.b2 - low.b2) * t,
    b3: low.b3 + (high.b3 - low.b3) * t,
  };
}

export function khamisRocheProjection(input: {
  sex: GrowthReferenceSex | null | undefined;
  ageYears: number | null | undefined;
  heightCm: number | null | undefined;
  weightKg: number | null | undefined;
  fatherHeightCm: number | null | undefined;
  motherHeightCm: number | null | undefined;
}) {
  const { sex, ageYears, heightCm, weightKg, fatherHeightCm, motherHeightCm } = input;
  if (!sex || ageYears == null || !heightCm || !weightKg || !fatherHeightCm || !motherHeightCm) return null;
  const c = interpolateKhamis(ageYears, sex);
  if (!c) return null;

  const heightIn = heightCm / 2.54;
  const weightLb = weightKg * 2.2046226218;
  const midParentIn = ((fatherHeightCm + motherHeightCm) / 2) / 2.54;
  const predictedIn = c.b0 + c.b1 * heightIn + c.b2 * weightLb + c.b3 * midParentIn;
  const predictedCm = predictedIn * 2.54;
  if (!Number.isFinite(predictedCm) || predictedCm <= 0) return null;
  const center = Math.round(predictedCm * 10) / 10;
  const approximateErrorCm = 5;
  return {
    centralCm: center,
    lowCm: Math.round((center - approximateErrorCm) * 10) / 10,
    highCm: Math.round((center + approximateErrorCm) * 10) / 10,
    approximateErrorCm,
    percentReached: Math.round((heightCm / center) * 1000) / 10,
    label: "Projeção não invasiva de estatura adulta",
    dynamicNotice: "Estimativa dinâmica: será atualizada conforme novas medições forem registradas.",
  };
}

export function buildMeasurementMetrics(measurements: MeasurementInput[], birthDate?: Date | null) {
  const sorted = [...measurements].sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime());
  return sorted.map((m, index) => {
    const previous = index > 0 ? sorted[index - 1] : null;
    return {
      ...m,
      bmi: m.bmi ?? calculateBmi(m.heightCm, m.weightKg),
      exactAge: exactAgeAt(birthDate, m.measuredAt),
      growthDeltaCm: calculateGrowthDelta(m, previous),
      growthVelocityCmPerYear: calculateGrowthVelocity(m, previous),
      wingspanHeightRatio: calculateWingspanRatio(m.heightCm, m.wingspanCm),
    };
  });
}

export function buildHeightChartRows(input: {
  measurements: ReturnType<typeof buildMeasurementMetrics>;
  sex?: GrowthReferenceSex | null;
  boneAgeDates?: Date[];
}) {
  const { measurements, sex } = input;
  const validAges = measurements.map((m) => m.exactAge?.totalMonths).filter((v): v is number => typeof v === "number");
  if (!validAges.length) return [];
  const youngest = Math.min(...validAges);
  const oldest = Math.max(...validAges);
  const min = Math.max(61, Math.floor(youngest - 12));
  // Mantém a referência OMS disponível até 18 anos (216 meses) para a visão estendida.
  // Medições reais acima disso continuam preservadas; a referência populacional deste gráfico encerra em 18 anos.
  const max = Math.min(216, Math.max(216, Math.ceil(oldest + 12)));
  const rows = new Map<number, Record<string, unknown>>();

  if (sex && max >= 61 && min <= 228) {
    for (let month = min; month <= max; month += 1) {
      const p = whoHeightPercentiles(month, sex);
      const z = whoHeightZCurves(month, sex);
      if (p && z) rows.set(month, { ageMonths: month, ...p, ...z });
    }
  }

  for (const m of measurements) {
    if (!m.exactAge || m.heightCm == null) continue;
    const key = Math.round(m.exactAge.totalMonths * 1000) / 1000;
    const p = sex ? whoHeightPercentiles(m.exactAge.totalMonths, sex) : null;
    const z = sex ? whoHeightZCurves(m.exactAge.totalMonths, sex) : null;
    const whoHeightZ = sex ? whoHeightZScore(m.exactAge.totalMonths, sex, m.heightCm) : null;
    rows.set(key, {
      ...(rows.get(key) || {}),
      ageMonths: key,
      ...(p || {}),
      ...(z || {}),
      whoHeightZ,
      athleteHeight: m.heightCm,
      athleteWeight: m.weightKg,
      athleteBmi: m.bmi,
      measurementId: m.id,
      date: m.measuredAt.toISOString(),
      ageLabel: m.exactAge.label,
      growthDeltaCm: m.growthDeltaCm,
      growthVelocityCmPerYear: m.growthVelocityCmPerYear,
    });
  }

  return [...rows.values()].sort((a, b) => Number(a.ageMonths) - Number(b.ageMonths));
}
