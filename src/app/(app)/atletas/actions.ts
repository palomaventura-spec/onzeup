"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const v = clean(value);
  return v || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const raw = clean(value);
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

async function validateCategory(categoryId: string | null, organizationId: string) {
  if (!categoryId) return null;

  const category = await prisma.category.findFirst({
    where: { id: categoryId, organizationId },
    select: { id: true },
  });

  return category?.id ?? null;
}

export async function createAthlete(formData: FormData) {
  const user = await requireOrganizationUser();

  const name = clean(formData.get("name"));
  const nickname = nullable(formData.get("nickname"));
  const jerseyNumber = nullableNumber(formData.get("jerseyNumber"));
  const position = nullable(formData.get("position"));
  const dominantFoot = nullable(formData.get("dominantFoot"));
  const birthYear = nullableNumber(formData.get("birthYear"));
  const photoUrl = nullable(formData.get("photoUrl"));

  const guardianName = nullable(formData.get("guardianName"));
  const guardianPhone = nullable(formData.get("guardianPhone"));
  const guardianEmail = nullable(formData.get("guardianEmail"));

  const categoryId = await validateCategory(
    nullable(formData.get("categoryId")),
    user.organizationId
  );

  if (!name) return;

  await prisma.athlete.create({
    data: {
      name,
      nickname,
      jerseyNumber,
      position,
      dominantFoot,
      birthYear,
      photoUrl,
      guardianName,
      guardianPhone,
      guardianEmail,
      categoryId,
      organizationId: user.organizationId,
      active: true,
    },
  });

  revalidatePath("/atletas");
}

export async function updateAthlete(formData: FormData) {
  const user = await requireOrganizationUser();

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const nickname = nullable(formData.get("nickname"));
  const jerseyNumber = nullableNumber(formData.get("jerseyNumber"));
  const position = nullable(formData.get("position"));
  const dominantFoot = nullable(formData.get("dominantFoot"));
  const birthYear = nullableNumber(formData.get("birthYear"));
  const photoUrl = nullable(formData.get("photoUrl"));
  const guardianName = nullable(formData.get("guardianName"));
  const guardianPhone = nullable(formData.get("guardianPhone"));
  const guardianEmail = nullable(formData.get("guardianEmail"));
  const active = clean(formData.get("active")) === "true";

  const categoryId = await validateCategory(
    nullable(formData.get("categoryId")),
    user.organizationId
  );

  if (!id || !name) return;

  await prisma.athlete.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      name,
      nickname,
      jerseyNumber,
      position,
      dominantFoot,
      birthYear,
      photoUrl,
      guardianName,
      guardianPhone,
      guardianEmail,
      categoryId,
      active,
    },
  });

  revalidatePath("/atletas");
  redirect("/atletas");
}

export async function deleteAthlete(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.athlete.deleteMany({
    where: { id, organizationId: user.organizationId },
  });

  revalidatePath("/atletas");
}

export async function toggleAthleteStatus(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  const next = clean(formData.get("next")) === "true";

  if (!id) return;

  await prisma.athlete.updateMany({
    where: { id, organizationId: user.organizationId },
    data: { active: next },
  });

  revalidatePath("/atletas");
}


export async function createAthleteMembership(formData: FormData) {
  const user = await requireOrganizationUser();
  const athleteId = clean(formData.get("athleteId"));
  const categoryId = nullable(formData.get("categoryId"));
  const sport = clean(formData.get("sport")) || "BOTH";
  const teamLabel = nullable(formData.get("teamLabel"));
  const competitionType = nullable(formData.get("competitionType"));
  const season = nullable(formData.get("season"));

  if (!athleteId) return;

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!athlete) return;

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!category) return;
  }

  await prisma.athleteMembership.create({
    data: {
      athleteId,
      organizationId: user.organizationId,
      categoryId,
      sport: sport as "FOOTBALL" | "FUTSAL" | "BOTH",
      teamLabel,
      competitionType,
      season,
      verified: true,
    },
  });

  revalidatePath("/atletas");
  revalidatePath(`/atletas/${athleteId}`);
}
