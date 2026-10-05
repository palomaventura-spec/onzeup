"use server";

import { createHash, randomBytes } from "node:crypto";

import {
  GrowthBoneAgeMethod,
  GrowthMeasurementSource,
  GrowthReferenceSex,
  Prisma,
  SportType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getEffectiveClubRole } from "@/lib/club-permissions";
import { requireClubPermission } from "@/lib/club-access";
import { requireClubGrowthAccess } from "@/lib/growth-access";
import {
  buildMeasurementMetrics,
  calculateBmi,
  familyTargetHeight,
  GROWTH_DISCLAIMER,
  khamisRocheProjection,
} from "@/lib/growth-calculations";
import { encryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}
function nullable(value: FormDataEntryValue | null) {
  const v = clean(value);
  return v || null;
}
function numberValue(value: FormDataEntryValue | null) {
  const raw = clean(value).replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function numeric(value: unknown) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function dateValue(value: FormDataEntryValue | null) {
  const raw = clean(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
function validHeight(value: number | null, min = 40, max = 250) {
  return value != null && value >= min && value <= max ? Number(value.toFixed(2)) : null;
}
function validWeight(value: number | null) {
  return value != null && value >= 5 && value <= 250 ? Number(value.toFixed(2)) : null;
}
function refresh(athleteId: string) {
  revalidatePath(`/atletas/${athleteId}`);
  revalidatePath(`/atletas/${athleteId}/dados`);
  revalidatePath(`/atletas/${athleteId}/performance`);
  revalidatePath(`/atletas/${athleteId}/performance/crescimento`);
}
async function audit(input: {
  organizationId: string;
  athleteId: string;
  actorUserId: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  entityType: string;
  entityId?: string | null;
  fields?: string[];
}) {
  await prisma.athleteDataAuditLog.create({
    data: {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      // Nunca gravar valores físicos/parentais/saúde no log; somente nomes de campos.
      metadataJson: JSON.stringify({ fields: input.fields || [] }),
    },
  });
}
export async function saveClubGrowthProfile(formData: FormData) {
  const athleteId = clean(formData.get("athleteId"));
  const { user, athlete } = await requireClubGrowthAccess(athleteId, "manage");
  const role = getEffectiveClubRole(user);
  if (role !== "MANAGER" && role !== "COORDINATOR") redirect(`/atletas/${athleteId}/performance/crescimento?erro=sem-permissao`);
  const current = await prisma.athleteGrowthProfile.findUnique({ where: { athleteId } });
  const referenceSexRaw = clean(formData.get("referenceSex"));
  const referenceSex = referenceSexRaw === "BOY" || referenceSexRaw === "GIRL"
    ? (referenceSexRaw as GrowthReferenceSex)
    : null;
  const motherHeightCm = validHeight(numberValue(formData.get("motherHeightCm")), 120, 220);
  const fatherHeightCm = validHeight(numberValue(formData.get("fatherHeightCm")), 120, 230);
  const saved = await prisma.athleteGrowthProfile.upsert({
    where: { athleteId },
    update: { referenceSex, motherHeightCm, fatherHeightCm },
    create: {
      organizationId: athlete.organizationId,
      athleteId,
      createdByUserId: user.id,
      referenceSex,
      motherHeightCm,
      fatherHeightCm,
    },
    select: { id: true },
  });
  await audit({
    organizationId: athlete.organizationId,
    athleteId,
    actorUserId: user.id,
    action: current ? "UPDATED" : "CREATED",
    entityType: "AthleteGrowthProfile",
    entityId: saved.id,
    fields: ["referenceSex", "parentHeights"],
  });
  refresh(athleteId);
  redirect(`/atletas/${athleteId}/performance/crescimento?status=perfil-salvo`);
}

export async function saveClubGrowthMeasurement(formData: FormData) {
  const athleteId = clean(formData.get("athleteId"));
  const measurementId = nullable(formData.get("measurementId"));
  const { user, athlete } = await requireClubGrowthAccess(athleteId, "manage");

  const privateData = await prisma.athletePrivateData.findUnique({ where: { athleteId }, select: { birthDate: true } });
  if (!privateData?.birthDate) redirect(`/atletas/${athleteId}/performance/crescimento?erro=nascimento`);

  const measuredAt = dateValue(formData.get("measuredAt"));
  const heightCm = validHeight(numberValue(formData.get("heightCm")));
  const weightKg = validWeight(numberValue(formData.get("weightKg")));
  if (!measuredAt || !heightCm || !weightKg) redirect(`/atletas/${athleteId}/performance/crescimento?erro=medicao`);
  if (measuredAt > new Date()) redirect(`/atletas/${athleteId}/performance/crescimento?erro=data-futura`);

  const role = getEffectiveClubRole(user);
  const measurementSource = role === "COACH" ? GrowthMeasurementSource.PROFESSIONAL : GrowthMeasurementSource.CLUB;
  const data = {
    measuredAt,
    heightCm,
    weightKg,
    bmi: calculateBmi(heightCm, weightKg),
    wingspanCm: validHeight(numberValue(formData.get("wingspanCm"))),
    sittingHeightCm: validHeight(numberValue(formData.get("sittingHeightCm")), 20, 180),
    bodyFatPercent: numberValue(formData.get("bodyFatPercent")),
    muscleMassKg: validWeight(numberValue(formData.get("muscleMassKg"))),
    notes: nullable(formData.get("notes")),
    recordedByUserId: user.id,
    measurementSource,
  };

  let savedId: string;
  let action: "CREATED" | "UPDATED" = "CREATED";
  if (measurementId) {
    const current = await prisma.athleteBodyMeasurement.findFirst({ where: { id: measurementId, athleteId, organizationId: athlete.organizationId }, select: { id: true } });
    if (!current) redirect(`/atletas/${athleteId}/performance/crescimento?erro=acesso`);
    const saved = await prisma.athleteBodyMeasurement.update({ where: { id: current.id }, data, select: { id: true } });
    savedId = saved.id;
    action = "UPDATED";
  } else {
    const saved = await prisma.athleteBodyMeasurement.create({
      data: { organizationId: athlete.organizationId, athleteId, ...data },
      select: { id: true },
    });
    savedId = saved.id;
  }
  await audit({ organizationId: athlete.organizationId, athleteId, actorUserId: user.id, action, entityType: "AthleteBodyMeasurement", entityId: savedId, fields: ["growthMeasurement"] });
  refresh(athleteId);
  redirect(`/atletas/${athleteId}/performance/crescimento?status=medicao-salva`);
}

export async function deleteClubGrowthMeasurement(formData: FormData) {
  const athleteId = clean(formData.get("athleteId"));
  const measurementId = clean(formData.get("measurementId"));
  const { user, athlete } = await requireClubGrowthAccess(athleteId, "manage");
  const current = await prisma.athleteBodyMeasurement.findFirst({ where: { id: measurementId, athleteId, organizationId: athlete.organizationId }, select: { id: true } });
  if (!current) return;
  await prisma.athleteBodyMeasurement.delete({ where: { id: current.id } });
  await audit({ organizationId: athlete.organizationId, athleteId, actorUserId: user.id, action: "DELETED", entityType: "AthleteBodyMeasurement", entityId: current.id, fields: ["growthMeasurement"] });
  refresh(athleteId);
}

export async function saveBoneAgeAssessment(formData: FormData) {
  const athleteId = clean(formData.get("athleteId"));
  const assessmentId = nullable(formData.get("assessmentId"));
  const { user, athlete } = await requireClubGrowthAccess(athleteId, "manage");
  const examinedAt = dateValue(formData.get("examinedAt"));
  const boneAgeMonths = Number(clean(formData.get("boneAgeMonths")));
  const methodRaw = clean(formData.get("method"));
  const method = (["GREULICH_PYLE", "TANNER_WHITEHOUSE", "OTHER"] as const).includes(methodRaw as GrowthBoneAgeMethod)
    ? (methodRaw as GrowthBoneAgeMethod)
    : null;
  if (!examinedAt || !Number.isInteger(boneAgeMonths) || boneAgeMonths < 12 || boneAgeMonths > 240 || !method) {
    redirect(`/atletas/${athleteId}/performance/crescimento?erro=idade-ossea`);
  }
  const reportDocumentId = nullable(formData.get("reportDocumentId"));
  if (reportDocumentId) {
    const doc = await prisma.athleteDocument.findFirst({ where: { id: reportDocumentId, athleteId, organizationId: athlete.organizationId, deletedAt: null }, select: { id: true } });
    if (!doc) redirect(`/atletas/${athleteId}/performance/crescimento?erro=documento`);
  }
  const data = {
    examinedAt,
    boneAgeMonths,
    method,
    reportDocumentId,
    professionalEncrypted: encryptPrivateData(nullable(formData.get("professional"))),
    notesEncrypted: encryptPrivateData(nullable(formData.get("notes"))),
    recordedByUserId: user.id,
  };
  let savedId: string;
  let action: "CREATED" | "UPDATED" = "CREATED";
  if (assessmentId) {
    const current = await prisma.athleteBoneAgeAssessment.findFirst({ where: { id: assessmentId, athleteId, organizationId: athlete.organizationId }, select: { id: true } });
    if (!current) return;
    const saved = await prisma.athleteBoneAgeAssessment.update({ where: { id: current.id }, data, select: { id: true } });
    savedId = saved.id;
    action = "UPDATED";
  } else {
    const saved = await prisma.athleteBoneAgeAssessment.create({ data: { organizationId: athlete.organizationId, athleteId, ...data }, select: { id: true } });
    savedId = saved.id;
  }
  await audit({ organizationId: athlete.organizationId, athleteId, actorUserId: user.id, action, entityType: "AthleteBoneAgeAssessment", entityId: savedId, fields: ["boneAgeAssessment"] });
  refresh(athleteId);
}

export async function deleteBoneAgeAssessment(formData: FormData) {
  const athleteId = clean(formData.get("athleteId"));
  const assessmentId = clean(formData.get("assessmentId"));
  const { user, athlete } = await requireClubGrowthAccess(athleteId, "manage");
  const current = await prisma.athleteBoneAgeAssessment.findFirst({ where: { id: assessmentId, athleteId, organizationId: athlete.organizationId }, select: { id: true } });
  if (!current) return;
  await prisma.athleteBoneAgeAssessment.delete({ where: { id: current.id } });
  await audit({ organizationId: athlete.organizationId, athleteId, actorUserId: user.id, action: "DELETED", entityType: "AthleteBoneAgeAssessment", entityId: current.id, fields: ["boneAgeAssessment"] });
  refresh(athleteId);
}


export async function generateClubGrowthReport(formData: FormData) {
  const athleteId = clean(formData.get("athleteId"));
  const { user } = await requireClubGrowthAccess(athleteId, "view");
  const role = getEffectiveClubRole(user);

  // A impressão da projeção e do relatório de crescimento é exclusiva do gestor.
  // O suporte SUPER_ADMIN nunca recebe acesso implícito a este documento privado.
  if (user.role === "SUPER_ADMIN" || role !== "MANAGER") {
    redirect(`/atletas/${athleteId}/performance/crescimento?erro=sem-permissao`);
  }

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, organizationId: user.organizationId },
    include: {
      category: { select: { name: true } },
      privateData: { select: { birthDate: true } },
      growthProfile: true,
      bodyMeasurements: {
        orderBy: [{ measuredAt: "asc" }, { createdAt: "asc" }],
      },
      boneAgeAssessments: {
        orderBy: { examinedAt: "asc" },
        select: {
          id: true,
          examinedAt: true,
          boneAgeMonths: true,
          method: true,
        },
      },
    },
  });

  if (!athlete) {
    redirect(`/atletas/${athleteId}/performance/crescimento?erro=acesso`);
  }

  const birthDate = athlete.privateData?.birthDate ?? null;
  const metrics = buildMeasurementMetrics(
    athlete.bodyMeasurements.map((item) => ({
      id: item.id,
      measuredAt: item.measuredAt,
      heightCm: numeric(item.heightCm),
      weightKg: numeric(item.weightKg),
      bmi: numeric(item.bmi),
      wingspanCm: numeric(item.wingspanCm),
      sittingHeightCm: numeric(item.sittingHeightCm),
    })),
    birthDate,
  );

  const latest = metrics[metrics.length - 1] ?? null;
  if (!latest) {
    redirect(`/atletas/${athleteId}/performance/crescimento?erro=relatorio-sem-medicoes`);
  }

  const target = familyTargetHeight({
    sex: athlete.growthProfile?.referenceSex,
    fatherHeightCm: numeric(athlete.growthProfile?.fatherHeightCm),
    motherHeightCm: numeric(athlete.growthProfile?.motherHeightCm),
  });

  const khamis = latest.exactAge
    ? khamisRocheProjection({
        sex: athlete.growthProfile?.referenceSex,
        ageYears: latest.exactAge.decimalYears,
        heightCm: latest.heightCm,
        weightKg: latest.weightKg,
        fatherHeightCm: numeric(athlete.growthProfile?.fatherHeightCm),
        motherHeightCm: numeric(athlete.growthProfile?.motherHeightCm),
      })
    : null;

  const snapshot: Prisma.InputJsonObject = {
    snapshotVersion: 1,
    documentKind: "GROWTH_REPORT",
    audience: "INTERNAL",
    generatedAt: new Date().toISOString(),
    generatedByName: user.name || null,
    athlete: {
      id: athlete.id,
      name: athlete.name,
      nickname: athlete.nickname,
      photoUrl: athlete.photoUrl,
      position: athlete.position,
      categoryName: athlete.category?.name ?? null,
    },
    growth: {
      whoReference: "OMS 2007 · altura por idade · 5–19 anos",
      referenceSex: athlete.growthProfile?.referenceSex ?? null,
      latest: {
        date: latest.measuredAt.toISOString(),
        ageLabel: latest.exactAge?.label ?? null,
        ageMonths: latest.exactAge?.totalMonths ?? null,
        heightCm: latest.heightCm,
        weightKg: latest.weightKg,
        bmi: latest.bmi ?? null,
        growthDeltaCm: latest.growthDeltaCm ?? null,
        growthVelocityCmPerYear: latest.growthVelocityCmPerYear ?? null,
      },
      targetHeight: target,
      khamisRoche: khamis,
      measurements: metrics.map((item) => ({
        id: item.id,
        date: item.measuredAt.toISOString(),
        ageLabel: item.exactAge?.label ?? null,
        ageMonths: item.exactAge?.totalMonths ?? null,
        heightCm: item.heightCm,
        weightKg: item.weightKg,
        bmi: item.bmi ?? null,
        wingspanCm: item.wingspanCm ?? null,
        sittingHeightCm: item.sittingHeightCm ?? null,
        growthDeltaCm: item.growthDeltaCm ?? null,
        growthVelocityCmPerYear: item.growthVelocityCmPerYear ?? null,
      })),
      boneAgeAssessments: athlete.boneAgeAssessments.map((item) => ({
        id: item.id,
        date: item.examinedAt.toISOString(),
        boneAgeMonths: item.boneAgeMonths,
        method: item.method,
      })),
      disclaimer: GROWTH_DISCLAIMER,
    },
  };

  const firstMeasurement = metrics[0]?.measuredAt ?? latest.measuredAt;
  const rawToken = randomBytes(32).toString("hex");
  const report = await prisma.performanceReport.create({
    data: {
      organizationId: user.organizationId,
      athleteId,
      generatedByUserId: user.id,
      title: `Relatório de crescimento e desenvolvimento físico · ${latest.measuredAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`,
      reportType: "CONSOLIDATED",
      sport: SportType.BOTH,
      status: "GENERATED",
      periodStart: firstMeasurement,
      periodEnd: latest.measuredAt,
      includeScores: false,
      includeInternalNotes: true,
      snapshot,
      fileName: `11up-crescimento-${athlete.id}-${latest.measuredAt.toISOString().slice(0, 10)}.pdf`,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    },
    select: { id: true },
  });

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "CREATED",
    entityType: "AthleteGrowthReport",
    entityId: report.id,
    fields: ["growthReportSnapshot"],
  });

  revalidatePath(`/atletas/${athleteId}/performance/crescimento`);
  revalidatePath(`/atletas/${athleteId}/performance/relatorios`);
  redirect(`/performance-report/${report.id}?print=1`);
}


