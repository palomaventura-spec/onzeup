import crypto from "node:crypto";
import { get, put, del } from "@vercel/blob";
import { AthleteDocumentCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { encryptPrivateData } from "@/lib/private-data-crypto";
import { syncAutomaticEligibility } from "@/lib/athlete-eligibility";

/** Each copied Blob is independent from the submission original. Never share a storageKey. */
type PreparedDocument = {
  sourceId: string;
  requirementId: string | null;
  categoryRequirementId: string | null;
  category: AthleteDocumentCategory;
  owner: "ATHLETE" | "FATHER" | "MOTHER" | "GUARDIAN";
  label: string;
  requirementKey: string | null;
  storageKey: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  expiresAt: Date | null;
};

export async function prepareRegistrationDocuments(input: { organizationId: string; submissionId: string; linkId: string }) {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  const originals = await prisma.publicRegistrationDocument.findMany({
    where: { submissionId: input.submissionId, submission: { organizationId: input.organizationId, linkId: input.linkId, status: "SUBMITTED" } },
    select: { id: true, requirementId: true, labelSnapshot: true, ownerSnapshot: true, storageKey: true,
      originalFileName: true, mimeType: true, sizeBytes: true, expiresAt: true, status: true },
  });
  if (!originals.length) return { documents: [] as PreparedDocument[], uploaded: [] as string[] };
  if (!token) throw new Error("PRIVATE_STORAGE_UNAVAILABLE");
  const requirements = await prisma.publicRegistrationDocumentRequirement.findMany({
    where: { linkId: input.linkId, active: true },
    select: { id: true, categoryRequirementId: true, owner: true, label: true,
      categoryRequirement: { select: { id: true, key: true, categoryId: true, organizationId: true, subject: true, documentCategory: true } } },
  });
  const map = new Map(requirements.map(r => [r.id, r]));
  const submission = await prisma.publicRegistrationSubmission.findUnique({ where: { id: input.submissionId }, select: { categoryId: true } });
  if (!submission) throw new Error("SUBMISSION_NOT_AVAILABLE");
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId },
    select: { documentStorageLimitBytes: true, documentStorageUsedBytes: true } });
  const bytesTotal = originals.reduce((s, doc) => s + BigInt(doc.sizeBytes), BigInt(0));
  if (!org || org.documentStorageUsedBytes + bytesTotal > org.documentStorageLimitBytes) throw new Error("DOCUMENT_STORAGE_LIMIT");
  // Link requirements without a reliable category mapping are retained as unattached pending files.
  // Never infer a category requirement by comparing a label.
  const docs: PreparedDocument[] = [];
  const uploaded: string[] = [];
  try {
    for (const doc of originals) {
      if (doc.status === "REJECTED") throw new Error("REJECTED_DOCUMENT_REQUIRES_REVIEW");
      const req = doc.requirementId ? map.get(doc.requirementId) : undefined;
      if (doc.requirementId && !req) throw new Error("DOCUMENT_REQUIREMENT_INACTIVE");
      const cat = req?.categoryRequirement;
      if (cat && (cat.categoryId !== submission.categoryId || cat.organizationId !== input.organizationId ||
          (cat.subject === "ATHLETE") !== (doc.ownerSnapshot === "ATHLETE"))) throw new Error("DOCUMENT_REQUIREMENT_MISMATCH");
      const downloaded = await get(doc.storageKey, { access: "private", token });
      if (!downloaded) throw new Error("SOURCE_DOCUMENT_NOT_FOUND");
      const raw = Buffer.from(await new Response(downloaded.stream).arrayBuffer());
      if (raw.length !== doc.sizeBytes) throw new Error("SOURCE_DOCUMENT_SIZE_MISMATCH");
      const extension = doc.mimeType === "application/pdf" ? "pdf" : doc.mimeType === "image/png" ? "png" : doc.mimeType === "image/webp" ? "webp" : "jpg";
      const key = `private/approved-registration/${input.organizationId}/${input.submissionId}/${doc.id}-${crypto.randomUUID()}.${extension}`;
      const copy = await put(key, raw, { access: "private", addRandomSuffix: false, token, contentType: doc.mimeType });
      uploaded.push(copy.url);
      docs.push({ sourceId: doc.id, requirementId: doc.requirementId,
        categoryRequirementId: cat?.id ?? null, category: cat?.documentCategory ?? AthleteDocumentCategory.OTHER,
        owner: doc.ownerSnapshot, label: doc.labelSnapshot, requirementKey: cat?.key ?? null,
        storageKey: copy.url, originalFileName: doc.originalFileName, mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes, expiresAt: doc.expiresAt });
    }
    return { documents: docs, uploaded };
  } catch (error) {
    await cleanupPreparedRegistrationDocuments(uploaded);
    throw error;
  }
}

export async function cleanupPreparedRegistrationDocuments(urls: string[]) {
  const token = process.env.PRIVATE_BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  for (const url of urls) {
    try { await del(url, { token }); } catch { console.error("APPROVAL_COPY_CLEANUP_FAILED"); }
  }
}

