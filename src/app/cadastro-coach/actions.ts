"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { notifyAdminNewRegistration } from "@/lib/admin-notifications";
import { issueAccountVerification } from "@/lib/registration-verification";

const clean = (v: FormDataEntryValue | null) => String(v || "").trim();
const slugify = (v: string) =>
  v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export async function registerCoach(formData: FormData) {
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));
  const confirm = clean(formData.get("confirm"));

  if (!name || !email || password.length < 8 || password !== confirm) {
    redirect("/cadastro-coach?erro=dados");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, active: true, emailVerifiedAt: true, accountStatus: true },
  });

  if (existing) {
    if (
      existing.role === "COACH" &&
      !existing.active &&
      !existing.emailVerifiedAt &&
      existing.accountStatus === "PENDING_VERIFICATION"
    ) {
      const sent = await issueAccountVerification({ userId: existing.id, email, product: "Coach" });
      redirect(`/cadastro-coach?status=${sent ? "reenviado" : "erro-email"}&email=${encodeURIComponent(email)}`);
    }
    redirect("/cadastro-coach?erro=email");
  }

  let slug = slugify(name) || `coach-${Date.now()}`;
  const base = slug;
  let n = 2;
  while (await prisma.coachProfile.findUnique({ where: { slug } })) slug = `${base}-${n++}`;

  const manages = formData.get("managesOrganization") === "yes";
  const orgType = clean(formData.get("organizationType"));
  const allowed = ["CLUB", "SCHOOL", "PROJECT", "ACADEMY", "PERSONAL_TRAINING"];

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hash(password, 12),
      role: "COACH",
      active: false,
      accountStatus: "PENDING_VERIFICATION",
      coachProfile: {
        create: {
          name,
          slug,
          directoryVisible: true,
          isPublic: false,
          managesOrganization: manages,
          managedOrganizationType: manages && allowed.includes(orgType) ? orgType as any : null,
        },
      },
    },
    include: { coachProfile: true },
  });

  if (user.coachProfile) {
    const matches = await prisma.staffMember.findMany({
      where: { coachEmail: { equals: email, mode: "insensitive" } },
      select: {
        organizationId: true,
        categoryId: true,
        sport: true,
        roleTitle: true,
        canManageCallUps: true,
      },
    });

    for (const match of matches) {
      const linked = await prisma.coachOrganizationAccess.findFirst({
        where: {
          coachId: user.coachProfile.id,
          organizationId: match.organizationId,
          categoryId: match.categoryId,
          sport: match.sport,
        },
        select: { id: true },
      });

      if (!linked) {
        await prisma.coachOrganizationAccess.create({
          data: {
            coachId: user.coachProfile.id,
            organizationId: match.organizationId,
            categoryId: match.categoryId,
            sport: match.sport,
            roleTitle: match.roleTitle,
            requestedBy: "COACH",
            active: false,
            canViewRoster: true,
            canViewSchedule: true,
            canViewCallUps: true,
            canManageCallUps: match.canManageCallUps,
          },
        });
      }
    }
  }

  const sent = await issueAccountVerification({ userId: user.id, email, product: "Coach" });

  await notifyAdminNewRegistration({
    type: "COACH",
    name,
    email,
    detail: manages ? `Administra organização: ${orgType || "não informado"}` : "Não administra organização",
    status: "Aguardando confirmação de e-mail",
  });

  redirect(`/cadastro-coach?status=${sent ? "enviado" : "erro-email"}&email=${encodeURIComponent(email)}`);
}

export async function resendCoachVerification(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  if (!email) redirect("/cadastro-coach?erro=dados");

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, active: true, emailVerifiedAt: true, accountStatus: true },
  });

  if (
    !user ||
    user.role !== "COACH" ||
    user.active ||
    user.emailVerifiedAt ||
    user.accountStatus !== "PENDING_VERIFICATION"
  ) {
    redirect("/cadastro-coach?status=reenviado");
  }

  const sent = await issueAccountVerification({ userId: user.id, email, product: "Coach" });
  redirect(`/cadastro-coach?status=${sent ? "reenviado" : "erro-email"}&email=${encodeURIComponent(email)}`);
}
