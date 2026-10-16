"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasEffectivePlayerPremium, reconcileExpiredPlayerPremiums } from "@/lib/billing-entitlements";
import { PLAYER_TRIAL_DAYS } from "@/lib/player-plans";

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

  const name = clean(formData.get("name"));
  const phone = clean(formData.get("phone"));

  if (!name) return;

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        name,
      },
    }),

    prisma.guardianProfile.update({
      where: {
        id: guardian.id,
      },
      data: {
        phone: phone || null,
      },
    }),
  ]);

  revalidatePath("/responsavel");
  revalidatePath("/responsavel/dados");
  revalidatePath("/responsavel/comunicacao");
  revalidatePath("/responsavel/pagina");
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

  if (id) await reconcileExpiredPlayerPremiums({ guardianId: guardian.id });
  const currentPlayer = id
    ? await prisma.playerProfile.findFirst({
        where: { id, guardianId: guardian.id },
        select: { plan: true, planStatus: true, premiumUntil: true, trialEndsAt: true, isComplimentary: true, complimentaryUntil: true, complimentaryPlan: true, template: true },
      })
    : null;
  const effectivePremium = currentPlayer ? hasEffectivePlayerPremium(currentPlayer) : true;
  const effectivePlan = effectivePremium ? "PREMIUM" : "FREE";

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
      return (effectivePremium ? all : all.slice(0, 1)).join("\n") || null;
    })(),
    gallery: effectivePremium ? (clean(formData.get("gallery")) || null) : null,
    template: effectivePremium ? (clean(formData.get("template")) || currentPlayer?.template || "PREMIUM_DARK") : "FREE_CLEAN",
    plan: effectivePlan,
    isPublic: formData.get("isPublic") === "on",
    directoryVisible: formData.get("directoryVisible") === "on",
  };

  if (id) {
    await prisma.playerProfile.updateMany({
      where: { id, guardianId: guardian.id },
      data,
    });
  } else {
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt);

    trialEndsAt.setDate(
      trialEndsAt.getDate() + PLAYER_TRIAL_DAYS
    );

    await prisma.playerProfile.create({
      data: {
        ...data,
        guardianId: guardian.id,
        plan: "PREMIUM",
        planStatus: "TRIAL",
        trialStartedAt,
        trialEndsAt,
        premiumUntil: null,
      },
    });
  }

  revalidatePath("/responsavel");
  revalidatePath("/responsavel/comunicacao");
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
  revalidatePath("/responsavel/comunicacao");
}