export async function attachRegistrationDocuments(tx: Prisma.TransactionClient, input: {
  organizationId: string; athleteId: string; submissionId: string; linkId: string;
  userId: string; documents: PreparedDocument[];
}) {
  const actual = await tx.publicRegistrationDocument.findMany({
    where: { submissionId: input.submissionId, submission: { organizationId: input.organizationId, linkId: input.linkId } },
    select: { id: true, status: true },
  });
  if (actual.length !== input.documents.length || actual.some(d => !input.documents.some(copy => copy.sourceId === d.id)) ||
      actual.some(d => d.status === "REJECTED")) throw new Error("DOCUMENTS_CHANGED_DURING_APPROVAL");
  const guardians = await tx.athleteGuardian.findMany({ where: { athleteId: input.athleteId },
    select: { id: true, relation: true, isPrimary: true } });
  for (const doc of input.documents) {
    let guardianId: string | null = null;
    if (doc.owner !== "ATHLETE") {
      const match = doc.owner === "FATHER" ? "FATHER" : doc.owner === "MOTHER" ? "MOTHER" : null;
      const guardian = match ? guardians.find(g => g.relation === match) : guardians.find(g => g.isPrimary);
      if (!guardian) throw new Error("DOCUMENT_GUARDIAN_NOT_FOUND");
      guardianId = guardian.id;
    }
    await tx.athleteDocument.create({ data: {
      organizationId: input.organizationId, athleteId: input.athleteId, guardianId,
      sourcePublicRegistrationDocumentId: doc.sourceId,
      requirementId: doc.categoryRequirementId, requirementKeySnapshot: doc.requirementKey,
      requirementLabelSnapshot: doc.label, category: doc.category, title: doc.label,
      status: "PENDING", storageKey: doc.storageKey, originalFileName: doc.originalFileName,
      mimeType: doc.mimeType, sizeBytes: doc.sizeBytes, expiresAt: doc.expiresAt,
      uploadedByUserId: input.userId,
    } });
  }
  if (input.documents.length) {
    const bytes = input.documents.reduce((s, d) => s + BigInt(d.sizeBytes), BigInt(0));
    const updated = await tx.organization.updateMany({
      where: { id: input.organizationId, documentStorageUsedBytes: { lte: (await tx.organization.findUniqueOrThrow({ where: { id: input.organizationId }, select: { documentStorageLimitBytes: true } })).documentStorageLimitBytes - bytes } },
      data: { documentStorageUsedBytes: { increment: bytes } },
    });
    if (updated.count !== 1) throw new Error("DOCUMENT_STORAGE_LIMIT");
  }
}

export async function savePreventiveDeclaration(tx: Prisma.TransactionClient, input: {
  organizationId: string; athleteId: string; submissionId: string; actorUserId: string;
  health: Record<string, unknown>;
}) {
  const health = input.health;
  const keys = ["heartCondition", "exertionSymptoms", "breathingProblems", "medicalRestriction", "importantAllergies", "recentInjury"];
  const questionnaire = health.questionnaire;
  if (!questionnaire || typeof questionnaire !== "object" || Array.isArray(questionnaire)) throw new Error("INVALID_HEALTH_DECLARATION");
  const answers = questionnaire as Record<string, unknown>;
  if (health.questionnaireVersion !== "11UP_PREVENTIVE_MINOR_V1" || health.declarationAccepted !== true ||
      keys.some(k => !["YES", "NO", "UNKNOWN"].includes(String(answers[k])))) throw new Error("INVALID_HEALTH_DECLARATION");
  const declaredAt = typeof health.declaredAt === "string" ? new Date(health.declaredAt) : null;
  if (!declaredAt || Number.isNaN(declaredAt.getTime()) || declaredAt.getTime() > Date.now() + 60000) throw new Error("INVALID_HEALTH_DECLARATION");
  const ciphertext = encryptPrivateData(JSON.stringify({
    questionnaireVersion: health.questionnaireVersion,
    questionnaire: Object.fromEntries(keys.map(key => [key, answers[key]])),
    observations: health.observations ?? null,
    declarationAccepted: true,
    declarationByGuardian: health.declarationByGuardian ?? null,
  }));
  if (!ciphertext) throw new Error("ENCRYPTION_UNAVAILABLE");
  await tx.athleteHealthDeclaration.create({ data: {
    organizationId: input.organizationId, athleteId: input.athleteId,
    sourceSubmissionId: input.submissionId, questionnaireEncrypted: ciphertext,
    declaredAt, recordedByUserId: input.actorUserId,
  } });
}

export async function syncRegistrationEligibility(tx: Prisma.TransactionClient, input: {
  organizationId: string; athleteId: string; actorId: string; actorName: string;
}) {
  await syncAutomaticEligibility(tx, {
    organizationId: input.organizationId, athleteId: input.athleteId,
    actor: { id: input.actorId, name: input.actorName },
  });
}
