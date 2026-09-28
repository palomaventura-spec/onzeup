"use server";

import crypto from "crypto";

import { revalidatePath } from "next/cache";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function text(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim();
}

type AthleteScope = {
  competitionId: string;
  categoryId: string;
  teamId: string;
  athleteId: string;
};

function athletePath(scope: AthleteScope) {
  return (
    `/organizador/competicoes/${scope.competitionId}` +
    `/categorias/${scope.categoryId}` +
    `/equipes/${scope.teamId}` +
    `/atletas/${scope.athleteId}`
  );
}

async function requireOwnedAthlete(
  scope: AthleteScope,
) {
  const user =
    await requireOrganizationUser();

  if (!user.organizationId) {
    throw new Error(
      "Usuário sem organização vinculada.",
    );
  }

  const athlete =
    await prisma.competitionAthlete.findFirst({
      where: {
        id: scope.athleteId,
        teamId: scope.teamId,

        team: {
          categoryId:
            scope.categoryId,

          competitionId:
            scope.competitionId,

          competition: {
            organizationId:
              user.organizationId,
          },
        },
      },

      select: {
        id: true,
      },
    });

  if (!athlete) {
    throw new Error(
      "Atleta da competição não encontrado.",
    );
  }

  return {
    user,
    athlete,
  };
}

async function syncCredential(
  scope: AthleteScope,
) {
  const activeRequired =
    await prisma.competitionDocumentRequirement.findMany({
      where: {
        competitionId:
          scope.competitionId,
        active: true,
        required: true,
      },

      select: {
        id: true,
      },
    });

  let complete = true;

  if (activeRequired.length) {
    const approved =
      await prisma.competitionAthleteDocument.findMany({
        where: {
          athleteId:
            scope.athleteId,

          requirementId: {
            in: activeRequired.map(
              (item) => item.id,
            ),
          },

          status: "APPROVED",
        },

        select: {
          requirementId: true,
        },

        distinct: [
          "requirementId",
        ],
      });

    complete =
      approved.length ===
      activeRequired.length;
  }

  const existing =
    await prisma.competitionAthleteCredential.findUnique({
      where: {
        athleteId:
          scope.athleteId,
      },

      select: {
        id: true,
        code: true,
        status: true,
      },
    });

  if (complete) {
    await prisma.competitionAthleteCredential.upsert({
      where: {
        athleteId:
          scope.athleteId,
      },

      create: {
        athleteId:
          scope.athleteId,

        code:
          `11UP-${crypto
            .randomUUID()
            .replace(/-/g, "")
            .slice(0, 12)
            .toUpperCase()}`,

        status: "ACTIVE",
        issuedAt: new Date(),
      },

      update: {
        status: "ACTIVE",

        issuedAt:
          existing?.status ===
          "ACTIVE"
            ? undefined
            : new Date(),

        revokedAt: null,
        suspendedAt: null,

        code:
          existing?.code ||
          `11UP-${crypto
            .randomUUID()
            .replace(/-/g, "")
            .slice(0, 12)
            .toUpperCase()}`,
      },
    });

    return;
  }

  if (!existing) {
    await prisma.competitionAthleteCredential.create({
      data: {
        athleteId:
          scope.athleteId,

        status: "DRAFT",
      },
    });

    return;
  }

  if (
    existing.status ===
    "ACTIVE"
  ) {
    await prisma.competitionAthleteCredential.update({
      where: {
        athleteId:
          scope.athleteId,
      },

      data: {
        status: "DRAFT",
      },
    });
  }
}

export async function submitCompetitionAthleteDocument(
  scope: AthleteScope,
  requirementId: string,
  formData: FormData,
) {
  await requireOwnedAthlete(
    scope,
  );

  const requirement =
    await prisma.competitionDocumentRequirement.findFirst({
      where: {
        id: requirementId,

        competitionId:
          scope.competitionId,

        active: true,
      },

      select: {
        id: true,
      },
    });

  if (!requirement) {
    throw new Error(
      "Requisito documental não encontrado.",
    );
  }

  const fileUrl =
    text(
      formData.get("fileUrl"),
    );

  const pathname =
    text(
      formData.get("pathname"),
    );

  const fileName =
    text(
      formData.get("fileName"),
    );

  const mimeType =
    text(
      formData.get("mimeType"),
    );

  if (
    !fileUrl ||
    !pathname ||
    !fileName ||
    !mimeType
  ) {
    throw new Error(
      "Envie o documento antes de salvar.",
    );
  }

  await prisma.competitionAthleteDocument.create({
    data: {
      athleteId:
        scope.athleteId,

      requirementId,

      source:
        "MANUAL_UPLOAD",

      status:
        "PENDING",

      fileUrl,
      fileName,
      mimeType,

      sourceReferenceId:
        pathname,
    },
  });

  await syncCredential(
    scope,
  );

  revalidatePath(
    athletePath(scope),
  );
}

export async function reviewCompetitionAthleteDocument(
  scope: AthleteScope,
  documentId: string,
  formData: FormData,
) {
  const { user } =
    await requireOwnedAthlete(
      scope,
    );

  const document =
    await prisma.competitionAthleteDocument.findFirst({
      where: {
        id: documentId,

        athleteId:
          scope.athleteId,

        requirement: {
          competitionId:
            scope.competitionId,
        },
      },

      select: {
        id: true,
      },
    });

  if (!document) {
    throw new Error(
      "Documento não encontrado.",
    );
  }

  const status =
    text(
      formData.get("status"),
    );

  if (
    ![
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
    ].includes(status)
  ) {
    throw new Error(
      "Status de revisão inválido.",
    );
  }

  const reviewNotes =
    text(
      formData.get(
        "reviewNotes",
      ),
    );

  await prisma.competitionAthleteDocument.update({
    where: {
      id: document.id,
    },

    data: {
      status:
        status as
          | "UNDER_REVIEW"
          | "APPROVED"
          | "REJECTED",

      reviewNotes:
        reviewNotes || null,

      reviewedAt:
        status ===
        "UNDER_REVIEW"
          ? null
          : new Date(),

      reviewedByUserId:
        status ===
        "UNDER_REVIEW"
          ? null
          : user.id,
    },
  });

  await syncCredential(
    scope,
  );

  revalidatePath(
    athletePath(scope),
  );
}