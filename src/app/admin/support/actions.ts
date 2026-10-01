"use server";

import { redirect } from "next/navigation";

import { requireSuperAdmin } from "@/lib/auth";
import {
  clearAdminSupportCookie,
  getAdminSupportSession,
  setAdminSupportCookie,
} from "@/lib/admin-support";
import { prisma } from "@/lib/prisma";

export async function startAdminSupportSession(formData: FormData) {
  const admin = await requireSuperAdmin();

  const organizationId = String(
    formData.get("organizationId") || "",
  ).trim();

  const reason = String(
    formData.get("reason") || "",
  ).trim();

  if (!organizationId) {
    redirect("/admin/organizacoes?error=missing_organization");
  }

  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!organization) {
    redirect("/admin/organizacoes?error=not_found");
  }

  await prisma.adminSupportSession.updateMany({
    where: {
      adminUserId: admin.id,
      endedAt: null,
    },
    data: {
      endedAt: new Date(),
    },
  });

  const session = await prisma.adminSupportSession.create({
    data: {
      adminUserId: admin.id,
      organizationId: organization.id,
      reason: reason || null,
    },
  });

  await setAdminSupportCookie(session.id);

  redirect("/dashboard");
}

export async function endAdminSupportSession() {
  const admin = await requireSuperAdmin();

  const session = await getAdminSupportSession(admin.id);

  if (session) {
    await prisma.adminSupportSession.update({
      where: {
        id: session.id,
      },
      data: {
        endedAt: new Date(),
      },
    });
  }

  await clearAdminSupportCookie();

  redirect("/admin");
}
