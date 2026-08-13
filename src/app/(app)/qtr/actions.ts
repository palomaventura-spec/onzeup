"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();

type QtrEvent = {
  type: "TRAINING" | "MATCH" | "FRIENDLY" | "EVENT" | "OTHER";
  title: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  notes?: string;
};

type QtrRow = {
  category: string;
  birthYear?: number | null;
  mon: QtrEvent[];
  tue: QtrEvent[];
  wed: QtrEvent[];
  thu: QtrEvent[];
  fri: QtrEvent[];
  sat: QtrEvent[];
  sun: QtrEvent[];
};

function blankRow(category = "", birthYear: number | null = null): QtrRow {
  return {
    category,
    birthYear,
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };
}

function normalizeRows(raw: unknown): QtrRow[] {
  if (!Array.isArray(raw)) return [];

  const keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

  return raw
    .map((row: any) => {
      const normalized = blankRow(clean(row?.category), row?.birthYear ?? null);
      for (const key of keys) {
        const value = row?.[key];
        if (Array.isArray(value)) {
          normalized[key] = value
            .filter(Boolean)
            .map((event: any) => ({
              type: ["TRAINING", "MATCH", "FRIENDLY", "EVENT", "OTHER"].includes(event?.type)
                ? event.type
                : "OTHER",
              title: clean(event?.title),
              startTime: clean(event?.startTime) || undefined,
              endTime: clean(event?.endTime) || undefined,
              location: clean(event?.location) || undefined,
              notes: clean(event?.notes) || undefined,
            }))
            .filter((event: QtrEvent) => event.title || event.startTime || event.location);
        } else if (typeof value === "string" && value.trim()) {
          // Backward compatibility with the first v0.9.1 QTR format.
          normalized[key] = [{ type: "OTHER", title: value.trim() }];
        }
      }
      return normalized;
    })
    .filter((row) => row.category);

}

export async function saveQtr(formData: FormData) {
  const user = await requireOrganizationUser();
  const weekStart = clean(formData.get("weekStart"));
  const data = clean(formData.get("qtrData"));

  if (!weekStart || !data) return;

  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return;
  }

  const rows = normalizeRows(parsed);

  await prisma.qtr.upsert({
    where: {
      organizationId_weekStart: {
        organizationId: user.organizationId,
        weekStart: new Date(`${weekStart}T12:00:00`),
      },
    },
    update: {
      dataJson: JSON.stringify(rows),
      title: "QTR semanal",
    },
    create: {
      organizationId: user.organizationId,
      weekStart: new Date(`${weekStart}T12:00:00`),
      title: "QTR semanal",
      dataJson: JSON.stringify(rows),
    },
  });

  revalidatePath("/qtr");
}

export async function generateQtr(formData: FormData) {
  const user = await requireOrganizationUser();
  const weekStart = clean(formData.get("weekStart"));
  if (!weekStart) return;

  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId },
    include: {
      trainingSchedules: true,
      matches: {
        where: {
          startsAt: {
            gte: start,
            lt: end,
          },
        },
      },
    },
    orderBy: [{ birthYear: "desc" }, { name: "asc" }],
  });

  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

  const rows: QtrRow[] = categories.map((category) => {
    const row = blankRow(category.name, category.birthYear);

    for (const training of category.trainingSchedules) {
      const key = dayKeys[training.weekday];
      row[key].push({
        type: "TRAINING",
        title: "Treino",
        startTime: training.startTime,
        endTime: training.endTime,
        location: training.location ?? undefined,
        notes: training.notes ?? undefined,
      });
    }

    for (const match of category.matches) {
      const key = dayKeys[match.startsAt.getDay()];
      const competition = (match.competition || "").toLowerCase();
      const friendly = competition.includes("amistoso");

      row[key].push({
        type: friendly ? "FRIENDLY" : "MATCH",
        title: friendly ? `Amistoso × ${match.opponent}` : `Jogo × ${match.opponent}`,
        startTime: match.startsAt.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        location: match.location ?? undefined,
        notes: match.competition ?? undefined,
      });
    }

    return row;
  });

  await prisma.qtr.upsert({
    where: {
      organizationId_weekStart: {
        organizationId: user.organizationId,
        weekStart: new Date(`${weekStart}T12:00:00`),
      },
    },
    update: {
      dataJson: JSON.stringify(rows),
      title: "QTR semanal",
    },
    create: {
      organizationId: user.organizationId,
      weekStart: new Date(`${weekStart}T12:00:00`),
      title: "QTR semanal",
      dataJson: JSON.stringify(rows),
    },
  });

  revalidatePath("/qtr");
}

export async function duplicatePreviousQtr(formData: FormData) {
  const user = await requireOrganizationUser();
  const weekStart = clean(formData.get("weekStart"));
  if (!weekStart) return;

  const target = new Date(`${weekStart}T12:00:00`);
  const previous = new Date(target);
  previous.setDate(previous.getDate() - 7);

  const previousQtr = await prisma.qtr.findUnique({
    where: {
      organizationId_weekStart: {
        organizationId: user.organizationId,
        weekStart: previous,
      },
    },
  });

  if (!previousQtr) return;

  await prisma.qtr.upsert({
    where: {
      organizationId_weekStart: {
        organizationId: user.organizationId,
        weekStart: target,
      },
    },
    update: {
      title: "QTR semanal",
      dataJson: previousQtr.dataJson,
    },
    create: {
      organizationId: user.organizationId,
      weekStart: target,
      title: "QTR semanal",
      dataJson: previousQtr.dataJson,
    },
  });

  revalidatePath("/qtr");
}
