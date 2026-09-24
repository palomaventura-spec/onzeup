"use server";

import {
  CallUpMode,
  CallUpRuleSource,
  CallUpStatus,
  FormationSlotType,
  MatchLineupRole,
  MatchParticipationStatus,
  Prisma,
  SportType,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getClubCallUpCategoryAccess,
  requireClubPermission,
} from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseInteger(
  value: FormDataEntryValue | null,
  min: number,
  max: number,
  fallback: number,
) {
  const parsed = Number(clean(value));

  return Number.isInteger(parsed) && parsed >= min && parsed <= max
    ? parsed
    : fallback;
}

function parseFormationPattern(value: string, expectedOutfieldCount: number) {
  const normalized = value
    .trim()
    .replace(/[–—×xX]/g, "-")
    .replace(/\s+/g, "");

  if (!normalized) return null;

  const lines = normalized
    .split("-")
    .filter(Boolean)
    .map((item) => Number(item));

  if (
    !lines.length ||
    lines.some((item) => !Number.isInteger(item) || item <= 0 || item > 12)
  ) {
    return null;
  }

  const total = lines.reduce((sum, item) => sum + item, 0);

  if (total !== expectedOutfieldCount) {
    return null;
  }

  return {
    name: lines.join("-"),
    lines,
  };
}

function distributeX(count: number) {
  return Array.from({ length: count }, (_, index) =>
    Math.round(((index + 1) / (count + 1)) * 100),
  );
}

function generateFormationSlots({
  goalkeeperCount,
  lines,
}: {
  goalkeeperCount: number;
  lines: number[];
}) {
  const slots: Array<{
    code: string;
    label: string;
    slotType: FormationSlotType;
    tacticalLine: number | null;
    x: number;
    y: number;
    sortOrder: number;
  }> = [];

  const goalkeeperXs = distributeX(goalkeeperCount);

  goalkeeperXs.forEach((x, index) => {
    slots.push({
      code: `GK_${index + 1}`,
      label:
        goalkeeperCount === 1
          ? "Goleiro"
          : `Goleiro ${index + 1}`,
      slotType: FormationSlotType.GOALKEEPER,
      tacticalLine: 0,
      x,
      y: 90,
      sortOrder: slots.length,
    });
  });

  const lineCount = lines.length;

  lines.forEach((playersInLine, lineIndex) => {
    const xs = distributeX(playersInLine);

    const y =
      lineCount === 1
        ? 48
        : Math.round(72 - (54 * lineIndex) / (lineCount - 1));

    xs.forEach((x, playerIndex) => {
      slots.push({
        code: `OUT_${lineIndex + 1}_${playerIndex + 1}`,
        label: `Linha ${lineIndex + 1} • posição ${playerIndex + 1}`,
        slotType: FormationSlotType.OUTFIELD,
        tacticalLine: lineIndex + 1,
        x,
        y,
        sortOrder: slots.length,
      });
    });
  });

  return slots;
}

