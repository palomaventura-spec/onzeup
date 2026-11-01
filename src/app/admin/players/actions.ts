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

// Cortesia do piloto: exclusivamente Player Simples, liberada manualmente.
// O valor comercial de R$ 19,90/mês não implica pagamento pelo clube.
export async function grantSimplePlayerCourtesy(formData: FormData) {
  await requireSuperAdmin();
  const playerId = String(formData.get("playerId") || "").trim();
  const untilRaw = String(formData.get("complimentaryUntil") || "").trim();

  if (!playerId) redirect(playerAdminUrl(undefined, "error=missing"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(untilRaw)) {
    redirect(playerAdminUrl(playerId, "error=invalid_date"));
  }

  // O piloto ocorre no Brasil (UTC-3). A data informada é inclusiva.
  const until = new Date(`${untilRaw}T23:59:59.999-03:00`);
  const now = new Date();
  if (!Number.isFinite(until.getTime()) || until <= now ||
      until.getTime() > now.getTime() + 5 * 366 * 86400000) {
    redirect(playerAdminUrl(playerId, "error=invalid_date"));
  }

  const player = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      slug: true,
      plan: true,
      planStatus: true,
      isComplimentary: true,
      complimentaryPlan: true,
      asaasSubscriptionId: true,
      premiumUntil: true,
    },
  });

  if (!player) redirect(playerAdminUrl(undefined, "error=not_found"));
  if (player.planStatus === "INACTIVE") {
    redirect(playerAdminUrl(playerId, "error=inactive"));
  }

  // Nunca rebaixar assinantes pagantes ou concessões Premium existentes.
  const hasPaidPremium = Boolean(
    player.asaasSubscriptionId ||
    (player.plan === "PREMIUM" && player.planStatus === "ACTIVE" && !player.isComplimentary) ||
    (player.plan === "PREMIUM" && player.premiumUntil && player.premiumUntil > now && !player.isComplimentary),
  );
  if (hasPaidPremium || (player.isComplimentary && player.complimentaryPlan !== "SIMPLE")) {
    redirect(playerAdminUrl(playerId, "error=existing_premium"));
  }

  // Conhecer nome e data de nascimento não é suficiente para liberar benefício.
  const confirmedLink = await prisma.playerAthleteLink.findFirst({
    where: {
      playerId,
      active: true,
      verified: true,
      athlete: { active: true, organization: { active: true } },
    },
    select: { id: true },
  });
  if (!confirmedLink) {
    redirect(playerAdminUrl(playerId, "error=link_required"));
  }

  await prisma.playerProfile.update({
    where: { id: playerId },
    data: {
      plan: "FREE", // identificador legado interno: Player Simples
      planStatus: "ACTIVE",
      template: "FREE_CLEAN",
      isComplimentary: true,
      complimentaryPlan: "SIMPLE",
      complimentaryUntil: until,
      complimentaryReason:
        "Benefício institucional da parceria 11UP–clube. Player Simples, liberação manual pelo Super Admin.",
    },
  });

  revalidatePath("/admin/players");
  revalidatePath("/responsavel");
  revalidatePath("/responsavel/assinatura");
  revalidatePath(`/player/${player.slug}`);
  redirect(playerAdminUrl(playerId, "saved=simple_courtesy"));
}

export async function setPlayerFeatured(formData: FormData) {
  await requireSuperAdmin();

  const playerId = String(formData.get("playerId") || "").trim();
  const featured = String(formData.get("featured") || "true") !== "false";
  const untilRaw = String(formData.get("featuredUntil") || "").trim();

  if (!playerId) redirect(playerAdminUrl(undefined, "error=missing"));

  const player = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      slug: true,
      isPublic: true,
      directoryVisible: true,
      planStatus: true,
      isFeatured: true,
    },
  });

  if (!player) redirect(playerAdminUrl(undefined, "error=not_found"));

  if (
    featured &&
    (!player.isPublic || !player.directoryVisible || player.planStatus === "INACTIVE")
  ) {
    redirect(playerAdminUrl(playerId, "error=featured_requires_public"));
  }

  if (featured && !player.isFeatured) {
    const totalDestaques = await prisma.playerProfile.count({
      where: {
        isFeatured: true,
        isPublic: true,
        directoryVisible: true,
        planStatus: { not: "INACTIVE" },
        OR: [
          { featuredUntil: null },
          { featuredUntil: { gt: new Date() } },
        ],
      },
    });

    if (totalDestaques >= 3) {
      redirect(playerAdminUrl(playerId, "error=featured_limit"));
    }
  }
  let featuredUntil: Date | null = null;

  if (featured && untilRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(untilRaw)) {
      redirect(playerAdminUrl(playerId, "error=invalid_featured_date"));
    }

    featuredUntil = new Date(`${untilRaw}T23:59:59.999-03:00`);

    if (!Number.isFinite(featuredUntil.getTime()) || featuredUntil <= new Date()) {
      redirect(playerAdminUrl(playerId, "error=invalid_featured_date"));
    }
  }

  await prisma.playerProfile.update({
    where: { id: playerId },
    data: {
      isFeatured: featured,
      featuredUntil: featured ? featuredUntil : null,
    },
  });

  revalidatePath("/admin/players");
  revalidatePath("/players");
  revalidatePath(`/player/${player.slug}`);
  revalidatePath(`/${player.slug}`);

  redirect(playerAdminUrl(playerId, featured ? "saved=featured" : "saved=feature_removed"));
}
export async function endSimplePlayerCourtesy(formData: FormData) {
  await requireSuperAdmin();
  const playerId = String(formData.get("playerId") || "").trim();
  if (!playerId) redirect(playerAdminUrl(undefined, "error=missing"));

  const player = await prisma.playerProfile.findUnique({
    where: { id: playerId },
    select: { id: true, slug: true, isComplimentary: true, complimentaryPlan: true },
  });
  if (!player) redirect(playerAdminUrl(undefined, "error=not_found"));
  if (!player.isComplimentary || player.complimentaryPlan !== "SIMPLE") {
    redirect(playerAdminUrl(playerId, "error=not_simple_courtesy"));
  }

  await prisma.playerProfile.update({
    where: { id: playerId },
    data: {
      isComplimentary: false,
      complimentaryPlan: null,
      complimentaryUntil: null,
      complimentaryReason: null,
      plan: "FREE",
      planStatus: "AWAITING_PAYMENT",
      isPublic: false,
      directoryVisible: false,
      isFeatured: false,
      featuredUntil: null,
    },
  });

  revalidatePath("/admin/players");
  revalidatePath("/responsavel");
  revalidatePath("/responsavel/assinatura");
  revalidatePath(`/player/${player.slug}`);
  redirect(playerAdminUrl(playerId, "saved=courtesy_ended"));
}
