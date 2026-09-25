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

// Transfere somente o Player selecionado para um responsável já cadastrado.
export async function updatePremiumPlayerGuardian(formData: FormData) {
  await requireSuperAdmin();
  const playerId = String(formData.get("playerId") || "").trim();
  const previousGuardianId = String(formData.get("previousGuardianId") || "").trim();
  const email = String(formData.get("guardianEmail") || "").trim().toLowerCase();
  if (!playerId || !previousGuardianId || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect(playerAdminUrl(playerId, "error=invalid_email"));
  }

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.playerProfile.findUnique({ where: { id: playerId } });
    if (!player || player.plan !== "PREMIUM") return "not_premium";
    // Evita substituir silenciosamente uma alteração feita em outra sessão.
    if (player.guardianId !== previousGuardianId) return "stale_guardian";
    const guardians = await tx.guardianProfile.findMany({
      where: { user: { email: { equals: email, mode: "insensitive" } } },
      select: { id: true },
      take: 2,
    });
    if (guardians.length !== 1) return "guardian_not_found";
    const updated = await tx.playerProfile.updateMany({
      where: { id: playerId, guardianId: previousGuardianId, plan: "PREMIUM" },
      data: { guardianId: guardians[0].id },
    });
    return updated.count === 1 ? "ok" : "stale_guardian";
  });
  if (result !== "ok") redirect(playerAdminUrl(playerId, `error=${result}`));
  revalidatePath("/", "layout");
  redirect(playerAdminUrl(playerId, "saved=guardian"));
}
