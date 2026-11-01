"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasEffectivePlayerPremium } from "@/lib/billing-entitlements";
import { PLAYER_TRIAL_DAYS } from "@/lib/player-plans";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();

// Marcador interno: oculta o vídeo em destaque sem excluir o histórico Premium.
const NO_FEATURED_VIDEO = "__11UP_NO_FEATURED_VIDEO__";

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

  const requestedPublicSlug =
    clean(formData.get("publicSlug")) || clean(formData.get("slug"));
  const nicknameOrName = clean(formData.get("nickname")) || name;
  const looksLikeAddress =
    /^(rua|r|avenida|av|alameda|travessa|estrada|rodovia|praca|largo)\b/i.test(
      requestedPublicSlug
    );
  let slug = safeSlug(
    requestedPublicSlug && !looksLikeAddress ? requestedPublicSlug : nicknameOrName
  );
  if (!slug) slug = `player-${Date.now()}`;

  const existingSlug = await prisma.playerProfile.findFirst({
    where: {
      slug,
      ...(id ? { NOT: { id } } : {}),
    },
    select: { id: true },
  });
  if (existingSlug) slug = `${slug}-${Date.now().toString().slice(-5)}`;

  const currentPlayer = id
    ? await prisma.playerProfile.findFirst({
        where: { id, guardianId: guardian.id },
        select: { plan: true, planStatus: true, premiumUntil: true, trialEndsAt: true, isComplimentary: true, complimentaryUntil: true, complimentaryPlan: true, template: true, videos: true },
      })
    : null;
  const effectivePremium = currentPlayer ? hasEffectivePlayerPremium(currentPlayer) : true;

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
    // Direitos de acesso controlam o que pode ser editado, nunca apagam o
    // conteúdo Premium já salvo. A exibição é limitada nas páginas públicas.
    ...(effectivePremium
      ? {
          videos: clean(formData.get("videos")) || null,
          gallery: clean(formData.get("gallery")) || null,
          template: clean(formData.get("template")) || currentPlayer?.template || "PREMIUM_DARK",
        }
      : {
          // No Simples, somente o primeiro link pode ser substituído.
          // Os demais vídeos Premium permanecem salvos para eventual reativação.
          videos: (() => {
            const raw = currentPlayer?.videos || "";
            // Preserva também o formato JSON legado com títulos e descrições.
            let items: Array<{ url: string; title?: string; description?: string }> = [];
            let isJson = false;
            try {
              const parsed: unknown = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                isJson = true;
                items = parsed.filter((item): item is { url: string; title?: string; description?: string } =>
                  !!item && typeof item === "object" && typeof item.url === "string"
                );
              }
            } catch { /* Lista de URLs, formato atual. */ }
            if (!isJson) {
              items = raw.split(/\r?\n/).map(url => url.trim()).filter(Boolean).map(url => ({ url }));
            }
            const previous = items[0]?.url === NO_FEATURED_VIDEO ? items.slice(1) : items.slice(1);
            const remove = formData.get("removeFeaturedVideo") === "on";
            const link = clean(formData.get("videos")).split(/\r?\n/).map(v => v.trim()).find(Boolean);
            // A exclusão é explícita: campo vazio sem marcar a caixa mantém o vídeo.
            if (!remove && !link) return raw || null;
            const featured = remove ? NO_FEATURED_VIDEO : link!;
            if (featured === NO_FEATURED_VIDEO && previous.length === 0) return null;
            const next = [{ url: featured }, ...previous];
            return isJson ? JSON.stringify(next) : next.map(item => item.url).join("\n");
          })(),
        }),
    // O plano e o status são gerenciados exclusivamente pelas rotinas de
    // assinatura/cortesia, não pelo formulário de edição do perfil.
    isPublic: formData.get("isPublic") === "on" && formData.get("publicationConsent") === "on",
    directoryVisible: formData.get("isPublic") === "on" && formData.get("publicationConsent") === "on" && formData.get("directoryVisible") === "on",
    // O painel visual usa somente registros particulares e exige autorização
    // separada para não apresentar o diário como dado oficial do Club.
    showDiaryStatsPublic: formData.get("isPublic") === "on" && formData.get("publicationConsent") === "on" && formData.get("showDiaryStatsPublic") === "on",
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

