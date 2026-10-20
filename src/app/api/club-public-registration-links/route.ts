import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizedOrganizationId() {
  const user = await getCurrentUser();
  if (!user?.organizationId || !hasClubPermission(user, "ATHLETES_EDIT")) return null;
  return { organizationId: user.organizationId, userId: user.id };
}

export async function GET() {
  if (process.env.CLUB_PUBLIC_REGISTRATION_LINKS_ENABLED !== "true") return NextResponse.json({ links: [], disabled: true });
  const access = await authorizedOrganizationId();
  if (!access) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const links = await prisma.publicRegistrationLink.findMany({
    where: { organizationId: access.organizationId },
    select: { id: true, name: true, categoryId: true, status: true, expiresAt: true, maxSubmissions: true, createdAt: true, _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" }, take: 100,
  });
  return NextResponse.json({ links });
}

export async function POST(request: Request) {
  if (process.env.CLUB_PUBLIC_REGISTRATION_LINKS_ENABLED !== "true") return NextResponse.json({ error: "Criação de links indisponível até homologação." }, { status: 503 });
  const access = await authorizedOrganizationId();
  if (!access) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  let payload: { name?: unknown; categoryId?: unknown; validityDays?: unknown; maxSubmissions?: unknown };
  try { payload = await request.json(); } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const name = typeof payload.name === "string" ? payload.name.trim().slice(0,120) : "";
  const categoryId = typeof payload.categoryId === "string" ? payload.categoryId.trim() : "";
  const days = Number(payload.validityDays);
  const cap = payload.maxSubmissions;
  const maxSubmissions = cap === null || cap === undefined || cap === "" ? null : Number(cap);
  if (!name || !categoryId || !Number.isInteger(days) || days < 1 || days > 90 || (maxSubmissions !== null && (!Number.isInteger(maxSubmissions) || maxSubmissions < 1 || maxSubmissions > 10000))) {
    return NextResponse.json({ error: "Informe nome, categoria e validade de 1 a 90 dias." }, { status: 400 });
  }
  const category = await prisma.category.findFirst({
    where: { id: categoryId, organizationId: access.organizationId, active: true },
    select: { id: true, type: true },
  });
  if (!category || !(["EVALUATION", "STANDARD"] as string[]).includes(category.type)) {
    return NextResponse.json({ error: "Selecione uma categoria ativa de avaliação ou regular deste clube." }, { status: 400 });
  }
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + days * 86400000);
  // Snapshot of this club category requirements. Existing category definitions remain untouched.
  // The manager may review/change this snapshot while the link is still DRAFT.
  const categoryRequirements = await prisma.categoryDocumentRequirement.findMany({
    where: { categoryId, organizationId: access.organizationId, active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, label: true, subject: true, required: true, requiresExpiry: true },
    take: 30,
  });
  const link = await prisma.publicRegistrationLink.create({
    data: { organizationId: access.organizationId, categoryId, createdByUserId: access.userId, name,
      tokenHash, status: "DRAFT", expiresAt, maxSubmissions,
      requirements: { create: categoryRequirements.map((doc, index) => ({
        categoryRequirementId: doc.id, label: doc.label, owner: doc.subject === "GUARDIAN" ? "GUARDIAN" as const : "ATHLETE" as const,
        required: doc.required, expires: doc.requiresExpiry, sortOrder: index,
      })) },
    },
    select: { id: true, status: true, expiresAt: true },
  });
  // O token bruto é mostrado apenas na resposta de criação, nunca em listagens nem logs.
  return NextResponse.json({ ...link, previewPath: `/inscricao-avaliacao/${token}` }, { status: 201 });
}