async function findValidFormationTemplate({
  organizationId,
  formationTemplateId,
  sport,
  outfieldPlayerCount,
  goalkeeperCount,
}: {
  organizationId: string;
  formationTemplateId: string | null;
  sport: SportType;
  outfieldPlayerCount: number;
  goalkeeperCount: number;
}) {
  if (!formationTemplateId) return null;

  return prisma.formationTemplate.findFirst({
    where: {
      id: formationTemplateId,
      organizationId,
      sport,
      outfieldPlayerCount,
      goalkeeperCount,
      active: true,
    },
    include: {
      slots: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

async function ensureFormationTemplate({
  organizationId,
  sport,
  outfieldPlayerCount,
  goalkeeperCount,
  formationTemplateId,
  formationPattern,
  formationName,
}: {
  organizationId: string;
  sport: SportType;
  outfieldPlayerCount: number;
  goalkeeperCount: number;
  formationTemplateId: string | null;
  formationPattern: string;
  formationName: string;
}) {
  const selected = await findValidFormationTemplate({
    organizationId,
    formationTemplateId,
    sport,
    outfieldPlayerCount,
    goalkeeperCount,
  });

  if (selected) {
    const activeGoalkeepers = selected.slots.filter(
      (slot) => slot.slotType === FormationSlotType.GOALKEEPER,
    ).length;

    const activeOutfield = selected.slots.filter(
      (slot) => slot.slotType === FormationSlotType.OUTFIELD,
    ).length;

    if (
      activeGoalkeepers === goalkeeperCount &&
      activeOutfield === outfieldPlayerCount
    ) {
      return selected;
    }
  }

  const parsed = parseFormationPattern(
    formationPattern,
    outfieldPlayerCount,
  );

  if (!parsed) {
    return null;
  }

  const name = formationName || parsed.name;

  const existing = await prisma.formationTemplate.findFirst({
    where: {
      organizationId,
      sport,
      name,
      outfieldPlayerCount,
      goalkeeperCount,
      active: true,
    },
    include: {
      slots: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (existing) {
    const activeGoalkeepers = existing.slots.filter(
      (slot) => slot.slotType === FormationSlotType.GOALKEEPER,
    ).length;

    const activeOutfield = existing.slots.filter(
      (slot) => slot.slotType === FormationSlotType.OUTFIELD,
    ).length;

    if (
      activeGoalkeepers === goalkeeperCount &&
      activeOutfield === outfieldPlayerCount
    ) {
      return existing;
    }
  }

  const slots = generateFormationSlots({
    goalkeeperCount,
    lines: parsed.lines,
  });

  return prisma.formationTemplate.create({
    data: {
      organizationId,
      name,
      sport,
      outfieldPlayerCount,
      goalkeeperCount,
      active: true,
      isSystemPreset: false,
      slots: {
        create: slots,
      },
    },
    include: {
      slots: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

function formationSnapshot(
  formation: Awaited<ReturnType<typeof ensureFormationTemplate>>,
) {
  if (!formation) return Prisma.JsonNull;

  return {
    templateId: formation.id,
    name: formation.name,
    sport: formation.sport,
    outfieldPlayerCount: formation.outfieldPlayerCount,
    goalkeeperCount: formation.goalkeeperCount,
    slots: formation.slots.map((slot) => ({
      id: slot.id,
      code: slot.code,
      label: slot.label,
      slotType: slot.slotType,
      tacticalLine: slot.tacticalLine,
      x: slot.x,
      y: slot.y,
      sortOrder: slot.sortOrder,
    })),
  } as Prisma.InputJsonValue;
}

async function saveDefaultCallUpRule({
  organizationId,
  categoryId,
  competitionName,
  sport,
  outfieldStarterCount,
  goalkeeperStarterCount,
  reserveCount,
  defaultFormationId,
}: {
  organizationId: string;
  categoryId: string;
  competitionName: string | null;
  sport: SportType;
  outfieldStarterCount: number;
  goalkeeperStarterCount: number;
  reserveCount: number;
  defaultFormationId: string;
}) {
  const existing = await prisma.competitionCallUpRule.findFirst({
    where: {
      organizationId,
      categoryId,
      competitionId: null,
      competitionCategoryId: null,
      competitionName,
      source: CallUpRuleSource.CLUB_MANUAL,
      sport,
      active: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    return prisma.competitionCallUpRule.update({
      where: { id: existing.id },
      data: {
        outfieldStarterCount,
        goalkeeperStarterCount,
        reserveCount,
        defaultFormationId,
        organizerLocked: false,
        active: true,
      },
    });
  }

  return prisma.competitionCallUpRule.create({
    data: {
      organizationId,
      categoryId,
      competitionName,
      source: CallUpRuleSource.CLUB_MANUAL,
      sport,
      outfieldStarterCount,
      goalkeeperStarterCount,
      reserveCount,
      defaultFormationId,
      organizerLocked: false,
      active: true,
    },
  });
}

export async function createCallUps(formData: FormData) {
  const user = await requireClubPermission("CALLUPS_MANAGE");

  const matchId = clean(formData.get("matchId"));

  const athleteIds = formData.getAll("athleteIds").map(String).filter(Boolean);

  if (!matchId || athleteIds.length === 0) {
    return;
  }

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      organizationId: user.organizationId,
    },

    select: {
      id: true,
      categoryId: true,
      callUpLimit: true,
      callUpMode: true,
    },
  });

  if (!match) return;

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    match.categoryId,
  );

  if (!categoryAccess.canManage) {
    return;
  }

  const currentCount = await prisma.callUp.count({
    where: {
      matchId: match.id,
      organizationId: user.organizationId,
    },
  });

  const squadLimit = match.callUpLimit;
  const availablePlaces = Math.max(0, squadLimit - currentCount);
  if (availablePlaces === 0) return;

  const uniqueAthleteIds = Array.from(new Set(athleteIds)).slice(
    0,
    availablePlaces,
  );

  const athletes = await prisma.athlete.findMany({
    where: {
      id: {
        in: uniqueAthleteIds,
      },

      organizationId: user.organizationId,

      categoryId: match.categoryId,

      active: true,
    },

    select: {
      id: true,
    },
  });

  if (athletes.length === 0) {
    return;
  }

  await prisma.$transaction(
    athletes.map((athlete) =>
      prisma.callUp.upsert({
        where: {
          matchId_athleteId: {
            matchId: match.id,
            athleteId: athlete.id,
          },
        },

        update: {
          status:
            match.callUpMode === CallUpMode.INFORMATION_ONLY
              ? CallUpStatus.INFORMED
              : CallUpStatus.PENDING,
        },

        create: {
          matchId: match.id,
          athleteId: athlete.id,
          organizationId: user.organizationId,
          status:
            match.callUpMode === CallUpMode.INFORMATION_ONLY
              ? CallUpStatus.INFORMED
              : CallUpStatus.PENDING,
          responseToken:
            match.callUpMode === CallUpMode.CONFIRMATION_REQUIRED
              ? randomUUID()
              : null,
        },
      }),
    ),
  );

  revalidatePath(`/convocacoes/${match.id}`);
}

export async function deleteCallUp(formData: FormData) {
  const user = await requireClubPermission("CALLUPS_MANAGE");

  const id = clean(formData.get("id"));

  if (!id) return;

  const callUp = await prisma.callUp.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },

    select: {
      id: true,
      matchId: true,
      athleteId: true,

      match: {
        select: {
          categoryId: true,
          callUpMode: true,
        },
      },
    },
  });

  if (!callUp) return;

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    callUp.match.categoryId,
  );

  if (!categoryAccess.canManage) {
    return;
  }

  await prisma.$transaction([
    prisma.matchAthleteStat.deleteMany({
      where: {
        matchId: callUp.matchId,
        athleteId: callUp.athleteId,
        organizationId: user.organizationId,
      },
    }),
    prisma.callUp.delete({ where: { id: callUp.id } }),
  ]);

  revalidatePath(`/convocacoes/${callUp.matchId}`);
}

export async function updateCallUpStatus(formData: FormData) {
  const user = await requireClubPermission("CALLUPS_MANAGE");

  const id = clean(formData.get("id"));

  const rawStatus = clean(formData.get("status"));

  if (!id) return;

  const callUp = await prisma.callUp.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },

    select: {
      id: true,
      matchId: true,
      responseHistory: true,

      match: {
        select: {
          categoryId: true,
          callUpMode: true,
        },
      },
    },
  });

  if (!callUp) return;

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    callUp.match.categoryId,
  );

  if (!categoryAccess.canManage) {
    return;
  }

  const status =
    callUp.match.callUpMode === CallUpMode.INFORMATION_ONLY
      ? CallUpStatus.INFORMED
      : rawStatus === "CONFIRMED"
        ? CallUpStatus.CONFIRMED
        : rawStatus === "DECLINED"
          ? CallUpStatus.DECLINED
          : CallUpStatus.PENDING;

  const previousHistory = Array.isArray(callUp.responseHistory)
    ? callUp.responseHistory
    : [];
  const responseHistory = [
    ...previousHistory,
    {
      status,
      source: "CLUB_MANUAL",
      at: new Date().toISOString(),
      userId: user.id,
    },
  ] as Prisma.InputJsonArray;

  await prisma.callUp.update({
    where: {
      id: callUp.id,
    },

    data: {
      status,

      respondedAt: status === CallUpStatus.PENDING ? null : new Date(),
      responseSource: "CLUB_MANUAL",
      responseHistory,
    },
  });

  revalidatePath(`/convocacoes/${callUp.matchId}`);
}

export async function markCallUpsSent(formData: FormData) {
  const user = await requireClubPermission("CALLUPS_MANAGE");

  const matchId = clean(formData.get("matchId"));

  if (!matchId) return;

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      organizationId: user.organizationId,
    },

    select: {
      id: true,
      categoryId: true,
      callUpMode: true,
    },
  });

  if (!match) return;

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    match.categoryId,
  );

  if (!categoryAccess.canManage) {
    return;
  }

  const callUps = await prisma.callUp.findMany({
    where: {
      matchId: match.id,
      organizationId: user.organizationId,
    },
    select: { id: true, responseToken: true },
  });

  await prisma.$transaction(
    callUps.map((callUp) =>
      prisma.callUp.update({
        where: { id: callUp.id },
        data: {
          sentAt: new Date(),
          status:
            match.callUpMode === CallUpMode.INFORMATION_ONLY
              ? CallUpStatus.INFORMED
              : undefined,
          responseToken:
            match.callUpMode === CallUpMode.CONFIRMATION_REQUIRED
              ? callUp.responseToken || randomUUID()
              : null,
        },
      }),
    ),
  );

  revalidatePath(`/convocacoes/${match.id}`);
}

