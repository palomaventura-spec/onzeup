import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

const COOKIE_NAME = "onzeup_session";

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await prisma.session.create({ data: { token, userId, expiresAt } });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  return prisma.user.findFirst({
    where: {
      active: true,
      sessions: {
        some: {
          token,
          expiresAt: { gt: new Date() },
        },
      },
    },
    include: { organization: true },
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireOrganizationUser() {
  const user = await requireUser();

  if (user.role === "GUARDIAN") redirect("/responsavel");
  if (user.role === "SUPER_ADMIN" && !user.organizationId) redirect("/admin");
  if (!user.organizationId) redirect("/login");

  return user as typeof user & { organizationId: string };
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }

  store.delete(COOKIE_NAME);
}


export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return user;
}
