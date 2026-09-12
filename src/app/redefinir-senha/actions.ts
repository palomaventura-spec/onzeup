"use server";

import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/password-reset";
import { redirect } from "next/navigation";

export async function resetPassword(formData: FormData) {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!token || password.length < 8 || password !== confirm) {
    redirect(`/redefinir-senha?token=${encodeURIComponent(token)}&erro=dados`);
  }

  const rec = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!rec || rec.usedAt || rec.expiresAt <= new Date()) {
    redirect("/redefinir-senha?erro=token");
  }

  const user = await prisma.user.findUnique({
    where: { id: rec.userId },
    select: { id: true, active: true, accountStatus: true },
  });

  // Redefinir senha nunca pode reativar uma conta desativada pelo administrador.
  if (!user || !user.active || user.accountStatus === "INACTIVE" || user.accountStatus === "SUSPENDED") {
    await prisma.passwordResetToken.update({
      where: { id: rec.id },
      data: { usedAt: new Date() },
    });
    redirect("/redefinir-senha?erro=conta-inativa");
  }

  const passwordHash = await hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: rec.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: rec.id },
      data: { usedAt: new Date() },
    }),
    prisma.session.deleteMany({ where: { userId: rec.userId } }),
  ]);

  redirect("/login?senha=alterada");
}
