"use server";

import {
  AthleteDataAuditAction,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const v = clean(value);
  return v || null;
}

function nullableNumber(value: FormDataEntryValue | null) {
  const raw = clean(value);
  if (!raw) return null;

  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function requestedEntryType(
  value: FormDataEntryValue | null,
): "STANDARD" | "EVALUATION" {
  return clean(value) === "EVALUATION"
    ? "EVALUATION"
    : "STANDARD";
}

async function validateCategory(
  categoryId: string | null,
  organizationId: string,
  expectedType?: "STANDARD" | "EVALUATION",
) {
  if (!categoryId) return null;

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId,
      ...(expectedType ? { type: expectedType } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      accentColor: true,
    },
  });

  return category ?? null;
}

async function syncSportRegistration(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    athleteId: string;
    sport: "FOOTBALL" | "FUTSAL";
    authorityType: "FEDERATION" | "CBF";
    authorityName: string | null;
    registrationNumber: string | null;
  },
) {
  const number =
    input.registrationNumber?.trim() || null;

  if (!number) {
    await tx.athleteSportRegistration.deleteMany({
      where: {
        athleteId: input.athleteId,
        organizationId: input.organizationId,
        sport: input.sport,
        authorityType: input.authorityType,
      },
    });

    return;
  }

  await tx.athleteSportRegistration.upsert({
    where: {
      athleteId_sport_authorityType: {
        athleteId: input.athleteId,
        sport: input.sport,
        authorityType: input.authorityType,
      },
    },
    create: {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      sport: input.sport,
      authorityType: input.authorityType,
      authorityName:
        input.authorityType === "CBF"
          ? "CBF"
          : input.authorityName,
      registrationNumber: number,
      status: "ACTIVE",
    },
    update: {
      authorityName:
        input.authorityType === "CBF"
          ? "CBF"
          : input.authorityName,
      registrationNumber: number,
      status: "ACTIVE",
    },
  });
}
function categoryEvent(
  fromType: "STANDARD" | "EVALUATION" | null,
  toType: "STANDARD" | "EVALUATION" | null,
) {
  if (fromType === "EVALUATION" && toType === "STANDARD") {
    return "EVALUATION_APPROVED";
  }

  if (toType === "EVALUATION" && fromType !== "EVALUATION") {
    return "EVALUATION_ENTRY";
  }

  if (fromType === "EVALUATION" && toType === "EVALUATION") {
    return "EVALUATION_TRANSFER";
  }

  if (fromType === "STANDARD" && toType === "STANDARD") {
    return "CATEGORY_TRANSFER";
  }

  if (toType === null) {
    return "CATEGORY_REMOVAL";
  }

  return "CATEGORY_ASSIGNMENT";
}

