"use server";

import { prisma } from "@/lib/prisma";
import { createRawToken, hashToken } from "@/lib/password-reset";
import { redirect } from "next/navigation";

async function sendResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) return false;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Redefinição de senha — ONZEUP",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
          <h2>Redefinição de senha ONZEUP</h2>
          <p>Recebemos uma solicitação para redefinir sua senha.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#9ddb16;color:#071006;padding:12px 18px;text-decoration:none;border-radius:8px;font-weight:bold">Criar nova senha</a></p>
          <p>Este link expira em 30 minutos.</p>
          <p>Se você não solicitou, ignore este e-mail.</p>
        </div>
      `,
    }),
  });

  return response.ok;
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!email) redirect("/esqueci-senha?status=ok");

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    redirect("/esqueci-senha?status=ok");
  }

  const raw = createRawToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://onzeup.com.br"
      : "http://localhost:3000");

  const resetUrl = `${appUrl}/redefinir-senha?token=${raw}`;

  if (process.env.NODE_ENV !== "production") {
    redirect(`/esqueci-senha?status=dev&token=${raw}`);
  }

  const sent = await sendResetEmail(email, resetUrl);

  if (!sent) {
    redirect("/esqueci-senha?status=email-nao-configurado");
  }

  redirect("/esqueci-senha?status=enviado");
}
