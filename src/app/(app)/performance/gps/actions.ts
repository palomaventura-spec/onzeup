"use server";

import {
  GpsContext,
  GpsDataSource,
  SportType,
  type Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { hasEffectiveClubElite } from "@/lib/billing-entitlements";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const result = clean(value);
  return result || null;
}

function optionalNumber(value: FormDataEntryValue | null | string | undefined) {
  const raw = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  if (!raw) return null;

  const number = Number(raw);
  return Number.isFinite(number) ? number : null;
}

function optionalInt(value: FormDataEntryValue | null | string | undefined) {
  const number = optionalNumber(value);
  if (number === null) return null;
  return Number.isInteger(number) ? number : null;
}

function activityDate(value: FormDataEntryValue | null | string | undefined) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) {
    const [, day, month, year] = br;
    const date = new Date(`${year}-${month}-${day}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSport(value: FormDataEntryValue | null) {
  const raw = clean(value);

  if (raw === SportType.FOOTBALL) return SportType.FOOTBALL;
  if (raw === SportType.FUTSAL) return SportType.FUTSAL;

  return null;
}

function parseContext(value: FormDataEntryValue | null) {
  const raw = clean(value);

  if (raw === GpsContext.TRAINING) return GpsContext.TRAINING;
  if (raw === GpsContext.MATCH) return GpsContext.MATCH;

  return null;
}

function gpsUrl(
  sport: SportType | null,
  suffix = "",
) {
  const params = new URLSearchParams();

  if (sport) params.set("sport", sport);

  if (suffix) {
    for (const [key, value] of new URLSearchParams(suffix)) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `/performance/gps?${query}` : "/performance/gps";
}

async function requireEliteGps() {
  const user = await requireClubPermission("GPS_MANAGE");

  const [subscription, organization] = await Promise.all([
    prisma.subscription.findUnique({
      where: {
        organizationId: user.organizationId,
      },
    }),
    prisma.organization.findUnique({
      where: {
        id: user.organizationId,
      },
      select: {
        accessStatus: true,
        complimentaryUntil: true,
      },
    }),
  ]);

  const elite = hasEffectiveClubElite({
    plan: subscription?.plan,
    status: subscription?.status,
    trialEnds: subscription?.trialEnds,
    currentPeriodEnd: subscription?.currentPeriodEnd,
    accessStatus: organization?.accessStatus,
    complimentaryUntil: organization?.complimentaryUntil,
  });

  if (!elite) {
    redirect("/performance?erro=elite");
  }

  return user;
}

async function validateAthleteForSport({
  organizationId,
  athleteId,
  sport,
}: {
  organizationId: string;
  athleteId: string;
  sport: SportType;
}) {
  return prisma.athlete.findFirst({
    where: {
      id: athleteId,
      organizationId,
      active: true,
      OR: [
        {
          category: {
            sport,
            active: true,
            type: "STANDARD",
          },
        },
        {
          memberships: {
            some: {
              organizationId,
              sport,
              status: "ACTIVE",
              category: {
                sport,
                active: true,
                type: "STANDARD",
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      categoryId: true,
    },
  });
}

async function validateActivityLink({
  organizationId,
  context,
  sport,
  trainingSessionId,
  matchId,
}: {
  organizationId: string;
  context: GpsContext;
  sport: SportType;
  trainingSessionId: string | null;
  matchId: string | null;
}) {
  if (context === GpsContext.TRAINING && trainingSessionId) {
    const session = await prisma.trainingSession.findFirst({
      where: {
        id: trainingSessionId,
        organizationId,
        category: {
          sport,
        },
        OR: [
          { sport },
          { sport: SportType.BOTH },
        ],
      },
      select: {
        id: true,
        startsAt: true,
      },
    });

    return session
      ? {
          trainingSessionId: session.id,
          matchId: null,
          activityAt: session.startsAt,
        }
      : null;
  }

  if (context === GpsContext.MATCH && matchId) {
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        organizationId,
        sport,
      },
      select: {
        id: true,
        startsAt: true,
      },
    });

    return match
      ? {
          trainingSessionId: null,
          matchId: match.id,
          activityAt: match.startsAt,
        }
      : null;
  }

  return {
    trainingSessionId: null,
    matchId: null,
    activityAt: null,
  };
}

function validateNumbers(values: Array<number | null>) {
  return !values.some(
    (value) => value !== null && value < 0,
  );
}

export async function createClubManualGpsRecord(
  formData: FormData,
) {
  const user = await requireEliteGps();

  const sport = parseSport(formData.get("sport"));
  const context = parseContext(formData.get("context"));
  const athleteId = clean(formData.get("athleteId"));
  const rawActivityAt = activityDate(formData.get("activityAt"));
  const trainingSessionId = nullable(
    formData.get("trainingSessionId"),
  );
  const matchId = nullable(formData.get("matchId"));

  if (!sport || !context || !athleteId || !rawActivityAt) {
    redirect(gpsUrl(sport, "erro=dados"));
  }

  const [athlete, activityLink] = await Promise.all([
    validateAthleteForSport({
      organizationId: user.organizationId,
      athleteId,
      sport,
    }),
    validateActivityLink({
      organizationId: user.organizationId,
      context,
      sport,
      trainingSessionId,
      matchId,
    }),
  ]);

  if (!athlete) {
    redirect(gpsUrl(sport, "erro=atleta"));
  }

  if (!activityLink) {
    redirect(gpsUrl(sport, "erro=vinculo"));
  }

  const durationMinutes = optionalInt(
    formData.get("durationMinutes"),
  );
  const distanceMeters = optionalNumber(
    formData.get("distanceMeters"),
  );
  const maxSpeedKmh = optionalNumber(
    formData.get("maxSpeedKmh"),
  );
  const averageSpeedKmh = optionalNumber(
    formData.get("averageSpeedKmh"),
  );
  const sprintCount = optionalInt(
    formData.get("sprintCount"),
  );
  const highIntensityDistanceMeters = optionalNumber(
    formData.get("highIntensityDistanceMeters"),
  );
  const accelerations = optionalInt(
    formData.get("accelerations"),
  );
  const decelerations = optionalInt(
    formData.get("decelerations"),
  );
  const playerLoad = optionalNumber(
    formData.get("playerLoad"),
  );

  if (
    !validateNumbers([
      durationMinutes,
      distanceMeters,
      maxSpeedKmh,
      averageSpeedKmh,
      sprintCount,
      highIntensityDistanceMeters,
      accelerations,
      decelerations,
      playerLoad,
    ])
  ) {
    redirect(gpsUrl(sport, "erro=valores"));
  }

  const data = {
    organizationId: user.organizationId,
    athleteId: athlete.id,
    recordedByUserId: user.id,
    sport,
    context,
    source: GpsDataSource.MANUAL,
    activityAt:
      activityLink.activityAt ?? rawActivityAt,
    trainingSessionId:
      context === GpsContext.TRAINING
        ? activityLink.trainingSessionId
        : null,
    matchId:
      context === GpsContext.MATCH
        ? activityLink.matchId
        : null,
    durationMinutes,
    distanceMeters,
    maxSpeedKmh,
    averageSpeedKmh,
    sprintCount,
    highIntensityDistanceMeters,
    accelerations,
    decelerations,
    playerLoad,
    notes: nullable(formData.get("notes")),
  };

  if (
    context === GpsContext.TRAINING &&
    data.trainingSessionId
  ) {
    const existing =
      await prisma.athleteGpsRecord.findFirst({
        where: {
          organizationId: user.organizationId,
          athleteId: athlete.id,
          trainingSessionId: data.trainingSessionId,
        },
        select: { id: true },
      });

    if (existing) {
      await prisma.athleteGpsRecord.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.athleteGpsRecord.create({
        data,
      });
    }
  } else if (
    context === GpsContext.MATCH &&
    data.matchId
  ) {
    const existing =
      await prisma.athleteGpsRecord.findFirst({
        where: {
          organizationId: user.organizationId,
          athleteId: athlete.id,
          matchId: data.matchId,
        },
        select: { id: true },
      });

    if (existing) {
      await prisma.athleteGpsRecord.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.athleteGpsRecord.create({
        data,
      });
    }
  } else {
    await prisma.athleteGpsRecord.create({
      data,
    });
  }

  revalidatePath("/performance");
  revalidatePath("/performance/gps");
  revalidatePath(
    `/atletas/${athlete.id}/performance/gps`,
  );

  redirect(gpsUrl(sport, "ok=gps-salvo"));
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizePerson(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function splitCsvLine(line: string, delimiter: string) {
  const result: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (char === delimiter && !quoted) {
      result.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current.trim());
  return result;
}

function detectDelimiter(header: string) {
  const options = [";", ",", "\t"];
  return options.sort(
    (a, b) =>
      header.split(b).length -
      header.split(a).length,
  )[0];
}

function parseCsv(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim());

  if (lines.length < 2) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(
    lines[0],
    delimiter,
  ).map(normalizeHeader);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line, delimiter);
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });

    return row;
  });
}

function firstValue(
  row: Record<string, string>,
  aliases: string[],
) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)];
    if (value?.trim()) return value.trim();
  }

  return "";
}

function rowMetric(
  row: Record<string, string>,
  aliases: string[],
) {
  return optionalNumber(
    firstValue(row, aliases),
  );
}

function rowInt(
  row: Record<string, string>,
  aliases: string[],
) {
  return optionalInt(
    firstValue(row, aliases),
  );
}

export async function importClubGpsCsv(
  formData: FormData,
) {
  const user = await requireEliteGps();

  const sport = parseSport(formData.get("sport"));
  const context = parseContext(formData.get("context"));
  const categoryId = clean(formData.get("categoryId"));
  const fallbackActivityAt = activityDate(
    formData.get("activityAt"),
  );
  const trainingSessionId = nullable(
    formData.get("trainingSessionId"),
  );
  const matchId = nullable(formData.get("matchId"));
  const file = formData.get("file");

  if (
    !sport ||
    !context ||
    !categoryId ||
    !fallbackActivityAt ||
    !(file instanceof File) ||
    !file.name.toLowerCase().endsWith(".csv") ||
    file.size <= 0
  ) {
    redirect(gpsUrl(sport, "erro=arquivo"));
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId: user.organizationId,
      active: true,
      type: "STANDARD",
      sport,
    },
    select: { id: true },
  });

  if (!category) {
    redirect(gpsUrl(sport, "erro=categoria"));
  }

  const activityLink = await validateActivityLink({
    organizationId: user.organizationId,
    context,
    sport,
    trainingSessionId,
    matchId,
  });

  if (!activityLink) {
    redirect(gpsUrl(sport, "erro=vinculo"));
  }

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      OR: [
        {
          categoryId,
        },
        {
          memberships: {
            some: {
              organizationId: user.organizationId,
              categoryId,
              sport,
              status: "ACTIVE",
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      nickname: true,
    },
  });

  const athleteLookup = new Map<
    string,
    Array<{ id: string; name: string }>
  >();

  for (const athlete of athletes) {
    for (const label of [
      athlete.name,
      athlete.nickname,
    ]) {
      if (!label) continue;

      const key = normalizePerson(label);
      const current = athleteLookup.get(key) ?? [];
      current.push({
        id: athlete.id,
        name: athlete.name,
      });
      athleteLookup.set(key, current);
    }
  }

  const rows = parseCsv(await file.text());

  let imported = 0;
  let ignored = 0;

  for (const row of rows) {
    const athleteLabel = firstValue(row, [
      "atleta",
      "athlete",
      "nome",
      "name",
      "jogador",
      "player",
      "apelido",
      "nickname",
    ]);

    const matches = athleteLookup.get(
      normalizePerson(athleteLabel),
    );

    if (!athleteLabel || !matches || matches.length !== 1) {
      ignored += 1;
      continue;
    }

    const durationMinutes = rowInt(row, [
      "minutos",
      "durationminutes",
      "duration",
      "duracao",
      "tempo",
    ]);
    const distanceMeters = rowMetric(row, [
      "distanciam",
      "distanciametros",
      "distancetotal",
      "distancetotalm",
      "distancemeters",
      "distance",
    ]);
    const maxSpeedKmh = rowMetric(row, [
      "velocidademaxima",
      "velocidademaximakmh",
      "maxspeed",
      "maxspeedkmh",
      "topspeed",
    ]);
    const averageSpeedKmh = rowMetric(row, [
      "velocidademedia",
      "velocidademediakmh",
      "averagespeed",
      "averagespeedkmh",
    ]);
    const sprintCount = rowInt(row, [
      "sprints",
      "sprintcount",
      "numsprints",
    ]);
    const highIntensityDistanceMeters = rowMetric(
      row,
      [
        "altaintensidade",
        "distanciaaltaintensidade",
        "highintensitydistance",
        "highintensitydistancemeters",
        "hidistance",
      ],
    );
    const accelerations = rowInt(row, [
      "aceleracoes",
      "accelerations",
    ]);
    const decelerations = rowInt(row, [
      "desaceleracoes",
      "decelerations",
    ]);
    const playerLoad = rowMetric(row, [
      "playerload",
      "carga",
      "load",
    ]);

    if (
      !validateNumbers([
        durationMinutes,
        distanceMeters,
        maxSpeedKmh,
        averageSpeedKmh,
        sprintCount,
        highIntensityDistanceMeters,
        accelerations,
        decelerations,
        playerLoad,
      ])
    ) {
      ignored += 1;
      continue;
    }

    const rowActivityAt =
      activityDate(
        firstValue(row, [
          "data",
          "date",
          "activityat",
          "datadaatividade",
        ]),
      ) ??
      activityLink.activityAt ??
      fallbackActivityAt;

    const data = {
      organizationId: user.organizationId,
      athleteId: matches[0].id,
      recordedByUserId: user.id,
      sport,
      context,
      source: GpsDataSource.CSV,
      activityAt: rowActivityAt,
      trainingSessionId:
        context === GpsContext.TRAINING
          ? activityLink.trainingSessionId
          : null,
      matchId:
        context === GpsContext.MATCH
          ? activityLink.matchId
          : null,
      durationMinutes,
      distanceMeters,
      maxSpeedKmh,
      averageSpeedKmh,
      sprintCount,
      highIntensityDistanceMeters,
      accelerations,
      decelerations,
      playerLoad,
      sourceFileName: file.name,
      rawData: row as Prisma.InputJsonObject,
    };

    if (
      context === GpsContext.TRAINING &&
      data.trainingSessionId
    ) {
      const existing =
        await prisma.athleteGpsRecord.findFirst({
          where: {
            organizationId:
              user.organizationId,
            athleteId: data.athleteId,
            trainingSessionId:
              data.trainingSessionId,
          },
          select: { id: true },
        });

      if (existing) {
        await prisma.athleteGpsRecord.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.athleteGpsRecord.create({
          data,
        });
      }
    } else if (
      context === GpsContext.MATCH &&
      data.matchId
    ) {
      const existing =
        await prisma.athleteGpsRecord.findFirst({
          where: {
            organizationId:
              user.organizationId,
            athleteId: data.athleteId,
            matchId: data.matchId,
          },
          select: { id: true },
        });

      if (existing) {
        await prisma.athleteGpsRecord.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.athleteGpsRecord.create({
          data,
        });
      }
    } else {
      await prisma.athleteGpsRecord.create({
        data,
      });
    }

    imported += 1;
  }

  revalidatePath("/performance");
  revalidatePath("/performance/gps");

  redirect(
    gpsUrl(
      sport,
      `ok=importado&importados=${imported}&ignorados=${ignored}`,
    ),
  );
}