export async function createAthlete(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const name = clean(formData.get("name"));
  const nickname = nullable(formData.get("nickname"));
  const jerseyNumber = nullableNumber(formData.get("jerseyNumber"));
  const position = nullable(formData.get("position"));
  const dominantFoot = nullable(formData.get("dominantFoot"));
  const birthYear = nullableNumber(formData.get("birthYear"));
  const photoUrl = nullable(formData.get("photoUrl"));

  const guardianName = nullable(formData.get("guardianName"));
  const guardianRelation = nullable(formData.get("guardianRelation"));
  const guardianPhone = nullable(formData.get("guardianPhone"));
  const guardianEmail = nullable(formData.get("guardianEmail"));

  const futsalFederationName = nullable(
    formData.get("futsalFederationName"),
  );
  const futsalFederationNumber = nullable(
    formData.get("futsalFederationNumber"),
  );
  const footballFederationName = nullable(
    formData.get("footballFederationName"),
  );
  const footballFederationNumber = nullable(
    formData.get("footballFederationNumber"),
  );
  const cbfRegistrationNumber = nullable(
    formData.get("cbfRegistrationNumber"),
  );
  const entryType = requestedEntryType(formData.get("entryType"));
  const requestedCategoryId = nullable(formData.get("categoryId"));

  if (!name) {
    return { error: "Informe o nome do atleta." };
  }

  if (entryType === "EVALUATION" && !requestedCategoryId) {
    return {
      error: "Selecione uma categoria de avaliação para este atleta.",
    };
  }

  const category = await validateCategory(
    requestedCategoryId,
    user.organizationId,
    requestedCategoryId ? entryType : undefined,
  );

  if (requestedCategoryId && !category) {
    return {
      error:
        entryType === "EVALUATION"
          ? "A categoria selecionada não é uma categoria de avaliação válida."
          : "A categoria selecionada não é uma categoria do elenco válida.",
    };
  }

  const athlete = await prisma.$transaction(async (tx) => {
    const created = await tx.athlete.create({
      data: {
        name,
        nickname,
        jerseyNumber,
        position,
        dominantFoot,
        birthYear,
        photoUrl,
        guardianName,
        guardianRelation,
        guardianPhone,
        guardianEmail,
        categoryId: category?.id ?? null,
        organizationId: user.organizationId,
        active: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    await syncSportRegistration(tx, {
      organizationId: user.organizationId,
      athleteId: created.id,
      sport: "FUTSAL",
      authorityType: "FEDERATION",
      authorityName: futsalFederationName,
      registrationNumber: futsalFederationNumber,
    });

    await syncSportRegistration(tx, {
      organizationId: user.organizationId,
      athleteId: created.id,
      sport: "FOOTBALL",
      authorityType: "FEDERATION",
      authorityName: footballFederationName,
      registrationNumber: footballFederationNumber,
    });

    await syncSportRegistration(tx, {
      organizationId: user.organizationId,
      athleteId: created.id,
      sport: "FOOTBALL",
      authorityType: "CBF",
      authorityName: "CBF",
      registrationNumber: cbfRegistrationNumber,
    });
    if (category) {
      await tx.athleteDataAuditLog.create({
        data: {
          organizationId: user.organizationId,
          athleteId: created.id,
          actorUserId: user.id,
          action: AthleteDataAuditAction.CREATED,
          entityType: "ATHLETE_CATEGORY",
          entityId: created.id,
          metadataJson: JSON.stringify({
            event:
              category.type === "EVALUATION"
                ? "EVALUATION_ENTRY"
                : "CATEGORY_ASSIGNMENT",
            fromCategory: null,
            toCategory: {
              id: category.id,
              name: category.name,
              type: category.type,
            },
          }),
        },
      });
    }

    return created;
  });

  revalidatePath("/atletas");
  revalidatePath("/categorias");

  return {
    athleteId: athlete.id,
    athleteName: athlete.name,
  };
}

export async function updateAthlete(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));
  const nickname = nullable(formData.get("nickname"));
  const jerseyNumber = nullableNumber(formData.get("jerseyNumber"));
  const position = nullable(formData.get("position"));
  const dominantFoot = nullable(formData.get("dominantFoot"));
  const birthYear = nullableNumber(formData.get("birthYear"));
  const photoUrl = nullable(formData.get("photoUrl"));

  const guardianName = nullable(formData.get("guardianName"));
  const guardianRelation = nullable(formData.get("guardianRelation"));
  const guardianPhone = nullable(formData.get("guardianPhone"));
  const guardianEmail = nullable(formData.get("guardianEmail"));

  const futsalFederationName = nullable(
    formData.get("futsalFederationName"),
  );
  const futsalFederationNumber = nullable(
    formData.get("futsalFederationNumber"),
  );
  const footballFederationName = nullable(
    formData.get("footballFederationName"),
  );
  const footballFederationNumber = nullable(
    formData.get("footballFederationNumber"),
  );
  const cbfRegistrationNumber = nullable(
    formData.get("cbfRegistrationNumber"),
  );
  const active = clean(formData.get("active")) === "true";
  const requestedCategoryId = nullable(formData.get("categoryId"));

  if (!id || !name) return;

  const category = await validateCategory(
    requestedCategoryId,
    user.organizationId,
  );

  if (requestedCategoryId && !category) return;

  await prisma.$transaction(async (tx) => {
    const current = await tx.athlete.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!current) return;

    await tx.athlete.update({
      where: { id: current.id },
      data: {
        name,
        nickname,
        jerseyNumber,
        position,
        dominantFoot,
        birthYear,
        photoUrl,
        guardianName,
        guardianRelation,
        guardianPhone,
        guardianEmail,
        categoryId: category?.id ?? null,
        active,
      },
    });

    await syncSportRegistration(tx, {
      organizationId: user.organizationId,
      athleteId: current.id,
      sport: "FUTSAL",
      authorityType: "FEDERATION",
      authorityName: futsalFederationName,
      registrationNumber: futsalFederationNumber,
    });

    await syncSportRegistration(tx, {
      organizationId: user.organizationId,
      athleteId: current.id,
      sport: "FOOTBALL",
      authorityType: "FEDERATION",
      authorityName: footballFederationName,
      registrationNumber: footballFederationNumber,
    });

    await syncSportRegistration(tx, {
      organizationId: user.organizationId,
      athleteId: current.id,
      sport: "FOOTBALL",
      authorityType: "CBF",
      authorityName: "CBF",
      registrationNumber: cbfRegistrationNumber,
    });
    const changedCategory =
      current.categoryId !== (category?.id ?? null);

    if (changedCategory) {
      const event = categoryEvent(
        current.category?.type ?? null,
        category?.type ?? null,
      );

      await tx.athleteDataAuditLog.create({
        data: {
          organizationId: user.organizationId,
          athleteId: current.id,
          actorUserId: user.id,
          action:
            event === "EVALUATION_APPROVED"
              ? AthleteDataAuditAction.APPROVED
              : AthleteDataAuditAction.UPDATED,
          entityType: "ATHLETE_CATEGORY",
          entityId: current.id,
          metadataJson: JSON.stringify({
            event,
            fromCategory: current.category
              ? {
                  id: current.category.id,
                  name: current.category.name,
                  type: current.category.type,
                }
              : null,
            toCategory: category
              ? {
                  id: category.id,
                  name: category.name,
                  type: category.type,
                }
              : null,
          }),
        },
      });
    }
  });

  revalidatePath("/atletas");
  revalidatePath(`/atletas/${id}`);
  revalidatePath("/categorias");

  redirect("/atletas");
}

