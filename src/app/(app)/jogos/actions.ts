"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CallUpMode,
  CallUpStatus,
  MatchArrivalAttire,
  MatchFootwearType,
  MatchStatus,
  SportType,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const v = clean(value);
  return v || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const raw = clean(value);

  if (!raw) {
    return null;
  }

  const n = Number(raw);

  return Number.isFinite(n) ? n : null;
}

async function validateCategory(categoryId: string, organizationId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId,
    },

    select: {
      id: true,
    },
  });

  return category?.id ?? null;
}

function parseDateTime(date: string, time: string) {
  if (!date || !time) {
    return null;
  }

  const parsed = new Date(`${date}T${time}:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseStatus(value: string): MatchStatus {
  if (value === "FINISHED") {
    return MatchStatus.FINISHED;
  }

  if (value === "CANCELLED") {
    return MatchStatus.CANCELLED;
  }

  return MatchStatus.SCHEDULED;
}

function parseSport(value: string): SportType {
  return value === "FUTSAL" ? SportType.FUTSAL : SportType.FOOTBALL;
}

function parseCallUpMode(value: string): CallUpMode {
  return value === "INFORMATION_ONLY"
    ? CallUpMode.INFORMATION_ONLY
    : CallUpMode.CONFIRMATION_REQUIRED;
}

function parseCallUpLimit(value: FormDataEntryValue | null, sport: SportType) {
  const parsed = Number(clean(value));
  const minimum = sport === SportType.FUTSAL ? 5 : 9;
  const fallback = sport === SportType.FUTSAL ? 14 : 18;
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= 30
    ? parsed
    : fallback;
}

function parseArrivalAttire(value: string): MatchArrivalAttire {
  return value === "TRAINING_UNIFORM"
    ? MatchArrivalAttire.TRAINING_UNIFORM
    : MatchArrivalAttire.GAME_UNIFORM;
}

function parseFootwear(value: string, sport: SportType) {
  if (sport === SportType.FUTSAL) return MatchFootwearType.FUTSAL_SHOES;
  return value === "SOCIETY_CLEATS"
    ? MatchFootwearType.SOCIETY_CLEATS
    : MatchFootwearType.FIELD_CLEATS;
}

async function validStaffIds(
  values: FormDataEntryValue[],
  organizationId: string,
) {
  const ids = Array.from(new Set(values.map(String).filter(Boolean)));
  if (!ids.length) return [];
  const staff = await prisma.staffMember.findMany({
    where: {
      id: { in: ids },
      organizationId,
      active: true,
    },
    select: { id: true },
  });
  return staff.map((member) => member.id);
}

export async function createMatch(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");

  const categoryId = await validateCategory(
    clean(formData.get("categoryId")),
    user.organizationId,
  );

  const opponent = clean(formData.get("opponent"));

  const competition = nullable(formData.get("competition"));

  const matchDate = clean(formData.get("matchDate"));

  const matchTime = clean(formData.get("matchTime"));

  const startsAt = parseDateTime(matchDate, matchTime);

  const location = nullable(formData.get("location"));

  const homeAway = nullable(formData.get("homeAway"));

  const notes = nullable(formData.get("notes"));

  const sport = parseSport(clean(formData.get("sport")));
  const callUpLimit = parseCallUpLimit(formData.get("callUpLimit"), sport);
  const callUpMode = parseCallUpMode(clean(formData.get("callUpMode")));
  const presentationTime = nullable(formData.get("presentationTime"));
  const arrivalAttire = parseArrivalAttire(
    clean(formData.get("arrivalAttire")),
  );
  const uniform = nullable(formData.get("uniform"));
  const sockRequirement = nullable(formData.get("sockRequirement"));
  const shinGuardsRequired = formData.get("shinGuardsRequired") === "on";
  const footwearType = parseFootwear(
    clean(formData.get("footwearType")),
    sport,
  );
  const equipmentNotes = nullable(formData.get("equipmentNotes"));

  if (!categoryId || !opponent || !startsAt) {
    return;
  }

  const staffIds = await validStaffIds(
    formData.getAll("staffIds"),
    user.organizationId,
  );

  await prisma.match.create({
    data: {
      opponent,
      competition,
      startsAt,
      location,
      homeAway,
      notes,
      sport,
      callUpLimit,
      callUpMode,
      presentationTime,
      arrivalAttire,
      uniform,
      sockRequirement,
      shinGuardsRequired,
      footwearType,
      equipmentNotes,
      categoryId,
      organizationId: user.organizationId,
      status: MatchStatus.SCHEDULED,
      staffAssignments: {
        create: staffIds.map((staffMemberId) => ({
          staffMemberId,
          organizationId: user.organizationId,
        })),
      },
    },
  });

  revalidatePath("/jogos");
}

export async function updateMatch(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");

  const id = clean(formData.get("id"));

  const categoryId = await validateCategory(
    clean(formData.get("categoryId")),
    user.organizationId,
  );

  const opponent = clean(formData.get("opponent"));

  const competition = nullable(formData.get("competition"));

  const matchDate = clean(formData.get("matchDate"));

  const matchTime = clean(formData.get("matchTime"));

  const startsAt = parseDateTime(matchDate, matchTime);

  const location = nullable(formData.get("location"));

  const homeAway = nullable(formData.get("homeAway"));

  const notes = nullable(formData.get("notes"));

  const sport = parseSport(clean(formData.get("sport")));
  const callUpLimit = parseCallUpLimit(formData.get("callUpLimit"), sport);
  const callUpMode = parseCallUpMode(clean(formData.get("callUpMode")));
  const presentationTime = nullable(formData.get("presentationTime"));
  const arrivalAttire = parseArrivalAttire(
    clean(formData.get("arrivalAttire")),
  );
  const uniform = nullable(formData.get("uniform"));
  const sockRequirement = nullable(formData.get("sockRequirement"));
  const shinGuardsRequired = formData.get("shinGuardsRequired") === "on";
  const footwearType = parseFootwear(
    clean(formData.get("footwearType")),
    sport,
  );
  const equipmentNotes = nullable(formData.get("equipmentNotes"));

  const status = parseStatus(clean(formData.get("status")));

  const goalsFor = nullableNumber(formData.get("goalsFor"));

  const goalsAgainst = nullableNumber(formData.get("goalsAgainst"));

  if (!id || !categoryId || !opponent || !startsAt) {
    return;
  }

  const staffIds = await validStaffIds(
    formData.getAll("staffIds"),
    user.organizationId,
  );

  const resultData =
    status === MatchStatus.FINISHED
      ? {
          goalsFor,
          goalsAgainst,
        }
      : {
          goalsFor: null,
          goalsAgainst: null,
        };

  await prisma.match.updateMany({
    where: {
      id,
      organizationId: user.organizationId,
    },

    data: {
      opponent,
      competition,
      startsAt,
      location,
      homeAway,
      notes,
      sport,
      callUpLimit,
      callUpMode,
      presentationTime,
      arrivalAttire,
      uniform,
      sockRequirement,
      shinGuardsRequired,
      footwearType,
      equipmentNotes,
      categoryId,
      status,
      ...resultData,
    },
  });

  await prisma.matchStaffAssignment.deleteMany({
    where: { matchId: id, organizationId: user.organizationId },
  });
  if (staffIds.length) {
    await prisma.matchStaffAssignment.createMany({
      data: staffIds.map((staffMemberId) => ({
        matchId: id,
        staffMemberId,
        organizationId: user.organizationId,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.callUp.updateMany({
    where: {
      matchId: id,
      organizationId: user.organizationId,
      status:
        callUpMode === CallUpMode.INFORMATION_ONLY
          ? { in: [CallUpStatus.PENDING, CallUpStatus.INFORMED] }
          : CallUpStatus.INFORMED,
    },
    data: {
      status:
        callUpMode === CallUpMode.INFORMATION_ONLY
          ? CallUpStatus.INFORMED
          : CallUpStatus.PENDING,
      respondedAt: null,
    },
  });

  revalidatePath("/jogos");
  redirect("/jogos");
}

export async function deleteMatch(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");

  const id = clean(formData.get("id"));

  if (!id) {
    return;
  }

  await prisma.match.deleteMany({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/jogos");
  redirect("/jogos");
}

export async function markMatchFinished(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");

  const id = clean(formData.get("id"));

  const goalsFor = nullableNumber(formData.get("goalsFor"));

  const goalsAgainst = nullableNumber(formData.get("goalsAgainst"));

  if (!id || goalsFor === null || goalsAgainst === null) {
    return;
  }

  await prisma.match.updateMany({
    where: {
      id,
      organizationId: user.organizationId,
    },

    data: {
      status: MatchStatus.FINISHED,
      goalsFor,
      goalsAgainst,
    },
  });

  revalidatePath("/jogos");
}
