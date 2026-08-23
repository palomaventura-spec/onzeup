"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CallUpStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createCallUps(formData: FormData) {
  const user = await requireOrganizationUser();
  const matchId = clean(formData.get("matchId"));
  const athleteIds = formData.getAll("athleteIds").map(String).filter(Boolean);

  if (!matchId || athleteIds.length === 0) return;

  const match = await prisma.match.findFirst({
    where: { id: matchId, organizationId: user.organizationId },
    select: { id: true },
  });
  if (!match) return;

  const athletes = await prisma.athlete.findMany({
    where: {
      id: { in: athleteIds },
      organizationId: user.organizationId,
      active: true,
    },
    select: { id: true },
  });

  if (athletes.length === 0) return;

  await prisma.$transaction(
    athletes.map((athlete) =>
      prisma.callUp.upsert({
        where: {
          matchId_athleteId: {
            matchId: match.id,
            athleteId: athlete.id,
          },
        },
        update: {},
        create: {
          matchId: match.id,
          athleteId: athlete.id,
          organizationId: user.organizationId,
        },
      })
    )
  );

  revalidatePath(`/convocacoes/${matchId}`);
}

export async function deleteCallUp(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  const matchId = clean(formData.get("matchId"));
  if (!id) return;

  await prisma.callUp.deleteMany({
    where: { id, organizationId: user.organizationId },
  });

  if (matchId) revalidatePath(`/convocacoes/${matchId}`);
}

export async function updateCallUpStatus(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  const matchId = clean(formData.get("matchId"));
  const rawStatus = clean(formData.get("status"));

  if (!id) return;

  const status =
    rawStatus === "CONFIRMED"
      ? CallUpStatus.CONFIRMED
      : rawStatus === "DECLINED"
      ? CallUpStatus.DECLINED
      : CallUpStatus.PENDING;

  await prisma.callUp.updateMany({
    where: { id, organizationId: user.organizationId },
    data: {
      status,
      respondedAt: status === CallUpStatus.PENDING ? null : new Date(),
    },
  });

  if (matchId) revalidatePath(`/convocacoes/${matchId}`);
}

export async function markCallUpsSent(formData: FormData) {
  const user = await requireOrganizationUser();
  const matchId = clean(formData.get("matchId"));
  if (!matchId) return;

  await prisma.callUp.updateMany({
    where: { matchId, organizationId: user.organizationId },
    data: { sentAt: new Date() },
  });

  revalidatePath(`/convocacoes/${matchId}`);
}

export async function goToMatchCallUps(formData: FormData) {
  const matchId = clean(formData.get("matchId"));
  if (!matchId) return;
  redirect(`/convocacoes/${matchId}`);
}
