"use server";

import { prisma } from "@/lib/prisma";
import { createRawToken, hashToken } from "@/lib/password-reset";
import { sendTransactionalEmail } from "@/lib/email";
import { redirect } from "next/navigation";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email) redirect("/esqueci-senha?status=ok");

  const user = await prisma.user.findUnique({ where: { email } });

  // Mantém resposta neutra para não revelar se o endereço existe.
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

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://www.onzeup.com.br"
      : "http://localhost:3000")
  ).replace(/\/$/, "");

  const resetUrl = `${appUrl}/redefinir-senha?token=${raw}`;

  if (process.env.NODE_ENV !== "production") {
    redirect(`/esqueci-senha?status=dev&token=${raw}`);
  }

  const result = await sendTransactionalEmail({
    to: email,
    subject: "Redefinição de senha — ONZEUP",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#101719">
        <div style="font-size:28px;font-weight:900;margin-bottom:22px">
          ONZE<span style="color:#9ddb16">UP</span>
        </div>
        <h2>Redefinição de senha</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta ONZEUP.</p>
        <p style="margin:28px 0">
          <a href="${resetUrl}" style="display:inline-block;background:#9ddb16;color:#071006;padding:14px 20px;text-decoration:none;border-radius:9px;font-weight:bold">
            Criar nova senha
          </a>
        </p>
        <p>Este link expira em 30 minutos.</p>
        <p style="color:#657278;font-size:13px">Se você não solicitou a alteração, ignore esta mensagem.</p>
      </div>
    `,
  });

  if (!result.ok) {
    redirect("/esqueci-senha?status=erro-email");
  }

  redirect("/esqueci-senha?status=enviado");
}
