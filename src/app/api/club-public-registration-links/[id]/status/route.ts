import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, { params }: Params) {
  if (process.env.CLUB_PUBLIC_REGISTRATION_LINKS_ENABLED !== "true")
    return NextResponse.json({ error: "Gerenciamento indisponível até homologação." }, { status: 503 });
  const user = await getCurrentUser();
  if (!user?.organizationId || user.role === "SUPER_ADMIN" || !hasClubPermission(user, "ATHLETES_EDIT"))
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const organizationId = user.organizationId;
  const { id } = await params;
  if (!id || id.length > 128) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const requested = body && typeof body === "object" && !Array.isArray(body) ? (body as { status?: unknown }).status : null;
  if (requested === "ACTIVE" && process.env.CLUB_PUBLIC_REGISTRATION_ACTIVATION_ENABLED !== "true")
    return NextResponse.json({ error: "Ativação pública indisponível até homologação." }, { status: 503 });
  if (requested !== "ACTIVE" && requested !== "PAUSED" && requested !== "REVOKED")
    return NextResponse.json({ error: "Situação inválida." }, { status: 400 });
  try {
    const current = await prisma.publicRegistrationLink.findFirst({
      where: { id, organizationId }, select: { id: true, status: true, expiresAt: true },
    });
    if (!current) return NextResponse.json({ error: "Link não encontrado." }, { status: 404 });
    if (current.status === "REVOKED") return NextResponse.json({ error: "Link revogado não pode ser reativado." }, { status: 409 });
    if (requested === "ACTIVE" && current.expiresAt <= new Date())
      return NextResponse.json({ error: "Link expirado. Crie um novo link." }, { status: 409 });
    const allowed = (current.status === "DRAFT" && (requested === "ACTIVE" || requested === "REVOKED")) ||
      (current.status === "ACTIVE" && (requested === "PAUSED" || requested === "REVOKED")) ||
      (current.status === "PAUSED" && (requested === "ACTIVE" || requested === "REVOKED"));
    if (!allowed) return NextResponse.json({ error: "Transição de estado não permitida." }, { status: 409 });
    const changed = await prisma.publicRegistrationLink.updateMany({
      where: { id, organizationId, status: current.status }, data: { status: requested },
    });
    if (changed.count !== 1) return NextResponse.json({ error: "Estado alterado por outra operação." }, { status: 409 });
    return NextResponse.json({ ok: true, status: requested }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("PUBLIC_REGISTRATION_LINK_STATUS_FAILED", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "Não foi possível atualizar o link." }, { status: 500 });
  }
}
