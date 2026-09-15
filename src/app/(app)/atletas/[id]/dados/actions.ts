"use server";

import { revalidatePath } from "next/cache";

import { requireClubPermission } from "@/lib/club-access";
import { encryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const normalized = clean(value);
  return normalized || null;
}

function numberValue(value: FormDataEntryValue | null) {
  const normalized = clean(value).replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function dateValue(value: FormDataEntryValue | null) {
  const normalized = clean(value);
  if (!normalized) return null;

  const parsed = new Date(`${normalized}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ownedAthlete(athleteId: string, organizationId: string) {
  if (!athleteId) return null;

  return prisma.athlete.findFirst({
    where: { id: athleteId, organizationId },
    select: { id: true },
  });
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
      metadataJson: JSON.stringify({ fields: input.fields || [] }),
    },
  });
}

function refresh(athleteId: string) {
  revalidatePath(`/atletas/${athleteId}`);
  revalidatePath(`/atletas/${athleteId}/dados`);
  revalidatePath(`/atletas/${athleteId}/performance`);
}

export async function saveAthletePrivateData(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const athleteId = clean(formData.get("athleteId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete) return;

  const data = {
    birthDate: dateValue(formData.get("birthDate")),
    rgEncrypted: encryptPrivateData(nullable(formData.get("rg"))),
    rgIssuerEncrypted: encryptPrivateData(nullable(formData.get("rgIssuer"))),
    cpfEncrypted: encryptPrivateData(nullable(formData.get("cpf"))),
    nationality: nullable(formData.get("nationality")),
    naturality: nullable(formData.get("naturality")),
    email: nullable(formData.get("email")),
    instagram: nullable(formData.get("instagram")),
    bloodTypeEncrypted: encryptPrivateData(nullable(formData.get("bloodType"))),
    allergiesEncrypted: encryptPrivateData(nullable(formData.get("allergies"))),
    medicationsEncrypted: encryptPrivateData(nullable(formData.get("medications"))),
    healthConditionsEncrypted: encryptPrivateData(
      nullable(formData.get("healthConditions"))
    ),
    medicalRestrictionsEncrypted: encryptPrivateData(
      nullable(formData.get("medicalRestrictions"))
    ),
    healthPlanEncrypted: encryptPrivateData(nullable(formData.get("healthPlan"))),
    healthPlanNumberEncrypted: encryptPrivateData(
      nullable(formData.get("healthPlanNumber"))
    ),
    emergencyContactNameEncrypted: encryptPrivateData(
      nullable(formData.get("emergencyContactName"))
    ),
    emergencyContactPhoneEncrypted: encryptPrivateData(
      nullable(formData.get("emergencyContactPhone"))
    ),
    emergencyContactRelationEncrypted: encryptPrivateData(
      nullable(formData.get("emergencyContactRelation"))
    ),
    medicalNotesEncrypted: encryptPrivateData(
      nullable(formData.get("medicalNotes"))
    ),
  };

  const existing = await prisma.athletePrivateData.findUnique({
    where: { athleteId },
    select: { id: true },
  });

  const saved = await prisma.athletePrivateData.upsert({
    where: { athleteId },
    update: data,
    create: { athleteId, ...data },
    select: { id: true },
  });

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: existing ? "UPDATED" : "CREATED",
    entityType: "AthletePrivateData",
    entityId: saved.id,
    fields: ["registration", "health", "emergencyContact"],
  });

  refresh(athleteId);
}

export async function saveAthleteGuardian(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const athleteId = clean(formData.get("athleteId"));
  const guardianId = nullable(formData.get("guardianId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete) return;

  const relationInput = clean(formData.get("relation"));
  const relation = ["FATHER", "MOTHER", "LEGAL_GUARDIAN", "OTHER"].includes(
    relationInput
  )
    ? (relationInput as "FATHER" | "MOTHER" | "LEGAL_GUARDIAN" | "OTHER")
    : "OTHER";
  const name = clean(formData.get("name"));
  if (!name) return;

  const data = {
    relation,
    name,
    rgEncrypted: encryptPrivateData(nullable(formData.get("rg"))),
    rgIssuerEncrypted: encryptPrivateData(nullable(formData.get("rgIssuer"))),
    cpfEncrypted: encryptPrivateData(nullable(formData.get("cpf"))),
    nationality: nullable(formData.get("nationality")),
    naturality: nullable(formData.get("naturality")),
    maritalStatus: nullable(formData.get("maritalStatus")),
    profession: nullable(formData.get("profession")),
    email: nullable(formData.get("email")),
    phone: nullable(formData.get("phone")),
    address: nullable(formData.get("address")),
    city: nullable(formData.get("city")),
    neighborhood: nullable(formData.get("neighborhood")),
    postalCode: nullable(formData.get("postalCode")),
    instagram: nullable(formData.get("instagram")),
    isPrimary: clean(formData.get("isPrimary")) === "true",
    authorizedForPickup:
      clean(formData.get("authorizedForPickup")) === "true",
  };

  let savedId: string;
  let action: "CREATED" | "UPDATED" = "CREATED";

  if (guardianId) {
    const guardian = await prisma.athleteGuardian.findFirst({
      where: { id: guardianId, athleteId },
      select: { id: true },
    });
    if (!guardian) return;

    const saved = await prisma.athleteGuardian.update({
      where: { id: guardian.id },
      data,
      select: { id: true },
    });
    savedId = saved.id;
    action = "UPDATED";
  } else {
    const saved = await prisma.athleteGuardian.create({
      data: { athleteId, ...data },
      select: { id: true },
    });
    savedId = saved.id;
  }

  if (data.isPrimary) {
    await prisma.athleteGuardian.updateMany({
      where: { athleteId, id: { not: savedId } },
      data: { isPrimary: false },
    });
  }

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action,
    entityType: "AthleteGuardian",
    entityId: savedId,
    fields: ["guardianRegistration"],
  });

  refresh(athleteId);
}

export async function deleteAthleteGuardian(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const athleteId = clean(formData.get("athleteId"));
  const guardianId = clean(formData.get("guardianId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete || !guardianId) return;

  const guardian = await prisma.athleteGuardian.findFirst({
    where: { id: guardianId, athleteId },
    select: { id: true },
  });
  if (!guardian) return;

  await prisma.athleteGuardian.delete({ where: { id: guardian.id } });
  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "DELETED",
    entityType: "AthleteGuardian",
    entityId: guardian.id,
  });

  refresh(athleteId);
}

export async function createBodyMeasurement(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const athleteId = clean(formData.get("athleteId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete) return;

  const enteredHeight = numberValue(formData.get("heightCm"));
  const convertedHeight =
    enteredHeight && enteredHeight <= 3
      ? enteredHeight * 100
      : enteredHeight;
  const heightCm =
    convertedHeight && convertedHeight >= 40 && convertedHeight <= 250
      ? Number(convertedHeight.toFixed(2))
      : null;
  const weightKg = numberValue(formData.get("weightKg"));
  const calculatedBmi =
    heightCm && weightKg
      ? weightKg / Math.pow(heightCm / 100, 2)
      : null;
  const bmi =
    calculatedBmi && calculatedBmi >= 5 && calculatedBmi <= 100
      ? Number(calculatedBmi.toFixed(2))
      : null;

  const measurement = await prisma.athleteBodyMeasurement.create({
    data: {
      organizationId: user.organizationId,
      athleteId,
      recordedByUserId: user.id,
      measuredAt: dateValue(formData.get("measuredAt")) || new Date(),
      heightCm,
      weightKg,
      bmi,
      wingspanCm: numberValue(formData.get("wingspanCm")),
      bodyFatPercent: numberValue(formData.get("bodyFatPercent")),
      muscleMassKg: numberValue(formData.get("muscleMassKg")),
      notes: nullable(formData.get("notes")),
    },
    select: { id: true },
  });

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "CREATED",
    entityType: "AthleteBodyMeasurement",
    entityId: measurement.id,
    fields: ["physicalMeasurement"],
  });

  refresh(athleteId);
}

export async function deleteBodyMeasurement(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");
  const athleteId = clean(formData.get("athleteId"));
  const measurementId = clean(formData.get("measurementId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete || !measurementId) return;

  const measurement = await prisma.athleteBodyMeasurement.findFirst({
    where: {
      id: measurementId,
      athleteId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });
  if (!measurement) return;

  await prisma.athleteBodyMeasurement.delete({
    where: { id: measurement.id },
  });
  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "DELETED",
    entityType: "AthleteBodyMeasurement",
    entityId: measurement.id,
  });

  refresh(athleteId);
}