export async function linkMatchingClubAthletes(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);

  const playerId = clean(formData.get("playerId"));
  const athleteFullName = clean(formData.get("athleteFullName"));
  const birthDateRaw = clean(formData.get("birthDate"));

  if (!playerId || !athleteFullName || !birthDateRaw) {
    redirect(
      `/responsavel/dados?player=${playerId || ""}&linkStatus=dados-incompletos`,
    );
  }

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerId,
      guardianId: guardian.id,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!player) {
    redirect("/responsavel?linkStatus=erro");
  }

  const normalize = (value: string | null | undefined) =>
    String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const requestedName = normalize(athleteFullName);

  const parts = birthDateRaw.split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    redirect(
      `/responsavel/dados?player=${player.id}&linkStatus=dados-incompletos`,
    );
  }

  const [year, month, day] = parts;
  const validDate =
    year >= 1900 &&
    year <= new Date().getUTCFullYear() &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31 &&
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === birthDateRaw;

  if (!validDate) {
    redirect(`/responsavel/dados?player=${player.id}&linkStatus=dados-incompletos`);
  }

  const birthStart = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0, 0),
  );

  const birthEnd = new Date(
    Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0),
  );

  const candidates = await prisma.athlete.findMany({
    where: {
      active: true,
      privateData: {
        is: {
          birthDate: {
            gte: birthStart,
            lt: birthEnd,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const matches = candidates.filter((athlete) => {
    const athleteName = normalize(athlete.name);

    if (!requestedName || athleteName !== requestedName) {
      return false;
    }

    // Nome completo + data de nascimento localizam apenas candidatos.
    // A relacao familiar e a autorizacao sao verificadas pelo clube depois.
    return true;
  });

  if (!matches.length) {
    redirect(
      `/responsavel/dados?player=${player.id}&linkStatus=sem-correspondencia`,
    );
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
      select: {
        id: true,
        active: true,
      },
    });

    if (existing) {
      if (existing.active) continue;

      await prisma.playerAthleteLink.update({
        where: {
          id: existing.id,
        },
        data: {
          active: true,
          verified: false,
          unlinkedAt: null,
          unlinkedByUserId: null,
          unlinkedByNameSnapshot: null,
          unlinkReason: null,
        },
      });

      created += 1;
      continue;
    }

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
  revalidatePath("/responsavel/comunicacao");
  revalidatePath("/vinculos-player");

  if (!created) {
    redirect(
      `/responsavel/dados?player=${player.id}&linkStatus=ja-solicitado`,
    );
  }

  redirect(
    `/responsavel/dados?player=${player.id}&linkStatus=solicitado&count=${created}`,
  );
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
            active: true,
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
  revalidatePath("/responsavel/comunicacao");
}
export async function markPlayerCommunicationRead(
  formData: FormData,
) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);
  const recipientId = clean(formData.get("recipientId"));

  if (!recipientId) return;

  const recipient =
    await prisma.clubCommunicationRecipient.findFirst({
      where: {
        id: recipientId,
        player: {
          guardianId: guardian.id,
        },
      },
      select: {
        id: true,
        readAt: true,
      },
    });

  if (!recipient || recipient.readAt) return;

  await prisma.clubCommunicationRecipient.update({
    where: {
      id: recipient.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/responsavel");
  revalidatePath("/responsavel/comunicacao");
}
export async function savePlayerData(formData: FormData) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));

  if (!id || !name) return;

  const player = await prisma.playerProfile.findFirst({
    where: {
      id,
      guardianId: guardian.id,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!player) return;

  await prisma.playerProfile.update({
    where: {
      id: player.id,
    },
    data: {
      name,
      birthYear:
        Number(clean(formData.get("birthYear"))) || null,
      nationality:
        clean(formData.get("nationality")) || null,
      position:
        clean(formData.get("position")) || null,
      secondaryPosition:
        clean(formData.get("secondaryPosition")) || null,
      height:
        clean(formData.get("height")) || null,
      weight:
        clean(formData.get("weight")) || null,
      dominantFoot:
        clean(formData.get("dominantFoot")) || null,
      currentClub:
        clean(formData.get("currentClub")) || null,
      modality:
        clean(formData.get("modality")) || null,
      categoryLabel:
        clean(formData.get("categoryLabel")) || null,
      jerseyNumber:
        Number(clean(formData.get("jerseyNumber"))) || null,
    },
  });

  revalidatePath("/responsavel");
  revalidatePath("/responsavel/dados");
  revalidatePath("/responsavel/pagina");
  revalidatePath(`/player/${player.slug}`);
  revalidatePath(`/${player.slug}`);
  revalidatePath("/players");
}

export async function savePlayerBillingProfile(formData: FormData) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);

  const playerId = clean(formData.get("playerId"));

  const billingName =
    clean(formData.get("billingName")) || user.name;

  const billingEmail =
    clean(formData.get("billingEmail")) || user.email;

  const billingPhone =
    clean(formData.get("billingPhone")) || null;

  const taxId =
    clean(formData.get("taxId"))
      .replace(/\D/g, "") || null;

  const postalCode =
    clean(formData.get("postalCode"))
      .replace(/\D/g, "") || null;

  const address =
    clean(formData.get("address")) || null;

  const addressNumber =
    clean(formData.get("addressNumber")) || null;

  const complement =
    clean(formData.get("complement")) || null;

  const neighborhood =
    clean(formData.get("neighborhood")) || null;

  const city =
    clean(formData.get("city")) || null;

  const state =
    clean(formData.get("state"))
      .toUpperCase()
      .slice(0, 2) || null;

  await prisma.playerBillingProfile.upsert({
    where: {
      guardianId: guardian.id,
    },
    create: {
      guardianId: guardian.id,
      billingName,
      billingEmail,
      billingPhone,
      taxId,
      postalCode,
      address,
      addressNumber,
      complement,
      neighborhood,
      city,
      state,
    },
    update: {
      billingName,
      billingEmail,
      billingPhone,
      taxId,
      postalCode,
      address,
      addressNumber,
      complement,
      neighborhood,
      city,
      state,
    },
  });

  revalidatePath("/responsavel/assinatura");

  if (playerId) {
    revalidatePath(
      `/responsavel/assinatura?player=${playerId}`
    );
  }
}
