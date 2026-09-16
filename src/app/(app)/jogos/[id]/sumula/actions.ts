"use server";

import {
  MatchEventTeam,
  MatchEventType,
  MatchLineupRole,
  MatchParticipationStatus,
  MatchSheetStatus,
  MatchStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function optional(value: FormDataEntryValue | null) {
  return clean(value) || null;
}

function integer(value: FormDataEntryValue | null, minimum = 0) {
  const raw = clean(value);
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : null;
}

function participation(value: string): MatchParticipationStatus {
  return Object.values(MatchParticipationStatus).includes(
    value as MatchParticipationStatus,
  )
    ? (value as MatchParticipationStatus)
    : MatchParticipationStatus.RELATED;
}

function lineupRole(value: string): MatchLineupRole | null {
  return Object.values(MatchLineupRole).includes(value as MatchLineupRole)
    ? (value as MatchLineupRole)
    : null;
}

async function editableMatch(matchId: string, organizationId: string) {
  return prisma.match.findFirst({
    where: { id: matchId, organizationId },
    select: { id: true, matchSheetStatus: true },
  });
}

function refresh(matchId: string) {
  revalidatePath(`/jogos/${matchId}`);
  revalidatePath(`/jogos/${matchId}/sumula`);
  revalidatePath("/jogos");
  revalidatePath("/dashboard");
}

export async function saveMatchSheet(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");
  const matchId = clean(formData.get("matchId"));
  const match = await editableMatch(matchId, user.organizationId);
  if (!match || match.matchSheetStatus !== MatchSheetStatus.DRAFT) return;

  const athleteIds = formData.getAll("athleteId").map(String).filter(Boolean);

  const validAthletes = await prisma.callUp.findMany({
    where: {
      organizationId: user.organizationId,
      matchId,
      athleteId: { in: athleteIds },
    },
    select: { athleteId: true },
  });
  const validIds = new Set(validAthletes.map((item) => item.athleteId));

  const goalsFor = integer(formData.get("goalsFor"));
  const goalsAgainst = integer(formData.get("goalsAgainst"));

  await prisma.$transaction([
    prisma.match.update({
      where: { id: matchId },
      data: {
        goalsFor,
        goalsAgainst,
        presentationTime: optional(formData.get("presentationTime")),
        uniform: optional(formData.get("uniform")),
        referee: optional(formData.get("referee")),
        assistantReferee: optional(formData.get("assistantReferee")),
        matchSheetNotes: optional(formData.get("matchSheetNotes")),
      },
    }),
    ...athleteIds
      .filter((id) => validIds.has(id))
      .map((athleteId) =>
        prisma.matchAthleteStat.upsert({
          where: { matchId_athleteId: { matchId, athleteId } },
          create: {
            organizationId: user.organizationId,
            matchId,
            athleteId,
            recordedByUserId: user.id,
            participation: participation(
              clean(formData.get(`participation_${athleteId}`)),
            ),
            lineupRole: lineupRole(
              clean(formData.get(`lineupRole_${athleteId}`)),
            ),
            enteredAtMinute: integer(
              formData.get(`enteredAtMinute_${athleteId}`),
            ),
            leftAtMinute: integer(formData.get(`leftAtMinute_${athleteId}`)),
            minutesPlayed: integer(formData.get(`minutesPlayed_${athleteId}`)),
            positionPlayed: optional(
              formData.get(`positionPlayed_${athleteId}`),
            ),
            jerseyNumber: integer(formData.get(`jerseyNumber_${athleteId}`), 1),
            isCaptain: clean(formData.get("captainId")) === athleteId,
            goals: integer(formData.get(`goals_${athleteId}`)) ?? 0,
            assists: integer(formData.get(`assists_${athleteId}`)) ?? 0,
            yellowCards: integer(formData.get(`yellowCards_${athleteId}`)) ?? 0,
            redCards: integer(formData.get(`redCards_${athleteId}`)) ?? 0,
            notes: optional(formData.get(`notes_${athleteId}`)),
          },
          update: {
            recordedByUserId: user.id,
            participation: participation(
              clean(formData.get(`participation_${athleteId}`)),
            ),
            lineupRole: lineupRole(
              clean(formData.get(`lineupRole_${athleteId}`)),
            ),
            enteredAtMinute: integer(
              formData.get(`enteredAtMinute_${athleteId}`),
            ),
            leftAtMinute: integer(formData.get(`leftAtMinute_${athleteId}`)),
            minutesPlayed: integer(formData.get(`minutesPlayed_${athleteId}`)),
            positionPlayed: optional(
              formData.get(`positionPlayed_${athleteId}`),
            ),
            jerseyNumber: integer(formData.get(`jerseyNumber_${athleteId}`), 1),
            isCaptain: clean(formData.get("captainId")) === athleteId,
            goals: integer(formData.get(`goals_${athleteId}`)) ?? 0,
            assists: integer(formData.get(`assists_${athleteId}`)) ?? 0,
            yellowCards: integer(formData.get(`yellowCards_${athleteId}`)) ?? 0,
            redCards: integer(formData.get(`redCards_${athleteId}`)) ?? 0,
            notes: optional(formData.get(`notes_${athleteId}`)),
          },
        }),
      ),
  ]);

  refresh(matchId);
}

export async function addMatchEvent(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");
  const matchId = clean(formData.get("matchId"));
  const match = await editableMatch(matchId, user.organizationId);
  if (!match || match.matchSheetStatus !== MatchSheetStatus.DRAFT) return;

  const rawType = clean(formData.get("type"));
  const rawTeam = clean(formData.get("team"));
  if (!Object.values(MatchEventType).includes(rawType as MatchEventType))
    return;

  const athleteId = optional(formData.get("athleteId"));
  if (athleteId) {
    const callUp = await prisma.callUp.findFirst({
      where: { matchId, athleteId, organizationId: user.organizationId },
      select: { id: true },
    });
    if (!callUp) return;
  }

  await prisma.matchEvent.create({
    data: {
      organizationId: user.organizationId,
      matchId,
      athleteId,
      type: rawType as MatchEventType,
      team:
        rawTeam === MatchEventTeam.OPPONENT
          ? MatchEventTeam.OPPONENT
          : MatchEventTeam.OURS,
      minute: integer(formData.get("minute")),
      period: optional(formData.get("period")),
      notes: optional(formData.get("notes")),
    },
  });
  refresh(matchId);
}

export async function deleteMatchEvent(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");
  const matchId = clean(formData.get("matchId"));
  const eventId = clean(formData.get("eventId"));
  const match = await editableMatch(matchId, user.organizationId);
  if (!match || match.matchSheetStatus !== MatchSheetStatus.DRAFT) return;

  await prisma.matchEvent.deleteMany({
    where: { id: eventId, matchId, organizationId: user.organizationId },
  });
  refresh(matchId);
}

export async function finalizeMatchSheet(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");
  const matchId = clean(formData.get("matchId"));
  const match = await prisma.match.findFirst({
    where: { id: matchId, organizationId: user.organizationId },
    select: { id: true, goalsFor: true, goalsAgainst: true },
  });
  if (!match || match.goalsFor === null || match.goalsAgainst === null) return;

  await prisma.match.update({
    where: { id: match.id },
    data: {
      matchSheetStatus: MatchSheetStatus.FINALIZED,
      finalizedAt: new Date(),
      status: MatchStatus.FINISHED,
    },
  });
  refresh(matchId);
}

export async function reopenMatchSheet(formData: FormData) {
  const user = await requireClubPermission("MATCHES_EDIT");
  const matchId = clean(formData.get("matchId"));
  await prisma.match.updateMany({
    where: { id: matchId, organizationId: user.organizationId },
    data: { matchSheetStatus: MatchSheetStatus.DRAFT, finalizedAt: null },
  });
  refresh(matchId);
}
