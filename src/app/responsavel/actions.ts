"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function guardianForUser(userId: string) {
  let guardian = await prisma.guardianProfile.findUnique({ where: { userId } });
  if (!guardian) {
    guardian = await prisma.guardianProfile.create({ data: { userId } });
  }
  return guardian;
}

export async function saveGuardianProfile(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);
  await prisma.guardianProfile.update({
    where: { id: guardian.id },
    data: { phone: clean(formData.get("phone")) || null },
  });

  revalidatePath("/responsavel");
}

export async function savePlayer(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);
  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  if (!name) return;

  let slug = safeSlug(clean(formData.get("slug")) || clean(formData.get("nickname")) || name);
  if (!slug) slug = `player-${Date.now()}`;

  const existingSlug = await prisma.playerProfile.findFirst({
    where: {
      slug,
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (existingSlug) slug = `${slug}-${Date.now().toString().slice(-5)}`;

  const data = {
    name,
    nickname: clean(formData.get("nickname")) || null,
    slug,
    birthYear: Number(clean(formData.get("birthYear"))) || null,
    position: clean(formData.get("position")) || null,
    currentClub: clean(formData.get("currentClub")) || null,
    dominantFoot: clean(formData.get("dominantFoot")) || null,
    height: clean(formData.get("height")) || null,
    weight: clean(formData.get("weight")) || null,
    nationality: clean(formData.get("nationality")) || null,
    secondaryPosition: clean(formData.get("secondaryPosition")) || null,
    modality: clean(formData.get("modality")) || null,
    categoryLabel: clean(formData.get("categoryLabel")) || null,
    jerseyNumber: Number(clean(formData.get("jerseyNumber"))) || null,
    photoUrl: clean(formData.get("photoUrl")) || null,
    coverUrl: clean(formData.get("coverUrl")) || null,
    bio: clean(formData.get("bio")) || null,
    instagram: clean(formData.get("instagram")) || null,
    websiteUrl: clean(formData.get("websiteUrl")) || null,
    matches: Number(clean(formData.get("matches"))) || null,
    goals: Number(clean(formData.get("goals"))) || null,
    assists: Number(clean(formData.get("assists"))) || null,
    titles: Number(clean(formData.get("titles"))) || null,
    careerHistory: clean(formData.get("careerHistory")) || null,
    achievements: clean(formData.get("achievements")) || null,
    videos: (() => {
      const all = clean(formData.get("videos")).split(/\r?\n/).map(v => v.trim()).filter(Boolean);
      const plan = clean(formData.get("plan")) || "FREE";
      return (plan === "PREMIUM" ? all : all.slice(0, 1)).join("\n") || null;
    })(),
    gallery: clean(formData.get("gallery")) || null,
    template: clean(formData.get("template")) || "FREE_CLEAN",
    plan: clean(formData.get("plan")) || "FREE",
    isPublic: formData.get("isPublic") === "on",
    directoryVisible: formData.get("directoryVisible") === "on",
  };

  if (id) {
    await prisma.playerProfile.updateMany({
      where: { id, guardianId: guardian.id },
      data,
    });
  } else {
    await prisma.playerProfile.create({
      data: { ...data, guardianId: guardian.id },
    });
  }

  revalidatePath("/responsavel");
  revalidatePath(`/player/${slug}`);
  revalidatePath(`/${slug}`);
  revalidatePath("/players");
}

export async function deletePlayer(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;
  const guardian = await guardianForUser(user.id);
  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.playerProfile.deleteMany({
    where: { id, guardianId: guardian.id },
  });

  revalidatePath("/responsavel");
}


export async function linkMatchingClubAthletes(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);
  const playerId = clean(formData.get("playerId"));
  if (!playerId) redirect("/responsavel?linkStatus=erro");

  const player = await prisma.playerProfile.findFirst({
    where: { id: playerId, guardianId: guardian.id },
    select: { id: true, name: true, nickname: true },
  });

  if (!player) redirect("/responsavel?linkStatus=erro");

  const candidates = await prisma.athlete.findMany({
    where: {
      guardianEmail: { equals: user.email, mode: "insensitive" },
      active: true,
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      organizationId: true,
    },
  });

  if (!candidates.length) {
    redirect(`/responsavel?player=${player.id}&linkStatus=nenhum-cadastro`);
  }

  const normalize = (value: string | null | undefined) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const playerName = normalize(player.name);
  const playerNickname = normalize(player.nickname);

  const samePerson = (athlete: { name: string; nickname: string | null }) => {
    const athleteName = normalize(athlete.name);
    const athleteNickname = normalize(athlete.nickname);

    if (playerName && athleteName && playerName === athleteName) return true;
    if (playerNickname && athleteNickname && playerNickname === athleteNickname) return true;

    const playerTokens = playerName.split(" ").filter(Boolean);
    const athleteTokens = athleteName.split(" ").filter(Boolean);

    if (
      playerTokens.length >= 2 &&
      athleteTokens.length >= 2 &&
      playerTokens[0] === athleteTokens[0] &&
      playerTokens[playerTokens.length - 1] === athleteTokens[athleteTokens.length - 1]
    ) {
      return true;
    }

    return false;
  };

  const matches = candidates.filter(samePerson);

  if (!matches.length) {
    redirect(`/responsavel?player=${player.id}&linkStatus=sem-correspondencia`);
  }

  let created = 0;

  for (const athlete of matches) {
    const existing = await prisma.playerAthleteLink.findUnique({
      where: {
        playerId_athleteId: {
          playerId: player.id,
          athleteId: athlete.id,
        },
      },
      select: { id: true },
    });

    if (existing) continue;

    await prisma.playerAthleteLink.create({
      data: {
        playerId: player.id,
        athleteId: athlete.id,
        verified: false,
      },
    });

    created += 1;
  }

  revalidatePath("/responsavel");
  revalidatePath("/vinculos-player");

  if (!created) {
    redirect(`/responsavel?player=${player.id}&linkStatus=ja-solicitado`);
  }

  redirect(`/responsavel?player=${player.id}&linkStatus=solicitado&count=${created}`);
}


export async function respondToPlayerCallUp(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);
  const callUpId = clean(formData.get("callUpId"));
  const rawStatus = clean(formData.get("status"));

  if (!callUpId || !["CONFIRMED", "DECLINED"].includes(rawStatus)) return;

  const callUp = await prisma.callUp.findFirst({
    where: {
      id: callUpId,
      athlete: {
        playerLinks: {
          some: {
            verified: true,
            player: { guardianId: guardian.id },
          },
        },
      },
    },
    select: { id: true },
  });

  if (!callUp) return;

  await prisma.callUp.update({
    where: { id: callUp.id },
    data: {
      status: rawStatus as "CONFIRMED" | "DECLINED",
      respondedAt: new Date(),
    },
  });

  revalidatePath("/responsavel");
}
