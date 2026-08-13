"use server";
import { prisma } from "@/lib/prisma";
import { createRawToken, hashToken } from "@/lib/password-reset";
import { redirect } from "next/navigation";
export async function requestPasswordReset(formData:FormData){
  const email=String(formData.get("email")||"").trim().toLowerCase();
  const user=email?await prisma.user.findUnique({where:{email}}):null;
  if(user){
    const raw=createRawToken();
    await prisma.passwordResetToken.deleteMany({where:{userId:user.id,usedAt:null}});
    await prisma.passwordResetToken.create({data:{userId:user.id,tokenHash:hashToken(raw),expiresAt:new Date(Date.now()+30*60*1000)}});
    if(process.env.NODE_ENV!=="production") redirect(`/esqueci-senha?status=dev&token=${raw}`);
  }
  redirect("/esqueci-senha?status=ok");
}
