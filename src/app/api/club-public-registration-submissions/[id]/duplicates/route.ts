import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { safeDecryptPrivateData } from "@/lib/private-data-crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RegistrationPayload = {
  athlete?: { name?: unknown; birthDate?: unknown };
};

function normalizeName(value: unknown) {
  if (typeof value !== "string") return "";
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLowerCase();
}

function parseBirthDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const result = new Date(`${value}T12:00:00.000Z`);
  return Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value ? null : result;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user?.organizationId || user.role === "SUPER_ADMIN" || !hasClubPermission(user, "ATHLETES_EDIT")) {
      return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 });
    }
    const { id } = await params;
    if (!id || id.length > 128) return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });

    const submission = await prisma.publicRegistrationSubmission.findFirst({
      where: { id, organizationId: user.organizationId },
      select: { status: true, payloadEncrypted: true, linkedAthleteId: true, categoryId: true },
    });
    if (!submission) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
    if (submission.status !== "SUBMITTED" || submission.linkedAthleteId !== null) {
      return NextResponse.json({ error: "A verificação de duplicidade está disponível para inscrições finalizadas." }, { status: 409 });
    }

    const decrypted = safeDecryptPrivateData(submission.payloadEncrypted);
    if (!decrypted) return NextResponse.json({ error: "Dados da inscrição indisponíveis para conferência." }, { status: 409 });
    let payload: RegistrationPayload;
    try { payload = JSON.parse(decrypted) as RegistrationPayload; }
    catch { return NextResponse.json({ error: "Ficha da inscrição inválida." }, { status: 409 }); }

    const name = normalizeName(payload.athlete?.name);
    const birthDate = parseBirthDate(payload.athlete?.birthDate);
    if (!name || !birthDate) return NextResponse.json({ error: "Nome ou data de nascimento ausentes." }, { status: 409 });

    // Conjunto limitado ao clube do gestor. Nenhum identificador privado é exposto.
    // Matching por nome e nascimento é apenas indicativo, nunca autoriza aprovação automática.
    const birthYear = birthDate.getUTCFullYear();
    const athletes = await prisma.athlete.findMany({
      where: { organizationId: user.organizationId, birthYear },
      select: {
        id: true, name: true, nickname: true, birthYear: true, categoryId: true,
        privateData: { select: { birthDate: true } },
      },

      orderBy: { name: "asc" },
    });

    const candidates = athletes.map(athlete => {
      const exactName = normalizeName(athlete.name) === name;
      const sameBirthDate = athlete.privateData?.birthDate?.toISOString().slice(0, 10) === birthDate.toISOString().slice(0, 10);
      return { athlete, exactName, sameBirthDate };
    }).filter(row => row.exactName || row.sameBirthDate)
      .sort((a,b) => Number(b.exactName && b.sameBirthDate) - Number(a.exactName && a.sameBirthDate))
      .slice(0, 30)
      .map(row => ({
        athleteId: row.athlete.id,
        name: row.athlete.name,
        nickname: row.athlete.nickname,
        birthYear: row.athlete.birthYear,
        categoryId: row.athlete.categoryId,
        match: row.exactName && row.sameBirthDate ? "NAME_AND_BIRTH_DATE" : row.exactName ? "NAME" : "BIRTH_DATE",
      }));

    return NextResponse.json({ candidates, requiresManualReview: true, automaticallyApproved: false }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("PUBLIC_REGISTRATION_DUPLICATES_READ_ERROR", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Não foi possível verificar possíveis duplicidades." }, { status: 500 });
  }
}
