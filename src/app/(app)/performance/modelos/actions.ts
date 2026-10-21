"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { PerformanceArea, PerformanceAthleteRole, Prisma } from "@prisma/client";
import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";
import {
  SPREADSHEET_CLASSIFICATION,
  SPREADSHEET_MODEL,
  parsePerformanceClassification,
  format11UPName,
} from "@/lib/performance-model-catalog";

const AREAS: PerformanceArea[] = ["PHYSICAL", "TECHNICAL", "TACTICAL", "COGNITIVE", "EMOTIONAL"];

async function requireModelsManager() {
  const user = await requireClubPermission("PERFORMANCE_MANAGE");
  // Modelos pertencem ao clube. Não permitir edição cruzada por suporte administrativo.
  if (user.role === "SUPER_ADMIN") redirect("/performance?erro=permissao");
  const [subscription, organization] = await Promise.all([
    prisma.subscription.findUnique({ where: { organizationId: user.organizationId } }),
    prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { accessStatus: true, complimentaryUntil: true },
    }),
  ]);
  if (!hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  })) redirect("/performance?erro=elite");
  return user;
}

function field(data: FormData, key: string, max = 1000) {
  return String(data.get(key) ?? "").trim().slice(0, max);
}

function invalid(message: string): never {
  throw new Error(message);
}

const FAMILIES = [
  { role: "LINE_PLAYER", key: "ONZEUP_LINHA", variant: "original" },
  { role: "GOALKEEPER", key: "ONZEUP_GOLEIRO", variant: "original" },
  { role: "LINE_PLAYER", key: "PLANILHA_LINHA", variant: "spreadsheet" },
  { role: "GOALKEEPER", key: "PLANILHA_GOLEIRO", variant: "spreadsheet" },
] as const;

/** Importação idempotente: cria modelos PRIVADOS de cada organização; não modifica defaults globais. */
export async function prepareClubEvaluationModels() {
  const user = await requireModelsManager();
  const originals = await prisma.performanceTemplate.findMany({
    where: { organizationId: null, systemDefault: true, active: true },
    include: {
      criteria: {
        where: { active: true },
        orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
        include: { levels: { orderBy: { score: "asc" } } },
      },
    },
  });
  for (const family of FAMILIES) {
    const prior = await prisma.performanceTemplate.findFirst({
      where: { organizationId: user.organizationId, modelFamilyKey: family.key },
      select: { id: true },
    });
    if (prior) continue;
    const origin = originals.find((item) => item.athleteRole === family.role);
    if (!origin || origin.criteria.length !== 25 || origin.criteria.some((c) => c.levels.length !== 4)) {
      invalid("O modelo original do Performance não está configurado. Verifique o seed-performance antes de preparar os modelos.");
    }
    const spreadsheet = SPREADSHEET_MODEL[family.role];
    const isSpreadsheet = family.variant === "spreadsheet";
    await prisma.performanceTemplate.create({
      data: {
        organizationId: user.organizationId,
        modelFamilyKey: family.key,
        name: isSpreadsheet ? spreadsheet.name : format11UPName(origin.name),
        description: isSpreadsheet
          ? "Modelo complementar baseado na planilha de avaliação técnica, tática, cognitiva e emocional."
          : origin.description,
        athleteRole: family.role as PerformanceAthleteRole,
        sport: origin.sport,
        active: true,
        systemDefault: false,
        version: 1,
        classificationJson: isSpreadsheet ? JSON.stringify(SPREADSHEET_CLASSIFICATION) : null,
        criteria: {
          create: origin.criteria.map((criterion, i) => ({
            area: criterion.area,
            code: isSpreadsheet ? `PLANILHA_${criterion.code}` : criterion.code,
            label: isSpreadsheet ? spreadsheet.labels[i] : criterion.label,
            description: criterion.description,
            sortOrder: i + 1,
            active: true,
            levels: {
              create: criterion.levels.map((level) => ({
                score: level.score,
                label: level.label,
                description: level.description,
              })),
            },
          })),
        },
      },
    });
  }
  revalidatePath("/performance/modelos");
  redirect("/performance/modelos?status=preparado");
}

