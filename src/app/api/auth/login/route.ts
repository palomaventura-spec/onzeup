import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { UserRole } from "@prisma/client";

function safeInternalDestination(value: string, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\") || /[\r\n]/.test(value)) return fallback;

  try {
    const parsed = new URL(value, "https://www.onzeup.com.br");
    if (parsed.origin !== "https://www.onzeup.com.br") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export async function POST(req: Request) {
  const form = await req.formData();

  const email = String(form.get("email") || "").toLowerCase().trim();
  const password = String(form.get("password") || "");
  const requestedNext = String(form.get("next") || "").trim();
  const adminOnly = String(form.get("adminOnly") || "") === "1";

  const failureUrl = adminOnly ? "/admin/login?erro=1" : "/login?erro=1";

  // Bootstrap do Super Admin pelas variáveis de ambiente.
  // Mantido para compatibilidade operacional, sem senha padrão em código.
  if (adminOnly) {
    const adminEmail = String(
      process.env.ONZEUP_ADMIN_EMAIL || "onzeupfutebolbase@gmail.com"
    ).toLowerCase().trim();

    const adminPassword = String(process.env.ONZEUP_ADMIN_PASSWORD || "");

    if (adminPassword && email === adminEmail && password === adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          name: "ONZEUP Super Admin",
          passwordHash,
          role: UserRole.SUPER_ADMIN,
          active: true,
          accountStatus: "ACTIVE",
          organizationId: null,
        },
        create: {
          name: "ONZEUP Super Admin",
          email: adminEmail,
          passwordHash,
          role: UserRole.SUPER_ADMIN,
          active: true,
          accountStatus: "ACTIVE",
          organizationId: null,
        },
      });

      await prisma.session.deleteMany({ where: { userId: admin.id } });
      await createSession(admin.id);

      return NextResponse.redirect(new URL("/admin", req.url), 303);
    }
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.redirect(new URL(failureUrl, req.url), 303);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return NextResponse.redirect(new URL(failureUrl, req.url), 303);
  }

  if (!user.active) {
    if (!adminOnly && user.accountStatus === "PENDING_VERIFICATION") {
      return NextResponse.redirect(new URL("/login?erro=confirme-email", req.url), 303);
    }
    return NextResponse.redirect(new URL(failureUrl, req.url), 303);
  }

  if (adminOnly && user.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/admin/login?erro=1", req.url), 303);
  }

  await createSession(user.id);

  const fallback =
    user.role === "SUPER_ADMIN"
      ? "/admin"
      : user.role === "GUARDIAN"
        ? "/responsavel"
        : user.role === "COACH"
          ? "/coach/dashboard"
          : "/dashboard";

  const destination = safeInternalDestination(requestedNext, fallback);

  return NextResponse.redirect(new URL(destination, req.url), 303);
}
