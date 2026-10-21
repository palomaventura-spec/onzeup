import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSubmissionUploadCredential } from "@/lib/public-registration-upload-security";
import { encryptPrivateData } from "@/lib/private-data-crypto";

function encryptOrReject(value: string): string {
  const encrypted = encryptPrivateData(value);
  if (encrypted === null) {
    throw new Error("Falha ao criptografar dados do pre-cadastro. Nenhum registro sera salvo.");
  }
  return encrypted;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const clean = (v: unknown, limit = 240) => typeof v === "string" ? v.trim().slice(0, limit) : "";
const date = (v: unknown) => {
  const s = clean(v, 10);
  if (!s) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s && d <= new Date() ? s : null;
};
const object = (v: unknown) => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
const fields = (v: unknown) => Object.fromEntries(Object.entries(object(v)).map(([k,x]) => [k, typeof x === "boolean" ? x : clean(x, 4000)]));
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (process.env.CLUB_PUBLIC_REGISTRATION_SUBMISSIONS_ENABLED !== "true") return NextResponse.json({ error: "InscriÃ§Ãµes indisponÃ­veis atÃ© homologaÃ§Ã£o." }, { status: 503 });
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token)) return NextResponse.json({ error: "Link invÃ¡lido." }, { status: 404 });
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 32_000) return NextResponse.json({ error: "FormulÃ¡rio muito grande." }, { status: 413 });
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Dados invÃ¡lidos." }, { status: 400 }); }
  if (JSON.stringify(raw).length > 32_000) return NextResponse.json({ error: "FormulÃ¡rio muito grande." }, { status: 413 });
  const payload = object(raw);
  const athlete = fields(payload.athlete), guardian = fields(payload.guardian);
  const birthDate = date(athlete.birthDate);
  if (!clean(athlete.name) || !birthDate) return NextResponse.json({ error: "Informe nome e data vÃ¡lida do atleta." }, { status: 400 });
  if (!clean(guardian.name) || !(clean(guardian.phone) || clean(guardian.email)) || guardian.accepted !== true)
    return NextResponse.json({ error: "Informe responsÃ¡vel, contato e confirmaÃ§Ã£o." }, { status: 400 });
  const family = fields(payload.family);
  if (date(family.fatherBirthDate) === null || date(family.motherBirthDate) === null)
    return NextResponse.json({ error: "Data de nascimento familiar invÃ¡lida." }, { status: 400 });
  // A triagem Ã© apenas informativa; nenhuma resposta gera aptidÃ£o ou diagnÃ³stico.
  const healthRaw = object(payload.health);
  const questionnaire = object(healthRaw.questionnaire);
  const preventiveQuestions = ["heartCondition", "exertionSymptoms", "breathingProblems", "medicalRestriction", "importantAllergies", "recentInjury"];
  if (healthRaw.questionnaireVersion !== "11UP_PREVENTIVE_MINOR_V1" || healthRaw.declarationAccepted !== true ||
      preventiveQuestions.some(key => !["YES", "NO", "UNKNOWN"].includes(String(questionnaire[key] ?? "")))) {
    return NextResponse.json({ error: "Responda ao questionÃ¡rio preventivo e confirme a declaraÃ§Ã£o do responsÃ¡vel." }, { status: 400 });
  }
  if (typeof healthRaw.observations === "string" && healthRaw.observations.length > 2000) {
    return NextResponse.json({ error: "ObservaÃ§Ãµes de saÃºde muito extensas." }, { status: 400 });
  }
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const link = await prisma.publicRegistrationLink.findUnique({ where: { tokenHash }, select: {
    id: true, status: true, expiresAt: true, organizationId: true, categoryId: true, maxSubmissions: true,
    requirements: { where: { active: true, required: true }, select: { id: true }, take: 1 },
  }});
  if (!link || link.status !== "ACTIVE" || link.expiresAt <= new Date())
    return NextResponse.json({ error: "Link nÃ£o disponÃ­vel." }, { status: 410 });
  // Ficha em PENDING_DOCUMENTS ate finalizacao.
  // Importante: nÃ£o cria atleta nem vincula Player; cada POST recebe uma inscriÃ§Ã£o prÃ³pria.
  // Antes de ativar links em produÃ§Ã£o: proteÃ§Ã£o contra spam/rate limits, polÃ­tica LGPD e testes.
  const uploadCredential = createSubmissionUploadCredential();
  const payloadEncrypted = encryptOrReject(JSON.stringify({ version: 1, source: "CLUB_PUBLIC_REGISTRATION", submittedAt: new Date().toISOString(), athlete: { ...athlete, birthDate }, family, guardian, guardian2: fields(payload.guardian2), health: { hasHealthPlan: healthRaw.hasHealthPlan === true, healthPlanName: clean(healthRaw.healthPlanName, 160), susCard: clean(healthRaw.susCard, 80), questionnaireVersion: "11UP_PREVENTIVE_MINOR_V1", questionnaire: Object.fromEntries(preventiveQuestions.map(key => [key, questionnaire[key]])), observations: clean(healthRaw.observations, 2000), declarationAccepted: true, declarationByGuardian: clean(guardian.name), declaredAt: new Date().toISOString() }, sportsHistory: fields(payload.sportsHistory) }));
  let submission;
  try {
    submission = await prisma.$transaction(async tx => {
      // Same advisory lock per link: prevents concurrent requests exceeding maxSubmissions.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${link.id}))`;
      const current = await tx.publicRegistrationLink.findFirst({
        where: { id: link.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
        select: { id: true, maxSubmissions: true },
      });
      if (!current) throw new Error("LINK_UNAVAILABLE");
      if (current.maxSubmissions !== null) {
        const count = await tx.publicRegistrationSubmission.count({ where: { linkId: current.id } });
        if (count >= current.maxSubmissions) throw new Error("LIMIT_REACHED");
      }
      return tx.publicRegistrationSubmission.create({
        data: { linkId: link.id, organizationId: link.organizationId, categoryId: link.categoryId,
          uploadTokenHash: uploadCredential.tokenHash, uploadTokenExpiresAt: uploadCredential.expiresAt,
          status: "PENDING_DOCUMENTS", payloadEncrypted }, select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof Error && (error.message === "LIMIT_REACHED" || error.message === "LINK_UNAVAILABLE"))
      return NextResponse.json({ error: error.message === "LIMIT_REACHED" ? "Limite de inscriÃ§Ãµes atingido." : "Link indisponÃ­vel." }, { status: 409 });
    console.error("PUBLIC_REGISTRATION_SUBMIT_FAILED", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "NÃ£o foi possÃ­vel registrar a inscriÃ§Ã£o." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, submissionId: submission.id, uploadCredential: uploadCredential.token, uploadCredentialExpiresAt: uploadCredential.expiresAt.toISOString() }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
