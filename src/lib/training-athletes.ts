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

  const evaluationTargets =
    await prisma.categoryEvaluationTarget.findMany({
      where: {
        targetCategoryId: categoryId,
        evaluationCategory: {
          organizationId,
          active: true,
          type: "EVALUATION",
          sport: {
            in: allowedSports,
          },
        },
      },
      select: {
        evaluationCategoryId: true,
      },
    });

  const evaluationCategoryIds =
    evaluationTargets.map(
      (item) => item.evaluationCategoryId,
    );

  const eligibleCategoryIds = [
    categoryId,
    ...evaluationCategoryIds,
  ];

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
