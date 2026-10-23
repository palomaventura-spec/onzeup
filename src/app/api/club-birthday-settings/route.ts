import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const AUDIENCES = ["ATHLETES", "GUARDIANS", "STAFF"] as const;
type Audience = typeof AUDIENCES[number];

async function access() {
  const user = await getCurrentUser();
  if (!user?.organizationId || user.role === "SUPER_ADMIN" || !hasClubPermission(user, "ATHLETES_EDIT")) return null;
  return { organizationId: user.organizationId };
}

export async function GET() {
  const user = await access();
  if (!user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const saved = await prisma.clubBirthdayReminderSetting.findMany({
    where: { organizationId: user.organizationId }, select: { audience: true, leadDays: true },
  });
  const settings = AUDIENCES.map(audience => ({ audience, leadDays: saved.find(setting => setting.audience === audience)?.leadDays ?? null }));
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  const user = await access();
  if (!user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { audience, leadDays } = body as { audience?: unknown; leadDays?: unknown };
  if (!AUDIENCES.includes(audience as Audience) || !(leadDays === null || leadDays === 0 || leadDays === 7 || leadDays === 30)) {
    return NextResponse.json({ error: "Use ATHLETES, GUARDIANS ou STAFF e leadDays null, 0, 7 ou 30." }, { status: 400 });
  }
  const saved = await prisma.clubBirthdayReminderSetting.upsert({
    where: { organizationId_audience: { organizationId: user.organizationId, audience: audience as Audience } },
    update: { leadDays: leadDays as number | null },
    create: { organizationId: user.organizationId, audience: audience as Audience, leadDays: leadDays as number | null },
    select: { audience: true, leadDays: true },
  });
  return NextResponse.json({ setting: saved });
}