export async function saveGrowthProfessionalAccess(formData: FormData) {
  const manager = await requireClubPermission("STAFF_EDIT");
  const athleteId = clean(formData.get("athleteId"));
  const staffMemberId = clean(formData.get("staffMemberId"));
  const athlete = await prisma.athlete.findFirst({ where: { id: athleteId, organizationId: manager.organizationId }, select: { id: true, categoryId: true, organizationId: true } });
  if (!athlete?.categoryId || !staffMemberId) return;
  const staff = await prisma.staffMember.findFirst({ where: { id: staffMemberId, organizationId: manager.organizationId, active: true }, select: { id: true } });
  if (!staff) return;
  const allowView = clean(formData.get("allowView")) === "true";
  const allowManage = clean(formData.get("allowManage")) === "true";
  await prisma.$transaction(async (tx) => {
    await tx.staffCategoryPermission.deleteMany({
      where: { staffMemberId, categoryId: athlete.categoryId!, sport: "BOTH", permission: { in: ["GROWTH_VIEW", "GROWTH_MANAGE"] } },
    });
    const permissions = [
      ...(allowView || allowManage ? ["GROWTH_VIEW" as const] : []),
      ...(allowManage ? ["GROWTH_MANAGE" as const] : []),
    ];
    if (permissions.length) {
      await tx.staffCategoryPermission.createMany({
        data: permissions.map((permission) => ({ organizationId: manager.organizationId, staffMemberId, categoryId: athlete.categoryId!, sport: "BOTH" as const, permission, enabled: true })),
        skipDuplicates: true,
      });
    }
    await tx.athleteDataAuditLog.create({
      data: { organizationId: manager.organizationId, athleteId, actorUserId: manager.id, action: "UPDATED", entityType: "AthleteGrowthAccess", entityId: staffMemberId, metadataJson: JSON.stringify({ fields: ["professionalGrowthAccess"] }) },
    });
  });
  refresh(athleteId);
}
