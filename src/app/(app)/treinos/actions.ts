"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(input: FormDataEntryValue | null): string | null {
  const normalized = clean(input);
  return normalized || null;
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

function dateWithTime(date: Date, value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return Number.isNaN(result.getTime()) ? null : result;
}

export async function createTraining(formData: FormData) {
  const user = await requireClubPermission("TRAININGS_EDIT");
  const categoryId = await validateCategory(clean(formData.get("categoryId")), user.organizationId);
  const date = parseTrainingDate(clean(formData.get("date")));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  if (!categoryId || !date || !startTime || !endTime) return;

  await prisma.trainingSchedule.create({
    data: {
      date,
      weekday: date.getDay(),
      startTime,
      endTime,
      location: nullable(formData.get("location")),
      notes: nullable(formData.get("notes")),
      categoryId,
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/treinos");
  revalidatePath("/agenda");
  revalidatePath("/qtr");
  revalidatePath("/dashboard");
}

export async function updateTraining(formData: FormData) {
  const user = await requireClubPermission("TRAININGS_EDIT");
  const id = clean(formData.get("id"));
  const categoryId = await validateCategory(clean(formData.get("categoryId")), user.organizationId);
  const date = parseTrainingDate(clean(formData.get("date")));
  const startTime = clean(formData.get("startTime"));
  const endTime = clean(formData.get("endTime"));
  if (!id || !categoryId || !date || !startTime || !endTime) return;

  await prisma.trainingSchedule.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      date,
      weekday: date.getDay(),
      startTime,
      endTime,
      location: nullable(formData.get("location")),
      notes: nullable(formData.get("notes")),
      categoryId,
    },
  });

  revalidatePath("/treinos");
  revalidatePath(`/treinos/${id}`);
  revalidatePath("/agenda");
  revalidatePath("/qtr");
  revalidatePath("/dashboard");
  redirect("/treinos");
}

export async function deleteTraining(formData: FormData) {
  const user = await requireClubPermission("TRAININGS_EDIT");
  const id = clean(formData.get("id"));
  if (!id) return;
  await prisma.trainingSchedule.deleteMany({ where: { id, organizationId: user.organizationId } });
  revalidatePath("/treinos");
  revalidatePath("/agenda");
  revalidatePath("/qtr");
  revalidatePath("/dashboard");
}

export async function saveTrainingAttendance(formData: FormData) {
  const user = await requireClubPermission("TRAININGS_EDIT");
  const scheduleId = clean(formData.get("scheduleId"));
  if (!scheduleId) return;

  const training = await prisma.trainingSchedule.findFirst({
    where: { id: scheduleId, organizationId: user.organizationId },
    select: { id: true, date: true, startTime: true, endTime: true, location: true, categoryId: true },
  });
  if (!training?.date) return;
  const trainingDate = training.date;

  const athletes = await prisma.athlete.findMany({
    where: { organizationId: user.organizationId, categoryId: training.categoryId, active: true },
    select: { id: true },
  });
  const athleteIds = new Set(athletes.map((athlete) => athlete.id));
  const startsAt = dateWithTime(trainingDate, training.startTime);
  const endsAt = dateWithTime(trainingDate, training.endTime);
  if (!startsAt) return;

  await prisma.$transaction(async (tx) => {
    let session = await tx.trainingSession.findFirst({
      where: { organizationId: user.organizationId, scheduleId: training.id },
      select: { id: true },
    });

    if (!session) {
      session = await tx.trainingSession.create({
        data: {
          organizationId: user.organizationId,
          categoryId: training.categoryId,
          scheduleId: training.id,
          recordedByUserId: user.id,
          startsAt,
          endsAt,
          location: training.location,
        },
        select: { id: true },
      });
    }

    for (const athleteId of athleteIds) {
      const rawStatus = clean(formData.get(`status_${athleteId}`));
      if (!rawStatus) continue;
      const status = rawStatus === "ABSENT" ? "ABSENT" : rawStatus === "LATE" ? "LATE" : "PRESENT";
      const arrivalValue = clean(formData.get(`arrival_${athleteId}`));
      const arrivedAt = status === "LATE" ? dateWithTime(trainingDate, arrivalValue) : null;
      if (status === "LATE" && !arrivedAt) continue;

      await tx.trainingAttendance.upsert({
        where: { sessionId_athleteId: { sessionId: session.id, athleteId } },
        update: { status, arrivedAt, recordedByUserId: user.id },
        create: {
          organizationId: user.organizationId,
          sessionId: session.id,
          athleteId,
          status,
          arrivedAt,
          recordedByUserId: user.id,
        },
      });
    }
  });

  revalidatePath(`/treinos/${scheduleId}`);
  revalidatePath("/treinos");
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
}
