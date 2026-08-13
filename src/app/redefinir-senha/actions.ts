"use server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/password-reset";
import { redirect } from "next/navigation";
export async function resetPassword(formData:FormData){
 const token=String(formData.get("token")||""); const password=String(formData.get("password")||""); const confirm=String(formData.get("confirm")||"");
 if(!token||password.length<8||password!==confirm) redirect(`/redefinir-senha?token=${encodeURIComponent(token)}&erro=dados`);
 const rec=await prisma.passwordResetToken.findUnique({where:{tokenHash:hashToken(token)}});
 if(!rec||rec.usedAt||rec.expiresAt<=new Date()) redirect("/redefinir-senha?erro=token");
 await prisma.$transaction([
  prisma.user.update({where:{id:rec.userId},data:{passwordHash:await hash(password,12),active:true,accountStatus:"ACTIVE"}}),
  prisma.passwordResetToken.update({where:{id:rec.id},data:{usedAt:new Date()}}),
  prisma.session.deleteMany({where:{userId:rec.userId}})
 ]);
 redirect("/login?senha=alterada");
}
