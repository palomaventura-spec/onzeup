"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

function playerAdminUrl(playerId?: string, params?: string) {
  const base = "/admin/players";
  if (!params) return base;
  const query = new URLSearchParams(params);
  if (playerId) query.set("player", playerId);
  return `${base}?${query.toString()}`;
}

export async function deactivatePlayer(formData: FormData) {
  await requireSuperAdmin();
  const playerId = String(formData.get("playerId") || "").trim();
  if (!playerId) redirect(playerAdminUrl(undefined, "error=missing"));

  const player = await prisma.playerProfile.findUnique({ where: { id: playerId } });
  if (!player) redirect(playerAdminUrl(undefined, "error=not_found"));

  await prisma.playerProfile.update({
    where: { id: playerId },
    data: {
      planStatus: "INACTIVE",
      isPublic: false,
      directoryVisible: false,
      isFeatured: false,
      featuredUntil: null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath(`/player/${player.slug}`);
  redirect(playerAdminUrl(playerId, "saved=deactivated"));
}

export async function reactivatePlayer(formData: FormData) {
  await requireSuperAdmin();
  const playerId = String(formData.get("playerId") || "").trim();
  if (!playerId) redirect(playerAdminUrl(undefined, "error=missing"));

  const player = await prisma.playerProfile.findUnique({ where: { id: playerId } });
  if (!player) redirect(playerAdminUrl(undefined, "error=not_found"));

  const premiumStillValid =
    player.isComplimentary ||
    (player.plan === "PREMIUM" && player.premiumUntil && player.premiumUntil > new Date());

  await prisma.playerProfile.update({
    where: { id: playerId },
    data: {
      plan: player.plan === "PREMIUM" && !premiumStillValid ? "FREE" : player.plan,
      planStatus: "ACTIVE",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath(`/player/${player.slug}`);
  redirect(playerAdminUrl(playerId, "saved=reactivated"));
}

export async function deleteInactivePlayer(formData: FormData) {
  await requireSuperAdmin();
  const playerId = String(formData.get("playerId") || "").trim();
  if (!playerId) redirect(playerAdminUrl(undefined, "error=missing"));

  const player = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    select: { id: true, slug: true, planStatus: true },
  });

  if (!player) redirect(playerAdminUrl(undefined, "error=not_found"));
  if (player.planStatus !== "INACTIVE") {
    redirect(playerAdminUrl(playerId, "error=must_deactivate"));
  }

  await prisma.playerProfile.delete({ where: { id: playerId } });

  revalidatePath("/admin");
  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath(`/player/${player.slug}`);
  redirect("/admin/players?deleted=1");
}
