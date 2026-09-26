import { prisma } from "@/lib/prisma";
import {
  createEmailVerificationToken,
  hashEmailVerificationToken,
} from "@/lib/email-verification";
import { sendTransactionalEmail } from "@/lib/email";

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://www.11UP.com.br"
      : "http://localhost:3000")
  ).replace(/\/$/, "");
}

export async function issueAccountVerification({
  userId,
  email,
  product,
}: {
  userId: string;
  email: string;
  product: "Coach" | "Club";
}) {
  const raw = createEmailVerificationToken();
  const tokenHash = hashEmailVerificationToken(raw);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.emailVerificationToken.deleteMany({
    where: { userId, usedAt: null },
  });

  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  const verifyUrl = `${appUrl()}/api/verificar-email?token=${raw}`;

  const result = await sendTransactionalEmail({
    to: email,
    subject: `Confirme seu e-mail — 11UP ${product}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#101719">
        <div style="font-size:28px;font-weight:900;margin-bottom:22px">
          ONZE<span style="color:#9ddb16">UP</span>
        </div>
        <h2>Confirme seu e-mail</h2>
        <p>Seu cadastro no 11UP ${product} foi recebido.</p>
        <p>Confirme seu endereço de e-mail para ativar a conta e acessar a plataforma.</p>
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
