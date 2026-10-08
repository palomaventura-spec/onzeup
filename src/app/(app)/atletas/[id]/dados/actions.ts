"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { encryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function nullable(value: FormDataEntryValue | null) {
  const normalized = clean(value);
  return normalized || null;
}

function numberValue(value: FormDataEntryValue | null) {
  const normalized = clean(value).replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function dateValue(value: FormDataEntryValue | null) {
  const normalized = clean(value);
  if (!normalized) return null;

  const parsed = new Date(`${normalized}T12:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ownedAthlete(athleteId: string, organizationId: string) {
  if (!athleteId) return null;

  return prisma.athlete.findFirst({
    where: { id: athleteId, organizationId },
    select: { id: true },
  });
}

async function audit(input: {
  organizationId: string;
  athleteId: string;
  actorUserId: string;
  action: "CREATED" | "UPDATED" | "DELETED";
  entityType: string;
  entityId?: string | null;
  fields?: string[];
}) {
  await prisma.athleteDataAuditLog.create({
    data: {
      organizationId: input.organizationId,
      athleteId: input.athleteId,
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      metadataJson: JSON.stringify({ fields: input.fields || [] }),
    },
  });
}

function refresh(athleteId: string) {
  revalidatePath(`/atletas/${athleteId}`);
  revalidatePath(`/atletas/${athleteId}/dados`);
  revalidatePath(`/atletas/${athleteId}/performance`);
}
async function requirePrivateAthleteActionUser() {
  const user = await requireClubPermission("ATHLETES_EDIT");

  // SUPER_ADMIN / suporte 11UP nunca altera dados privados,
  // médicos, responsáveis ou documentação sensível do atleta.
  if (user.role === "SUPER_ADMIN") {
    redirect("/dashboard?support=private-data-restricted");
  }

  return user;
}

export async function saveAthletePrivateData(formData: FormData) {
  const user = await requirePrivateAthleteActionUser();
  const athleteId = clean(formData.get("athleteId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete) return;

  const data = {
    birthDate: dateValue(formData.get("birthDate")),
    rgEncrypted: encryptPrivateData(nullable(formData.get("rg"))),
    rgIssuerEncrypted: encryptPrivateData(nullable(formData.get("rgIssuer"))),
    cpfEncrypted: encryptPrivateData(nullable(formData.get("cpf"))),
    nationality: nullable(formData.get("nationality")),
    naturality: nullable(formData.get("naturality")),
    email: nullable(formData.get("email")),
    instagram: nullable(formData.get("instagram")),
    bloodTypeEncrypted: encryptPrivateData(nullable(formData.get("bloodType"))),
    allergiesEncrypted: encryptPrivateData(nullable(formData.get("allergies"))),
    medicationsEncrypted: encryptPrivateData(nullable(formData.get("medications"))),
    healthConditionsEncrypted: encryptPrivateData(
      nullable(formData.get("healthConditions"))
    ),
    medicalRestrictionsEncrypted: encryptPrivateData(
      nullable(formData.get("medicalRestrictions"))
    ),
    healthPlanEncrypted: encryptPrivateData(nullable(formData.get("healthPlan"))),
    healthPlanNumberEncrypted: encryptPrivateData(
      nullable(formData.get("healthPlanNumber"))
    ),
    emergencyContactNameEncrypted: encryptPrivateData(
      nullable(formData.get("emergencyContactName"))
    ),
    emergencyContactPhoneEncrypted: encryptPrivateData(
      nullable(formData.get("emergencyContactPhone"))
    ),
    emergencyContactRelationEncrypted: encryptPrivateData(
      nullable(formData.get("emergencyContactRelation"))
    ),
    medicalNotesEncrypted: encryptPrivateData(
      nullable(formData.get("medicalNotes"))
    ),
  };

  const existing = await prisma.athletePrivateData.findUnique({
    where: { athleteId },
    select: { id: true },
  });

  const saved = await prisma.athletePrivateData.upsert({
    where: { athleteId },
    update: data,
    create: { athleteId, ...data },
    select: { id: true },
  });

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: existing ? "UPDATED" : "CREATED",
    entityType: "AthletePrivateData",
    entityId: saved.id,
    fields: ["registration", "health", "emergencyContact"],
  });

  refresh(athleteId);
}

export async function saveAthleteGuardian(formData: FormData) {
  const user = await requirePrivateAthleteActionUser();
  const athleteId = clean(formData.get("athleteId"));
  const guardianId = nullable(formData.get("guardianId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete) return;

  const relationInput = clean(formData.get("relation"));
  const relation = ["FATHER", "MOTHER", "LEGAL_GUARDIAN", "OTHER"].includes(
    relationInput
  )
    ? (relationInput as "FATHER" | "MOTHER" | "LEGAL_GUARDIAN" | "OTHER")
    : "OTHER";
  const name = clean(formData.get("name"));
  if (!name) return;

  const data = {
    relation,
    name,
    rgEncrypted: encryptPrivateData(nullable(formData.get("rg"))),
    rgIssuerEncrypted: encryptPrivateData(nullable(formData.get("rgIssuer"))),
    cpfEncrypted: encryptPrivateData(nullable(formData.get("cpf"))),
    nationality: nullable(formData.get("nationality")),
    naturality: nullable(formData.get("naturality")),
    maritalStatus: nullable(formData.get("maritalStatus")),
    profession: nullable(formData.get("profession")),
    email: nullable(formData.get("email")),
    phone: nullable(formData.get("phone")),
    address: nullable(formData.get("address")),
    city: nullable(formData.get("city")),
    neighborhood: nullable(formData.get("neighborhood")),
    postalCode: nullable(formData.get("postalCode")),
    instagram: nullable(formData.get("instagram")),
    isPrimary: clean(formData.get("isPrimary")) === "true",
    authorizedForPickup:
      clean(formData.get("authorizedForPickup")) === "true",
  };

  let savedId: string;
  let action: "CREATED" | "UPDATED" = "CREATED";

  if (guardianId) {
    const guardian = await prisma.athleteGuardian.findFirst({
      where: { id: guardianId, athleteId },
      select: { id: true },
    });
    if (!guardian) return;

    const saved = await prisma.athleteGuardian.update({
      where: { id: guardian.id },
      data,
      select: { id: true },
    });
    savedId = saved.id;
    action = "UPDATED";
  } else {
    const saved = await prisma.athleteGuardian.create({
      data: { athleteId, ...data },
      select: { id: true },
    });
    savedId = saved.id;
  }

  if (data.isPrimary) {
    await prisma.athleteGuardian.updateMany({
      where: { athleteId, id: { not: savedId } },
      data: { isPrimary: false },
    });
  }

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action,
    entityType: "AthleteGuardian",
    entityId: savedId,
    fields: ["guardianRegistration"],
  });

  refresh(athleteId);
}

export async function deleteAthleteGuardian(formData: FormData) {
  const user = await requirePrivateAthleteActionUser();
  const athleteId = clean(formData.get("athleteId"));
  const guardianId = clean(formData.get("guardianId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete || !guardianId) return;

  const guardian = await prisma.athleteGuardian.findFirst({
    where: { id: guardianId, athleteId },
    select: { id: true },
  });
  if (!guardian) return;

  await prisma.athleteGuardian.delete({ where: { id: guardian.id } });
  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "DELETED",
    entityType: "AthleteGuardian",
    entityId: guardian.id,
  });

  refresh(athleteId);
}

export async function createBodyMeasurement(formData: FormData) {
  const user = await requirePrivateAthleteActionUser();
  const athleteId = clean(formData.get("athleteId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete) return;

  const enteredHeight = numberValue(formData.get("heightCm"));
  const convertedHeight =
    enteredHeight && enteredHeight <= 3
      ? enteredHeight * 100
      : enteredHeight;
  const heightCm =
    convertedHeight && convertedHeight >= 40 && convertedHeight <= 250
      ? Number(convertedHeight.toFixed(2))
      : null;
  const weightKg = numberValue(formData.get("weightKg"));
  const calculatedBmi =
    heightCm && weightKg
      ? weightKg / Math.pow(heightCm / 100, 2)
      : null;
  const bmi =
    calculatedBmi && calculatedBmi >= 5 && calculatedBmi <= 100
      ? Number(calculatedBmi.toFixed(2))
      : null;

  const measurement = await prisma.athleteBodyMeasurement.create({
    data: {
      organizationId: user.organizationId,
      athleteId,
      recordedByUserId: user.id,
      measuredAt: dateValue(formData.get("measuredAt")) || new Date(),
      heightCm,
      weightKg,
      bmi,
      wingspanCm: numberValue(formData.get("wingspanCm")),
      bodyFatPercent: numberValue(formData.get("bodyFatPercent")),
      muscleMassKg: numberValue(formData.get("muscleMassKg")),
      notes: nullable(formData.get("notes")),
    },
    select: { id: true },
  });

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "CREATED",
    entityType: "AthleteBodyMeasurement",
    entityId: measurement.id,
    fields: ["physicalMeasurement"],
  });

  refresh(athleteId);
}

export async function deleteBodyMeasurement(formData: FormData) {
  const user = await requirePrivateAthleteActionUser();
  const athleteId = clean(formData.get("athleteId"));
  const measurementId = clean(formData.get("measurementId"));
  const athlete = await ownedAthlete(athleteId, user.organizationId);
  if (!athlete || !measurementId) return;

  const measurement = await prisma.athleteBodyMeasurement.findFirst({
    where: {
      id: measurementId,
      athleteId,
      organizationId: user.organizationId,
    },
    select: { id: true },
  });
  if (!measurement) return;

  await prisma.athleteBodyMeasurement.delete({
    where: { id: measurement.id },
  });
  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "DELETED",
    entityType: "AthleteBodyMeasurement",
    entityId: measurement.id,
  });

  refresh(athleteId);
}
export async function confirmAthleteDocumentation(formData: FormData) {
  const user = await requirePrivateAthleteActionUser();
  const athleteId = clean(formData.get("athleteId"));

  const athlete = await ownedAthlete(
    athleteId,
    user.organizationId
  );

  if (!athlete) return;

  const now = new Date();

  const [documents, pendingRequests, memberships] =
    await Promise.all([
      prisma.athleteDocument.findMany({
        where: {
          athleteId,
          organizationId: user.organizationId,
          deletedAt: null,
          status: { not: "ARCHIVED" },
        },
        select: {
          id: true,
          requirementId: true,
          status: true,
          expiresAt: true,
        },
      }),

      prisma.athleteRegistrationRequest.count({
        where: {
          athleteId,
          organizationId: user.organizationId,
          status: "PENDING",
        },
      }),

      prisma.athleteMembership.findMany({
        where: {
          athleteId,
          organizationId: user.organizationId,
          status: "ACTIVE",
          categoryId: { not: null },
        },
        select: {
          category: {
            select: {
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
      }),
    ]);

  if (pendingRequests > 0) return;

  const blockingManualDocumentIssues =
    await prisma.athleteDocumentManualIssue.count({
      where: {
        athleteId,
        organizationId: user.organizationId,
        status: "OPEN",
        blocking: true,
      },
    });

  if (blockingManualDocumentIssues > 0) return;

  const requiredDocuments = memberships
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

  const hasConfiguredRequirements =
    requiredDocuments.length > 0;

  let documentationReady = false;

  if (hasConfiguredRequirements) {
    documentationReady = requiredDocuments.every(
      (requirement) => {
        const validDocuments = documents.filter(
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
  } else {
    documentationReady =
      documents.length > 0 &&
      documents.every(
        (document) =>
          document.status === "APPROVED" &&
          !(
            document.expiresAt &&
            document.expiresAt < now
          )
      );
  }

  if (!documentationReady) return;

  const confirmedAt = new Date();

  await prisma.$transaction([
    prisma.athlete.update({
      where: { id: athleteId },
      data: {
        documentationConfirmedAt: confirmedAt,
      },
    }),

    prisma.athleteDataAuditLog.create({
      data: {
        organizationId: user.organizationId,
        athleteId,
        actorUserId: user.id,
        action: "UPDATED",
        entityType: "AthleteDocumentation",
        entityId: athleteId,
        metadataJson: JSON.stringify({
          documentationConfirmedAt:
            confirmedAt.toISOString(),
          documentCount: documents.length,
          requirementCount:
            requiredDocuments.length,
          validationMode: hasConfiguredRequirements
            ? "CATEGORY_REQUIREMENTS"
            : "LEGACY_DOCUMENTS",
        }),
      },
    }),
  ]);

  refresh(athleteId);
}

export async function createManualDocumentIssue(formData: FormData) {
  const user = await requirePrivateAthleteActionUser();

  const athleteId = clean(formData.get("athleteId"));
  const title = clean(formData.get("title"));
  const notes = nullable(formData.get("notes"));
  const blocking = clean(formData.get("blocking")) === "true";

  if (!athleteId || !title) return;

  const athlete = await ownedAthlete(
    athleteId,
    user.organizationId
  );

  if (!athlete) return;

  const issue = await prisma.$transaction(async (tx) => {
    const created =
      await tx.athleteDocumentManualIssue.create({
        data: {
          organizationId: user.organizationId,
          athleteId,
          title,
          notes,
          blocking,
          status: "OPEN",
          createdByUserId: user.id,
          createdByNameSnapshot: user.name,
        },
      });

    if (blocking) {
      await tx.athleteEligibilityIssue.create({
        data: {
          organizationId: user.organizationId,
          athleteId,
          type: "DOCUMENTATION",
          source: "MANUAL",
          scope: "GLOBAL",
          blocking: true,
          key: `MANUAL:DOCUMENT:${created.id}`,
          reason: `Pendência documental: ${title}`,
          notes,
          sourceReferenceType:
            "AthleteDocumentManualIssue",
          sourceReferenceId: created.id,
          createdByUserId: user.id,
          createdByNameSnapshot: user.name,
        },
      });
    }

    return created;
  });

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "CREATED",
    entityType: "AthleteDocumentManualIssue",
    entityId: issue.id,
    fields: [
      "title",
      "notes",
      "blocking",
      "status",
    ],
  });

  refresh(athleteId);
}

export async function resolveManualDocumentIssue(
  formData: FormData
) {
  const user = await requirePrivateAthleteActionUser();

  const athleteId = clean(formData.get("athleteId"));
  const issueId = clean(formData.get("issueId"));
  const resolutionNotes = nullable(
    formData.get("resolutionNotes")
  );

  if (!athleteId || !issueId) return;

  const athlete = await ownedAthlete(
    athleteId,
    user.organizationId
  );

  if (!athlete) return;

  const issue =
    await prisma.athleteDocumentManualIssue.findFirst({
      where: {
        id: issueId,
        athleteId,
        organizationId: user.organizationId,
      },
    });

  if (!issue || issue.status === "RESOLVED") return;

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.athleteDocumentManualIssue.update({
      where: {
        id: issue.id,
      },
      data: {
        status: "RESOLVED",
        resolvedAt: now,
        resolvedByUserId: user.id,
        resolvedByNameSnapshot: user.name,
        resolutionNotes,
      },
    });

    await tx.athleteEligibilityIssue.updateMany({
      where: {
        organizationId: user.organizationId,
        athleteId,
        source: "MANUAL",
        sourceReferenceType:
          "AthleteDocumentManualIssue",
        sourceReferenceId: issue.id,
        resolvedAt: null,
      },
      data: {
        resolvedAt: now,
        resolutionNotes:
          resolutionNotes ??
          "Pendência documental manual resolvida.",
        resolvedByUserId: user.id,
        resolvedByNameSnapshot: user.name,
      },
    });
  });

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "UPDATED",
    entityType: "AthleteDocumentManualIssue",
    entityId: issue.id,
    fields: [
      "status",
      "resolvedAt",
      "resolutionNotes",
    ],
  });

  refresh(athleteId);
}

export async function reopenManualDocumentIssue(
  formData: FormData
) {
  const user = await requirePrivateAthleteActionUser();

  const athleteId = clean(formData.get("athleteId"));
  const issueId = clean(formData.get("issueId"));

  if (!athleteId || !issueId) return;

  const athlete = await ownedAthlete(
    athleteId,
    user.organizationId
  );

  if (!athlete) return;

  const issue =
    await prisma.athleteDocumentManualIssue.findFirst({
      where: {
        id: issueId,
        athleteId,
        organizationId: user.organizationId,
      },
    });

  if (!issue || issue.status === "OPEN") return;

  await prisma.$transaction(async (tx) => {
    await tx.athleteDocumentManualIssue.update({
      where: {
        id: issue.id,
      },
      data: {
        status: "OPEN",
        resolvedAt: null,
        resolvedByUserId: null,
        resolvedByNameSnapshot: null,
        resolutionNotes: null,
      },
    });

    if (issue.blocking) {
      const openEligibilityIssue =
        await tx.athleteEligibilityIssue.findFirst({
          where: {
            organizationId: user.organizationId,
            athleteId,
            source: "MANUAL",
            sourceReferenceType:
              "AthleteDocumentManualIssue",
            sourceReferenceId: issue.id,
            resolvedAt: null,
          },
          select: {
            id: true,
          },
        });

      if (!openEligibilityIssue) {
        await tx.athleteEligibilityIssue.create({
          data: {
            organizationId: user.organizationId,
            athleteId,
            type: "DOCUMENTATION",
            source: "MANUAL",
            scope: "GLOBAL",
            blocking: true,
            key: `MANUAL:DOCUMENT:${issue.id}`,
            reason:
              `Pendência documental: ${issue.title}`,
            notes: issue.notes,
            sourceReferenceType:
              "AthleteDocumentManualIssue",
            sourceReferenceId: issue.id,
            createdByUserId: user.id,
            createdByNameSnapshot: user.name,
          },
        });
      }
    }
  });

  await audit({
    organizationId: user.organizationId,
    athleteId,
    actorUserId: user.id,
    action: "UPDATED",
    entityType: "AthleteDocumentManualIssue",
    entityId: issue.id,
    fields: ["status"],
  });

  refresh(athleteId);
}