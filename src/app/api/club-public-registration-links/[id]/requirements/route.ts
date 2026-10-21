import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const OWNERS = ["ATHLETE", "FATHER", "MOTHER", "GUARDIAN"] as const;

async function access(id: string) {
  const user = await getCurrentUser();
  if (!user?.organizationId || user.role === "SUPER_ADMIN" || !hasClubPermission(user, "ATHLETES_EDIT")) return null;
  const link = await prisma.publicRegistrationLink.findFirst({
    where: { id, organizationId: user.organizationId }, select: { id: true, status: true },
  });
  return link ? { user: { organizationId: user.organizationId }, link } : null;
}

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const scope = await access(id);
  if (!scope) return NextResponse.json({ error: "Acesso negado ou link inexistente." }, { status: 403 });
  const requirements = await prisma.publicRegistrationDocumentRequirement.findMany({
    where: { linkId: id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, categoryRequirementId: true, label: true, owner: true, required: true, expires: true, active: true, sortOrder: true },
  });
  return NextResponse.json({ requirements, linkStatus: scope.link.status });
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
  const scope = await access(id);
  if (!scope) return NextResponse.json({ error: "Acesso negado ou link inexistente." }, { status: 403 });
  if (scope.link.status !== "DRAFT") {
    return NextResponse.json({ error: "A configuração de documentos só pode ser editada em links em rascunho." }, { status: 409 });
  }
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body || typeof body !== "object" || !Array.isArray((body as { items?: unknown }).items)) {
    return NextResponse.json({ error: "Envie items como lista." }, { status: 400 });
  }
  const incoming = (body as { items: unknown[] }).items;
  if (incoming.length > 30) return NextResponse.json({ error: "Máximo de 30 documentos por link." }, { status: 400 });
  const items: { id?: string; label: string; owner: typeof OWNERS[number]; required: boolean; expires: boolean; sortOrder: number }[] = [];
  for (let index = 0; index < incoming.length; index++) {
    const value = incoming[index];
    if (!value || typeof value !== "object") return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
    const row = value as Record<string, unknown>;
    const label = typeof row.label === "string" ? row.label.trim() : "";
    if (!label || label.length > 120 || !OWNERS.some(owner => owner === row.owner) || typeof row.required !== "boolean" || typeof row.expires !== "boolean") {
      return NextResponse.json({ error: `Documento inválido na posição ${index + 1}.` }, { status: 400 });
    }
    items.push({ id: typeof row.id === "string" ? row.id : undefined, label, owner: row.owner as typeof OWNERS[number], required: row.required, expires: row.expires, sortOrder: index });
  }
  // Exclusão só de requisitos sem documentos: o banco impede excluir históricos referenciados.
  // A consulta e a escrita são feitas na mesma transação para reduzir riscos de concorrência.
  try {
    await prisma.$transaction(async tx => {
      const current = await tx.publicRegistrationLink.findFirst({ where: { id, organizationId: scope.user.organizationId, status: "DRAFT" }, select: { id: true } });
      if (!current) throw new Error("NOT_DRAFT");
      const submissions = await tx.publicRegistrationSubmission.count({ where: { linkId: id } });
      if (submissions !== 0) throw new Error("SUBMISSIONS_PRESENT");
      // Conservar a identidade dos requisitos herdados. Nunca confiar em categoryRequirementId enviado pelo navegador.
      const previous = await tx.publicRegistrationDocumentRequirement.findMany({
        where: { linkId: id },
        select: { id: true, label: true, owner: true, categoryRequirementId: true },
      });
      const byId = new Map(previous.map(item => [item.id, item]));
      const inheritedIds = [...new Set(previous.map(item => item.categoryRequirementId).filter((id): id is string => Boolean(id)))];
      const validInherited = inheritedIds.length ? await tx.categoryDocumentRequirement.findMany({
        where: { id: { in: inheritedIds }, category: { publicRegistrationLinks: { some: { id } } } },
        select: { id: true },
      }) : [];
      const validIds = new Set(validInherited.map(item => item.id));
      const next = items.map(item => {
        const original = item.id ? byId.get(item.id) : undefined;
        if (item.id && !original) throw new Error("INVALID_REQUIREMENT_ID");
        // Alterar titular ou rótulo retira a associação: nunca associar documento diferente à categoria.
        const inherited = original?.categoryRequirementId && original.label === item.label &&
          original.owner === item.owner && validIds.has(original.categoryRequirementId)
          ? original.categoryRequirementId : null;
        return { linkId: id, label: item.label, owner: item.owner,
          required: item.required, expires: item.expires, sortOrder: item.sortOrder,
          categoryRequirementId: inherited };
      });
      await tx.publicRegistrationDocumentRequirement.deleteMany({ where: { linkId: id } });
      if (next.length) await tx.publicRegistrationDocumentRequirement.createMany({ data: next });
    });
  } catch (error) {
    console.error("PUBLIC_REGISTRATION_REQUIREMENTS_UPDATE_ERROR", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Não foi possível atualizar. Verifique se o link continua em rascunho e sem inscrições." }, { status: 409 });
  }
  return NextResponse.json({ ok: true, count: items.length });
}
