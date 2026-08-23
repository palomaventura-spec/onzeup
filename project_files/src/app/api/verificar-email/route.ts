import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashEmailVerificationToken } from "@/lib/email-verification";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = String(url.searchParams.get("token") || "");

  if (!raw) {
    return NextResponse.redirect(
      new URL("/login?verificacao=token-invalido", req.url),
      303
    );
  }

  const tokenHash = hashEmailVerificationToken(raw);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt <= new Date()) {
    return NextResponse.redirect(
      new URL("/login?verificacao=token-expirado", req.url),
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
    new URL("/login?verificacao=ok", req.url),
    303
  );
}
