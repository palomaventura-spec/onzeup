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

function parseTrainingDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createTraining(formData: FormData) {
  const user = await requireOrganizationUser();

  const categoryIdRaw = clean(formData.get("categoryId"));
  const categoryId = await validateCategory(categoryIdRaw, user.organizationId);
  const date = parseTrainingDate(clean(formData.get("date")));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  const location = nullable(formData.get("location"));
  const notes = nullable(formData.get("notes"));

  if (!categoryId || !date || !startTime || !endTime) return;

  await prisma.trainingSchedule.create({
    data: {
      date,
      // Mantemos weekday preenchido para compatibilidade com registros/rotinas antigas.
      weekday: date.getDay(),
      startTime,
      endTime,
      location,
      notes,
      categoryId,
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/treinos");
  revalidatePath("/agenda");
  revalidatePath("/qtr");
}

export async function updateTraining(formData: FormData) {
  const user = await requireOrganizationUser();

  const id = clean(formData.get("id"));
  const categoryIdRaw = clean(formData.get("categoryId"));
  const categoryId = await validateCategory(categoryIdRaw, user.organizationId);
  const date = parseTrainingDate(clean(formData.get("date")));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  const location = nullable(formData.get("location"));
  const notes = nullable(formData.get("notes"));

  if (!id || !categoryId || !date || !startTime || !endTime) return;

  await prisma.trainingSchedule.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      date,
      weekday: date.getDay(),
      startTime,
      endTime,
      location,
      notes,
      categoryId,
    },
  });

  revalidatePath("/treinos");
  revalidatePath("/agenda");
  revalidatePath("/qtr");
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
  revalidatePath("/agenda");
  revalidatePath("/qtr");
}
