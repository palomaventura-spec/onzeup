import type { Prisma } from "@prisma/client";

/** Exige documentos obrigatorios revisados pelo clube. Uso somente dentro de transacao. */
export async function assertPublicRegistrationDocumentsApproved(
  tx: Prisma.TransactionClient,
  submissionId: string,
  linkId: string,
) {
  const requirements = await tx.publicRegistrationDocumentRequirement.findMany({
    where: { linkId, active: true, required: true },
    select: { id: true },
  });
  if (!requirements.length) return;
  const docs = await tx.publicRegistrationDocument.findMany({
    where: {
      submissionId,
      requirementId: { in: requirements.map((r) => r.id) },
      status: "APPROVED",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { requirementId: true, storageKey: true },
  });
  const approved = new Set(docs.filter((d) => d.storageKey.trim()).map((d) => d.requirementId));
  if (requirements.some((r) => !approved.has(r.id))) {
    throw new Error("DOCUMENTS_NOT_APPROVED");
  }
}
