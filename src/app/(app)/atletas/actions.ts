"use server";

import {
  AthleteCurrentStatus,
  AthleteDataAuditAction,
  AthleteEligibilityIssueSource,
  AthleteEligibilityIssueType,
  AthleteEligibilityScope,
  AthleteEvaluationProcessEntryMode,
  AthleteEvaluationProcessStatus,
  AthleteExitOrigin,
  Prisma,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import {
  closeAutomaticEligibilityIssues,
  syncAutomaticEligibility,
} from "@/lib/athlete-eligibility";
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
      sport: true,
      accentColor: true,
      evaluationTargets: {
        where: {
          targetCategory: {
            organizationId,
            type: "STANDARD",
          },
        },
        select: {
          targetCategory: {
            select: {
              id: true,
              name: true,
              type: true,
              sport: true,
              active: true,
            },
          },
        },
      },
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

type EvaluationCategorySnapshot = {
  id: string;
  name: string;
  type: "STANDARD" | "EVALUATION";
  sport: "FOOTBALL" | "FUTSAL" | "BOTH";
  evaluationTargets: Array<{
    targetCategory: {
      id: string;
      name: string;
      type: "STANDARD" | "EVALUATION";
      sport: "FOOTBALL" | "FUTSAL" | "BOTH";
      active: boolean;
    };
  }>;
};

function parseDateInput(
  value: FormDataEntryValue | null,
  fallback = new Date(),
) {
  const raw = clean(value);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return fallback;
  }

  const parsed = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function processTarget(
  category: EvaluationCategorySnapshot,
  requestedTargetCategoryId?: string | null,
) {
  const validTargets = category.evaluationTargets
    .map((item) => item.targetCategory)
    .filter((target) => target.active);

  if (requestedTargetCategoryId) {
    return (
      validTargets.find(
        (target) => target.id === requestedTargetCategoryId,
      ) ?? null
    );
  }

  return validTargets.length === 1 ? validTargets[0] : null;
}

function processSeason(date: Date) {
  return String(date.getUTCFullYear());
}

async function findLegacyEvaluationStart(
  tx: Prisma.TransactionClient,
  organizationId: string,
  athleteId: string,
  evaluationCategoryId: string,
) {
  const logs = await tx.athleteDataAuditLog.findMany({
    where: {
      organizationId,
      athleteId,
      entityType: "ATHLETE_CATEGORY",
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
    select: {
      metadataJson: true,
      createdAt: true,
    },
  });

  for (const log of logs) {
    if (!log.metadataJson) continue;

    try {
      const metadata = JSON.parse(log.metadataJson) as {
        event?: string;
        toCategory?: {
          id?: string;
        } | null;
      };

      if (
        (metadata.event === "EVALUATION_ENTRY" ||
          metadata.event === "EVALUATION_TRANSFER") &&
        metadata.toCategory?.id === evaluationCategoryId
      ) {
        return log.createdAt;
      }
    } catch {
      // Histórico legado inválido não deve bloquear o processo atual.
    }
  }

  return null;
}

async function createCurrentEvaluationProcess(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    athleteId: string;
    category: EvaluationCategorySnapshot;
    userId: string;
    userName: string;
    startedAt?: Date;
  },
) {
  const target = processTarget(input.category);
  const startedAt = input.startedAt ?? new Date();

  return tx.athleteEvaluationProcess.create({
    data: {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      evaluationCategoryId: input.category.id,
      targetCategoryId: target?.id ?? null,
      sport: input.category.sport,
      status: AthleteEvaluationProcessStatus.IN_EVALUATION,
      entryMode: AthleteEvaluationProcessEntryMode.CURRENT,
      startedAt,
      evaluationCategoryNameSnapshot: input.category.name,
      targetCategoryNameSnapshot: target?.name ?? null,
      seasonSnapshot: processSeason(startedAt),
      createdByUserId: input.userId,
      createdByNameSnapshot: input.userName,
    },
  });
}

async function ensureCurrentEvaluationProcess(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    athleteId: string;
    category: EvaluationCategorySnapshot;
    userId: string;
    userName: string;
  },
) {
  const existing = await tx.athleteEvaluationProcess.findFirst({
    where: {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      evaluationCategoryId: input.category.id,
      entryMode: AthleteEvaluationProcessEntryMode.CURRENT,
      status: AthleteEvaluationProcessStatus.IN_EVALUATION,
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  if (existing) return existing;

  const legacyStart =
    await findLegacyEvaluationStart(
      tx,
      input.organizationId,
      input.athleteId,
      input.category.id,
    );

  return createCurrentEvaluationProcess(tx, {
    ...input,
    startedAt: legacyStart ?? new Date(),
  });
}

async function finalizeCurrentEvaluationProcess(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    athleteId: string;
    category: EvaluationCategorySnapshot;
    userId: string;
    userName: string;
    status: Exclude<
      AthleteEvaluationProcessStatus,
      "IN_EVALUATION"
    >;
    decidedAt: Date;
    decisionReason?: string | null;
    notes?: string | null;
    targetCategory?: {
      id: string;
      name: string;
    } | null;
  },
) {
  const process = await ensureCurrentEvaluationProcess(tx, {
    organizationId: input.organizationId,
    athleteId: input.athleteId,
    category: input.category,
    userId: input.userId,
    userName: input.userName,
  });

  return tx.athleteEvaluationProcess.update({
    where: {
      id: process.id,
    },
    data: {
      status: input.status,
      decidedAt: input.decidedAt,
      decisionReason: input.decisionReason ?? null,
      notes: input.notes ?? null,
      decidedByUserId: input.userId,
      decidedByNameSnapshot: input.userName,
      ...(input.targetCategory
        ? {
            targetCategoryId: input.targetCategory.id,
            targetCategoryNameSnapshot:
              input.targetCategory.name,
          }
        : {}),
    },
  });
}

function revalidateEvaluationPaths(athleteId: string) {
  revalidatePath("/atletas");
  revalidatePath(`/atletas/${athleteId}`);
  revalidatePath("/categorias");
  revalidatePath("/treinos");
  revalidatePath("/performance");
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
  const sportModeRaw = clean(formData.get("sportMode"));
  const sportMode =
    sportModeRaw === "FUTSAL"
      ? "FUTSAL"
      : sportModeRaw === "BOTH"
        ? "BOTH"
        : "FOOTBALL";

  const evaluationCategoryId = nullable(
    formData.get("categoryId"),
  );
  const footballCategoryId = nullable(
    formData.get("footballCategoryId"),
  );
  const futsalCategoryId = nullable(
    formData.get("futsalCategoryId"),
  );

  if (!name) {
    return { error: "Informe o nome do atleta." };
  }

  let evaluationCategory: Awaited<
    ReturnType<typeof validateCategory>
  > = null;
  let footballCategory: Awaited<
    ReturnType<typeof validateCategory>
  > = null;
  let futsalCategory: Awaited<
    ReturnType<typeof validateCategory>
  > = null;

  if (entryType === "EVALUATION") {
    if (!evaluationCategoryId) {
      return {
        error: "Selecione uma categoria de avaliação.",
      };
    }

    evaluationCategory = await validateCategory(
      evaluationCategoryId,
      user.organizationId,
      "EVALUATION",
    );

    if (!evaluationCategory) {
      return {
        error:
          "A categoria selecionada não é uma categoria de avaliação válida.",
      };
    }
  } else {
    if (
      (sportMode === "FOOTBALL" || sportMode === "BOTH") &&
      !footballCategoryId
    ) {
      return {
        error:
          "Selecione a categoria do Futebol de Campo.",
      };
    }

    if (
      (sportMode === "FUTSAL" || sportMode === "BOTH") &&
      !futsalCategoryId
    ) {
      return {
        error: "Selecione a categoria do Futsal.",
      };
    }

    if (footballCategoryId) {
      footballCategory = await validateCategory(
        footballCategoryId,
        user.organizationId,
        "STANDARD",
      );

      if (
        !footballCategory ||
        !["FOOTBALL", "BOTH"].includes(
          footballCategory.sport,
        )
      ) {
        return {
          error:
            "A categoria escolhida para Campo não é válida para Futebol de Campo.",
        };
      }
    }

    if (futsalCategoryId) {
      futsalCategory = await validateCategory(
        futsalCategoryId,
        user.organizationId,
        "STANDARD",
      );

      if (
        !futsalCategory ||
        !["FUTSAL", "BOTH"].includes(futsalCategory.sport)
      ) {
        return {
          error:
            "A categoria escolhida para Futsal não é válida para Futsal.",
        };
      }
    }
  }

  const legacyPrimaryCategory =
    entryType === "EVALUATION"
      ? evaluationCategory
      : footballCategory ?? futsalCategory;

  if (!legacyPrimaryCategory) {
    return {
      error:
        "Todo atleta precisa estar vinculado a pelo menos uma modalidade e categoria.",
    };
  }

  const athlete = await prisma.$transaction(async (tx) => {
    const now = new Date();

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
        categoryId: legacyPrimaryCategory.id,
        organizationId: user.organizationId,
        active: true,
        currentStatus:
          entryType === "EVALUATION"
            ? AthleteCurrentStatus.EVALUATION
            : AthleteCurrentStatus.ACTIVE,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (entryType === "EVALUATION" && evaluationCategory) {
      await tx.athleteMembership.create({
        data: {
          athleteId: created.id,
          organizationId: user.organizationId,
          categoryId: evaluationCategory.id,
          sport: evaluationCategory.sport,
          season: processSeason(now),
          status: "ACTIVE",
          verified: true,
          startedAt: now,
        },
      });
    } else {
      if (
        (sportMode === "FOOTBALL" || sportMode === "BOTH") &&
        footballCategory
      ) {
        await tx.athleteMembership.create({
          data: {
            athleteId: created.id,
            organizationId: user.organizationId,
            categoryId: footballCategory.id,
            sport: "FOOTBALL",
            season: processSeason(now),
            status: "ACTIVE",
            verified: true,
            startedAt: now,
          },
        });
      }

      if (
        (sportMode === "FUTSAL" || sportMode === "BOTH") &&
        futsalCategory
      ) {
        await tx.athleteMembership.create({
          data: {
            athleteId: created.id,
            organizationId: user.organizationId,
            categoryId: futsalCategory.id,
            sport: "FUTSAL",
            season: processSeason(now),
            status: "ACTIVE",
            verified: true,
            startedAt: now,
          },
        });
      }
    }

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

    await syncAutomaticEligibility(tx, {
      organizationId: user.organizationId,
      athleteId: created.id,
      actor: {
        id: user.id,
        name: user.name,
      },
    });

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
            entryType === "EVALUATION"
              ? "EVALUATION_ENTRY"
              : "SPORT_MEMBERSHIPS_CREATED",
          sportMode:
            entryType === "EVALUATION"
              ? evaluationCategory?.sport
              : sportMode,
          memberships:
            entryType === "EVALUATION"
              ? [
                  {
                    sport: evaluationCategory?.sport,
                    categoryId: evaluationCategory?.id,
                    categoryName: evaluationCategory?.name,
                  },
                ]
              : [
                  ...(footballCategory
                    ? [
                        {
                          sport: "FOOTBALL",
                          categoryId: footballCategory.id,
                          categoryName: footballCategory.name,
                        },
                      ]
                    : []),
                  ...(futsalCategory
                    ? [
                        {
                          sport: "FUTSAL",
                          categoryId: futsalCategory.id,
                          categoryName: futsalCategory.name,
                        },
                      ]
                    : []),
                ],
        }),
      },
    });

    if (entryType === "EVALUATION" && evaluationCategory) {
      await createCurrentEvaluationProcess(tx, {
        organizationId: user.organizationId,
        athleteId: created.id,
        category: evaluationCategory,
        userId: user.id,
        userName: user.name,
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

  const requestedCategoryId = nullable(formData.get("categoryId"));
  const footballCategoryId = nullable(
    formData.get("footballCategoryId"),
  );
  const futsalCategoryId = nullable(
    formData.get("futsalCategoryId"),
  );

  if (!id || !name) return;

  const category = await validateCategory(
    requestedCategoryId,
    user.organizationId,
  );

  if (requestedCategoryId && !category) return;

  const [footballCategory, futsalCategory] = await Promise.all([
    footballCategoryId
      ? validateCategory(
          footballCategoryId,
          user.organizationId,
        )
      : Promise.resolve(null),
    futsalCategoryId
      ? validateCategory(
          futsalCategoryId,
          user.organizationId,
        )
      : Promise.resolve(null),
  ]);

  if (
    footballCategoryId &&
    (!footballCategory ||
      footballCategory.type !== "STANDARD" ||
      !["FOOTBALL", "BOTH"].includes(
        footballCategory.sport,
      ))
  ) {
    return;
  }

  if (
    futsalCategoryId &&
    (!futsalCategory ||
      futsalCategory.type !== "STANDARD" ||
      !["FUTSAL", "BOTH"].includes(
        futsalCategory.sport,
      ))
  ) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.athlete.findFirst({
      where: {
        id,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        categoryId: true,
        currentStatus: true,
        active: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            sport: true,
            evaluationTargets: {
              where: {
                targetCategory: {
                  organizationId: user.organizationId,
                  type: "STANDARD",
                },
              },
              select: {
                targetCategory: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    sport: true,
                    active: true,
                  },
                },
              },
            },
          },
        },
        memberships: {
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
            sport: true,
            categoryId: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!current) return;

    const isActiveRoster =
      current.currentStatus === AthleteCurrentStatus.ACTIVE;

    if (isActiveRoster) {
      const now = new Date();

      const requestedMemberships = [
        {
          sport: "FOOTBALL" as const,
          category: footballCategory,
        },
        {
          sport: "FUTSAL" as const,
          category: futsalCategory,
        },
      ];

      for (const requested of requestedMemberships) {
        if (!requested.category) continue;

        const existing = current.memberships.find(
          (membership) =>
            membership.sport === requested.sport,
        );

        if (existing) {
          if (
            existing.categoryId !== requested.category.id
          ) {
            await tx.athleteMembership.update({
              where: {
                id: existing.id,
              },
              data: {
                categoryId: requested.category.id,
              },
            });

            await tx.athleteDataAuditLog.create({
              data: {
                organizationId: user.organizationId,
                athleteId: current.id,
                actorUserId: user.id,
                action: AthleteDataAuditAction.UPDATED,
                entityType: "ATHLETE_MEMBERSHIP",
                entityId: existing.id,
                metadataJson: JSON.stringify({
                  event: "SPORT_CATEGORY_CHANGED",
                  sport: requested.sport,
                  fromCategory: existing.category
                    ? {
                        id: existing.category.id,
                        name: existing.category.name,
                      }
                    : null,
                  toCategory: {
                    id: requested.category.id,
                    name: requested.category.name,
                  },
                }),
              },
            });
          }
        } else {
          const createdMembership =
            await tx.athleteMembership.create({
              data: {
                athleteId: current.id,
                organizationId: user.organizationId,
                categoryId: requested.category.id,
                sport: requested.sport,
                season: processSeason(now),
                status: "ACTIVE",
                verified: true,
                startedAt: now,
              },
            });

          await tx.athleteDataAuditLog.create({
            data: {
              organizationId: user.organizationId,
              athleteId: current.id,
              actorUserId: user.id,
              action: AthleteDataAuditAction.CREATED,
              entityType: "ATHLETE_MEMBERSHIP",
              entityId: createdMembership.id,
              metadataJson: JSON.stringify({
                event: "SPORT_MEMBERSHIP_ADDED",
                sport: requested.sport,
                toCategory: {
                  id: requested.category.id,
                  name: requested.category.name,
                },
              }),
            },
          });
        }
      }

      const activeMembershipsAfter =
        await tx.athleteMembership.findMany({
          where: {
            athleteId: current.id,
            organizationId: user.organizationId,
            status: "ACTIVE",
          },
          orderBy: [
            {
              sport: "asc",
            },
            {
              startedAt: "asc",
            },
          ],
          select: {
            sport: true,
            categoryId: true,
          },
        });

      const primaryMembership =
        activeMembershipsAfter.find(
          (membership) =>
            membership.sport === "FOOTBALL",
        ) ??
        activeMembershipsAfter.find(
          (membership) =>
            membership.sport === "FUTSAL",
        ) ??
        activeMembershipsAfter[0] ??
        null;

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
          categoryId:
            primaryMembership?.categoryId ??
            current.categoryId,
          currentStatus: AthleteCurrentStatus.ACTIVE,
          active: true,
        },
      });
    } else {
      const changedCategory =
        current.categoryId !== (category?.id ?? null);

      if (
        changedCategory &&
        current.category?.type === "EVALUATION" &&
        category?.type === "STANDARD"
      ) {
        const linkedTarget =
          current.category.evaluationTargets.some(
            (item) =>
              item.targetCategory.id === category.id &&
              item.targetCategory.active,
          );

        if (!linkedTarget) return;
      }

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
          currentStatus:
            category?.type === "EVALUATION"
              ? AthleteCurrentStatus.EVALUATION
              : category?.type === "STANDARD"
                ? AthleteCurrentStatus.ACTIVE
                : current.currentStatus,
          active:
            category?.type === "EVALUATION" ||
            category?.type === "STANDARD"
              ? true
              : current.active,
        },
      });

      if (changedCategory) {
        const event = categoryEvent(
          current.category?.type ?? null,
          category?.type ?? null,
        );

        if (
          category?.type === "EVALUATION" &&
          current.category?.type !== "EVALUATION"
        ) {
          await createCurrentEvaluationProcess(tx, {
            organizationId: user.organizationId,
            athleteId: current.id,
            category,
            userId: user.id,
            userName: user.name,
          });
        } else if (
          category?.type === "EVALUATION" &&
          current.category?.type === "EVALUATION"
        ) {
          const target = processTarget(category);

          const openProcess =
            await tx.athleteEvaluationProcess.findFirst({
              where: {
                organizationId: user.organizationId,
                athleteId: current.id,
                entryMode:
                  AthleteEvaluationProcessEntryMode.CURRENT,
                status:
                  AthleteEvaluationProcessStatus.IN_EVALUATION,
              },
              orderBy: {
                startedAt: "desc",
              },
            });

          if (openProcess) {
            await tx.athleteEvaluationProcess.update({
              where: {
                id: openProcess.id,
              },
              data: {
                evaluationCategoryId: category.id,
                evaluationCategoryNameSnapshot:
                  category.name,
                targetCategoryId: target?.id ?? null,
                targetCategoryNameSnapshot:
                  target?.name ?? null,
                sport: category.sport,
              },
            });
          } else {
            await createCurrentEvaluationProcess(tx, {
              organizationId: user.organizationId,
              athleteId: current.id,
              category,
              userId: user.id,
              userName: user.name,
            });
          }
        } else if (
          current.category?.type === "EVALUATION" &&
          category?.type === "STANDARD"
        ) {
          const decidedAt = new Date();

          const evaluationMembership =
            await tx.athleteMembership.findFirst({
              where: {
                athleteId: current.id,
                organizationId: user.organizationId,
                status: "ACTIVE",
                categoryId: current.category.id,
                sport: current.category.sport,
              },
              orderBy: {
                startedAt: "desc",
              },
              select: {
                id: true,
                startedAt: true,
              },
            });

          const existingTargetMembership =
            await tx.athleteMembership.findFirst({
              where: {
                athleteId: current.id,
                organizationId: user.organizationId,
                status: "ACTIVE",
                categoryId: category.id,
                sport: category.sport,
              },
              select: {
                id: true,
              },
            });

          const effectiveDecidedAt =
            evaluationMembership?.startedAt &&
            decidedAt.getTime() <
              evaluationMembership.startedAt.getTime()
              ? evaluationMembership.startedAt
              : decidedAt;

          if (evaluationMembership) {
            await tx.athleteMembership.update({
              where: {
                id: evaluationMembership.id,
              },
              data: {
                status: "RELEASED",
                endedAt: effectiveDecidedAt,
              },
            });
          }

          if (!existingTargetMembership) {
            await tx.athleteMembership.create({
              data: {
                athleteId: current.id,
                organizationId: user.organizationId,
                categoryId: category.id,
                sport: category.sport,
                season: processSeason(effectiveDecidedAt),
                status: "ACTIVE",
                verified: true,
                startedAt: effectiveDecidedAt,
              },
            });
          }

          await finalizeCurrentEvaluationProcess(tx, {
            organizationId: user.organizationId,
            athleteId: current.id,
            category: current.category,
            userId: user.id,
            userName: user.name,
            status: AthleteEvaluationProcessStatus.APPROVED,
            decidedAt: effectiveDecidedAt,
            targetCategory: {
              id: category.id,
              name: category.name,
            },
          });
        }

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
    }

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

    await syncAutomaticEligibility(tx, {
      organizationId: user.organizationId,
      athleteId: current.id,
      actor: {
        id: user.id,
        name: user.name,
      },
    });
  });

  revalidateEvaluationPaths(id);
  redirect(`/atletas/${id}`);
}