export async function goToMatchCallUps(formData: FormData) {
  const user = await requireClubPermission("CALLUPS_VIEW");

  const matchId = clean(formData.get("matchId"));

  if (!matchId) return;

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      organizationId: user.organizationId,
    },

    select: {
      id: true,
      categoryId: true,
    },
  });

  if (!match) return;

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    match.categoryId,
  );

  if (!categoryAccess.canView) {
    redirect("/convocacoes?erro=sem-acesso-categoria");
  }

  redirect(`/convocacoes/${match.id}`);
}

/**
 * Salva a regra da convocação daquele jogo.
 *
 * Campos esperados pelo formulário:
 * - matchId
 * - starterGoalkeeperCount
 * - starterOutfieldCount
 * - reserveCount
 * - formationPattern (ex.: 2-2-3)
 * - formationName (opcional)
 * - formationTemplateId (opcional)
 * - callUpRuleId (opcional)
 * - saveAsDefault = "on" (opcional)
 */
export async function saveCallUpConfiguration(formData: FormData) {
  const user = await requireClubPermission("CALLUPS_MANAGE");

  const matchId = clean(formData.get("matchId"));

  if (!matchId) {
    return {
      ok: false,
      error: "Jogo não informado.",
    };
  }

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      organizationId: user.organizationId,
    },
    include: {
      callUps: {
        select: {
          athleteId: true,
        },
      },
    },
  });

  if (!match) {
    return {
      ok: false,
      error: "Jogo não encontrado.",
    };
  }

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    match.categoryId,
  );

  if (!categoryAccess.canManage) {
    return {
      ok: false,
      error: "Sem permissão para alterar esta convocação.",
    };
  }

  const goalkeeperStarterCount = parseInteger(
    formData.get("starterGoalkeeperCount"),
    1,
    3,
    match.starterGoalkeeperCount ?? 1,
  );

  const outfieldStarterCount = parseInteger(
    formData.get("starterOutfieldCount"),
    1,
    20,
    match.starterOutfieldCount ??
      Math.max(
        1,
        (match.sport === SportType.FUTSAL ? 5 : 9) -
          goalkeeperStarterCount,
      ),
  );

  const reserveCount = parseInteger(
    formData.get("reserveCount"),
    0,
    30,
    match.reserveCount ??
      Math.max(
        0,
        match.callUpLimit -
          goalkeeperStarterCount -
          outfieldStarterCount,
      ),
  );

  const totalStarters =
    goalkeeperStarterCount + outfieldStarterCount;

  const totalCalled = totalStarters + reserveCount;

  if (totalCalled < 2 || totalCalled > 40) {
    return {
      ok: false,
      error: "O total da convocação deve ficar entre 2 e 40 atletas.",
    };
  }

  if (match.callUps.length > totalCalled) {
    return {
      ok: false,
      error: `Já existem ${match.callUps.length} atletas convocados. O novo limite não pode ser ${totalCalled}.`,
    };
  }

  const formationTemplateId =
    clean(formData.get("formationTemplateId")) || null;

  const requestedFormationPattern =
    clean(formData.get("formationPattern")) ||
    match.formation ||
    "";

  const formationName = clean(formData.get("formationName"));

  const formation = await ensureFormationTemplate({
    organizationId: user.organizationId,
    sport: match.sport,
    outfieldPlayerCount: outfieldStarterCount,
    goalkeeperCount: goalkeeperStarterCount,
    formationTemplateId,
    formationPattern: requestedFormationPattern,
    formationName,
  });

  if (!formation) {
    return {
      ok: false,
      error: `A formação precisa distribuir exatamente ${outfieldStarterCount} jogadores de linha. Exemplo: 2-2-3.`,
    };
  }

  const expectedSlotCount =
    goalkeeperStarterCount + outfieldStarterCount;

  if (formation.slots.length !== expectedSlotCount) {
    return {
      ok: false,
      error:
        "A formação selecionada não possui a mesma quantidade de posições dos titulares.",
    };
  }

  const requestedRuleId =
    clean(formData.get("callUpRuleId")) || null;

  let callUpRuleId: string | null = null;

  if (requestedRuleId) {
    const rule = await prisma.competitionCallUpRule.findFirst({
      where: {
        id: requestedRuleId,
        organizationId: user.organizationId,
        active: true,
      },
      select: {
        id: true,
      },
    });

    callUpRuleId = rule?.id ?? null;
  }

  const saveAsDefault =
    clean(formData.get("saveAsDefault")) === "on" ||
    clean(formData.get("saveAsDefault")) === "1";

  if (saveAsDefault) {
    const rule = await saveDefaultCallUpRule({
      organizationId: user.organizationId,
      categoryId: match.categoryId,
      competitionName: match.competition,
      sport: match.sport,
      outfieldStarterCount,
      goalkeeperStarterCount,
      reserveCount,
      defaultFormationId: formation.id,
    });

    callUpRuleId = rule.id;
  }

  const configSnapshot = {
    source: callUpRuleId ? "RULE" : "MATCH_CUSTOM",
    callUpRuleId,
    categoryId: match.categoryId,
    competition: match.competition,
    sport: match.sport,
    goalkeeperStarterCount,
    outfieldStarterCount,
    reserveCount,
    totalStarters,
    totalCalled,
    formationTemplateId: formation.id,
    formationName: formation.name,
    savedAt: new Date().toISOString(),
  } as Prisma.InputJsonValue;

  const calledAthleteIds = match.callUps.map(
    (callUp) => callUp.athleteId,
  );

  await prisma.$transaction([
    prisma.match.update({
      where: {
        id: match.id,
      },
      data: {
        callUpLimit: totalCalled,
        callUpRuleId,
        formationTemplateId: formation.id,
        starterOutfieldCount: outfieldStarterCount,
        starterGoalkeeperCount: goalkeeperStarterCount,
        reserveCount,
        formation: formation.name,
        callUpConfigSnapshot: configSnapshot,
        formationSnapshot: formationSnapshot(formation),
      },
    }),

    ...(calledAthleteIds.length
      ? [
          prisma.matchAthleteStat.updateMany({
            where: {
              matchId: match.id,
              organizationId: user.organizationId,
              athleteId: {
                in: calledAthleteIds,
              },
            },
            data: {
              lineupRole: MatchLineupRole.SUBSTITUTE,
              positionPlayed: "SUBSTITUTE",
              isCaptain: false,
            },
          }),
        ]
      : []),
  ]);

  revalidatePath("/convocacoes");
  revalidatePath(`/convocacoes/${match.id}`);
  revalidatePath(`/convocacoes/${match.id}/arte`);
  revalidatePath(`/jogos/${match.id}`);

  return {
    ok: true,
    totalStarters,
    totalCalled,
    formationName: formation.name,
  };
}

