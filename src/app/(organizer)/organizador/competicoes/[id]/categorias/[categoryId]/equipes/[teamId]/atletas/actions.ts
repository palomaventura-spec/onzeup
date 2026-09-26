"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function text(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function optionalText(value: FormDataEntryValue | null) {
  const result = text(value);

  return result || null;
}

function optionalInt(value: FormDataEntryValue | null) {
  const result = text(value);

  if (!result) {
    return null;
  }

  const parsed = Number.parseInt(result, 10);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function optionalDate(value: FormDataEntryValue | null) {
  const result = text(value);

  if (!result) {
    return null;
  }

  /*
   * Meio-dia UTC evita alterações indesejadas
   * da data por causa de timezone.
   */
  const date = new Date(
    `${result}T12:00:00.000Z`
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function createCompetitionAthlete(
  competitionId: string,
  categoryId: string,
  teamId: string,
  formData: FormData
) {
  const user =
    await requireOrganizationUser();

  if (!user.organizationId) {
    throw new Error(
      "Usuário sem organização vinculada."
    );
  }

  /*
   * Confere se:
   * - a equipe existe;
   * - pertence à categoria informada;
   * - pertence à competição informada;
   * - a competição pertence ao organizador logado.
   */
  const team =
    await prisma.competitionTeam.findFirst({
      where: {
        id: teamId,
        competitionId,
        categoryId,

        competition: {
          organizationId:
            user.organizationId,
        },
      },

      include: {
        category: true,

        _count: {
          select: {
            athletes: true,
          },
        },
      },
    });

  if (!team) {
    throw new Error(
      "Equipe, categoria ou competição não encontrada."
    );
  }

  /*
   * Respeita o limite de atletas definido
   * na categoria da competição.
   */
  if (
    team.category.rosterLimit !== null &&
    team._count.athletes >=
      team.category.rosterLimit
  ) {
    throw new Error(
      "Esta equipe já atingiu o limite máximo de atletas."
    );
  }

  const name = text(
    formData.get("name")
  );

  if (name.length < 3) {
    throw new Error(
      "Informe o nome completo do atleta."
    );
  }

  /*
   * A foto é enviada pelo componente
   * ImageUpload e chega aqui como URL.
   */
  const photoUrl = optionalText(
    formData.get("photoUrl")
  );

  const birthDate = optionalDate(
    formData.get("birthDate")
  );

  /*
   * Quando houver data de nascimento,
   * valida também o enquadramento na categoria.
   */
  if (birthDate) {
    const birthYear =
      birthDate.getUTCFullYear();

    if (
      team.category.birthYearFrom !== null &&
      birthYear <
        team.category.birthYearFrom
    ) {
      throw new Error(
        `O atleta não atende ao ano mínimo da categoria ${team.category.name}.`
      );
    }

    if (
      team.category.birthYearTo !== null &&
      birthYear >
        team.category.birthYearTo
    ) {
      throw new Error(
        `O atleta não atende ao ano máximo da categoria ${team.category.name}.`
      );
    }
  }

  const jerseyNumber = optionalInt(
    formData.get("jerseyNumber")
  );

  if (
    jerseyNumber !== null &&
    (jerseyNumber < 0 ||
      jerseyNumber > 999)
  ) {
    throw new Error(
      "Informe um número de camisa válido."
    );
  }

  const position = optionalText(
    formData.get("position")
  );

  /*
   * Evita duplicação dentro da mesma
   * equipe da competição.
   *
   * Havendo nascimento, compara nome +
   * nascimento.
   *
   * Sem nascimento, compara pelo nome.
   */
  const duplicate =
    await prisma.competitionAthlete.findFirst({
      where: {
        teamId,

        name: {
          equals: name,
          mode: "insensitive",
        },

        ...(birthDate
          ? {
              birthDate,
            }
          : {}),
      },

      select: {
        id: true,
      },
    });

  if (duplicate) {
    throw new Error(
      "Este atleta já está cadastrado nesta equipe."
    );
  }

  /*
   * Cadastro manual do Organizador.
   *
   * No futuro, atletas compartilhados pelo
   * 11Up Club usarão:
   *
   * source: "CLUB_SHARED"
   * sourceAthleteId: id do Athlete original
   *
   * O restante continuará salvo como snapshot
   * oficial da inscrição na competição.
   */
  await prisma.competitionAthlete.create({
    data: {
      teamId,

      source: "MANUAL",
      sourceAthleteId: null,
      sourceSnapshotAt: null,

      name,
      photoUrl,
      birthDate,
      jerseyNumber,
      position,

      status: "APPROVED",
    },
  });

  /*
   * Atualiza todas as telas que podem
   * mostrar contagem ou dados desse atleta.
   */
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
    `/organizador/competicoes/${competitionId}/categorias/${categoryId}/equipes/${teamId}`
  );

  revalidatePath(
    "/organizador/atletas"
  );

  /*
   * Depois do cadastro, volta para
   * a página interna da equipe.
   */
  redirect(
    `/organizador/competicoes/${competitionId}/categorias/${categoryId}/equipes/${teamId}`
  );
}