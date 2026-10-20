import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { encryptPrivateData, safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";
import { attachRegistrationDocuments, cleanupPreparedRegistrationDocuments, prepareRegistrationDocuments, savePreventiveDeclaration, syncRegistrationEligibility } from "@/lib/public-registration-approval-integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: object, status: number) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
type FormFields = Record<string, unknown>;
const obj = (value: unknown): FormFields => value && typeof value === "object" && !Array.isArray(value) ? value as FormFields : {};
const str = (value: unknown, max = 250): string => typeof value === "string" ? value.trim().slice(0, max) : "";
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
function dateOnly(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && date <= new Date() ? date : null;
}
const relation = (value: unknown): "FATHER" | "MOTHER" | "LEGAL_GUARDIAN" | "OTHER" =>
  value === "FATHER" || value === "MOTHER" || value === "OTHER" ? value : "LEGAL_GUARDIAN";
const encrypted = (value: unknown): string | null => {
  const s = str(value, 4000);
  if (!s) return null;
  const ciphertext = encryptPrivateData(s);
  if (!ciphertext) throw new Error("ENCRYPTION_UNAVAILABLE");
  return ciphertext;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Enabled only in isolated testing; do not enable with the production Neon DATABASE_URL.
  if (process.env.CLUB_PUBLIC_REGISTRATION_APPROVAL_ENABLED !== "true")
    return reply({ error: "Aprovação administrativa desativada." }, 503);
  const user = await getCurrentUser();
  if (!user?.organizationId || user.role === "SUPER_ADMIN" || !hasClubPermission(user, "ATHLETES_EDIT"))
    return reply({ error: "Acesso negado." }, 403);
  const organizationId = user.organizationId;
  const { id } = await params;
  if (!id || id.length > 128) return reply({ error: "Identificador inválido." }, 400);
  if (Number(request.headers.get("content-length") || 0) > 2048) return reply({ error: "Pedido excessivo." }, 413);
  let body: unknown;
  try { body = await request.json(); } catch { return reply({ error: "JSON inválido." }, 400); }
  const input = obj(body);
  if (input.confirmation !== "CRIAR_NOVO_ATLETA" || input.duplicatesReviewed !== true)
    return reply({ error: "Revisão de duplicidades e confirmação explícita são obrigatórias." }, 400);

  let prepared: Awaited<ReturnType<typeof prepareRegistrationDocuments>> | null = null;
  try {
    const current = await prisma.publicRegistrationSubmission.findFirst({
      where: { id, organizationId: user.organizationId, status: "SUBMITTED", linkedAthleteId: null },
      select: { linkId: true },
    });
    if (!current) throw new Error("SUBMISSION_NOT_AVAILABLE");
    prepared = await prepareRegistrationDocuments({ organizationId: user.organizationId, submissionId: id, linkId: current.linkId });
    const result = await prisma.$transaction(async tx => {
      const submission = await tx.publicRegistrationSubmission.findFirst({
        where: { id, organizationId: organizationId, status: "SUBMITTED", linkedAthleteId: null },
        select: { id: true, linkId: true, organizationId: true, categoryId: true, payloadEncrypted: true },
      });
      if (!submission) throw new Error("SUBMISSION_NOT_AVAILABLE");
      if (!prepared) throw new Error("DOCUMENT_PREPARATION_MISSING");
      const plaintext = safeDecryptPrivateData(submission.payloadEncrypted);
      if (!plaintext) throw new Error("INVALID_PAYLOAD");
      let parsed: unknown;
      try { parsed = JSON.parse(plaintext); } catch { throw new Error("INVALID_PAYLOAD"); }
      const payload = obj(parsed);
      const athleteData = obj(payload.athlete), guardian = obj(payload.guardian), guardian2 = obj(payload.guardian2);
      const family = obj(payload.family), health = obj(payload.health);
      const name = str(athleteData.name);
      const birthDate = dateOnly(athleteData.birthDate);
      if (name.length < 3 || !birthDate || !str(guardian.name) || guardian.accepted !== true)
        throw new Error("INCOMPLETE_IDENTITY");
      const normalizedName = norm(name);
      const birthYear = birthDate.getUTCFullYear();

      // Serialize creations with the same club + name + birth date, including separate public submissions.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}), hashtext(${normalizedName + "|" + birthDate.toISOString().slice(0, 10)}))::text AS lock_result`;
      const possible = await tx.athlete.findMany({
        where: { organizationId: organizationId, OR: [{ birthYear }, { name: { equals: name, mode: "insensitive" } }] },
        select: { id: true, name: true, privateData: { select: { birthDate: true } } },
        take: 2000,
      });
      if (possible.length === 2000) throw new Error("REVIEW_REQUIRED");
      if (possible.some(a => norm(a.name) === normalizedName &&
        (!a.privateData?.birthDate || a.privateData.birthDate.toISOString().slice(0, 10) === birthDate.toISOString().slice(0, 10))))
        throw new Error("DUPLICATE_FOUND");

      const category = await tx.category.findFirst({
        where: { id: submission.categoryId, organizationId: organizationId, active: true },
        select: { id: true, name: true, type: true, sport: true, evaluationTargets: {
          where: { targetCategory: { active: true, type: "STANDARD", organizationId: organizationId } },
          select: { targetCategory: { select: { id: true, name: true } } }, take: 2,
        } },
      });
      if (!category) throw new Error("CATEGORY_UNAVAILABLE");
      const changed = await tx.publicRegistrationSubmission.updateMany({
        where: { id, organizationId: organizationId, status: "SUBMITTED", linkedAthleteId: null },
        data: { status: "APPROVED", reviewedByUserId: user.id, reviewedAt: new Date() },
      });
      if (changed.count !== 1) throw new Error("CONCURRENT_REVIEW");

      const now = new Date();
      const primary = str(guardian.name), phone = str(guardian.phone) || str(family.phone1) || null;
      const email = str(guardian.email) || str(family.email) || null;
      const target = category.type === "EVALUATION" && category.evaluationTargets.length === 1
        ? category.evaluationTargets[0].targetCategory : null;
      const athlete = await tx.athlete.create({ data: {
        organizationId: organizationId, categoryId: category.id, name, birthYear,
        position: str(athleteData.position1) || null, active: true,
        currentStatus: category.type === "EVALUATION" ? "EVALUATION" : "ACTIVE",
        evaluationTargetCategoryId: target?.id ?? null,
        guardianName: primary, guardianPhone: phone, guardianEmail: email,
        guardianRelation: relation(guardian.relation),
      }, select: { id: true } });
      await tx.athletePrivateData.create({ data: {
        athleteId: athlete.id, birthDate, rgEncrypted: encrypted(athleteData.identity),
        cpfEncrypted: encrypted(athleteData.cpf), email,
        healthPlanEncrypted: health.hasHealthPlan === true ? encrypted(health.healthPlanName || "Possui plano de saúde") : null,
      } });
      await tx.athleteGuardian.create({ data: {
        athleteId: athlete.id, name: primary, relation: relation(guardian.relation), phone, email,
        address: str(family.address, 4000) || null, isPrimary: true,
        cpfEncrypted: encrypted(guardian.cpf), rgEncrypted: encrypted(guardian.rg),
      } });
      if (str(guardian2.name)) await tx.athleteGuardian.create({ data: {
        athleteId: athlete.id, name: str(guardian2.name), relation: relation(guardian2.relation),
        phone: str(guardian2.phone) || null, email: str(guardian2.email) || null, isPrimary: false,
        cpfEncrypted: encrypted(guardian2.cpf), rgEncrypted: encrypted(guardian2.rg),
      } });
      await tx.athleteMembership.create({ data: {
        organizationId: organizationId, athleteId: athlete.id, categoryId: category.id,
        sport: category.sport, season: String(now.getUTCFullYear()), status: "ACTIVE", verified: true, startedAt: now,
      } });
      if (category.type === "EVALUATION") await tx.athleteEvaluationProcess.create({ data: {
        organizationId: organizationId, athleteId: athlete.id, evaluationCategoryId: category.id,
        targetCategoryId: target?.id ?? null, sport: category.sport,
        createdByUserId: user.id, status: "IN_EVALUATION", entryMode: "CURRENT", startedAt: now,
        evaluationCategoryNameSnapshot: category.name, targetCategoryNameSnapshot: target?.name ?? null,
        seasonSnapshot: String(now.getUTCFullYear()), createdByNameSnapshot: user.name,
      } });
      await savePreventiveDeclaration(tx, {
        organizationId, athleteId: athlete.id, submissionId: id, actorUserId: user.id, health,
      });
      await attachRegistrationDocuments(tx, { organizationId, athleteId: athlete.id, submissionId: id,
        linkId: submission.linkId, userId: user.id, documents: prepared.documents });
      await syncRegistrationEligibility(tx, { organizationId, athleteId: athlete.id, actorId: user.id, actorName: user.name });
      await tx.publicRegistrationSubmission.update({ where: { id }, data: { linkedAthleteId: athlete.id } });
      await tx.athleteDataAuditLog.create({ data: {
        organizationId: organizationId, athleteId: athlete.id, actorUserId: user.id,
        action: "APPROVED", entityType: "PUBLIC_REGISTRATION_NEW_ATHLETE", entityId: id,
        metadataJson: JSON.stringify({ source: "PUBLIC_REGISTRATION", mode: "CREATE_NEW", submissionId: id }),
      } });
      await tx.publicRegistrationReviewLog.create({ data: {
        submissionId: id, organizationId, actorUserId: user.id,
        action: "CREATE_NEW", previousStatus: "SUBMITTED", newStatus: "APPROVED",
      }});
      return { athleteId: athlete.id };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
    return reply({ ok: true, status: "APPROVED", mode: "CREATE_NEW", ...result }, 200);
  } catch (error) {
    if (prepared?.uploaded.length) await cleanupPreparedRegistrationDocuments(prepared.uploaded);
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (["DOCUMENT_TRANSFER_NOT_READY", "INVALID_HEALTH_DECLARATION", "SUBMISSION_NOT_AVAILABLE", "INVALID_PAYLOAD", "INCOMPLETE_IDENTITY", "DUPLICATE_FOUND", "REVIEW_REQUIRED", "CATEGORY_UNAVAILABLE", "CONCURRENT_REVIEW"].includes(code))
      return reply({ error: "Aprovação não realizada. Revise a inscrição, a categoria e os possíveis cadastros existentes.", code }, 409);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034")
      return reply({ error: "Conflito simultâneo. Recarregue e tente novamente após conferir duplicidades." }, 409);
    console.error("PUBLIC_REGISTRATION_APPROVE_NEW_FAILED", error instanceof Error ? error.name : "unknown");
    return reply({ error: "Não foi possível criar o atleta." }, 500);
  }
}