export async function deleteAthlete(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.athlete.deleteMany({
    where: {
      id,
      organizationId: user.organizationId,
    },
  });

  revalidatePath("/atletas");
  revalidatePath("/categorias");
}

export async function toggleAthleteStatus(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const id = clean(formData.get("id"));
  const next = clean(formData.get("next")) === "true";

  if (!id) return;

  await prisma.athlete.updateMany({
    where: {
      id,
      organizationId: user.organizationId,
    },
    data: {
      active: next,
    },
  });

  revalidatePath("/atletas");
  revalidatePath(`/atletas/${id}`);
  revalidatePath("/categorias");
}

export async function createAthleteMembership(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const athleteId = clean(formData.get("athleteId"));
  const categoryId = nullable(formData.get("categoryId"));
  const sport = clean(formData.get("sport")) || "BOTH";
  const teamLabel = nullable(formData.get("teamLabel"));
  const competitionType = nullable(formData.get("competitionType"));
  const season = nullable(formData.get("season"));

  if (!athleteId) return;

  const athlete = await prisma.athlete.findFirst({
    where: {
      id: athleteId,
      organizationId: user.organizationId,
    },
    select: {
      id: true,
    },
  });

  if (!athlete) return;

  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!category) return;
  }

  await prisma.athleteMembership.create({
    data: {
      athleteId,
      organizationId: user.organizationId,
      categoryId,
      sport: sport as "FOOTBALL" | "FUTSAL" | "BOTH",
      teamLabel,
      competitionType,
      season,
      verified: true,
    },
  });

  revalidatePath("/atletas");
  revalidatePath(`/atletas/${athleteId}`);
}
