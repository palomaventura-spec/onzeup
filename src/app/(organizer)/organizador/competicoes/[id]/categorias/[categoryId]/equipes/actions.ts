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
  const result = text(value);
  return result || null;
}

export async function createCompetitionTeam(
  competitionId: string,
  categoryId: string,
  formData: FormData
) {
  const user = await requireOrganizationUser();

  if (!user.organizationId) {
    throw new Error("Usuário sem organização vinculada.");
  }

  const category =
    await prisma.competitionCategory.findFirst({
      where: {
        id: categoryId,
        competitionId,

        competition: {
          organizationId: user.organizationId,
        },
      },

      include: {
        _count: {
          select: {
            teams: true,
          },
        },
      },
    });

  if (!category) {
    throw new Error(
      "Categoria ou competição não encontrada."
    );
  }

  const name = text(formData.get("name"));

  if (name.length < 2) {
    throw new Error(
      "Informe um nome válido para a equipe."
    );
  }

  if (
    category.maxTeams !== null &&
    category._count.teams >= category.maxTeams
  ) {
    throw new Error(
      "Esta categoria já atingiu o limite máximo de equipes."
    );
  }

  const existing =
    await prisma.competitionTeam.findFirst({
      where: {
        competitionId,
        categoryId,

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
      "Já existe uma equipe com esse nome nesta categoria."
    );
  }

  await prisma.competitionTeam.create({
    data: {
      competitionId,
      categoryId,

      name,

      shortName: optionalText(
        formData.get("shortName")
      ),

      logoUrl: optionalText(
        formData.get("logoUrl")
      ),

      city: optionalText(
        formData.get("city")
      ),

      state: optionalText(
        formData.get("state")
      ),

      responsibleName: optionalText(
        formData.get("responsibleName")
      ),

      responsibleEmail: optionalText(
        formData.get("responsibleEmail")
      ),

      responsiblePhone: optionalText(
        formData.get("responsiblePhone")
      ),

      status: "APPROVED",
    },
  });

  revalidatePath(
    `/organizador/competicoes/${competitionId}`
  );

  revalidatePath(
    `/organizador/competicoes/${competitionId}/categorias`
  );

  revalidatePath(
    `/organizador/competicoes/${competitionId}/categorias/${categoryId}`
  );

  revalidatePath(
    `/organizador/competicoes/${competitionId}/equipes`
  );

  revalidatePath("/organizador/equipes");

  redirect(
    `/organizador/competicoes/${competitionId}/categorias/${categoryId}`
  );
}