export async function deleteAthlete(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const id = clean(formData.get("id"));
  if (!id) return;

  await prisma.athlete.updateMany({
    where: {
      id,
      organizationId: user.organizationId,
    },
    data: {
      active: false,
      currentStatus: AthleteCurrentStatus.RELEASED,
    },
  });

  revalidatePath("/atletas");
  revalidatePath("/categorias");
}

export async function toggleAthleteStatus(formData: FormData) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const id = clean(formData.get("id"));
  const next = clean(formData.get("next")) === "true";

  if (!id || !next) return;

  const athlete = await prisma.athlete.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
      currentStatus: {
        in: [
          AthleteCurrentStatus.ACTIVE,
          AthleteCurrentStatus.EVALUATION,
        ],
      },
    },
    select: {
      id: true,
    },
  });

  if (!athlete) return;

  await prisma.athlete.update({
    where: {
      id: athlete.id,
    },
    data: {
      active: true,
    },
  });

  revalidatePath("/atletas");
  revalidatePath(`/atletas/${id}`);
  revalidatePath("/categorias");
}

export async function approveEvaluationAthlete(
  formData: FormData,
) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const athleteId = clean(formData.get("athleteId"));
  const requestedTargetCategoryId = nullable(
    formData.get("targetCategoryId"),
  );
  const decidedAt = parseDateInput(
    formData.get("decisionDate"),
  );
  const notes = nullable(formData.get("notes"));

  if (!athleteId) return;

  await prisma.$transaction(async (tx) => {
    const athlete = await tx.athlete.findFirst({
      where: {
        id: athleteId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            sport: true,
            evaluationTargets: {
              where: {
                targetCategory: {
                  organizationId: user.organizationId,
                  type: "STANDARD",
                  active: true,
                },
              },
              select: {
                targetCategory: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    sport: true,
                    active: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !athlete ||
      !athlete.category ||
      athlete.category.type !== "EVALUATION"
    ) {
      return;
    }

    const targetCategory = processTarget(
      athlete.category,
      requestedTargetCategoryId,
    );

    if (!targetCategory) return;

    const evaluationMembership =
      await tx.athleteMembership.findFirst({
        where: {
          athleteId: athlete.id,
          organizationId: user.organizationId,
          status: "ACTIVE",
          categoryId: athlete.category.id,
          sport: athlete.category.sport,
        },
        orderBy: {
          startedAt: "desc",
        },
        select: {
          id: true,
          sport: true,
          categoryId: true,
          startedAt: true,
        },
      });

    const existingTargetMembership =
      await tx.athleteMembership.findFirst({
        where: {
          athleteId: athlete.id,
          organizationId: user.organizationId,
          status: "ACTIVE",
          categoryId: targetCategory.id,
          sport: targetCategory.sport,
        },
        select: {
          id: true,
        },
      });    const effectiveDecidedAt =
      evaluationMembership?.startedAt &&
      decidedAt.getTime() < evaluationMembership.startedAt.getTime()
        ? evaluationMembership.startedAt
        : decidedAt;

    if (evaluationMembership) {await tx.athleteMembership.update({
        where: {
          id: evaluationMembership.id,
        },
        data: {
          status: "RELEASED",
          endedAt: effectiveDecidedAt,
        },
      });
    }

    if (!existingTargetMembership) {
      await tx.athleteMembership.create({
        data: {
          athleteId: athlete.id,
          organizationId: user.organizationId,
          categoryId: targetCategory.id,
          sport: targetCategory.sport,
          season: processSeason(effectiveDecidedAt),
          status: "ACTIVE",
          verified: true,
          startedAt: effectiveDecidedAt,
        },
      });
    }
    const process =
      await finalizeCurrentEvaluationProcess(tx, {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        category: athlete.category,
        userId: user.id,
        userName: user.name,
        status: AthleteEvaluationProcessStatus.APPROVED,
        decidedAt: effectiveDecidedAt,
        notes,
        targetCategory,
      });

    await tx.athlete.update({
      where: {
        id: athlete.id,
      },
      data: {
        categoryId: targetCategory.id,
        evaluationTargetCategoryId: null,
        currentStatus: AthleteCurrentStatus.ACTIVE,
        active: true,
      },
    });

    await syncAutomaticEligibility(tx, {
      organizationId: user.organizationId,
      athleteId: athlete.id,
      actor: {
        id: user.id,
        name: user.name,
      },
      effectiveAt: effectiveDecidedAt,
    });

    await tx.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        actorUserId: user.id,
        action: AthleteDataAuditAction.APPROVED,
        entityType: "ATHLETE_CATEGORY",
        entityId: athlete.id,
        metadataJson: JSON.stringify({
          event: "EVALUATION_APPROVED",
          evaluationProcessId: process.id,
          decidedAt: effectiveDecidedAt.toISOString(),
          fromCategory: {
            id: athlete.category.id,
            name: athlete.category.name,
            type: athlete.category.type,
          },
          toCategory: {
            id: targetCategory.id,
            name: targetCategory.name,
            type: targetCategory.type,
          },
        }),
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  redirect(`/atletas/${athleteId}`);
}

async function finishEvaluationWithoutApproval(
  formData: FormData,
  status:
    | "REJECTED"
    | "RELEASED"
    | "WITHDRAWN",
  event:
    | "EVALUATION_REJECTED"
    | "EVALUATION_RELEASED"
    | "EVALUATION_WITHDRAWN",
  requireReason: boolean,
) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const athleteId = clean(formData.get("athleteId"));
  const reason = nullable(formData.get("reason"));
  const notes = nullable(formData.get("notes"));
  const decidedAt = parseDateInput(
    formData.get("decisionDate"),
  );

  if (!athleteId || (requireReason && !reason)) {
    return null;
  }

  await prisma.$transaction(async (tx) => {
    const athlete = await tx.athlete.findFirst({
      where: {
        id: athleteId,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            sport: true,
            evaluationTargets: {
              where: {
                targetCategory: {
                  organizationId: user.organizationId,
                  type: "STANDARD",
                },
              },
              select: {
                targetCategory: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    sport: true,
                    active: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (
      !athlete ||
      !athlete.category ||
      athlete.category.type !== "EVALUATION"
    ) {
      return;
    }

        const process =
      await finalizeCurrentEvaluationProcess(tx, {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        category: athlete.category,
        userId: user.id,
        userName: user.name,
        status,
        decidedAt,
        decisionReason: reason,
        notes,
      });

    const currentStatus =
      status === AthleteEvaluationProcessStatus.REJECTED
        ? AthleteCurrentStatus.REJECTED
        : AthleteCurrentStatus.RELEASED;

    await tx.athlete.update({
      where: {
        id: athlete.id,
      },
      data: {
        categoryId: null,
        evaluationTargetCategoryId: null,
        currentStatus,
        active: false,
      },
    });

    await tx.athleteMembership.updateMany({
      where: {
        athleteId: athlete.id,
        organizationId: user.organizationId,
        categoryId: athlete.category.id,
        status: "ACTIVE",
      },
      data: {
        status: "RELEASED",
        endedAt: decidedAt,
      },
    });

    await closeAutomaticEligibilityIssues(tx, {
      organizationId: user.organizationId,
      athleteId: athlete.id,
      actor: {
        id: user.id,
        name: user.name,
      },
      note:
        currentStatus === AthleteCurrentStatus.REJECTED
          ? "Pendência encerrada porque a avaliação terminou sem aprovação."
          : "Pendência encerrada porque o atleta saiu do clube.",
    });

    if (
      status === AthleteEvaluationProcessStatus.RELEASED ||
      status === AthleteEvaluationProcessStatus.WITHDRAWN
    ) {
      await tx.athleteExitRecord.create({
        data: {
          organizationId: user.organizationId,
          athleteId: athlete.id,
          origin:
            status === AthleteEvaluationProcessStatus.WITHDRAWN
              ? AthleteExitOrigin.FAMILY
              : AthleteExitOrigin.CLUB,
          occurredAt: decidedAt,
          reason,
          notes,
          previousCategoryId: athlete.category.id,
          previousCategoryNameSnapshot:
            athlete.category.name,
          seasonSnapshot: processSeason(decidedAt),
          recordedByUserId: user.id,
          recordedByNameSnapshot: user.name,
        },
      });
    }

    await tx.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        actorUserId: user.id,
        action: AthleteDataAuditAction.UPDATED,
        entityType: "ATHLETE_CATEGORY",
        entityId: athlete.id,
        metadataJson: JSON.stringify({
          event,
          evaluationProcessId: process.id,
          decidedAt: decidedAt.toISOString(),
          reason,
          fromCategory: {
            id: athlete.category.id,
            name: athlete.category.name,
            type: athlete.category.type,
          },
          toCategory: null,
        }),
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  return athleteId;
}

export async function rejectEvaluationAthlete(
  formData: FormData,
) {
  const athleteId =
    await finishEvaluationWithoutApproval(
      formData,
      AthleteEvaluationProcessStatus.REJECTED,
      "EVALUATION_REJECTED",
      true,
    );

  if (athleteId) {
    redirect(`/atletas/${athleteId}`);
  }
}

export async function releaseEvaluationAthlete(
  formData: FormData,
) {
  const athleteId =
    await finishEvaluationWithoutApproval(
      formData,
      AthleteEvaluationProcessStatus.RELEASED,
      "EVALUATION_RELEASED",
      true,
    );

  if (athleteId) {
    redirect(`/atletas/${athleteId}`);
  }
}

export async function withdrawEvaluationAthlete(
  formData: FormData,
) {
  const athleteId =
    await finishEvaluationWithoutApproval(
      formData,
      AthleteEvaluationProcessStatus.WITHDRAWN,
      "EVALUATION_WITHDRAWN",
      false,
    );

  if (athleteId) {
    redirect(`/atletas/${athleteId}`);
  }
}

export async function releaseAthlete(
  formData: FormData,
) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const athleteId = clean(formData.get("athleteId"));
  const membershipId = clean(formData.get("membershipId"));
  const originRaw = clean(formData.get("origin"));
  const reason = nullable(formData.get("reason"));
  const notes = nullable(formData.get("notes"));
  const occurredAt = parseDateInput(
    formData.get("occurredAt"),
  );

  const origin =
    originRaw === AthleteExitOrigin.FAMILY
      ? AthleteExitOrigin.FAMILY
      : originRaw === AthleteExitOrigin.CLUB
        ? AthleteExitOrigin.CLUB
        : null;

  if (
    !athleteId ||
    !membershipId ||
    !origin ||
    !reason
  ) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const athlete = await tx.athlete.findFirst({
      where: {
        id: athleteId,
        organizationId: user.organizationId,
        currentStatus: AthleteCurrentStatus.ACTIVE,
      },
      select: {
        id: true,
        categoryId: true,
      },
    });

    if (!athlete) return;

    const membership = await tx.athleteMembership.findFirst({
      where: {
        id: membershipId,
        athleteId: athlete.id,
        organizationId: user.organizationId,
        status: "ACTIVE",
      },
      select: {
        id: true,
        sport: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!membership) return;

    await tx.athleteMembership.update({
      where: {
        id: membership.id,
      },
      data: {
        status: "RELEASED",
        endedAt: occurredAt,
      },
    });

    const exitRecord = await tx.athleteExitRecord.create({
      data: {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        sport: membership.sport,
        origin,
        occurredAt,
        reason,
        notes,
        previousCategoryId: membership.categoryId,
        previousCategoryNameSnapshot:
          membership.category?.name ?? null,
        seasonSnapshot: processSeason(occurredAt),
        recordedByUserId: user.id,
        recordedByNameSnapshot: user.name,
      },
    });

    const remainingMembership =
      await tx.athleteMembership.findFirst({
        where: {
          athleteId: athlete.id,
          organizationId: user.organizationId,
          status: "ACTIVE",
        },
        orderBy: {
          startedAt: "asc",
        },
        select: {
          id: true,
          sport: true,
          categoryId: true,
        },
      });

    if (remainingMembership) {
      await tx.athlete.update({
        where: {
          id: athlete.id,
        },
        data: {
          currentStatus: AthleteCurrentStatus.ACTIVE,
          active: true,
          categoryId: remainingMembership.categoryId,
          evaluationTargetCategoryId: null,
        },
      });

      await tx.athleteEligibilityIssue.updateMany({
        where: {
          athleteId: athlete.id,
          organizationId: user.organizationId,
          source: AthleteEligibilityIssueSource.AUTOMATIC,
          scope:
            membership.sport === "FUTSAL"
              ? "FUTSAL"
              : "FOOTBALL",
          resolvedAt: null,
        },
        data: {
          resolvedAt: occurredAt,
          resolutionNotes:
            "Pendência encerrada porque o vínculo desta modalidade foi encerrado.",
          resolvedByUserId: user.id,
          resolvedByNameSnapshot: user.name,
        },
      });

      await syncAutomaticEligibility(tx, {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        actor: {
          id: user.id,
          name: user.name,
        },
        effectiveAt: occurredAt,
      });
    } else {
      await tx.athlete.update({
        where: {
          id: athlete.id,
        },
        data: {
          currentStatus: AthleteCurrentStatus.RELEASED,
          active: false,
          categoryId: null,
          evaluationTargetCategoryId: null,
        },
      });

      await closeAutomaticEligibilityIssues(tx, {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        actor: {
          id: user.id,
          name: user.name,
        },
        note:
          origin === AthleteExitOrigin.FAMILY
            ? "Pendência encerrada porque a família/atleta solicitou a saída da última modalidade ativa."
            : "Pendência encerrada porque o clube encerrou a última modalidade ativa do atleta.",
      });
    }

    await tx.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        actorUserId: user.id,
        action: AthleteDataAuditAction.UPDATED,
        entityType: "ATHLETE_STATUS",
        entityId: exitRecord.id,
        metadataJson: JSON.stringify({
          event: remainingMembership
            ? "ATHLETE_SPORT_RELEASED"
            : "ATHLETE_RELEASED",
          sport: membership.sport,
          origin,
          occurredAt: occurredAt.toISOString(),
          reason,
          fromCategory: membership.category
            ? {
                id: membership.category.id,
                name: membership.category.name,
              }
            : null,
          athleteStillActive: Boolean(remainingMembership),
          remainingMembership: remainingMembership
            ? {
                id: remainingMembership.id,
                sport: remainingMembership.sport,
                categoryId: remainingMembership.categoryId,
              }
            : null,
        }),
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  redirect(`/atletas/${athleteId}`);
}


export async function createAthleteEligibilityIssue(
  formData: FormData,
) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const athleteId = clean(formData.get("athleteId"));
  const typeRaw = clean(formData.get("type"));
  const reason = nullable(formData.get("reason"));
  const notes = nullable(formData.get("notes"));
  const startedAt = parseDateInput(
    formData.get("startedAt"),
  );

  const allowedTypes = new Set<string>([
    AthleteEligibilityIssueType.DOCUMENTATION,
    AthleteEligibilityIssueType.MEDICAL_EXAM,
    AthleteEligibilityIssueType.FEDERATION_REGISTRATION,
    AthleteEligibilityIssueType.COMPETITION_REGISTRATION,
    AthleteEligibilityIssueType.OTHER,
  ]);

  if (
    !athleteId ||
    !reason ||
    !allowedTypes.has(typeRaw)
  ) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const athlete = await tx.athlete.findFirst({
      where: {
        id: athleteId,
        organizationId: user.organizationId,
        currentStatus: AthleteCurrentStatus.ACTIVE,
        category: {
          type: "STANDARD",
        },
      },
      select: {
        id: true,
      },
    });

    if (!athlete) return;

    const issue = await tx.athleteEligibilityIssue.create({
      data: {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        type: typeRaw as AthleteEligibilityIssueType,
        source: AthleteEligibilityIssueSource.MANUAL,
        blocking: true,
        reason,
        notes,
        startedAt,
        createdByUserId: user.id,
        createdByNameSnapshot: user.name,
      },
    });

    await tx.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        actorUserId: user.id,
        action: AthleteDataAuditAction.CREATED,
        entityType: "ATHLETE_ELIGIBILITY",
        entityId: issue.id,
        metadataJson: JSON.stringify({
          event: "ATHLETE_MARKED_UNFIT",
          type: issue.type,
          startedAt: startedAt.toISOString(),
          reason,
        }),
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  redirect(`/atletas/${athleteId}`);
}

export async function resolveAthleteEligibilityIssue(
  formData: FormData,
) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const issueId = clean(formData.get("issueId"));
  const athleteId = clean(formData.get("athleteId"));
  const resolutionNotes = nullable(
    formData.get("resolutionNotes"),
  );
  const resolvedAt = parseDateInput(
    formData.get("resolvedAt"),
  );

  if (!issueId || !athleteId) return;

  await prisma.$transaction(async (tx) => {
    const issue = await tx.athleteEligibilityIssue.findFirst({
      where: {
        id: issueId,
        athleteId,
        organizationId: user.organizationId,
        resolvedAt: null,
      },
      select: {
        id: true,
        type: true,
        source: true,
      },
    });

    if (!issue) return;

    await tx.athleteEligibilityIssue.update({
      where: {
        id: issue.id,
      },
      data: {
        resolvedAt,
        resolutionNotes:
          resolutionNotes ??
          "Pendência regularizada pela gestão.",
        resolvedByUserId: user.id,
        resolvedByNameSnapshot: user.name,
      },
    });

    await tx.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId,
        actorUserId: user.id,
        action: AthleteDataAuditAction.UPDATED,
        entityType: "ATHLETE_ELIGIBILITY",
        entityId: issue.id,
        metadataJson: JSON.stringify({
          event: "ATHLETE_ELIGIBILITY_RESOLVED",
          type: issue.type,
          source: issue.source,
          resolvedAt: resolvedAt.toISOString(),
        }),
      },
    });

    await syncAutomaticEligibility(tx, {
      organizationId: user.organizationId,
      athleteId,
      actor: {
        id: user.id,
        name: user.name,
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  redirect(`/atletas/${athleteId}`);
}

export async function allowAthleteEligibilityOverride(
  formData: FormData,
) {
  const user = await requireClubPermission(
    "ORGANIZATION_MANAGE"
  );

  const issueId = clean(formData.get("issueId"));
  const athleteId = clean(formData.get("athleteId"));
  const reason = nullable(formData.get("reason"));
  const notes = nullable(formData.get("notes"));

  if (!issueId || !athleteId || !reason) return;

  const authorizedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const issue =
      await tx.athleteEligibilityIssue.findFirst({
        where: {
          id: issueId,
          athleteId,
          organizationId: user.organizationId,
          resolvedAt: null,
          blocking: true,
        },
        select: {
          id: true,
          type: true,
          source: true,
          key: true,
          reason: true,
        },
      });

    if (!issue) return;

    await tx.athleteEligibilityIssue.update({
      where: {
        id: issue.id,
      },
      data: {
        blocking: false,

        authorizedAt,
        authorizedByUserId: user.id,
        authorizedByNameSnapshot: user.name,
        authorizationReason: reason,

        authorizationRevokedAt: null,
        authorizationRevokedByUserId: null,
        authorizationRevokedByNameSnapshot: null,
        authorizationRevocationReason: null,
      },
    });

    await tx.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId,
        actorUserId: user.id,
        action: AthleteDataAuditAction.UPDATED,
        entityType: "ATHLETE_ELIGIBILITY",
        entityId: issue.id,
        metadataJson: JSON.stringify({
          event:
            "ATHLETE_ELIGIBILITY_OVERRIDE_ALLOWED",
          type: issue.type,
          source: issue.source,
          key: issue.key,
          issueReason: issue.reason,
          reason,
          notes,
          changedAt:
            authorizedAt.toISOString(),
          blocking: {
            from: true,
            to: false,
          },
          authorization: {
            status: "AUTHORIZED",
            authorizedAt:
              authorizedAt.toISOString(),
            reason,
            authorizedBy: {
              userId: user.id,
              name: user.name,
            },
          },
        }),
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  redirect(`/atletas/${athleteId}`);
}

export async function revokeAthleteEligibilityOverride(
  formData: FormData,
) {
  const user = await requireClubPermission(
    "ORGANIZATION_MANAGE"
  );

  const issueId = clean(formData.get("issueId"));
  const athleteId = clean(formData.get("athleteId"));
  const reason = nullable(formData.get("reason"));

  if (!issueId || !athleteId) return;

  const revokedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const issue =
      await tx.athleteEligibilityIssue.findFirst({
        where: {
          id: issueId,
          athleteId,
          organizationId: user.organizationId,
          resolvedAt: null,
          blocking: false,
        },
        select: {
          id: true,
          type: true,
          source: true,
          key: true,
          reason: true,
          authorizedAt: true,
          authorizedByUserId: true,
          authorizedByNameSnapshot: true,
          authorizationReason: true,
        },
      });

    if (!issue) return;

    await tx.athleteEligibilityIssue.update({
      where: {
        id: issue.id,
      },
      data: {
        blocking: true,

        authorizationRevokedAt: revokedAt,
        authorizationRevokedByUserId: user.id,
        authorizationRevokedByNameSnapshot:
          user.name,
        authorizationRevocationReason:
          reason,
      },
    });

    await tx.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId,
        actorUserId: user.id,
        action: AthleteDataAuditAction.UPDATED,
        entityType: "ATHLETE_ELIGIBILITY",
        entityId: issue.id,
        metadataJson: JSON.stringify({
          event:
            "ATHLETE_ELIGIBILITY_OVERRIDE_REVOKED",
          type: issue.type,
          source: issue.source,
          key: issue.key,
          issueReason: issue.reason,
          reason,
          changedAt:
            revokedAt.toISOString(),
          blocking: {
            from: false,
            to: true,
          },
          previousAuthorization: {
            authorizedAt:
              issue.authorizedAt?.toISOString() ??
              null,
            authorizedByUserId:
              issue.authorizedByUserId,
            authorizedByName:
              issue.authorizedByNameSnapshot,
            authorizationReason:
              issue.authorizationReason,
          },
          revocation: {
            revokedAt:
              revokedAt.toISOString(),
            reason,
            revokedBy: {
              userId: user.id,
              name: user.name,
            },
          },
        }),
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  redirect(`/atletas/${athleteId}`);
}

export async function resyncAthleteEligibility(
  formData: FormData,
) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const athleteId = clean(formData.get("athleteId"));

  if (!athleteId) return;

  await prisma.$transaction(async (tx) => {
    await syncAutomaticEligibility(tx, {
      organizationId: user.organizationId,
      athleteId,
      actor: {
        id: user.id,
        name: user.name,
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  redirect(`/atletas/${athleteId}`);
}

export async function registerRetroactiveEvaluation(
  formData: FormData,
) {
  const user = await requireClubPermission("ATHLETES_EDIT");

  const athleteId = clean(formData.get("athleteId"));
  const pair = clean(formData.get("evaluationTargetPair"));
  const statusRaw = clean(formData.get("status"));
  const reason = nullable(formData.get("reason"));
  const notes = nullable(formData.get("notes"));

  const [evaluationCategoryId, targetCategoryId] =
    pair.split("::");

  const allowedStatuses = new Set<string>([
    AthleteEvaluationProcessStatus.APPROVED,
    AthleteEvaluationProcessStatus.REJECTED,
    AthleteEvaluationProcessStatus.RELEASED,
    AthleteEvaluationProcessStatus.WITHDRAWN,
  ]);

  if (
    !athleteId ||
    !evaluationCategoryId ||
    !targetCategoryId ||
    !allowedStatuses.has(statusRaw)
  ) {
    return;
  }

  const startedAt = parseDateInput(
    formData.get("startedAt"),
  );
  const decidedAt = parseDateInput(
    formData.get("decidedAt"),
  );

  if (decidedAt.getTime() < startedAt.getTime()) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    const [athlete, targetLink] = await Promise.all([
      tx.athlete.findFirst({
        where: {
          id: athleteId,
          organizationId: user.organizationId,
        },
        select: {
          id: true,
        },
      }),
      tx.categoryEvaluationTarget.findFirst({
        where: {
          evaluationCategoryId,
          targetCategoryId,
          evaluationCategory: {
            organizationId: user.organizationId,
            type: "EVALUATION",
          },
          targetCategory: {
            organizationId: user.organizationId,
            type: "STANDARD",
          },
        },
        select: {
          evaluationCategory: {
            select: {
              id: true,
              name: true,
              sport: true,
            },
          },
          targetCategory: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    if (!athlete || !targetLink) return;

    const process =
      await tx.athleteEvaluationProcess.create({
        data: {
          organizationId: user.organizationId,
          athleteId: athlete.id,
          evaluationCategoryId:
            targetLink.evaluationCategory.id,
          targetCategoryId:
            targetLink.targetCategory.id,
          sport: targetLink.evaluationCategory.sport,
          status:
            statusRaw as AthleteEvaluationProcessStatus,
          entryMode:
            AthleteEvaluationProcessEntryMode.RETROACTIVE,
          startedAt,
          decidedAt,
          decisionReason: reason,
          notes,
          evaluationCategoryNameSnapshot:
            targetLink.evaluationCategory.name,
          targetCategoryNameSnapshot:
            targetLink.targetCategory.name,
          seasonSnapshot: processSeason(startedAt),
          createdByUserId: user.id,
          decidedByUserId: user.id,
          createdByNameSnapshot: user.name,
          decidedByNameSnapshot: user.name,
        },
      });

    await tx.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId: athlete.id,
        actorUserId: user.id,
        action: AthleteDataAuditAction.CREATED,
        entityType: "ATHLETE_EVALUATION_PROCESS",
        entityId: process.id,
        metadataJson: JSON.stringify({
          event: "EVALUATION_RETROACTIVE_REGISTERED",
          status: process.status,
          startedAt: startedAt.toISOString(),
          decidedAt: decidedAt.toISOString(),
          evaluationCategory: {
            id: targetLink.evaluationCategory.id,
            name: targetLink.evaluationCategory.name,
          },
          targetCategory: {
            id: targetLink.targetCategory.id,
            name: targetLink.targetCategory.name,
          },
        }),
      },
    });
  });

  revalidateEvaluationPaths(athleteId);
  redirect(`/atletas/${athleteId}`);
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
