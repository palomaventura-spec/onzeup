"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

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
  if (await prisma.user.findUnique({ where: { email } })) {
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
      active: true,
      accountStatus: "ACTIVE",
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
      const existing = await prisma.coachOrganizationAccess.findFirst({
        where: {
          coachId: user.coachProfile.id,
          organizationId: match.organizationId,
          categoryId: match.categoryId,
          sport: match.sport,
        },
        select: { id: true },
      });

      if (!existing) {
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

  await createSession(user.id);
  redirect("/coach/dashboard");
}
