import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashEmailVerificationToken } from "@/lib/email-verification";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = String(url.searchParams.get("token") || "");

  const next = safeInternalDestination(
    String(url.searchParams.get("next") || ""),
  );

  const nextQuery = next
    ? `&next=${encodeURIComponent(next)}`
    : "";

  if (!raw) {
    return NextResponse.redirect(
      new URL(`/login?verificacao=token-invalido${nextQuery}`, req.url),
      303
    );
  }

  const tokenHash = hashEmailVerificationToken(raw);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          active: true,
          accountStatus: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.redirect(
      new URL(`/login?verificacao=token-expirado${nextQuery}`, req.url),
      303
    );
  }

  // Um token antigo não pode reativar conta já bloqueada/desativada.
  if (
    record.user.emailVerifiedAt ||
    record.user.accountStatus !== "PENDING_VERIFICATION"
  ) {
    await prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    return NextResponse.redirect(
      new URL(`/login?verificacao=token-invalido${nextQuery}`, req.url),
      303
    );
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        active: true,
        accountStatus: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.emailVerificationToken.updateMany({
      where: {
        userId: record.userId,
        usedAt: null,
        id: { not: record.id },
      },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.redirect(
    new URL(`/login?verificacao=ok${nextQuery}`, req.url),
    303
  );
}
