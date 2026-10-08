"use server";

import crypto from "node:crypto";

import {
  AthleteDocumentCategory,
  AthleteDocumentRequirementSubject,
  Prisma,
  SportType,
} from "@prisma/client";
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

function documentRequirementCategory(
  value: FormDataEntryValue | null,
): AthleteDocumentCategory | null {
  const raw = clean(value);

  return Object.values(AthleteDocumentCategory).includes(
    raw as AthleteDocumentCategory,
  )
    ? (raw as AthleteDocumentCategory)
    : null;
}

function documentRequirementSubject(
  value: FormDataEntryValue | null,
): AthleteDocumentRequirementSubject {
  const raw = clean(value);

  return raw === AthleteDocumentRequirementSubject.GUARDIAN
    ? AthleteDocumentRequirementSubject.GUARDIAN
    : AthleteDocumentRequirementSubject.ATHLETE;
}

function booleanValue(
  value: FormDataEntryValue | null,
  fallback = false,
) {
  const raw = clean(value).toLowerCase();

  if (!raw) return fallback;

  return raw === "true" || raw === "1" || raw === "on";
}

function requirementCount(
  value: FormDataEntryValue | null,
) {
  const parsed = Number(clean(value));

  if (!Number.isFinite(parsed)) return 1;

  return Math.min(10, Math.max(1, Math.trunc(parsed)));
}

async function syncCategoryDocumentationRequirement(
  tx: Prisma.TransactionClient,
  categoryId: string,
  organizationId: string,
) {
  const activeRequirements =
    await tx.categoryDocumentRequirement.count({
      where: {
        categoryId,
        organizationId,
        active: true,
        required: true,
      },
    });

  await tx.category.updateMany({
    where: {
      id: categoryId,
      organizationId,
    },
    data: {
      requiresDocumentation: activeRequirements > 0,
    },
  });
}

export async function createCategoryDocumentRequirement(
  formData: FormData,
) {
  const user =
    await requireClubPermission("CATEGORIES_EDIT");

  const categoryId = clean(formData.get("categoryId"));
  const label = clean(formData.get("label"));
  const documentCategory =
    documentRequirementCategory(
      formData.get("documentCategory"),
    );

  if (!categoryId || !label || !documentCategory) {
    return;
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      organizationId: user.organizationId,
      type: "STANDARD",
    },
    select: {
      id: true,
    },
  });

  if (!category) return;

  const requestedKey = clean(formData.get("key"))
    .toLowerCase()
    .replace(/[^a-z0-9_:-]/g, "");

  const key =
    requestedKey ||
    `custom_${crypto.randomUUID().replaceAll("-", "")}`;

  await prisma.$transaction(async (tx) => {
    await tx.categoryDocumentRequirement.upsert({
      where: {
        categoryId_key: {
          categoryId: category.id,
          key,
        },
      },
      create: {
        organizationId: user.organizationId,
        categoryId: category.id,
        key,
        label: label.slice(0, 160),
        documentCategory,
        subject: documentRequirementSubject(
          formData.get("subject"),
        ),
        minCount: requirementCount(
          formData.get("minCount"),
        ),
        required: booleanValue(
          formData.get("required"),
          true,
        ),
        requiresApproval: booleanValue(
          formData.get("requiresApproval"),
          true,
        ),
        requiresExpiry: booleanValue(
          formData.get("requiresExpiry"),
          false,
        ),
        instructions:
          nullable(formData.get("instructions")),
        active: true,
        sortOrder:
          Number(clean(formData.get("sortOrder"))) || 0,
      },
      update: {
        label: label.slice(0, 160),
        documentCategory,
        subject: documentRequirementSubject(
          formData.get("subject"),
        ),
        minCount: requirementCount(
          formData.get("minCount"),
        ),
        required: booleanValue(
          formData.get("required"),
          true,
        ),
        requiresApproval: booleanValue(
          formData.get("requiresApproval"),
          true,
        ),
        requiresExpiry: booleanValue(
          formData.get("requiresExpiry"),
          false,
        ),
        instructions:
          nullable(formData.get("instructions")),
        active: true,
      },
    });

    await syncCategoryDocumentationRequirement(
      tx,
      category.id,
      user.organizationId,
    );
  });

  revalidatePath("/categorias");
  revalidatePath(`/categorias/${category.id}`);
  revalidatePath("/atletas");
}

