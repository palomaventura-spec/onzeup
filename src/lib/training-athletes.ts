import type { SportType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type TrainingAthleteGroup =
  | "ROSTER"
  | "EVALUATION";

export async function findEligibleTrainingAthletes(
  organizationId: string,
  categoryId: string,
  sport: SportType,
) {
  const allowedSports: SportType[] =
    sport === "BOTH"
      ? ["BOTH"]
      : ["BOTH", sport];

  // A chamada pertence a uma categoria-base (regular) e inclui
  // os atletas das categorias de avaliacao vinculadas a ela.
  // A resolucao funciona tambem quando o treino foi criado na
  // propria categoria de avaliacao.
  const selectedCategory = await prisma.category.findFirst({
    where: { id: categoryId, organizationId, active: true },
    select: { id: true, type: true },
  });

  if (!selectedCategory) return [];

  const linkedRegularTargets =
    selectedCategory.type === "EVALUATION"
      ? await prisma.categoryEvaluationTarget.findMany({
          where: {
            evaluationCategoryId: categoryId,
            targetCategory: {
              organizationId,
              active: true,
              type: "STANDARD",
              sport: { in: allowedSports },
            },
          },
          select: { targetCategoryId: true },
        })
      : [];

  const regularCategoryIds =
    selectedCategory.type === "EVALUATION"
      ? linkedRegularTargets.map((item) => item.targetCategoryId)
      : [categoryId];

  const linkedEvaluationTargets =
    regularCategoryIds.length > 0
      ? await prisma.categoryEvaluationTarget.findMany({
          where: {
            targetCategoryId: { in: regularCategoryIds },
            evaluationCategory: {
              organizationId,
              active: true,
              type: "EVALUATION",
              sport: { in: allowedSports },
            },
          },
          select: { evaluationCategoryId: true },
        })
      : [];

  const eligibleCategoryIds = Array.from(
    new Set([
      ...regularCategoryIds,
      ...linkedEvaluationTargets.map((item) => item.evaluationCategoryId),
      categoryId,
    ]),
  );

  const categories =
    await prisma.category.findMany({
      where: {
        id: {
          in: eligibleCategoryIds,
        },
        organizationId,
        active: true,
      },
      select: {
        id: true,
        accentColor: true,
      },
    });

  const categoryColorById = new Map(
    categories.map((category) => [
      category.id,
      category.accentColor,
    ]),
  );

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId,
      active: true,
      OR: [
        {
          categoryId: {
            in: eligibleCategoryIds,
          },
        },
        {
          memberships: {
            some: {
              organizationId,
              categoryId: {
                in: eligibleCategoryIds,
              },
              status: "ACTIVE",
              sport: {
                in: allowedSports,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      jerseyNumber: true,
      photoUrl: true,
      categoryId: true,
      memberships: {
        where: {
          organizationId,
          status: "ACTIVE",
          sport: {
            in: allowedSports,
          },
          categoryId: {
            in: eligibleCategoryIds,
          },
        },
        select: {
          categoryId: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  return athletes.map((athlete) => {
    const belongsToRoster =
      athlete.categoryId === categoryId ||
      athlete.memberships.some(
        (membership) =>
          membership.categoryId === categoryId,
      );

    const rosterType: TrainingAthleteGroup =
      belongsToRoster
        ? "ROSTER"
        : "EVALUATION";

    const visualCategoryId =
      rosterType === "ROSTER"
        ? categoryId
        : athlete.categoryId ?? categoryId;

    return {
      id: athlete.id,
      name: athlete.name,
      nickname: athlete.nickname,
      jerseyNumber: athlete.jerseyNumber,
      photoUrl: athlete.photoUrl,
      rosterType,
      categoryAccentColor:
        categoryColorById.get(
          visualCategoryId,
        ) ?? "#dbe3ea",
    };
  });
}
