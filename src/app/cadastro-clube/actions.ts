"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { notifyAdminNewRegistration } from "@/lib/admin-notifications";
import { issueAccountVerification } from "@/lib/registration-verification";

const clean = (value: FormDataEntryValue | null) =>
  String(value || "").trim();

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function registerClubTrial(formData: FormData) {
  const responsibleName = clean(
    formData.get("responsibleName")
  );

  const organizationName = clean(
    formData.get("organizationName")
  );

  const email = clean(
    formData.get("email")
  ).toLowerCase();

  const phone = clean(
    formData.get("phone")
  );

  const password = clean(
    formData.get("password")
  );

  const confirm = clean(
    formData.get("confirm")
  );

  const rawType =
    clean(formData.get("type")) || "SCHOOL";

  const allowedTypes = [
    "CLUB",
    "SCHOOL",
    "PROJECT",
    "ACADEMY",
    "PERSONAL_TRAINING",
  ] as const;

  const type = allowedTypes.includes(
    rawType as (typeof allowedTypes)[number]
  )
    ? rawType
    : "SCHOOL";

  const legal =
    formData.get("legal") === "on";

  if (
    !responsibleName ||
    !organizationName ||
    !email ||
    password.length < 8 ||
    password !== confirm ||
    !legal
  ) {
    redirect("/cadastro-clube?erro=dados");
  }

  const existing =
    await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        clubRole: true,
        active: true,
        emailVerifiedAt: true,
        accountStatus: true,
      },
    });

  if (existing) {
    if (
      existing.role === "COORDINATOR" &&
      !existing.active &&
      !existing.emailVerifiedAt &&
      existing.accountStatus ===
        "PENDING_VERIFICATION"
    ) {
      const sent =
        await issueAccountVerification({
          userId: existing.id,
          email,
          product: "Club",
        });

      redirect(
        `/cadastro-clube?status=${
          sent ? "reenviado" : "erro-email"
        }&email=${encodeURIComponent(email)}`
      );
    }

    redirect("/cadastro-clube?erro=email");
  }

  const baseSlug =
    safeSlug(organizationName) ||
    `clube-${Date.now()}`;

  let slug = baseSlug;
  let suffix = 2;

  while (
    await prisma.organization.findUnique({
      where: { slug },
    })
  ) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const trialEnds = new Date();
  trialEnds.setDate(
    trialEnds.getDate() + 15
  );

  const passwordHash =
    await hash(password, 12);

  const organization =
    await prisma.organization.create({
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

        subscription: {
          create: {
            plan: "STARTER",
            status: "TRIAL",
            trialEnds,
          },
        },

        users: {
          create: {
            name: responsibleName,
            email,
            passwordHash,

            // Mantemos COORDINATOR como papel
            // estrutural do ONZEUP Club para
            // compatibilidade com o sistema atual.
            role: "COORDINATOR",

            // O primeiro usuário criado pelo clube
            // é o Gestor principal.
            clubRole: "MANAGER",

            active: false,
            accountStatus:
              "PENDING_VERIFICATION",
          },
        },
      },

      include: {
        users: true,
      },
    });

  const user =
    organization.users[0];

  const sent =
    await issueAccountVerification({
      userId: user.id,
      email,
      product: "Club",
    });

  await notifyAdminNewRegistration({
    type: "CLUB",
    name: organizationName,
    email,
    detail:
      `Responsável: ${responsibleName} • Tipo: ${type}`,
    status:
      "Aguardando confirmação de e-mail",
  });

  redirect(
    `/cadastro-clube?status=${
      sent ? "enviado" : "erro-email"
    }&email=${encodeURIComponent(email)}`
  );
}

export async function resendClubVerification(
  formData: FormData
) {
  const email = clean(
    formData.get("email")
  ).toLowerCase();

  if (!email) {
    redirect(
      "/cadastro-clube?erro=dados"
    );
  }

  const user =
    await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        clubRole: true,
        active: true,
        emailVerifiedAt: true,
        accountStatus: true,
      },
    });

  if (
    !user ||
    user.role !== "COORDINATOR" ||
    user.active ||
    user.emailVerifiedAt ||
    user.accountStatus !==
      "PENDING_VERIFICATION"
  ) {
    redirect(
      "/cadastro-clube?status=reenviado"
    );
  }

  const sent =
    await issueAccountVerification({
      userId: user.id,
      email,
      product: "Club",
    });

  redirect(
    `/cadastro-clube?status=${
      sent ? "reenviado" : "erro-email"
    }&email=${encodeURIComponent(email)}`
  );
}