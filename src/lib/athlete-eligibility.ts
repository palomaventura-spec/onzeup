import {
  AthleteCurrentStatus,
  AthleteEligibilityIssueSource,
  AthleteEligibilityIssueType,
  AthleteEligibilityScope,
  Prisma,
} from "@prisma/client";

export type EligibilityActor = {
  id: string;
  name: string;
};

type AutomaticEligibilityIssue = {
  key: string;
  type: AthleteEligibilityIssueType;
  scope: AthleteEligibilityScope;
  reason: string;
  shouldBeOpen: boolean;
};

async function setAutomaticEligibilityIssue(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    athleteId: string;
    issue: AutomaticEligibilityIssue;
    actor: EligibilityActor;
    effectiveAt?: Date;
  },
) {
  const openIssues = await tx.athleteEligibilityIssue.findMany({
    where: {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      source: AthleteEligibilityIssueSource.AUTOMATIC,
      key: input.issue.key,
      resolvedAt: null,
    },
    orderBy: {
      startedAt: "asc",
    },
  });

  if (input.issue.shouldBeOpen) {
    if (!openIssues.length) {
      await tx.athleteEligibilityIssue.create({
        data: {
          organizationId: input.organizationId,
          athleteId: input.athleteId,
          type: input.issue.type,
          source: AthleteEligibilityIssueSource.AUTOMATIC,
          scope: input.issue.scope,
          blocking: true,
          key: input.issue.key,
          reason: input.issue.reason,
          startedAt: input.effectiveAt ?? new Date(),
          createdByUserId: input.actor.id,
          createdByNameSnapshot: input.actor.name,
        },
      });

      return;
    }

    const [primary, ...duplicates] = openIssues;

    if (
      primary.reason !== input.issue.reason ||
      primary.scope !== input.issue.scope
    ) {
      await tx.athleteEligibilityIssue.update({
        where: {
          id: primary.id,
        },
        data: {
          reason: input.issue.reason,
          scope: input.issue.scope,
        },
      });
    }

    if (duplicates.length) {
      await tx.athleteEligibilityIssue.updateMany({
        where: {
          id: {
            in: duplicates.map((issue) => issue.id),
          },
        },
        data: {
          resolvedAt: new Date(),
          resolutionNotes:
            "Pendência automática duplicada encerrada pelo sistema.",
          resolvedByUserId: input.actor.id,
          resolvedByNameSnapshot: input.actor.name,
        },
      });
    }

    return;
  }

  if (openIssues.length) {
    await tx.athleteEligibilityIssue.updateMany({
      where: {
        id: {
          in: openIssues.map((issue) => issue.id),
        },
      },
      data: {
        resolvedAt: new Date(),
        resolutionNotes:
          "Requisito regularizado e conferido pelo 11UP.",
        resolvedByUserId: input.actor.id,
        resolvedByNameSnapshot: input.actor.name,
      },
    });
  }
}

export async function closeAutomaticEligibilityIssues(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    athleteId: string;
    actor: EligibilityActor;
    note: string;
  },
) {
  await tx.athleteEligibilityIssue.updateMany({
    where: {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      source: AthleteEligibilityIssueSource.AUTOMATIC,
      resolvedAt: null,
    },
    data: {
      resolvedAt: new Date(),
      resolutionNotes: input.note,
      resolvedByUserId: input.actor.id,
      resolvedByNameSnapshot: input.actor.name,
    },
  });
}

