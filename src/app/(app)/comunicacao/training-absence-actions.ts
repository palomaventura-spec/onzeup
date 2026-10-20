"use server";

import { revalidatePath } from "next/cache";

import { requireOrganizationUser } from "@/lib/auth";
import { getClubTrainingCategoryAccess } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

/**
 * Aprova ou rejeita uma justificativa recebida na Comunicação Interna.
 * Não modifica a presença do atleta nem a sessão de treino.
 */
export async function reviewTrainingAbsenceRequest(formData: FormData): Promise<void> {
  if (process.env.TRAINING_ABSENCE_INBOX_ENABLED !== "true") throw new Error("Funcionalidade indisponível.");
  const requestId = formData.get("requestId");
  const decision = formData.get("decision");
  const rawNotes = formData.get("reviewNotes");

  if (typeof requestId !== "string" || !requestId.trim() || requestId.length > 128) {
    throw new Error("Solicitação inválida.");
  }
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    throw new Error("Decisão inválida.");
  }
  if (rawNotes !== null && typeof rawNotes !== "string") {
    throw new Error("Observação inválida.");
  }
  const reviewNotes = typeof rawNotes === "string" ? rawNotes.trim() : "";
  if (reviewNotes.length > 1000) {
    throw new Error("A observação deve ter no máximo 1.000 caracteres.");
  }

  const user = await requireOrganizationUser();
  const request = await prisma.trainingAbsenceRequest.findFirst({
    where: { id: requestId, organizationId: user.organizationId },
    select: {
      id: true,
      schedule: { select: { categoryId: true, sport: true, organizationId: true } },
    },
  });

  if (!request || request.schedule.organizationId !== user.organizationId) {
    throw new Error("Solicitação não encontrada.");
  }

  const access = await getClubTrainingCategoryAccess(
    user,
    request.schedule.categoryId,
    request.schedule.sport,
  );
  if (!access.canManageAttendance) {
    throw new Error("Você não tem permissão para decidir justificativas desta categoria.");
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.trainingAbsenceRequest.updateMany({
      where: { id: request.id, organizationId: user.organizationId, status: "PENDING" },
      data: {
        status: decision,
        reviewedById: user.id,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || null,
      },
    });

    if (updated.count !== 1) {
      throw new Error("Esta justificativa já foi analisada ou não está mais disponível.");
    }

    await tx.trainingAbsenceRequestEvent.create({
      data: {
        requestId: request.id,
        actorId: user.id,
        action: decision === "APPROVED" ? "APPROVED" : "REJECTED",
      },
    });
  });

  revalidatePath("/comunicacao");
}