export async function updateCategoryDocumentRequirement(
  formData: FormData,
) {
  const user =
    await requireClubPermission("CATEGORIES_EDIT");

  const requirementId =
    clean(formData.get("requirementId"));

  const label = clean(formData.get("label"));

  const documentCategory =
    documentRequirementCategory(
      formData.get("documentCategory"),
    );

  if (!requirementId || !label || !documentCategory) {
    return;
  }

  const requirement =
    await prisma.categoryDocumentRequirement.findFirst({
      where: {
        id: requirementId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        categoryId: true,
      },
    });

  if (!requirement) return;

  await prisma.$transaction(async (tx) => {
    await tx.categoryDocumentRequirement.update({
      where: {
        id: requirement.id,
      },
      data: {
        label: label.slice(0, 160),
        documentCategory,
        subject: documentRequirementSubject(
          formData.get("subject"),
        ),
        minCount: requirementCount(
          formData.get("minCount"),
        ),
        required: booleanValue(
          formData.get("required"),
          true,
        ),
        requiresApproval: booleanValue(
          formData.get("requiresApproval"),
          true,
        ),
        requiresExpiry: booleanValue(
          formData.get("requiresExpiry"),
          false,
        ),
        instructions:
          nullable(formData.get("instructions")),
      },
    });

    await syncCategoryDocumentationRequirement(
      tx,
      requirement.categoryId,
      user.organizationId,
    );
  });

  revalidatePath("/categorias");
  revalidatePath(
    `/categorias/${requirement.categoryId}`,
  );
  revalidatePath("/atletas");
}

export async function toggleCategoryDocumentRequirement(
  formData: FormData,
) {
  const user =
    await requireClubPermission("CATEGORIES_EDIT");

  const requirementId =
    clean(formData.get("requirementId"));

  if (!requirementId) return;

  const requirement =
    await prisma.categoryDocumentRequirement.findFirst({
      where: {
        id: requirementId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        categoryId: true,
        active: true,
      },
    });

  if (!requirement) return;

  await prisma.$transaction(async (tx) => {
    await tx.categoryDocumentRequirement.update({
      where: {
        id: requirement.id,
      },
      data: {
        active: !requirement.active,
      },
    });

    await syncCategoryDocumentationRequirement(
      tx,
      requirement.categoryId,
      user.organizationId,
    );
  });

  revalidatePath("/categorias");
  revalidatePath(
    `/categorias/${requirement.categoryId}`,
  );
  revalidatePath("/atletas");
}

export async function deleteCategoryDocumentRequirement(
  formData: FormData,
) {
  const user =
    await requireClubPermission("CATEGORIES_EDIT");

  const requirementId =
    clean(formData.get("requirementId"));

  if (!requirementId) return;

  const requirement =
    await prisma.categoryDocumentRequirement.findFirst({
      where: {
        id: requirementId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        categoryId: true,
        _count: {
          select: {
            documents: true,
          },
        },
      },
    });

  if (!requirement) return;

  await prisma.$transaction(async (tx) => {
    if (requirement._count.documents > 0) {
      await tx.categoryDocumentRequirement.update({
        where: {
          id: requirement.id,
        },
        data: {
          active: false,
        },
      });
    } else {
      await tx.categoryDocumentRequirement.delete({
        where: {
          id: requirement.id,
        },
      });
    }

    await syncCategoryDocumentationRequirement(
      tx,
      requirement.categoryId,
      user.organizationId,
    );
  });

  revalidatePath("/categorias");
  revalidatePath(
    `/categorias/${requirement.categoryId}`,
  );
  revalidatePath("/atletas");
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