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


// SUMULA_AUTO_MINUTES_V1: o servidor nunca confia apenas no total calculado no navegador.
function derivedMinutes(formData: FormData, athleteId: string) {
  const from = integer(formData.get(`enteredAtMinute_${athleteId}`));
  const to = integer(formData.get(`leftAtMinute_${athleteId}`));
  if (from !== null && to !== null) {
    if (to < from) throw new Error("Na sumula, o minuto de saida nao pode ser anterior ao de entrada.");
    return to - from;
  }
  return integer(formData.get(`minutesPlayed_${athleteId}`));
}


// 11UP_SUMULA_DOIS_TEMPOS_V1: os minutos sao relativos a cada tempo, nunca ao relogio corrido da partida.
type PriorFootballTime = {
  minutesPlayed: number | null;
  firstHalfEntryMinute: number | null;
  firstHalfExitMinute: number | null;
  secondHalfEntryMinute: number | null;
  secondHalfExitMinute: number | null;
};

function readHalfMinute(formData: FormData, key: string): number | null {
  const entry = formData.get(key);
  if (entry === null) throw new Error("Campo de minutagem nao enviado: " + key);
  const raw = String(entry).trim();
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) throw new Error("Minutagem deve ser um numero inteiro.");
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0 || value > 180) {
    throw new Error("Minutagem fora do intervalo permitido (0 a 180).");
  }
  return value;
}

function footballMinuteData(formData: FormData, athleteId: string, prior?: PriorFootballTime) {
  const firstHalfEntryMinute = readHalfMinute(formData, `firstHalfEntryMinute_${athleteId}`);
  const firstHalfExitMinute = readHalfMinute(formData, `firstHalfExitMinute_${athleteId}`);
  const secondHalfEntryMinute = readHalfMinute(formData, `secondHalfEntryMinute_${athleteId}`);
  const secondHalfExitMinute = readHalfMinute(formData, `secondHalfExitMinute_${athleteId}`);
  const pairs = [
    [firstHalfEntryMinute, firstHalfExitMinute],
    [secondHalfEntryMinute, secondHalfExitMinute],
  ] as const;
  let hasPeriod = false;
  let total = 0;
  for (const [entry, exit] of pairs) {
    if (entry === null && exit === null) continue;
    if (entry === null || exit === null) {
      throw new Error("Preencha entrada e saida juntas em cada tempo.");
    }
    if (exit < entry) throw new Error("O minuto de saida nao pode ser anterior ao de entrada.");
    hasPeriod = true;
    total += exit - entry;
  }
  const hadPeriod = !!prior && [
    prior.firstHalfEntryMinute, prior.firstHalfExitMinute,
    prior.secondHalfEntryMinute, prior.secondHalfExitMinute,
  ].some((value) => value !== null);
  // Historico antigo fica intacto se nao foi substituido por novos tempos.
  // Caso o usuario limpe tempos anteriormente registrados, limpa tambem o total.
  const minutesPlayed = hasPeriod ? total : hadPeriod ? null : (prior?.minutesPlayed ?? null);
  return {
    firstHalfEntryMinute, firstHalfExitMinute,
    secondHalfEntryMinute, secondHalfExitMinute,
    minutesPlayed,
  };
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
    select: { id: true, matchSheetStatus: true, sport: true },
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

  const existingStats = new Map(
    (await prisma.matchAthleteStat.findMany({
      where: { matchId, organizationId: user.organizationId, athleteId: { in: athleteIds } },
      select: {
        athleteId: true, enteredAtMinute: true, leftAtMinute: true, minutesPlayed: true,
        firstHalfEntryMinute: true, firstHalfExitMinute: true,
        secondHalfEntryMinute: true, secondHalfExitMinute: true,
      },
    })).map((item) => [item.athleteId, item]),
  );

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
            enteredAtMinute: match.sport === "FOOTBALL"
              ? (existingStats.get(athleteId)?.enteredAtMinute ?? null)
              : integer(formData.get(`enteredAtMinute_${athleteId}`)),
            leftAtMinute: match.sport === "FOOTBALL"
              ? (existingStats.get(athleteId)?.leftAtMinute ?? null)
              : integer(formData.get(`leftAtMinute_${athleteId}`)),
            minutesPlayed: match.sport === "FOOTBALL"
              ? (existingStats.get(athleteId)?.minutesPlayed ?? null)
              : derivedMinutes(formData, athleteId),
            ...(match.sport === "FOOTBALL"
              ? footballMinuteData(formData, athleteId, existingStats.get(athleteId))
              : {}),
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
            enteredAtMinute: match.sport === "FOOTBALL"
              ? (existingStats.get(athleteId)?.enteredAtMinute ?? null)
              : integer(formData.get(`enteredAtMinute_${athleteId}`)),
            leftAtMinute: match.sport === "FOOTBALL"
              ? (existingStats.get(athleteId)?.leftAtMinute ?? null)
              : integer(formData.get(`leftAtMinute_${athleteId}`)),
            minutesPlayed: match.sport === "FOOTBALL"
              ? (existingStats.get(athleteId)?.minutesPlayed ?? null)
              : derivedMinutes(formData, athleteId),
            ...(match.sport === "FOOTBALL"
              ? footballMinuteData(formData, athleteId, existingStats.get(athleteId))
              : {}),
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
