"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function text(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function optionalText(value: FormDataEntryValue | null) {
  const valueText = text(value);
  return valueText || null;
}

function optionalInt(value: FormDataEntryValue | null) {
  const valueText = text(value);

  if (!valueText) return null;

  const parsed = Number.parseInt(valueText, 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function positiveInt(
  value: FormDataEntryValue | null,
  fallback: number
) {
  const parsed = optionalInt(value);

  if (parsed === null || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export async function createCompetitionCategory(
  competitionId: string,
  formData: FormData
) {
  const user = await requireOrganizationUser();

  if (!user.organizationId) {
    throw new Error("Usuário sem organização vinculada.");
  }

  const competition = await prisma.competition.findFirst({
    where: {
      id: competitionId,
      organizationId: user.organizationId,
    },

    select: {
      id: true,
    },
  });

  if (!competition) {
    throw new Error("Competição não encontrada.");
  }

  const name = text(formData.get("name"));

  if (name.length < 2) {
    throw new Error(
      "Informe um nome válido para a categoria."
    );
  }

  const existing = await prisma.competitionCategory.findFirst({
    where: {
      competitionId,
      name: {
        equals: name,
        mode: "insensitive",
      },
    },

    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error(
      "Já existe uma categoria com esse nome nesta competição."
    );
  }

  const birthYearFrom = optionalInt(
    formData.get("birthYearFrom")
  );

  const birthYearTo = optionalInt(
    formData.get("birthYearTo")
  );

  if (
    birthYearFrom !== null &&
    birthYearTo !== null &&
    birthYearTo < birthYearFrom
  ) {
    throw new Error(
      "O ano final não pode ser menor que o ano inicial."
    );
  }

  const lastCategory =
    await prisma.competitionCategory.findFirst({
      where: {
        competitionId,
      },

      orderBy: {
        sortOrder: "desc",
      },

      select: {
        sortOrder: true,
      },
    });

  await prisma.competitionCategory.create({
    data: {
      competitionId,

      name,

      code: optionalText(
        formData.get("code")
      ),

      birthYearFrom,
      birthYearTo,

      maxTeams: optionalInt(
        formData.get("maxTeams")
      ),

      rosterLimit: optionalInt(
        formData.get("rosterLimit")
      ),

      matchDurationMinutes: positiveInt(
        formData.get("matchDurationMinutes"),
        20
      ),

      transitionMinutes: positiveInt(
        formData.get("transitionMinutes"),
        5
      ),

      sortOrder:
        (lastCategory?.sortOrder ?? -1) + 1,

      active: true,
    },
  });

  revalidatePath(
    `/organizador/competicoes/${competitionId}`
  );

  revalidatePath(
    `/organizador/competicoes/${competitionId}/categorias`
  );

  revalidatePath("/organizador/competicoes");

  redirect(
    `/organizador/competicoes/${competitionId}/categorias`
  );
}