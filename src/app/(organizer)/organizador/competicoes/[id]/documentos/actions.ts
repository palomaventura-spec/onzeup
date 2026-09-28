"use server";

import { revalidatePath } from "next/cache";

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

async function requireOwnedCompetition(
  competitionId: string,
) {
  const user = await requireOrganizationUser();

  if (!user.organizationId) {
    throw new Error(
      "Usuário sem organização vinculada.",
    );
  }

  const competition =
    await prisma.competition.findFirst({
      where: {
        id: competitionId,
        organizationId:
          user.organizationId,
      },

      select: {
        id: true,
      },
    });

  if (!competition) {
    throw new Error(
      "Competição não encontrada.",
    );
  }

  return {
    user,
    competition,
  };
}

function revalidateCompetitionDocuments(
  competitionId: string,
) {
  revalidatePath(
    `/organizador/competicoes/${competitionId}`,
  );

  revalidatePath(
    `/organizador/competicoes/${competitionId}/documentos`,
  );

  revalidatePath(
    "/organizador/competicoes",
  );
}

export async function createCompetitionDocumentRequirement(
  competitionId: string,
  formData: FormData,
) {
  await requireOwnedCompetition(
    competitionId,
  );

  const name = text(
    formData.get("name"),
  );

  const description = optionalText(
    formData.get("description"),
  );

  const required =
    formData.get("required") === "on";

  if (name.length < 2) {
    throw new Error(
      "Informe um nome válido para o documento.",
    );
  }

  const existing =
    await prisma.competitionDocumentRequirement.findFirst({
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
      "Já existe um documento com esse nome nesta competição.",
    );
  }

  const lastRequirement =
    await prisma.competitionDocumentRequirement.findFirst({
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

  await prisma.competitionDocumentRequirement.create({
    data: {
      competitionId,
      name,
      description,
      required,
      active: true,

      sortOrder:
        (lastRequirement?.sortOrder ??
          -1) + 1,
    },
  });

  revalidateCompetitionDocuments(
    competitionId,
  );
}

export async function toggleCompetitionDocumentRequirement(
  competitionId: string,
  requirementId: string,
) {
  await requireOwnedCompetition(
    competitionId,
  );

  const requirement =
    await prisma.competitionDocumentRequirement.findFirst({
      where: {
        id: requirementId,
        competitionId,
      },

      select: {
        id: true,
        active: true,
      },
    });

  if (!requirement) {
    throw new Error(
      "Documento não encontrado.",
    );
  }

  await prisma.competitionDocumentRequirement.update({
    where: {
      id: requirement.id,
    },

    data: {
      active: !requirement.active,
    },
  });

  revalidateCompetitionDocuments(
    competitionId,
  );
}

export async function deleteCompetitionDocumentRequirement(
  competitionId: string,
  requirementId: string,
) {
  await requireOwnedCompetition(
    competitionId,
  );

  const requirement =
    await prisma.competitionDocumentRequirement.findFirst({
      where: {
        id: requirementId,
        competitionId,
      },

      select: {
        id: true,

        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

  if (!requirement) {
    throw new Error(
      "Documento não encontrado.",
    );
  }

  if (
    requirement._count.documents > 0
  ) {
    throw new Error(
      "Este requisito já possui documentos enviados e não pode ser excluído. Desative-o para preservar o histórico.",
    );
  }

  await prisma.competitionDocumentRequirement.delete({
    where: {
      id: requirement.id,
    },
  });

  revalidateCompetitionDocuments(
    competitionId,
  );
}