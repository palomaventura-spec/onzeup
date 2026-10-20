import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";
import { attachRegistrationDocuments, cleanupPreparedRegistrationDocuments, prepareRegistrationDocuments, savePreventiveDeclaration, syncRegistrationEligibility } from "@/lib/public-registration-approval-integration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const respond = (data: object, status: number) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });

const normalized = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();

function dateOnly(input: unknown): string | null {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = new Date(`${input}T12:00:00.000Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === input ? input : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Never activate in production before isolated-DB approval, audit, and race-condition tests.
  if (process.env.CLUB_PUBLIC_REGISTRATION_APPROVAL_ENABLED !== "true")
    return respond({ error: "Aprovação administrativa desativada." }, 503);

  const user = await getCurrentUser();
  if (!user?.organizationId || user.role === "SUPER_ADMIN" || !hasClubPermission(user, "ATHLETES_EDIT"))
    return respond({ error: "Acesso negado." }, 403);

  const { id } = await params;
  if (!id || id.length > 128) return respond({ error: "Inscrição inválida." }, 400);
  if (Number(request.headers.get("content-length") || 0) > 2048) return respond({ error: "Pedido excessivo." }, 413);
  let body: unknown;
  try { body = await request.json(); } catch { return respond({ error: "JSON inválido." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return respond({ error: "Pedido inválido." }, 400);
  const { athleteId, confirmation } = body as Record<string, unknown>;
  if (typeof athleteId !== "string" || athleteId.length < 1 || athleteId.length > 128 || confirmation !== "VINCULAR_ATLETA_EXISTENTE")
    return respond({ error: "Seleção e confirmação explícita obrigatórias." }, 400);

  let prepared: Awaited<ReturnType<typeof prepareRegistrationDocuments>> | null = null;
  try {
    const current = await prisma.publicRegistrationSubmission.findFirst({
      where: { id, organizationId: user.organizationId, status: "SUBMITTED", linkedAthleteId: null },
      select: { linkId: true },
    });
    if (!current) throw new Error("SUBMISSION_NOT_AVAILABLE");
    prepared = await prepareRegistrationDocuments({ organizationId: user.organizationId, submissionId: id, linkId: current.linkId });
    const organizationId = user.organizationId;
    const outcome = await prisma.$transaction(async (tx) => {
      const submission = await tx.publicRegistrationSubmission.findFirst({
        where: { id, organizationId, status: "SUBMITTED", linkedAthleteId: null },
        select: { id: true, linkId: true, categoryId: true, payloadEncrypted: true },
      });
      if (!submission) throw new Error("SUBMISSION_NOT_AVAILABLE");
      if (!prepared) throw new Error("DOCUMENT_PREPARATION_MISSING");
      const plain = safeDecryptPrivateData(submission.payloadEncrypted);
      if (!plain) throw new Error("INVALID_PRIVATE_PAYLOAD");
      let data: unknown;
      try { data = JSON.parse(plain); } catch { throw new Error("INVALID_PRIVATE_PAYLOAD"); }
      if (!data || typeof data !== "object") throw new Error("INVALID_PRIVATE_PAYLOAD");
      const athleteData = (data as { athlete?: { name?: unknown; birthDate?: unknown } }).athlete;
      const name = athleteData?.name;
      const birthDate = dateOnly(athleteData?.birthDate);
      if (typeof name !== "string" || !normalized(name) || !birthDate)
        throw new Error("MISSING_IDENTITY");

      const athlete = await tx.athlete.findFirst({
        where: { id: athleteId, organizationId },
        select: { id: true, name: true, privateData: { select: { birthDate: true } } },
      });
      if (!athlete || normalized(athlete.name) !== normalized(name) ||
          athlete.privateData?.birthDate?.toISOString().slice(0, 10) !== birthDate)
        throw new Error("ATHLETE_IDENTITY_MISMATCH");

      const parsed = data as Record<string, unknown>;
      const health = parsed.health && typeof parsed.health === "object" && !Array.isArray(parsed.health)
        ? parsed.health as Record<string, unknown> : {};
      const category = await tx.category.findFirst({
        where: { id: submission.categoryId, organizationId, active: true },
        select: { id: true, name: true, type: true, sport: true, evaluationTargets: {
          where: { targetCategory: { active: true, type: "STANDARD", organizationId } },
          select: { targetCategory: { select: { id: true, name: true } } }, take: 2,
        } },
      });
      if (!category) throw new Error("CATEGORY_UNAVAILABLE");
      const activeMembership = await tx.athleteMembership.findFirst({
        where: { athleteId: athlete.id, organizationId, categoryId: category.id, status: "ACTIVE" },
        select: { id: true },
      });
      if (!activeMembership) {
        const now = new Date();
        await tx.athleteMembership.create({ data: {
          athleteId: athlete.id, organizationId, categoryId: category.id,
          sport: category.sport, season: String(now.getUTCFullYear()),
          status: "ACTIVE", verified: true, startedAt: now,
        } });
      }
      if (category.type === "EVALUATION") {
        const priorEvaluation = await tx.athleteEvaluationProcess.findFirst({
          where: { athleteId: athlete.id, organizationId, evaluationCategoryId: category.id, status: "IN_EVALUATION" },
          select: { id: true },
        });
        if (!priorEvaluation) {
          const target = category.evaluationTargets.length === 1 ? category.evaluationTargets[0].targetCategory : null;
          const now = new Date();
          await tx.athleteEvaluationProcess.create({ data: {
            organizationId, athleteId: athlete.id, evaluationCategoryId: category.id,
            targetCategoryId: target?.id ?? null, sport: category.sport,
            createdByUserId: user.id, status: "IN_EVALUATION", entryMode: "CURRENT", startedAt: now,
            evaluationCategoryNameSnapshot: category.name, targetCategoryNameSnapshot: target?.name ?? null,
            seasonSnapshot: String(now.getUTCFullYear()), createdByNameSnapshot: user.name,
          } });
        }
      }
      await savePreventiveDeclaration(tx, { organizationId, athleteId: athlete.id,
        submissionId: id, actorUserId: user.id, health });
      await attachRegistrationDocuments(tx, { organizationId, athleteId: athlete.id, submissionId: id,
        linkId: submission.linkId, userId: user.id, documents: prepared.documents });
      await syncRegistrationEligibility(tx, { organizationId, athleteId: athlete.id,
        actorId: user.id, actorName: user.name });
      const changed = await tx.publicRegistrationSubmission.updateMany({
        where: { id, organizationId, status: "SUBMITTED", linkedAthleteId: null },
        data: { status: "APPROVED", linkedAthleteId: athlete.id, reviewedByUserId: user.id, reviewedAt: new Date() },
      });
      if (changed.count !== 1) throw new Error("CONCURRENT_REVIEW");

      await tx.athleteDataAuditLog.create({
        data: {
          organizationId, athleteId: athlete.id, actorUserId: user.id,
          action: "APPROVED", entityType: "PUBLIC_REGISTRATION_EXISTING_ATHLETE",
          entityId: id,
          metadataJson: JSON.stringify({ source: "PUBLIC_REGISTRATION", mode: "LINK_EXISTING", submissionId: id }),
        },
      });
      await tx.publicRegistrationReviewLog.create({ data: {
        submissionId: id, organizationId, actorUserId: user.id,
        action: "LINK_EXISTING", previousStatus: "SUBMITTED", newStatus: "APPROVED",
      }});
      return { athleteId: athlete.id };
    }, { isolationLevel: "Serializable" });
    return respond({ ok: true, status: "APPROVED", mode: "LINK_EXISTING", ...outcome }, 200);
  } catch (error) {
    if (prepared?.uploaded.length) await cleanupPreparedRegistrationDocuments(prepared.uploaded);
    const code = error instanceof Error ? error.message : "UNKNOWN";
    if (["DOCUMENT_TRANSFER_NOT_READY", "INVALID_HEALTH_DECLARATION", "CATEGORY_UNAVAILABLE", "SUBMISSION_NOT_AVAILABLE", "CONCURRENT_REVIEW", "ATHLETE_IDENTITY_MISMATCH", "MISSING_IDENTITY", "INVALID_PRIVATE_PAYLOAD"].includes(code))
      return respond({ error: "Vínculo não realizado. Verifique a inscrição e a identidade do atleta.", code }, 409);
    console.error("PUBLIC_REGISTRATION_APPROVE_EXISTING_FAILED", error instanceof Error ? error.name : "unknown");
    return respond({ error: "Não foi possível realizar a aprovação." }, 500);
  }
}