/** Cada edição cria nova versão imutável; avaliações antigas continuam apontando à versão anterior. */
export async function saveClubEvaluationModel(formData: FormData) {
  const user = await requireModelsManager();
  const templateId = field(formData, "templateId", 100);
  const template = await prisma.performanceTemplate.findFirst({
    where: { id: templateId, organizationId: user.organizationId, active: true, modelFamilyKey: { not: null } },
    include: { criteria: { orderBy: { sortOrder: "asc" }, include: { levels: { orderBy: { score: "asc" } } } } },
  });
  if (!template?.modelFamilyKey) invalid("Modelo não encontrado ou não editável.");
  const name = format11UPName(field(formData, "name", 120));
  const description = field(formData, "description", 800);
  if (name.length < 3) invalid("Informe o nome do modelo (mínimo de três caracteres).");

  const criteria: Prisma.PerformanceCriterionCreateWithoutTemplateInput[] = [];
  for (const original of template.criteria) {
    if (field(formData, `active_${original.id}`, 8) !== "1") continue;
    const label = field(formData, `label_${original.id}`, 160);
    if (!label) invalid(`Critério sem nome: ${original.code}`);
    const area = field(formData, `area_${original.id}`, 20) as PerformanceArea;
    if (!AREAS.includes(area)) invalid("Área de avaliação inválida.");
    const sortRaw = Number(field(formData, `order_${original.id}`, 5));
    const sortOrder = Number.isInteger(sortRaw) && sortRaw >= 1 && sortRaw <= 999 ? sortRaw : original.sortOrder;
    const levels = [1, 2, 3, 4].map((score) => {
      const prior = original.levels.find((item) => item.score === score);
      if (!prior) invalid(`O critério ${original.code} não possui quatro níveis.`);
      const levelLabel = field(formData, `level_label_${original.id}_${score}`, 100);
      const levelDescription = field(formData, `level_description_${original.id}_${score}`, 1200);
      if (!levelLabel || !levelDescription) invalid(`Complete os quatro níveis de ${label}.`);
      return { score, label: levelLabel, description: levelDescription };
    });
    criteria.push({
      area, code: original.code, label,
      description: field(formData, `description_${original.id}`, 600) || null,
      sortOrder, active: true, levels: { create: levels },
    });
  }
  const extraName = field(formData, "newLabel", 160);
  if (extraName) {
    const extraArea = field(formData, "newArea", 20) as PerformanceArea;
    if (!AREAS.includes(extraArea)) invalid("Selecione a área do novo critério.");
    const labels = ["Iniciante", "Em desenvolvimento", "Eficiente", "Excelente"];
    criteria.push({
      area: extraArea,
      code: `CUSTOM_${randomUUID().replace(/-/g, "").toUpperCase()}`,
      label: extraName,
      description: field(formData, "newDescription", 600) || null,
      sortOrder: criteria.length + 1,
      active: true,
      levels: { create: labels.map((label, i) => ({score: i + 1, label, description: label})) },
    });
  }
  if (criteria.length < 1 || criteria.length > 60) invalid("O modelo deve conter de 1 a 60 critérios ativos.");

  let classificationJson: string | null = template.classificationJson;
  if (field(formData, "stageEnabled", 3) === "1") {
    const urgencyMax = Number(field(formData, "urgencyMax", 8));
    const attentionMax = Number(field(formData, "attentionMax", 8));
    if (!Number.isFinite(urgencyMax) || !Number.isFinite(attentionMax) || urgencyMax < 0 || urgencyMax >= attentionMax || attentionMax > 100) {
      invalid("Os limites dos estágios devem estar entre 0 e 100, com urgência menor que atenção.");
    }
    classificationJson = JSON.stringify({ kind: "THREE_STAGES", urgencyMax, attentionMax });
  } else {
    classificationJson = null;
  }
  // Verificação definitiva no banco dentro da transação evita sobrescrever uma edição concorrente.
  await prisma.$transaction(async (tx) => {
    const current = await tx.performanceTemplate.findFirst({
      where: { id: template.id, organizationId: user.organizationId, active: true },
      select: { id: true, version: true },
    });
    if (!current) invalid("Este modelo foi alterado por outro usuário. Recarregue a página.");
    await tx.performanceTemplate.create({
      data: {
        organizationId: user.organizationId,
        modelFamilyKey: template.modelFamilyKey,
        name,
        description: description || null,
        athleteRole: template.athleteRole,
        sport: template.sport,
        systemDefault: false,
        active: true,
        version: template.version + 1,
        classificationJson,
        criteria: { create: criteria },
      },
    });
    await tx.performanceTemplate.update({ where: { id: template.id }, data: { active: false } });
  }, { maxWait: 10000, timeout: 30000 });
  revalidatePath("/performance/modelos");
  redirect("/performance/modelos?status=salvo");
}

/** Reativa os critérios originais de fábrica em nova versão, sem apagar versões anteriores. */
export async function restoreClubEvaluationModel(formData: FormData) {
  const user = await requireModelsManager();
  const templateId = field(formData, "templateId", 100);
  const current = await prisma.performanceTemplate.findFirst({
    where: { id: templateId, organizationId: user.organizationId, active: true, modelFamilyKey: { not: null } },
    select: { id: true, modelFamilyKey: true, athleteRole: true, version: true },
  });
  if (!current?.modelFamilyKey) invalid("Modelo não encontrado.");
  const original = await prisma.performanceTemplate.findFirst({
    where: { organizationId: user.organizationId, modelFamilyKey: current.modelFamilyKey, version: 1 },
    include: { criteria: { orderBy: { sortOrder: "asc" }, include: {levels: {orderBy: {score: "asc"}}} } },
  });
  if (!original) invalid("Versão inicial não encontrada.");
  await prisma.$transaction(async (tx) => {
    await tx.performanceTemplate.create({
      data: {
        organizationId: user.organizationId,
        modelFamilyKey: current.modelFamilyKey,
        name: format11UPName(original.name),
        description: original.description,
        athleteRole: original.athleteRole,
        sport: original.sport,
        active: true,
        systemDefault: false,
        version: current.version + 1,
        classificationJson: original.classificationJson,
        criteria: {create: original.criteria.map((item) => ({
          area: item.area, code: item.code, label: item.label, description: item.description,
          sortOrder: item.sortOrder, active: item.active,
          levels: {create: item.levels.map((level) => ({score: level.score, label:level.label,description:level.description}))},
        }))},
      },
    });
    await tx.performanceTemplate.update({where: {id: current.id}, data:{active:false}});
  }, { maxWait: 10000, timeout: 30000 });
  revalidatePath("/performance/modelos");
  redirect("/performance/modelos?status=restaurado");
}
