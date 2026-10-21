import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { encryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const json = (data: object, status: number) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

type Decision = "CHANGES_REQUESTED" | "REJECTED";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Fail closed: no writes until an isolated DB, authorization and audit tests pass.
  if (process.env.CLUB_PUBLIC_REGISTRATION_DECISIONS_ENABLED !== "true") {
    return json({ error: "Decisões administrativas ainda indisponíveis." }, 503);
  }
  const user = await getCurrentUser();
  const organizationId = user?.organizationId;
  if (!user || !organizationId || user.role === "SUPER_ADMIN" ||
      !hasClubPermission(user, "ATHLETES_EDIT")) {
    return json({ error: "Acesso negado." }, 403);
  }
  const { id } = await params;
  if (!id || id.length > 128) return json({ error: "Identificador inválido." }, 400);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 4000) return json({ error: "Solicitação muito extensa." }, 413);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "JSON inválido." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "Dados inválidos." }, 400);
  const input = body as Record<string, unknown>;
  const decision: Decision | null =
    input.decision === "CHANGES_REQUESTED" || input.decision === "REJECTED"
      ? input.decision : null;
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (!decision || reason.length < 10 || reason.length > 1500) {
    return json({ error: "Informe a decisão e um motivo entre 10 e 1500 caracteres." }, 400);
  }
  // Avoid persisting sensitive notes unencrypted; failure aborts before any write.
  const encrypted = encryptPrivateData(reason);
  if (!encrypted) return json({ error: "Não foi possível proteger a justificativa." }, 500);
  try {
    // A conditional update prevents double decisions. No Athlete or Player is created/updated.
    const result = await prisma.$transaction(async (tx) => {
      const changed = await tx.publicRegistrationSubmission.updateMany({
      where: { id, organizationId, status: "SUBMITTED" },
      data: {
        status: decision,
        reviewNotesEncrypted: encrypted,
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
      },
    });
      if (changed.count !== 1) throw new Error("CONCURRENT_REVIEW");
      await tx.publicRegistrationReviewLog.create({ data: {
        submissionId: id, organizationId, actorUserId: user.id,
        action: decision, previousStatus: "SUBMITTED", newStatus: decision,
        reasonEncrypted: encrypted,
      }});
      return changed;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (result.count !== 1) {
      return json({ error: "Inscrição inexistente, de outro clube ou já analisada." }, 409);
    }
    return json({ ok: true, status: decision }, 200);
  } catch (error) {
    if (error instanceof Error && error.message === "CONCURRENT_REVIEW") return json({error:"Inscrição já analisada."},409);
    console.error("CLUB_PUBLIC_REGISTRATION_DECISION_FAILED", error instanceof Error ? error.name : "unknown");
    return json({ error: "Não foi possível registrar a decisão." }, 500);
  }
}