export async function syncAutomaticEligibility(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    athleteId: string;
    actor: EligibilityActor;
    effectiveAt?: Date;
  },
) {
  const now = new Date();

  const athlete = await tx.athlete.findFirst({
    where: {
      id: input.athleteId,
      organizationId: input.organizationId,
    },
    select: {
      id: true,
      currentStatus: true,
      documentationConfirmedAt: true,

      memberships: {
        where: {
          status: "ACTIVE",
        },
        select: {
          id: true,
          sport: true,
          category: {
            select: {
              id: true,
              type: true,
              sport: true,
              requiresDocumentation: true,
              requiresMedicalExam: true,
              requiresFederationRegistration: true,

              documentRequirements: {
                where: {
                  active: true,
                  required: true,
                },
                select: {
                  id: true,
                  minCount: true,
                  requiresApproval: true,
                  requiresExpiry: true,
                },
              },
            },
          },
        },
      },

      documents: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          category: true,
          requirementId: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      },

      sportRegistrations: {
        where: {
          authorityType: "FEDERATION",
          status: "ACTIVE",
        },
        select: {
          sport: true,
          status: true,
        },
      },
    },
  });

  if (
    !athlete ||
    athlete.currentStatus !== AthleteCurrentStatus.ACTIVE
  ) {
    if (athlete) {
      await closeAutomaticEligibilityIssues(tx, {
        organizationId: input.organizationId,
        athleteId: input.athleteId,
        actor: input.actor,
        note:
          "Pendência automática encerrada porque o atleta não está no elenco ativo.",
      });
    }

    return;
  }

  const activeStandardMemberships =
    athlete.memberships.filter(
      (membership) =>
        membership.category?.type === "STANDARD",
    );

  if (!activeStandardMemberships.length) {
    await closeAutomaticEligibilityIssues(tx, {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      actor: input.actor,
      note:
        "Pendência automática encerrada porque o atleta não possui vínculo esportivo ativo no elenco.",
    });

    return;
  }

  const activeDocuments = athlete.documents.filter(
    (document) => document.status !== "ARCHIVED",
  );

  const requiredDocumentRequirements =
    activeStandardMemberships
      .flatMap(
        (membership) =>
          membership.category?.documentRequirements ?? []
      )
      .filter(
        (requirement, index, items) =>
          items.findIndex(
            (item) => item.id === requirement.id
          ) === index
      );

  const hasConfiguredDocumentRequirements =
    requiredDocumentRequirements.length > 0;

  const requiredDocumentIds = new Set(
    requiredDocumentRequirements.map(
      (requirement) => requirement.id
    )
  );

  const allRequiredDocumentsFulfilled =
    hasConfiguredDocumentRequirements &&
    requiredDocumentRequirements.every(
      (requirement) => {
        const validDocuments = activeDocuments.filter(
          (document) => {
            if (
              document.requirementId !== requirement.id
            ) {
              return false;
            }

            const expired =
              document.status === "EXPIRED" ||
              Boolean(
                document.expiresAt &&
                  document.expiresAt < now
              ) ||
              Boolean(
                requirement.requiresExpiry &&
                  !document.expiresAt
              );

            if (
              expired ||
              document.status === "REJECTED"
            ) {
              return false;
            }

            if (requirement.requiresApproval) {
              return document.status === "APPROVED";
            }

            return true;
          }
        );

        return (
          validDocuments.length >= requirement.minCount
        );
      }
    );

  const hasRelevantDocumentAfterConfirmation =
    athlete.documentationConfirmedAt
      ? activeDocuments.some(
          (document) =>
            Boolean(
              document.requirementId &&
                requiredDocumentIds.has(
                  document.requirementId
                )
            ) &&
            document.createdAt >
              athlete.documentationConfirmedAt!,
        )
      : false;

  const hasExpiredLegacyDocument =
    activeDocuments.some(
      (document) =>
        document.status === "EXPIRED" ||
        Boolean(
          document.expiresAt &&
            document.expiresAt < now
        ),
    );

  const hasPendingOrRejectedLegacyDocument =
    activeDocuments.some(
      (document) =>
        document.status === "PENDING" ||
        document.status === "REJECTED",
    );

  const hasLegacyDocumentAfterConfirmation =
    athlete.documentationConfirmedAt
      ? activeDocuments.some(
          (document) =>
            document.createdAt >
            athlete.documentationConfirmedAt!,
        )
      : false;

  const documentationReady =
    Boolean(athlete.documentationConfirmedAt) &&
    (hasConfiguredDocumentRequirements
      ? allRequiredDocumentsFulfilled &&
        !hasRelevantDocumentAfterConfirmation
      : activeDocuments.length > 0 &&
        !hasExpiredLegacyDocument &&
        !hasPendingOrRejectedLegacyDocument &&
        !hasLegacyDocumentAfterConfirmation);

  const validMedicalDocument = activeDocuments.some(
    (document) =>
      (document.category === "MEDICAL_EXAM" ||
        document.category === "MEDICAL_CLEARANCE") &&
      document.status === "APPROVED" &&
      (!document.expiresAt ||
        document.expiresAt >= now),
  );

  const federationSports = new Set(
    athlete.sportRegistrations.map(
      (registration) => registration.sport,
    ),
  );

  const requiresDocumentation =
    hasConfiguredDocumentRequirements ||
    activeStandardMemberships.some(
      (membership) =>
        membership.category?.requiresDocumentation,
    );

  const requiresMedicalExam =
    activeStandardMemberships.some(
      (membership) =>
        membership.category?.requiresMedicalExam,
    );

  const automaticIssues: AutomaticEligibilityIssue[] = [
    {
      key: "AUTO:DOCUMENTATION",
      type: AthleteEligibilityIssueType.DOCUMENTATION,
      scope: AthleteEligibilityScope.GLOBAL,
      reason:
        "Documentação obrigatória ainda não está completa e confirmada.",
      shouldBeOpen:
        requiresDocumentation && !documentationReady,
    },
    {
      key: "AUTO:MEDICAL_EXAM",
      type: AthleteEligibilityIssueType.MEDICAL_EXAM,
      scope: AthleteEligibilityScope.GLOBAL,
      reason:
        "Exame ou atestado médico obrigatório ainda não foi apresentado, aprovado ou está fora da validade.",
      shouldBeOpen:
        requiresMedicalExam && !validMedicalDocument,
    },
  ];

  for (const sport of ["FOOTBALL", "FUTSAL"] as const) {
    const sportMemberships =
      activeStandardMemberships.filter(
        (membership) =>
          membership.sport === sport ||
          membership.sport === "BOTH",
      );

    const required =
      sportMemberships.some(
        (membership) =>
          membership.category
            ?.requiresFederationRegistration,
      );

    automaticIssues.push({
      key: `AUTO:FEDERATION:${sport}`,
      type:
        AthleteEligibilityIssueType.FEDERATION_REGISTRATION,
      scope:
        sport === "FOOTBALL"
          ? AthleteEligibilityScope.FOOTBALL
          : AthleteEligibilityScope.FUTSAL,
      reason:
        sport === "FOOTBALL"
          ? "Inscrição na federação de futebol ainda não está ativa."
          : "Inscrição na federação de futsal ainda não está ativa.",
      shouldBeOpen:
        required && !federationSports.has(sport),
    });
  }

  for (const issue of automaticIssues) {
    await setAutomaticEligibilityIssue(tx, {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      issue,
      actor: input.actor,
      effectiveAt: input.effectiveAt,
    });
  }
}