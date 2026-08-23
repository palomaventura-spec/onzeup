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

async function validateCategory(categoryId: string, organizationId: string) {
  const category = await prisma.category.findFirst({
    where: { id: categoryId, organizationId },
    select: { id: true },
  });
  return category?.id ?? null;
}

function validWeekday(value: string) {
  const weekday = Number(value);
  return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : null;
}

export async function createTraining(formData: FormData) {
  const user = await requireOrganizationUser();

  const categoryIdRaw = clean(formData.get("categoryId"));
  const categoryId = await validateCategory(categoryIdRaw, user.organizationId);
  const weekday = validWeekday(clean(formData.get("weekday")));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  const location = nullable(formData.get("location"));
  const notes = nullable(formData.get("notes"));

  if (!categoryId || weekday === null || !startTime || !endTime) return;

  await prisma.trainingSchedule.create({
    data: {
      weekday,
      startTime,
      endTime,
      location,
      notes,
      categoryId,
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/treinos");
}

export async function updateTraining(formData: FormData) {
  const user = await requireOrganizationUser();

  const id = clean(formData.get("id"));
  const categoryIdRaw = clean(formData.get("categoryId"));
  const categoryId = await validateCategory(categoryIdRaw, user.organizationId);
  const weekday = validWeekday(clean(formData.get("weekday")));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  const location = nullable(formData.get("location"));
  const notes = nullable(formData.get("notes"));

  if (!id || !categoryId || weekday === null || !startTime || !endTime) return;

  await prisma.trainingSchedule.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      weekday,
      startTime,
      endTime,
      location,
      notes,
      categoryId,
    },
  });

  revalidatePath("/treinos");
  redirect("/treinos");
}

export async function deleteTraining(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.trainingSchedule.deleteMany({
    where: { id, organizationId: user.organizationId },
  });

  revalidatePath("/treinos");
}
