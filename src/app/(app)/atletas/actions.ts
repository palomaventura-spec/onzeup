"use server";

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
      ...(expectedType
        ? {
            type: expectedType,
          }
        : {}),
    },
    select: {
      id: true,
      type: true,
    },
  });

  return category ?? null;
}

export async function createAthlete(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const name = clean(formData.get("name"));
  const nickname = nullable(formData.get("nickname"));
  const jerseyNumber = nullableNumber(
    formData.get("jerseyNumber"),
  );
  const position = nullable(formData.get("position"));
  const dominantFoot = nullable(formData.get("dominantFoot"));
  const birthYear = nullableNumber(formData.get("birthYear"));
  const photoUrl = nullable(formData.get("photoUrl"));

  const guardianName = nullable(formData.get("guardianName"));
  const guardianRelation = nullable(
    formData.get("guardianRelation"),
  );
  const guardianPhone = nullable(
    formData.get("guardianPhone"),
  );
  const guardianEmail = nullable(
    formData.get("guardianEmail"),
  );

  const entryType = requestedEntryType(
    formData.get("entryType"),
  );

  const requestedCategoryId = nullable(
    formData.get("categoryId"),
  );

  if (!name) {
    return {
      error: "Informe o nome do atleta.",
    };
  }

  if (entryType === "EVALUATION" && !requestedCategoryId) {
    return {
      error:
        "Selecione uma categoria de avaliação para este atleta.",
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

  const athlete = await prisma.athlete.create({
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
  const jerseyNumber = nullableNumber(
    formData.get("jerseyNumber"),
  );
  const position = nullable(formData.get("position"));
  const dominantFoot = nullable(formData.get("dominantFoot"));
  const birthYear = nullableNumber(formData.get("birthYear"));
  const photoUrl = nullable(formData.get("photoUrl"));

  const guardianName = nullable(formData.get("guardianName"));
  const guardianRelation = nullable(
    formData.get("guardianRelation"),
  );
  const guardianPhone = nullable(
    formData.get("guardianPhone"),
  );
  const guardianEmail = nullable(
    formData.get("guardianEmail"),
  );

  const active = clean(formData.get("active")) === "true";

  const requestedCategoryId = nullable(
    formData.get("categoryId"),
  );

  const category = await validateCategory(
    requestedCategoryId,
    user.organizationId,
  );

  if (!id || !name) return;

  if (requestedCategoryId && !category) {
    return;
  }

  await prisma.athlete.updateMany({
    where: {
      id,
      organizationId: user.organizationId,
    },
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

export async function toggleAthleteStatus(
  formData: FormData,
) {
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

export async function createAthleteMembership(
  formData: FormData,
) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const athleteId = clean(formData.get("athleteId"));
  const categoryId = nullable(formData.get("categoryId"));
  const sport = clean(formData.get("sport")) || "BOTH";
  const teamLabel = nullable(formData.get("teamLabel"));
  const competitionType = nullable(
    formData.get("competitionType"),
  );
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
