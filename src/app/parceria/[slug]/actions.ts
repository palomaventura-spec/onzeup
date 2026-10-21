"use server";

import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const INTENT_MINUTES = 15;

function normalizeName(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function cookieName(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9-]/gi, "").toLowerCase();
  return `onzeup_partnership_intent_${safeSlug}`;
}

export async function locatePartnershipAthlete(
  slug: string,
  formData: FormData,
) {
  // Protecao temporaria durante o desenvolvimento do piloto.
  // Nenhuma outra organizacao pode usar este fluxo ainda.
  if (slug !== "teste") {
    redirect("/login");
  }

  const athleteFullName = String(
    formData.get("athleteFullName") || "",
  ).trim();

  const birthDateRaw = String(
    formData.get("birthDate") || "",
  ).trim();

  if (!athleteFullName || !birthDateRaw) {
    redirect(`/parceria/${slug}?status=dados-incompletos`);
  }

  const organization = await prisma.organization.findUnique({
    where: { slug },
    select: {
      id: true,
      active: true,
    },
  });

  if (!organization || !organization.active) {
    redirect(`/parceria/${slug}?status=indisponivel`);
  }

  const parts = birthDateRaw.split("-").map(Number);

  if (
    parts.length !== 3 ||
    parts.some((part) => !Number.isInteger(part))
  ) {
    redirect(`/parceria/${slug}?status=dados-incompletos`);
  }

  const [year, month, day] = parts;

  const birthStart = new Date(
    Date.UTC(year, month - 1, day, 0, 0, 0, 0),
  );

  const birthEnd = new Date(
    Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0),
  );

  const candidates = await prisma.athlete.findMany({
    where: {
      organizationId: organization.id,
      active: true,
      privateData: {
        is: {
          birthDate: {
            gte: birthStart,
            lt: birthEnd,
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  const requestedName = normalizeName(athleteFullName);

  const matches = candidates.filter(
    (athlete) => normalizeName(athlete.name) === requestedName,
  );

  if (matches.length === 0) {
    redirect(`/parceria/${slug}?status=nao-encontrado`);
  }

  if (matches.length > 1) {
    redirect(`/parceria/${slug}?status=validacao-manual`);
  }

  const athlete = matches[0];

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() + INTENT_MINUTES * 60 * 1000,
  );

  await prisma.playerPartnershipActivationIntent.create({
    data: {
      tokenHash,
      organizationId: organization.id,
      athleteId: athlete.id,
      expiresAt,
    },
  });

  const store = await cookies();

  store.set(cookieName(slug), rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/parceria/${slug}`,
    maxAge: INTENT_MINUTES * 60,
  });

  redirect(`/parceria/${slug}?status=encontrado`);
}