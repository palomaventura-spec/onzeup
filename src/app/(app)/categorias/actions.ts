"use server";

import { SportType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  return clean(value) || null;
}

function accent(value: FormDataEntryValue | null) {
  const color = clean(value);
  return /^#[0-9a-f]{6}$/i.test(color)
    ? color
    : "#9DDB16";
}

function categorySport(
  value: FormDataEntryValue | null,
  allowBoth = false,
): SportType | null {
  const sport = clean(value);

  if (sport === "FOOTBALL") return SportType.FOOTBALL;
  if (sport === "FUTSAL") return SportType.FUTSAL;

  if (allowBoth && sport === "BOTH") {
    return SportType.BOTH;
  }

  return null;
}

function categoryType(value: FormDataEntryValue | null) {
  return clean(value) === "EVALUATION"
    ? "EVALUATION"
    : "STANDARD";
}

function evaluationTargetIds(formData: FormData) {
  return [
    ...new Set(
      formData
        .getAll("evaluationTargetIds")
        .map((value) => String(value).trim())
        .filter(Boolean),
    ),
  ];
}

async function validEvaluationTargetIds(
  organizationId: string,
  sport: SportType,
  ids: string[],
) {
  if (!ids.length) return [];

  const categories = await prisma.category.findMany({
    where: {
      id: {
        in: ids,
      },
      organizationId,
      active: true,
      type: "STANDARD",
      ...(sport === SportType.BOTH
        ? {
            sport: {
              in: [
                SportType.FOOTBALL,
                SportType.FUTSAL,
              ],
            },
          }
        : {
            sport,
          }),
    },
    select: {
      id: true,
    },
  });

  return categories.map((category) => category.id);
}

export async function createCategory(
  formData: FormData,
) {
  const user =
    await requireClubPermission("CATEGORIES_EDIT");

  const name = clean(formData.get("name"));
  const birthYearRaw = clean(
    formData.get("birthYear"),
  );
  const birthYear = birthYearRaw
    ? Number(birthYearRaw)
    : null;

  const description = nullable(
    formData.get("description"),
  );

  const accentColor = accent(
    formData.get("accentColor"),
  );

  const type = categoryType(
    formData.get("type"),
  );

  const sport = categorySport(
    formData.get("sport"),
  );

  if (!name || !sport) return;

  const requestedTargets =
    type === "EVALUATION"
      ? evaluationTargetIds(formData)
      : [];

  const targets =
    type === "EVALUATION"
      ? await validEvaluationTargetIds(
          user.organizationId,
          sport,
          requestedTargets,
        )
      : [];

  await prisma.$transaction(async (tx) => {
    const category =
      await tx.category.create({
        data: {
          name,
          birthYear:
            Number.isFinite(birthYear)
              ? birthYear
              : null,
          description,
          accentColor,
          type,
          sport,
          active: true,
          organizationId:
            user.organizationId,
        },
        select: {
          id: true,
        },
      });

    if (targets.length) {
      await tx.categoryEvaluationTarget.createMany({
        data: targets.map((targetCategoryId) => ({
          evaluationCategoryId: category.id,
          targetCategoryId,
        })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath("/categorias");
  revalidatePath("/atletas");
  revalidatePath("/qtr");
}

export async function updateCategory(
  formData: FormData,
) {
  const user =
    await requireClubPermission("CATEGORIES_EDIT");

  const id = clean(formData.get("id"));
  const name = clean(formData.get("name"));

  const birthYearRaw = clean(
    formData.get("birthYear"),
  );

  const birthYear = birthYearRaw
    ? Number(birthYearRaw)
    : null;

  const description = nullable(
    formData.get("description"),
  );

  const accentColor = accent(
    formData.get("accentColor"),
  );

  const type = categoryType(
    formData.get("type"),
  );

  const active =
    clean(formData.get("active")) !== "false";

  const sport = categorySport(
    formData.get("sport"),
    true,
  );

  if (!id || !name || !sport) return;

  const requestedTargets =
    type === "EVALUATION"
      ? evaluationTargetIds(formData)
      : [];

  const targets =
    type === "EVALUATION"
      ? await validEvaluationTargetIds(
          user.organizationId,
          sport,
          requestedTargets,
        )
      : [];

  await prisma.$transaction(async (tx) => {
    const result =
      await tx.category.updateMany({
        where: {
          id,
          organizationId:
            user.organizationId,
        },
        data: {
          name,
          birthYear:
            Number.isFinite(birthYear)
              ? birthYear
              : null,
          description,
          accentColor,
          type,
          sport,
          active,
        },
      });

    if (!result.count) return;

    await tx.categoryEvaluationTarget.deleteMany({
      where: {
        evaluationCategoryId: id,
      },
    });

    if (
      type === "EVALUATION" &&
      targets.length
    ) {
      await tx.categoryEvaluationTarget.createMany({
        data: targets.map((targetCategoryId) => ({
          evaluationCategoryId: id,
          targetCategoryId,
        })),
        skipDuplicates: true,
      });
    }
  });

  revalidatePath("/categorias");
  revalidatePath(`/categorias/${id}`);
  revalidatePath("/atletas");
  revalidatePath("/qtr");

  redirect("/categorias");
}

export async function deleteCategory(
  formData: FormData,
) {
  const user =
    await requireClubPermission("CATEGORIES_EDIT");

  const id = clean(formData.get("id"));

  if (!id) return;

  await prisma.category.updateMany({
    where: {
      id,
      organizationId:
        user.organizationId,
    },
    data: {
      active: false,
    },
  });

  revalidatePath("/categorias");
  revalidatePath(`/categorias/${id}`);
  revalidatePath("/atletas");
  revalidatePath("/qtr");
}