const LEGACY_FOOTBALL_SLOTS = [
  "GOALKEEPER",
  "DEFENDER_LEFT",
  "DEFENDER_CENTER",
  "DEFENDER_RIGHT",
  "MIDFIELDER_LEFT",
  "MIDFIELDER_CENTER",
  "MIDFIELDER_RIGHT",
  "FORWARD_LEFT",
  "FORWARD_RIGHT",
] as const;

const LEGACY_FUTSAL_SLOTS = [
  "GOALKEEPER",
  "FIXO",
  "ALA_LEFT",
  "ALA_RIGHT",
  "PIVO",
] as const;

export async function saveCallUpLineup(formData: FormData) {
  const user = await requireClubPermission("CALLUPS_MANAGE");

  const matchId = clean(formData.get("matchId"));
  const captainId = clean(formData.get("captainId"));

  if (!matchId) return;

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      organizationId: user.organizationId,
    },
    include: {
      callUps: {
        select: {
          athleteId: true,
        },
      },
      formationTemplate: {
        include: {
          slots: {
            where: {
              active: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    },
  });

  if (!match) return;

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    match.categoryId,
  );

  if (!categoryAccess.canManage) return;

  const dynamicSlots =
    match.formationTemplate?.slots.map((slot) => slot.code) ?? [];

  const legacySlots: readonly string[] =
    match.sport === SportType.FUTSAL
      ? LEGACY_FUTSAL_SLOTS
      : LEGACY_FOOTBALL_SLOTS;

  const starterSlots: readonly string[] =
    dynamicSlots.length > 0 ? dynamicSlots : legacySlots;

  const configuredStarterCount =
    match.starterGoalkeeperCount != null &&
    match.starterOutfieldCount != null
      ? match.starterGoalkeeperCount + match.starterOutfieldCount
      : starterSlots.length;

  if (starterSlots.length !== configuredStarterCount) {
    return;
  }

  const squadLimit =
    match.starterGoalkeeperCount != null &&
    match.starterOutfieldCount != null &&
    match.reserveCount != null
      ? match.starterGoalkeeperCount +
        match.starterOutfieldCount +
        match.reserveCount
      : match.callUpLimit;

  if (match.callUps.length > squadLimit) return;

  const entries = match.callUps.map((callUp, index) => {
    const slot = clean(
      formData.get(`slot_${callUp.athleteId}`),
    );

    const jerseyRaw = clean(
      formData.get(`jersey_${callUp.athleteId}`),
    );

    const jerseyNumber = jerseyRaw
      ? Number(jerseyRaw)
      : null;

    const isStarter = starterSlots.includes(slot);

    return {
      athleteId: callUp.athleteId,
      slot: isStarter ? slot : "SUBSTITUTE",
      isStarter,
      lineupOrder: index,
      jerseyNumber:
        jerseyNumber !== null &&
        Number.isInteger(jerseyNumber) &&
        jerseyNumber >= 0 &&
        jerseyNumber <= 999
          ? jerseyNumber
          : null,
    };
  });

  const starters = entries.filter(
    (entry) => entry.isStarter,
  );

  const usedSlots = new Set(
    starters.map((entry) => entry.slot),
  );

  if (
    starters.length > starterSlots.length ||
    usedSlots.size !== starters.length
  ) {
    return;
  }

  if (
    captainId &&
    !starters.some(
      (entry) => entry.athleteId === captainId,
    )
  ) {
    return;
  }

  await prisma.$transaction([
    ...entries.map((entry) =>
      prisma.matchAthleteStat.upsert({
        where: {
          matchId_athleteId: {
            matchId,
            athleteId: entry.athleteId,
          },
        },
        update: {
          participation:
            MatchParticipationStatus.CALLED_UP,
          lineupRole: entry.isStarter
            ? MatchLineupRole.STARTER
            : MatchLineupRole.SUBSTITUTE,
          positionPlayed: entry.slot,
          jerseyNumber: entry.jerseyNumber,
          isCaptain:
            entry.athleteId === captainId,
          lineupOrder: entry.lineupOrder,
          recordedByUserId: user.id,
        },
        create: {
          organizationId: user.organizationId,
          matchId,
          athleteId: entry.athleteId,
          participation:
            MatchParticipationStatus.CALLED_UP,
          lineupRole: entry.isStarter
            ? MatchLineupRole.STARTER
            : MatchLineupRole.SUBSTITUTE,
          positionPlayed: entry.slot,
          jerseyNumber: entry.jerseyNumber,
          isCaptain:
            entry.athleteId === captainId,
          lineupOrder: entry.lineupOrder,
          recordedByUserId: user.id,
        },
      }),
    ),

    prisma.match.update({
      where: {
        id: matchId,
      },
      data: {
        callUpLimit: squadLimit,
        formation:
          match.formationTemplate?.name ??
          match.formation ??
          (match.sport === SportType.FUTSAL
            ? "1-2-1"
            : "3-3-2"),
      },
    }),
  ]);

  revalidatePath(`/convocacoes/${matchId}`);
  revalidatePath(`/convocacoes/${matchId}/arte`);
  revalidatePath(`/jogos/${matchId}`);
}
