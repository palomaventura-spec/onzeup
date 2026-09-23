"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  CompetitionFormat,
  SportType,
} from "@prisma/client";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function text(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function optionalText(value: FormDataEntryValue | null) {
  const result = text(value);
  return result || null;
}

function optionalInt(value: FormDataEntryValue | null) {
  const result = text(value);

  if (!result) return null;

  const parsed = Number.parseInt(result, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function optionalDate(value: FormDataEntryValue | null) {
  const result = text(value);

  if (!result) return null;

  const date = new Date(`${result}T12:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueCompetitionSlug(
  organizationId: string,
  name: string
) {
  const baseSlug = slugify(name) || `competicao-${Date.now()}`;

  let slug = baseSlug;
  let counter = 2;

  while (
    await prisma.competition.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
      select: {
        id: true,
      },
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

const allowedSports = new Set<SportType>([
  SportType.FOOTBALL,
  SportType.FUTSAL,
  SportType.BOTH,
]);

const allowedFormats = new Set<CompetitionFormat>([
  CompetitionFormat.GROUP_STAGE_KNOCKOUT,
  CompetitionFormat.ROUND_ROBIN,
  CompetitionFormat.KNOCKOUT,
  CompetitionFormat.CUSTOM,
]);

export async function createCompetition(formData: FormData) {
  const user = await requireOrganizationUser();

  if (!user.organizationId) {
    throw new Error("Usuário sem organização vinculada.");
  }

  const name = text(formData.get("name"));

  if (name.length < 3) {
    throw new Error(
      "O nome da competição deve ter pelo menos 3 caracteres."
    );
  }

  const requestedSport = text(formData.get("sport")) as SportType;
  const requestedFormat = text(
    formData.get("format")
  ) as CompetitionFormat;

  const sport = allowedSports.has(requestedSport)
    ? requestedSport
    : SportType.FOOTBALL;

  const format = allowedFormats.has(requestedFormat)
    ? requestedFormat
    : CompetitionFormat.CUSTOM;

  const startDate = optionalDate(formData.get("startDate"));
  const endDate = optionalDate(formData.get("endDate"));

  if (
    startDate &&
    endDate &&
    endDate.getTime() < startDate.getTime()
  ) {
    throw new Error(
      "A data final não pode ser anterior à data inicial."
    );
  }

  const registrationStart = optionalDate(
    formData.get("registrationStart")
  );

  const registrationEnd = optionalDate(
    formData.get("registrationEnd")
  );

  if (
    registrationStart &&
    registrationEnd &&
    registrationEnd.getTime() < registrationStart.getTime()
  ) {
    throw new Error(
      "O fim das inscrições não pode ser anterior ao início."
    );
  }

  const slug = await uniqueCompetitionSlug(
    user.organizationId,
    name
  );

  await prisma.competition.create({
    data: {
      organizationId: user.organizationId,
      name,
      slug,

      description: optionalText(
        formData.get("description")
      ),

      season: optionalText(
        formData.get("season")
      ),

      sport,
      format,

      startDate,
      endDate,
      registrationStart,
      registrationEnd,

      maxTeams: optionalInt(
        formData.get("maxTeams")
      ),

      isPublic:
        formData.get("isPublic") === "on",
    },
  });

  revalidatePath("/organizador/dashboard");
  revalidatePath("/organizador/competicoes");

  redirect("/organizador/competicoes");
}