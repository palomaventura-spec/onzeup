"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();

export async function approvePlayerLink(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  const link = await prisma.playerAthleteLink.findFirst({
    where: {
      id,
      athlete: { organizationId: user.organizationId },
    },
    select: { id: true, player: { select: { slug: true } } },
  });

  if (!link) return;

  await prisma.playerAthleteLink.update({
    where: { id: link.id },
    data: {
      verified: true,
      active: true,
      unlinkedAt: null,
      unlinkedByUserId: null,
      unlinkedByNameSnapshot: null,
      unlinkReason: null,
    },
  });

  revalidatePath("/vinculos-player");
  revalidatePath(`/player/${link.player.slug}`);
}

export async function rejectPlayerLink(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.playerAthleteLink.deleteMany({
    where: {
      id,
      athlete: { organizationId: user.organizationId },
    },
  });

  revalidatePath("/vinculos-player");
}
export async function unlinkPlayerLink(formData: FormData) {
  const user = await requireOrganizationUser();
  const id = clean(formData.get("id"));

  if (!id) return;

  const link = await prisma.playerAthleteLink.findFirst({
    where: {
      id,
      active: true,
      verified: true,
      athlete: {
        organizationId: user.organizationId,
      },
    },
    select: {
      id: true,
      player: {
        select: {
          slug: true,
        },
      },
    },
  });

  if (!link) return;

  await prisma.playerAthleteLink.update({
    where: {
      id: link.id,
    },
    data: {
      active: false,
      unlinkedAt: new Date(),
      unlinkedByUserId: user.id,
      unlinkedByNameSnapshot: user.name,
      unlinkReason: "Desvinculado manualmente pelo clube.",
    },
  });

  revalidatePath("/vinculos-player");
  revalidatePath("/responsavel");
  revalidatePath(`/player/${link.player.slug}`);
}
