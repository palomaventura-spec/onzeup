"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { MatchStatus } from "@prisma/client";

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
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function validateCategory(categoryId: string, organizationId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, organizationId },
    select: { id: true },
  });
  return category?.id ?? null;
}

function parseDateTime(date: string, time: string) {
  if (!date || !time) return null;
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseStatus(value: string): MatchStatus {
  if (value === "FINISHED") return MatchStatus.FINISHED;
  if (value === "CANCELLED") return MatchStatus.CANCELLED;
  return MatchStatus.SCHEDULED;
}

export async function createMatch(formData: FormData) {
  const user = await requireOrganizationUser();

  const categoryId = await validateCategory(
    clean(formData.get("categoryId")),
    user.organizationId
  );
  const opponent = clean(formData.get("opponent"));
  const competition = nullable(formData.get("competition"));
  const matchDate = clean(formData.get("matchDate"));
  const matchTime = clean(formData.get("matchTime"));
  const startsAt = parseDateTime(matchDate, matchTime);
  const location = nullable(formData.get("location"));
  const homeAway = nullable(formData.get("homeAway"));
  const notes = nullable(formData.get("notes"));

  if (!categoryId || !opponent || !startsAt) return;

  await prisma.match.create({
    data: {
      opponent,
      competition,
      startsAt,
      location,
      homeAway,
      notes,
      categoryId,
      organizationId: user.organizationId,
      status: MatchStatus.SCHEDULED,
    },
  });

  revalidatePath("/jogos");
}

export async function updateMatch(formData: FormData) {
  const user = await requireOrganizationUser();

  const id = clean(formData.get("id"));
  const categoryId = await validateCategory(
    clean(formData.get("categoryId")),
    user.organizationId
  );
  const opponent = clean(formData.get("opponent"));
  const competition = nullable(formData.get("competition"));
  const matchDate = clean(formData.get("matchDate"));
  const matchTime = clean(formData.get("matchTime"));
  const startsAt = parseDateTime(matchDate, matchTime);
  const location = nullable(formData.get("location"));
  const homeAway = nullable(formData.get("homeAway"));
  const notes = nullable(formData.get("notes"));
  const status = parseStatus(clean(formData.get("status")));
  const goalsFor = nullableNumber(formData.get("goalsFor"));
  const goalsAgainst = nullableNumber(formData.get("goalsAgainst"));

  if (!id || !categoryId || !opponent || !startsAt) return;

  const resultData =
    status === MatchStatus.FINISHED
      ? { goalsFor, goalsAgainst }
      : { goalsFor: null, goalsAgainst: null };

  await prisma.match.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      opponent,
      competition,
      startsAt,
      location,
      homeAway,
      notes,
      categoryId,
      status,
      ...resultData,
    },
  });

  revalidatePath("/jogos");
  redirect("/jogos");
}

export async function deleteMatch(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.match.deleteMany({
    where: { id, organizationId: user.organizationId },
  });

  revalidatePath("/jogos");
}

export async function markMatchFinished(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  const goalsFor = nullableNumber(formData.get("goalsFor"));
  const goalsAgainst = nullableNumber(formData.get("goalsAgainst"));

  if (!id || goalsFor === null || goalsAgainst === null) return;

  await prisma.match.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      status: MatchStatus.FINISHED,
      goalsFor,
      goalsAgainst,
    },
  });

  revalidatePath("/jogos");
}
