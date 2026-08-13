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
    data: { verified: true },
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
