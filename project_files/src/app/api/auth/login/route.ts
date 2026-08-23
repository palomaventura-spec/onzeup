import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function POST(req: Request) {
  const form = await req.formData();

  const email = String(form.get("email") || "").toLowerCase().trim();
  const password = String(form.get("password") || "");
  const requestedNext = String(form.get("next") || "").trim();
  const adminOnly = String(form.get("adminOnly") || "") === "1";

  const failureUrl = adminOnly ? "/admin/login?erro=1" : "/login?erro=1";

  // Bootstrap seguro do Super Admin pelas variáveis de ambiente.
  // Isso evita depender de seed manual para entrar em produção.
  if (adminOnly) {
    const adminEmail = String(
      process.env.ONZEUP_ADMIN_EMAIL || "onzeupfutebolbase@gmail.com"
    ).toLowerCase().trim();

    const adminPassword = String(process.env.ONZEUP_ADMIN_PASSWORD || "");

    if (
      adminPassword &&
      email === adminEmail &&
      password === adminPassword
    ) {
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

  if (!user || !user.active) {
    return NextResponse.redirect(new URL(failureUrl, req.url), 303);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);

  if (!ok) {
    return NextResponse.redirect(new URL(failureUrl, req.url), 303);
  }

  if (adminOnly && user.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/admin/login?erro=1", req.url), 303);
  }

  await createSession(user.id);

  const destination =
    requestedNext ||
    (user.role === "SUPER_ADMIN"
      ? "/admin"
      : user.role === "GUARDIAN"
        ? "/responsavel"
        : user.role === "COACH"
          ? "/coach/dashboard"
          : "/dashboard");

  return NextResponse.redirect(new URL(destination, req.url), 303);
}
