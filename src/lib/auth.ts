import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { isPastGrace } from "@/lib/billing-entitlements";
import { getAdminSupportSession } from "@/lib/admin-support";

const COOKIE_NAME = "onzeup_session";

export async function createSession(
  userId: string,
  remember = false,
) {
  const token = crypto.randomBytes(32).toString("hex");

  const duration = remember
    ? 1000 * 60 * 60 * 24 * 30
    : 1000 * 60 * 60 * 24 * 7;

  const expiresAt = new Date(Date.now() + duration);

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  const store = await cookies();

  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain:
      process.env.NODE_ENV === "production"
        ? ".onzeup.com.br"
        : undefined,
    expires: expiresAt,
    maxAge: Math.floor(duration / 1000),
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
    include: {
      organization: true,
    },
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
  if (user.role === "COACH") redirect("/coach/dashboard");

  let effectiveOrganizationId = user.organizationId;
  let effectiveOrganization = user.organization;
  let isSupportMode = false;

  if (user.role === "SUPER_ADMIN") {
    const supportSession = await getAdminSupportSession(user.id);

    if (!supportSession) {
      redirect("/admin");
    }

    effectiveOrganizationId = supportSession.organizationId;
    effectiveOrganization = supportSession.organization;
    isSupportMode = true;
  }

  if (!effectiveOrganizationId) {
    redirect("/login");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: effectiveOrganizationId,
    },
    select: {
      accessStatus: true,
      complimentaryUntil: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  if (!organization) {
    redirect(user.role === "SUPER_ADMIN" ? "/admin" : "/login");
  }

  const effectiveUser = {
    ...user,
    organizationId: effectiveOrganizationId,
    organization: effectiveOrganization,
    isSupportMode,
  };

  if (isSupportMode) {
    return effectiveUser;
  }

  if (organization.accessStatus === "SUSPENDED") {
    redirect("/acesso-bloqueado?status=suspended");
  }

  if (organization.accessStatus === "CANCELLED") {
    redirect("/acesso-bloqueado?status=cancelled");
  }

  if (organization.accessStatus === "COMPLIMENTARY") {
    if (
      organization.complimentaryUntil &&
      organization.complimentaryUntil < new Date()
    ) {
      redirect("/acesso-bloqueado?status=expired");
    }

    return effectiveUser;
  }

  const subscription = organization.subscription;

  if (subscription?.status === "CANCELLED") {
    redirect("/acesso-bloqueado?status=billing_cancelled");
  }

  if (
    subscription?.status === "PAST_DUE" &&
    isPastGrace(subscription.currentPeriodEnd)
  ) {
    redirect("/acesso-bloqueado?status=past_due");
  }

  return effectiveUser;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;

  if (token) {
    await prisma.session.deleteMany({
      where: {
        token,
      },
    });
  }

  store.delete(COOKIE_NAME);
}

export async function requireSuperAdmin() {
  const user = await requireUser();

  if (user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return user;
}