function optionalInteger(value: FormDataEntryValue | null) {
  const normalized = clean(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

export async function createPlayerDiaryEntry(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);
  const playerId = clean(formData.get("playerId"));
  const occurredAtRaw = clean(formData.get("occurredAt"));
  const occurredAt = occurredAtRaw ? new Date(`${occurredAtRaw}T12:00:00`) : null;

  if (!playerId || !occurredAt || Number.isNaN(occurredAt.getTime())) return;

  const player = await prisma.playerProfile.findFirst({
    where: { id: playerId, guardianId: guardian.id },
    select: { id: true },
  });
  if (!player) return;

  const entryTypeValue = clean(formData.get("entryType"));
  const entryType = ["MATCH", "TOURNAMENT", "ACHIEVEMENT"].includes(entryTypeValue)
    ? entryTypeValue as "MATCH" | "TOURNAMENT" | "ACHIEVEMENT"
    : "MATCH";
  const sportValue = clean(formData.get("sport"));
  const sport: "FOOTBALL" | "FUTSAL" =
  sportValue === "FUTSAL" ? "FUTSAL" : "FOOTBALL";
  const competition = clean(formData.get("competition"));
  const opponent = clean(formData.get("opponent"));
  const defaultTitle = entryType === "TOURNAMENT"
    ? competition || "Torneio registrado"
    : entryType === "ACHIEVEMENT"
      ? "Conquista registrada"
      : opponent ? `Jogo contra ${opponent}` : "Jogo registrado";

  await prisma.playerDiaryEntry.create({
    data: {
      playerId: player.id,
      entryType,
      sport,
      occurredAt,
      title: clean(formData.get("title")) || defaultTitle,
      teamName: clean(formData.get("teamName")) || null,
      opponent: opponent || null,
      competition: competition || null,
      categoryLabel: clean(formData.get("categoryLabel")) || null,
      location: clean(formData.get("location")) || null,
      scoreFor: optionalInteger(formData.get("scoreFor")),
      scoreAgainst: optionalInteger(formData.get("scoreAgainst")),
      minutesPlayed: optionalInteger(formData.get("minutesPlayed")),
      position: clean(formData.get("position")) || null,
      jerseyNumber: optionalInteger(formData.get("jerseyNumber")),
      goals: optionalInteger(formData.get("goals")) || 0,
      assists: optionalInteger(formData.get("assists")) || 0,
      yellowCards: optionalInteger(formData.get("yellowCards")) || 0,
      redCards: optionalInteger(formData.get("redCards")) || 0,
      notes: clean(formData.get("notes")) || null,
    },
  });

  revalidatePath("/responsavel");
  revalidatePath(`/responsavel/desempenho?player=${player.id}`);
}

export async function deletePlayerDiaryEntry(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);
  const entryId = clean(formData.get("entryId"));
  const playerId = clean(formData.get("playerId"));
  if (!entryId || !playerId) return;

  await prisma.playerDiaryEntry.deleteMany({
    where: {
      id: entryId,
      playerId,
      player: { guardianId: guardian.id },
    },
  });

  revalidatePath("/responsavel");
  revalidatePath(`/responsavel/desempenho?player=${playerId}`);
}

export async function savePlayerHistoryPeriod(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;

  const guardian = await guardianForUser(user.id);
  const playerId = clean(formData.get("playerId"));
  const id = clean(formData.get("historyPeriodId"));
  const startedAtRaw = clean(formData.get("startedAt"));
  const endedAtRaw = clean(formData.get("endedAt"));
  const startedAt = startedAtRaw ? new Date(`${startedAtRaw}T12:00:00`) : null;
  const endedAt = endedAtRaw ? new Date(`${endedAtRaw}T12:00:00`) : null;
  if (!playerId || !startedAt || !endedAt || Number.isNaN(startedAt.getTime()) || Number.isNaN(endedAt.getTime()) || endedAt < startedAt) return;

  const player = await prisma.playerProfile.findFirst({
    where: { id: playerId, guardianId: guardian.id },
    select: { id: true, slug: true },
  });
  if (!player) return;

  const periodTypeValue = clean(formData.get("periodType"));
  const periodType = ["SEASON", "SEMESTER", "CUSTOM_PERIOD"].includes(periodTypeValue)
    ? periodTypeValue as "SEASON" | "SEMESTER" | "CUSTOM_PERIOD"
    : "CUSTOM_PERIOD";
  const sport: "FOOTBALL" | "FUTSAL" = clean(formData.get("sport")) === "FUTSAL" ? "FUTSAL" : "FOOTBALL";
  const season = clean(formData.get("season")) || String(startedAt.getFullYear());
  const label = clean(formData.get("label")) || (periodType === "SEASON" ? `Temporada ${season}` : periodType === "SEMESTER" ? `${season} · semestre` : "Período histórico");

  const data = {
    periodType,
    season,
    label,
    sport,
    startedAt,
    endedAt,
    clubName: clean(formData.get("clubName")) || null,
    competition: clean(formData.get("competition")) || null,
    matches: optionalInteger(formData.get("matches")) || 0,
    goals: optionalInteger(formData.get("goals")) || 0,
    assists: optionalInteger(formData.get("assists")) || 0,
    notes: clean(formData.get("notes")) || null,
  };

  if (id) {
    await prisma.playerHistoryPeriod.updateMany({ where: { id, playerId: player.id }, data });
  } else {
    await prisma.playerHistoryPeriod.create({ data: { playerId: player.id, ...data } });
  }

  revalidatePath("/responsavel");
  revalidatePath(`/responsavel/desempenho?player=${player.id}`);
  revalidatePath(`/player/${player.slug}`);
  revalidatePath(`/${player.slug}`);
}

export async function deletePlayerHistoryPeriod(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") return;
  const guardian = await guardianForUser(user.id);
  const id = clean(formData.get("historyPeriodId"));
  const playerId = clean(formData.get("playerId"));
  if (!id || !playerId) return;

  const player = await prisma.playerProfile.findFirst({ where: { id: playerId, guardianId: guardian.id }, select: { id: true, slug: true } });
  if (!player) return;
  await prisma.playerHistoryPeriod.deleteMany({ where: { id, playerId: player.id } });
  revalidatePath("/responsavel");
  revalidatePath(`/responsavel/desempenho?player=${player.id}`);
  revalidatePath(`/player/${player.slug}`);
  revalidatePath(`/${player.slug}`);
}
