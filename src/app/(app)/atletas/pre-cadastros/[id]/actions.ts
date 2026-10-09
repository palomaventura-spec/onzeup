"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import {
  encryptPrivateData,
  safeDecryptPrivateData,
} from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

type PreRegistrationPayload = {
  version?: number;

  athlete?: {
    name?: string | null;
    nickname?: string | null;
    identity?: string | null;
    cpf?: string | null;
    birthDate?: string | null;
    birthYear?: number | null;
    height?: number | null;
    weight?: number | null;
    category?: string | null;
    position1?: string | null;
    position2?: string | null;

    // compatibilidade com a primeira versão
    position?: string | null;
    dominantFoot?: string | null;
    jerseyNumber?: number | null;
  };

  family?: {
    fatherName?: string | null;
    motherName?: string | null;
    address?: string | null;
    email?: string | null;
    phone1?: string | null;
    phone2?: string | null;
  };

  health?: {
    hasHealthPlan?: boolean;
    healthPlanName?: string | null;
    susCard?: string | null;
  };

  sportsHistory?: {
    lastClub?: string | null;
    registeredClubs?: string | null;
    amateurBond?: boolean;
    referral?: string | null;
    intermediary?: string | null;
    arrivalDate?: string | null;
  };

  guardian?: {
    name?: string | null;
    relation?: string | null;
    phone?: string | null;
    email?: string | null;
    accepted?: boolean;
  };
};

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function parsePayload(
  payloadEncrypted: string | null,
): PreRegistrationPayload {
  try {
    const decrypted =
      safeDecryptPrivateData(payloadEncrypted);

    if (!decrypted) return {};

    return JSON.parse(
      decrypted,
    ) as PreRegistrationPayload;
  } catch {
    return {};
  }
}

