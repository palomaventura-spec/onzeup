"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
    update: { dataJson: JSON.stringify(rows), title: "QTR semanal" },
    create: {
      organizationId: user.organizationId,
      weekStart: new Date(`${weekStart}T12:00:00`),
      title: "QTR semanal",
      dataJson: JSON.stringify(rows),
    },
  });

  revalidatePath("/qtr");
  redirect(`/qtr?week=${encodeURIComponent(weekStart)}&salvo=1`);
}

export async function generateQtr(formData: FormData) {
  const user = await requireOrganizationUser();
  const weekStart = clean(formData.get("weekStart"));
  if (!weekStart) redirect("/qtr?erro=sem-semana");

  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ birthYear: "desc" }, { name: "asc" }],
  });

  const trainings = await prisma.trainingSchedule.findMany({
    where: {
      organizationId: user.organizationId,
      OR: [{ date: { gte: start, lt: end } }, { date: null }],
    },
    orderBy: [{ startTime: "asc" }],
  });

  const matches = await prisma.match.findMany({
    where: {
      organizationId: user.organizationId,
      startsAt: { gte: start, lt: end },
    },
    orderBy: [{ startsAt: "asc" }],
  });

  const dayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const rowsByCategory = new Map<string, QtrRow>();

  for (const category of categories) {
    rowsByCategory.set(category.id, blankRow(category.name, category.birthYear));
  }

  for (const training of trainings) {
    const row = rowsByCategory.get(training.categoryId);
    if (!row) continue;

    const weekday = training.date ? training.date.getDay() : training.weekday;
    const key = dayKeys[weekday];
    if (!key) continue;

    row[key].push({
      type: "TRAINING",
      title: "Treino",
      startTime: training.startTime,
      endTime: training.endTime,
      location: training.location ?? undefined,
      notes: training.notes ?? undefined,
    });
  }

  for (const match of matches) {
    const row = rowsByCategory.get(match.categoryId);
    if (!row) continue;

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

  const rows = categories.map((category) => rowsByCategory.get(category.id)!);

  await prisma.qtr.upsert({
    where: {
      organizationId_weekStart: {
        organizationId: user.organizationId,
        weekStart: new Date(`${weekStart}T12:00:00`),
      },
    },
    update: { dataJson: JSON.stringify(rows), title: "QTR semanal" },
    create: {
      organizationId: user.organizationId,
      weekStart: new Date(`${weekStart}T12:00:00`),
      title: "QTR semanal",
      dataJson: JSON.stringify(rows),
    },
  });

  revalidatePath("/qtr");
  redirect(`/qtr?week=${encodeURIComponent(weekStart)}&gerado=1`);
}
