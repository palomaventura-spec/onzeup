"use server";

import {
  CallUpStatus,
  MatchLineupRole,
  MatchParticipationStatus,
} from "@prisma/client";
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
      sport: true,
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

  const squadLimit = match.sport === "FUTSAL" ? 14 : 18;
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

        update: {},

        create: {
          matchId: match.id,
          athleteId: athlete.id,
          organizationId: user.organizationId,
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

      match: {
        select: {
          categoryId: true,
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
    rawStatus === "CONFIRMED"
      ? CallUpStatus.CONFIRMED
      : rawStatus === "DECLINED"
        ? CallUpStatus.DECLINED
        : CallUpStatus.PENDING;

  await prisma.callUp.update({
    where: {
      id: callUp.id,
    },

    data: {
      status,

      respondedAt: status === CallUpStatus.PENDING ? null : new Date(),
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

  await prisma.callUp.updateMany({
    where: {
      matchId: match.id,
      organizationId: user.organizationId,
    },

    data: {
      sentAt: new Date(),
    },
  });

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

const FOOTBALL_SLOTS = [
  "GOALKEEPER",
  "DEFENDER_LEFT",
  "DEFENDER_CENTER",
  "DEFENDER_RIGHT",
  "MIDFIELDER_LEFT",
  "MIDFIELDER_CENTER",
  "MIDFIELDER_RIGHT",
  "FORWARD_LEFT",
  "FORWARD_RIGHT",
];
const FUTSAL_SLOTS = ["GOALKEEPER", "FIXO", "ALA_LEFT", "ALA_RIGHT", "PIVO"];

export async function saveCallUpLineup(formData: FormData) {
  const user = await requireClubPermission("CALLUPS_MANAGE");
  const matchId = clean(formData.get("matchId"));
  const captainId = clean(formData.get("captainId"));
  if (!matchId) return;

  const match = await prisma.match.findFirst({
    where: { id: matchId, organizationId: user.organizationId },
    include: { callUps: { select: { athleteId: true } } },
  });
  if (!match) return;

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    match.categoryId,
  );
  const starterSlots: readonly string[] =
    match.sport === "FUTSAL" ? FUTSAL_SLOTS : FOOTBALL_SLOTS;
  const squadLimit = match.sport === "FUTSAL" ? 14 : 18;
  if (!categoryAccess.canManage || match.callUps.length > squadLimit) return;

  const entries = match.callUps.map((callUp, index) => {
    const slot = clean(formData.get(`slot_${callUp.athleteId}`));
    const jerseyRaw = clean(formData.get(`jersey_${callUp.athleteId}`));
    const jerseyNumber = jerseyRaw ? Number(jerseyRaw) : null;
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

  const starters = entries.filter((entry) => entry.isStarter);
  const usedSlots = new Set(starters.map((entry) => entry.slot));
  if (
    starters.length > starterSlots.length ||
    usedSlots.size !== starters.length
  )
    return;
  if (captainId && !starters.some((entry) => entry.athleteId === captainId))
    return;

  await prisma.$transaction([
    ...entries.map((entry) =>
      prisma.matchAthleteStat.upsert({
        where: { matchId_athleteId: { matchId, athleteId: entry.athleteId } },
        update: {
          participation: MatchParticipationStatus.CALLED_UP,
          lineupRole: entry.isStarter
            ? MatchLineupRole.STARTER
            : MatchLineupRole.SUBSTITUTE,
          positionPlayed: entry.slot,
          jerseyNumber: entry.jerseyNumber,
          isCaptain: entry.athleteId === captainId,
          lineupOrder: entry.lineupOrder,
          recordedByUserId: user.id,
        },
        create: {
          organizationId: user.organizationId,
          matchId,
          athleteId: entry.athleteId,
          participation: MatchParticipationStatus.CALLED_UP,
          lineupRole: entry.isStarter
            ? MatchLineupRole.STARTER
            : MatchLineupRole.SUBSTITUTE,
          positionPlayed: entry.slot,
          jerseyNumber: entry.jerseyNumber,
          isCaptain: entry.athleteId === captainId,
          lineupOrder: entry.lineupOrder,
          recordedByUserId: user.id,
        },
      }),
    ),
    prisma.match.update({
      where: { id: matchId },
      data: { formation: match.sport === "FUTSAL" ? "1-2-1" : "3-3-2" },
    }),
  ]);

  revalidatePath(`/convocacoes/${matchId}`);
  revalidatePath(`/convocacoes/${matchId}/arte`);
  revalidatePath(`/jogos/${matchId}`);
}
