"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ChargeStatus, ChargeType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const v = clean(value);
  return v || null;
}

function moneyToCents(value: string) {
  const normalized = value.replace(",", ".").replace(/[^0-9.]/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function parseType(value: string): ChargeType {
  switch (value) {
    case "REFEREE_FEE": return ChargeType.REFEREE_FEE;
    case "TOURNAMENT": return ChargeType.TOURNAMENT;
    case "UNIFORM": return ChargeType.UNIFORM;
    case "TRAVEL": return ChargeType.TRAVEL;
    case "EVENT": return ChargeType.EVENT;
    case "OTHER": return ChargeType.OTHER;
    default: return ChargeType.MONTHLY_FEE;
  }
}

export async function createCharge(formData: FormData) {
  const user = await requireOrganizationUser();

  const athleteId = clean(formData.get("athleteId"));
  const type = parseType(clean(formData.get("type")));
  const title = clean(formData.get("title"));
  const description = nullable(formData.get("description"));
  const amountCents = moneyToCents(clean(formData.get("amount")));
  const dueDateRaw = clean(formData.get("dueDate"));
  const matchId = nullable(formData.get("matchId"));

  if (!athleteId || !title || amountCents === null || !dueDateRaw) return;

  const athlete = await prisma.athlete.findFirst({
    where: { id: athleteId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!athlete) return;

  if (matchId) {
    const match = await prisma.match.findFirst({
      where: { id: matchId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!match) return;
  }

  const dueDate = new Date(`${dueDateRaw}T12:00:00`);
  if (Number.isNaN(dueDate.getTime())) return;

  await prisma.charge.create({
    data: {
      athleteId,
      organizationId: user.organizationId,
      type,
      title,
      description,
      amountCents,
      dueDate,
      matchId,
    },
  });

  revalidatePath("/financeiro");
}

export async function createMonthlyFees(formData: FormData) {
  const user = await requireOrganizationUser();

  const title = clean(formData.get("title")) || "Mensalidade";
  const amountCents = moneyToCents(clean(formData.get("amount")));
  const dueDateRaw = clean(formData.get("dueDate"));
  const categoryId = nullable(formData.get("categoryId"));

  if (amountCents === null || !dueDateRaw) return;

  const dueDate = new Date(`${dueDateRaw}T12:00:00`);
  if (Number.isNaN(dueDate.getTime())) return;

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      ...(categoryId ? { categoryId } : {}),
    },
    select: { id: true },
  });

  if (athletes.length === 0) return;

  await prisma.$transaction(
    athletes.map((athlete) =>
      prisma.charge.create({
        data: {
          athleteId: athlete.id,
          organizationId: user.organizationId,
          type: ChargeType.MONTHLY_FEE,
          title,
          amountCents,
          dueDate,
        },
      })
    )
  );

  revalidatePath("/financeiro");
}

export async function createRefereeFeesForCallUps(formData: FormData) {
  const user = await requireOrganizationUser();

  const matchId = clean(formData.get("matchId"));
  const amountCents = moneyToCents(clean(formData.get("amount")));
  const dueDateRaw = clean(formData.get("dueDate"));
  if (!matchId || amountCents === null || !dueDateRaw) return;

  const match = await prisma.match.findFirst({
    where: { id: matchId, organizationId: user.organizationId },
    include: { callUps: { select: { athleteId: true } } },
  });
  if (!match || match.callUps.length === 0) return;

  const dueDate = new Date(`${dueDateRaw}T12:00:00`);
  if (Number.isNaN(dueDate.getTime())) return;

  await prisma.$transaction(
    match.callUps.map((callUp) =>
      prisma.charge.create({
        data: {
          athleteId: callUp.athleteId,
          organizationId: user.organizationId,
          matchId,
          type: ChargeType.REFEREE_FEE,
          title: `Taxa de arbitragem — ${match.opponent}`,
          amountCents,
          dueDate,
        },
      })
    )
  );

  revalidatePath("/financeiro");
}

export async function markChargePaid(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  const paymentMethod = nullable(formData.get("paymentMethod"));
  if (!id) return;

  await prisma.charge.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      status: ChargeStatus.PAID,
      paidAt: new Date(),
      paymentMethod,
    },
  });

  revalidatePath("/financeiro");
}

export async function markChargePending(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.charge.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      status: ChargeStatus.PENDING,
      paidAt: null,
      paymentMethod: null,
    },
  });

  revalidatePath("/financeiro");
}

export async function cancelCharge(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.charge.updateMany({
    where: { id, organizationId: user.organizationId },
    data: { status: ChargeStatus.CANCELLED },
  });

  revalidatePath("/financeiro");
}

export async function deleteCharge(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.charge.deleteMany({
    where: { id, organizationId: user.organizationId },
  });

  revalidatePath("/financeiro");
}

export async function goToCharge(formData: FormData) {
  const id = clean(formData.get("id"));
  if (!id) return;
  redirect(`/financeiro/${id}`);
}
