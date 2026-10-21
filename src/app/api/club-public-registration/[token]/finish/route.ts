import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tokenHash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (process.env.CLUB_PUBLIC_REGISTRATION_SUBMISSIONS_ENABLED !== "true")
    return NextResponse.json({ error: "Finalização de inscrição indisponível." }, { status: 503 });
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(token))
    return NextResponse.json({ error: "Link inválido." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Dados inválidos." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { submissionId, uploadCredential } = body as Record<string, unknown>;
  if (typeof submissionId !== "string" || submissionId.length > 128 || typeof uploadCredential !== "string" || !/^[A-Za-z0-9_-]{32,128}$/.test(uploadCredential))
    return NextResponse.json({ error: "Credencial inválida." }, { status: 403 });
  const submission = await prisma.publicRegistrationSubmission.findFirst({
    where: {
      id: submissionId,
      status: "PENDING_DOCUMENTS",
      uploadTokenHash: tokenHash(uploadCredential),
      uploadTokenExpiresAt: { gt: new Date() },
      // Uma inscrição já criada pode ser finalizada após expiração/pausa/revogação do link coletivo.
      // A credencial individual e o prazo uploadTokenExpiresAt continuam obrigatórios.
      link: { tokenHash: tokenHash(token) },
    },
    select: { id: true, linkId: true },
  });
  if (!submission) return NextResponse.json({ error: "Inscrição indisponível ou credencial expirada." }, { status: 403 });
  // Missing category-required documents do NOT block registration.
  // They remain pending for the club to review after administrative acceptance.
  const updated = await prisma.publicRegistrationSubmission.updateMany({
    where: { id: submission.id, status: "PENDING_DOCUMENTS", uploadTokenHash: tokenHash(uploadCredential), uploadTokenExpiresAt: { gt: new Date() } },
    data: { status: "SUBMITTED", submittedAt: new Date(), uploadTokenHash: null, uploadTokenExpiresAt: null },
  });
  if (updated.count !== 1) return NextResponse.json({ error: "Inscrição já finalizada ou expirada." }, { status: 409 });
  return NextResponse.json({ ok: true, status: "SUBMITTED" }, { headers: { "Cache-Control": "no-store" } });
}
