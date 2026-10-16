"use server";

import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";
import {
  createEmailVerificationToken,
  hashEmailVerificationToken,
} from "@/lib/email-verification";
import { sendTransactionalEmail } from "@/lib/email";
import { notifyAdminNewRegistration } from "@/lib/admin-notifications";

const clean = (v: FormDataEntryValue | null) => String(v || "").trim();

function safeInternalDestination(value: string) {
  if (!value) return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  if (value.includes("\\") || /[\r\n]/.test(value)) return "";

  try {
    const parsed = new URL(value, "https://www.onzeup.com.br");

    if (parsed.origin !== "https://www.onzeup.com.br") {
      return "";
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "";
  }
}

function cadastroDestination(query: string, next: string) {
  const safeNext = safeInternalDestination(next);

  return `/cadastro?${query}${
    safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""
  }`;
}

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://www.onzeup.com.br"
      : "http://localhost:3000")
  ).replace(/\/$/, "");
}

async function issueVerification(
  userId: string,
  email: string,
  next = "",
) {
  const raw = createEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(raw);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerificationToken.deleteMany({
    where: { userId, usedAt: null },
  });

  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  const safeNext = safeInternalDestination(next);

  const verifyUrl =
    `${appUrl()}/api/verificar-email?token=${raw}` +
    (safeNext ? `&next=${encodeURIComponent(safeNext)}` : "");

  const result = await sendTransactionalEmail({
    to: email,
    subject: "Confirme seu e-mail — 11UP Player",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#101719">
        <div style="font-size:28px;font-weight:900;margin-bottom:22px">
          11<span style="color:#9ddb16">UP</span>
        </div>
        <h2>Confirme seu e-mail</h2>
        <p>Seu cadastro no 11UP Player foi recebido.</p>
        <p>Confirme seu endereço de e-mail para ativar a conta e começar a criar o perfil esportivo do atleta.</p>
        <p style="margin:28px 0">
          <a href="${verifyUrl}" style="display:inline-block;background:#9ddb16;color:#071006;padding:14px 20px;text-decoration:none;border-radius:9px;font-weight:bold">
            Ativar minha conta
          </a>
        </p>
        <p>Este link é válido por 24 horas.</p>
        <p style="color:#657278;font-size:13px">Se você não criou esta conta, ignore esta mensagem.</p>
      </div>
    `,
  });

  return result.ok;
}

export async function registerGuardian(formData: FormData) {
  const name = clean(formData.get("name"));
  const email = clean(formData.get("email")).toLowerCase();
  const phone = clean(formData.get("phone"));
  const password = clean(formData.get("password"));
  const confirm = clean(formData.get("confirm"));
  const legal = formData.get("legal") === "on";
  const ref = clean(formData.get("ref"));
  const next = safeInternalDestination(clean(formData.get("next")));

  if (!name || !email || password.length < 8 || password !== confirm || !legal) {
    redirect(cadastroDestination("erro=dados", next));
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      active: true,
      emailVerifiedAt: true,
      role: true,
    },
  });

  if (existing) {
    if (
      existing.role === "GUARDIAN" &&
      !existing.active &&
      !existing.emailVerifiedAt
    ) {
      const sent = await issueVerification(existing.id, email, next);
      redirect(
        cadastroDestination(
          `status=${sent ? "reenviado" : "erro-email"}&email=${encodeURIComponent(email)}`,
          next,
        ),
      );
    }

    redirect(cadastroDestination("erro=email-existente", next));
  }

  const passwordHash = await hash(password, 12);
  const coach = ref
    ? await prisma.coachProfile.findUnique({
        where: { slug: ref },
        select: { id: true },
      })
    : null;

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "GUARDIAN",
      active: false,
      accountStatus: "PENDING_VERIFICATION",
      guardianProfile: {
        create: {
          phone: phone || null,
          referredByCoachId: coach?.id || null,
        },
      },
    },
    select: { id: true },
  });

  const sent = await issueVerification(user.id, email, next);

  await notifyAdminNewRegistration({
    type: "PLAYER",
    name,
    email,
    detail: phone ? `Telefone: ${phone}` : null,
    status: "Aguardando confirmação de e-mail",
  });

  redirect(
    cadastroDestination(
      `status=${sent ? "enviado" : "erro-email"}&email=${encodeURIComponent(email)}`,
      next,
    ),
  );
}

export async function resendGuardianVerification(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  const next = safeInternalDestination(clean(formData.get("next")));

  if (!email) redirect(cadastroDestination("erro=dados", next));

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      active: true,
      emailVerifiedAt: true,
    },
  });

  // Resposta neutra para não revelar cadastro de terceiros.
  if (
    !user ||
    user.role !== "GUARDIAN" ||
    user.active ||
    user.emailVerifiedAt
  ) {
    redirect(cadastroDestination("status=reenviado", next));
  }

  const sent = await issueVerification(user.id, email, next);

  redirect(
        cadastroDestination(
          `status=${sent ? "reenviado" : "erro-email"}&email=${encodeURIComponent(email)}`,
          next,
        ),
      );
}