function parseBirthDate(
  value: string | null | undefined,
) {
  if (!value) return null;

  const date = new Date(
    value.length === 10
      ? `${value}T12:00:00`
      : value,
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function guardianRelation(
  value: string | null | undefined,
):
  | "FATHER"
  | "MOTHER"
  | "LEGAL_GUARDIAN"
  | "OTHER" {
  if (value === "FATHER") return "FATHER";
  if (value === "MOTHER") return "MOTHER";
  if (value === "OTHER") return "OTHER";

  return "LEGAL_GUARDIAN";
}

export async function approveAthletePreRegistration(
  formData: FormData,
) {
  const user =
    await requireClubPermission("ATHLETES_EDIT");

  const registrationId =
    clean(formData.get("registrationId"));

  if (!registrationId) {
    return;
  }

  const registration =
    await prisma.athletePreRegistrationRequest.findFirst({
      where: {
        id: registrationId,
        organizationId: user.organizationId,
      },

      select: {
        id: true,
        organizationId: true,
        categoryId: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            sport: true,
            evaluationTargets: {
              where: {
                targetCategory: {
                  active: true,
                  type: "STANDARD",
                },
              },
              select: {
                targetCategory: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
              take: 1,
            },
          },
        },
        status: true,
        payloadEncrypted: true,
        recipientName: true,
        recipientPhone: true,
        recipientEmail: true,
      },
    });

  if (
    !registration ||
    registration.status !== "SUBMITTED"
  ) {
    return;
  }

  const payload = parsePayload(
    registration.payloadEncrypted,
  );

  const athleteData = payload.athlete || {};
  const family = payload.family || {};
  const health = payload.health || {};
  const guardian = payload.guardian || {};

  const athleteName =
    athleteData.name?.trim();

  if (!athleteName) {
    return;
  }

  const birthDate = parseBirthDate(
    athleteData.birthDate,
  );

  const birthYear =
    birthDate?.getFullYear() ??
    athleteData.birthYear ??
    null;

  const guardianName =
    guardian.name?.trim() ||
    registration.recipientName?.trim() ||
    null;

  const guardianPhone =
    guardian.phone?.trim() ||
    family.phone1?.trim() ||
    registration.recipientPhone?.trim() ||
    null;

  const guardianEmail =
    guardian.email?.trim() ||
    family.email?.trim() ||
    registration.recipientEmail?.trim() ||
    null;

  const relation =
    guardianRelation(guardian.relation);
  const approvedAt = new Date();

  const createdAthlete =
    await prisma.$transaction(async (tx) => {
      /*
       * Reserva esta solicitação dentro da transação.
       * Evita criação duplicada em caso de clique duplo.
       */
      const reserved =
        await tx.athletePreRegistrationRequest.updateMany({
          where: {
            id: registration.id,
            organizationId:
              user.organizationId,
            status: "SUBMITTED",
          },

          data: {
            status: "APPROVED",
            reviewedByUserId: user.id,
            reviewedAt: new Date(),
          },
        });

      if (reserved.count !== 1) {
        throw new Error(
          "PRE_REGISTRATION_ALREADY_REVIEWED",
        );
      }

      const athlete = await tx.athlete.create({
        data: {
          name: athleteName,

          nickname:
            athleteData.nickname?.trim() ||
            null,

          jerseyNumber:
            typeof athleteData.jerseyNumber ===
            "number"
              ? athleteData.jerseyNumber
              : null,

          position:
            athleteData.position1?.trim() ||
            athleteData.position?.trim() ||
            null,

          dominantFoot:
            athleteData.dominantFoot?.trim() ||
            null,

          birthYear,

            active: true,

            currentStatus:
              registration.category?.type === "EVALUATION"
                ? "EVALUATION"
                : "ACTIVE",

            evaluationTargetCategoryId:
              registration.category?.type === "EVALUATION"
                ? registration.category.evaluationTargets[0]
                    ?.targetCategory.id ?? null
                : null,

            guardianName,
          guardianPhone,
          guardianEmail,
          guardianRelation: relation,

          organizationId:
            user.organizationId,

          categoryId:
            registration.categoryId,
        },
      });

      /*
       * Dados privados do atleta.
       * RG, CPF e plano de saúde continuam criptografados.
       */
      await tx.athletePrivateData.create({
        data: {
          athleteId: athlete.id,

          birthDate,

          rgEncrypted:
            encryptPrivateData(
              athleteData.identity ||
                null,
            ),

          cpfEncrypted:
            encryptPrivateData(
              athleteData.cpf ||
                null,
            ),

          email:
            family.email?.trim() ||
            guardianEmail ||
            null,

          healthPlanEncrypted:
            health.hasHealthPlan
              ? encryptPrivateData(
                  health.healthPlanName ||
                    "Possui plano de saúde",
                )
              : null,
        },
      });

      /*
       * Responsável principal.
       */
        if (registration.category) {
          await tx.athleteMembership.create({
            data: {
              athleteId: athlete.id,
              organizationId: user.organizationId,
              categoryId: registration.category.id,
              sport: registration.category.sport,
              season: String(approvedAt.getUTCFullYear()),
              status: "ACTIVE",
              verified: true,
              startedAt: approvedAt,
            },
          });

          if (registration.category.type === "EVALUATION") {
            const targetCategory =
              registration.category.evaluationTargets[0]
                ?.targetCategory ?? null;

            await tx.athleteEvaluationProcess.create({
              data: {
                organizationId: user.organizationId,
                athleteId: athlete.id,

                evaluationCategoryId:
                  registration.category.id,

                targetCategoryId:
                  targetCategory?.id ?? null,

                createdByUserId: user.id,
                sport: registration.category.sport,

                status: "IN_EVALUATION",
                entryMode: "CURRENT",
                startedAt: approvedAt,

                evaluationCategoryNameSnapshot:
                  registration.category.name,

                targetCategoryNameSnapshot:
                  targetCategory?.name ?? null,

                seasonSnapshot:
                  String(approvedAt.getUTCFullYear()),

                createdByNameSnapshot:
                  user.name,
              },
            });
          }
        }

        if (guardianName) {
          await tx.athleteGuardian.create({
          data: {
            athleteId: athlete.id,
            relation,
            name: guardianName,
            email: guardianEmail,
            phone: guardianPhone,
            address:
              family.address?.trim() ||
              null,
            isPrimary: true,
          },
        });
      }

      /*
       * Vincula o pré-cadastro ao atleta definitivo.
       */
      await tx.athletePreRegistrationRequest.update({
        where: {
          id: registration.id,
        },

        data: {
          createdAthleteId:
            athlete.id,
        },
      });

      /*
       * Auditoria da criação/aprovação.
       */
      await tx.athleteDataAuditLog.create({
        data: {
          organizationId:
            user.organizationId,

          athleteId:
            athlete.id,

          actorUserId:
            user.id,

          action:
            "APPROVED",

          entityType:
            "ATHLETE_PRE_REGISTRATION",

          entityId:
            registration.id,

          metadataJson:
            JSON.stringify({
              source:
                "ATHLETE_PRE_REGISTRATION",
              registrationId:
                registration.id,
            }),
        },
      });

      return athlete;
    });

  revalidatePath("/atletas");
  revalidatePath(
    `/atletas/pre-cadastros/${registration.id}`,
  );
  revalidatePath(
    `/atletas/${createdAthlete.id}`,
  );
  revalidatePath(
    `/atletas/${createdAthlete.id}/dados`,
  );

  redirect(
    `/atletas/${createdAthlete.id}/dados#documentos`,
  );
}

export async function rejectAthletePreRegistration(
  formData: FormData,
) {
  const user =
    await requireClubPermission("ATHLETES_EDIT");

  const registrationId =
    clean(formData.get("registrationId"));

  const rejectionReason =
    clean(formData.get("rejectionReason"));

  if (!registrationId) {
    return;
  }

  await prisma.athletePreRegistrationRequest.updateMany({
    where: {
      id: registrationId,
      organizationId: user.organizationId,
      status: "SUBMITTED",
    },

    data: {
      status: "REJECTED",

      reviewedByUserId:
        user.id,

      reviewedAt:
        new Date(),

      rejectionReason:
        rejectionReason || null,
    },
  });

  revalidatePath("/atletas");
  revalidatePath(
    `/atletas/pre-cadastros/${registrationId}`,
  );

  redirect("/atletas");
}
