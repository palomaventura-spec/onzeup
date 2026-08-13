"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const clean = (value: FormDataEntryValue | null) => String(value || "").trim();

function safeSlug(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function registerClubTrial(formData: FormData) {
  const responsibleName = clean(formData.get("responsibleName"));
  const organizationName = clean(formData.get("organizationName"));
  const email = clean(formData.get("email")).toLowerCase();
  const phone = clean(formData.get("phone"));
  const password = clean(formData.get("password"));
  const confirm = clean(formData.get("confirm"));
  const type = clean(formData.get("type")) || "SCHOOL";
  const legal = formData.get("legal") === "on";

  if (!responsibleName || !organizationName || !email || password.length < 8 || password !== confirm || !legal) {
    redirect("/cadastro-clube?erro=dados");
  }
  if (await prisma.user.findUnique({ where: { email } })) redirect("/cadastro-clube?erro=email");

  const baseSlug = safeSlug(organizationName) || `clube-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 2;
  while (await prisma.organization.findUnique({ where: { slug } })) slug = `${baseSlug}-${suffix++}`;

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 15);
  const passwordHash = await hash(password, 12);

  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      publicName: organizationName,
      type: type as any,
      sport: "BOTH",
      slug,
      phone: phone || null,
      whatsapp: phone || null,
      email,
      active: true,
      onboardingCompleted: false,
      subscription: { create: { plan: "STARTER", status: "TRIAL", trialEnds } },
      users: {
        create: {
          name: responsibleName,
          email,
          passwordHash,
          role: "COORDINATOR",
          active: true,
          accountStatus: "TRIAL",
        },
      },
    },
    include: { users: true },
  });

  await createSession(organization.users[0].id);
  redirect("/onboarding-clube");
}
