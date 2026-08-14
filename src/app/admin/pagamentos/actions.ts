"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";

export async function confirmPayment(formData:FormData){
  const admin=await requireSuperAdmin();
  const id=String(formData.get("id")||"");
  const payment=await prisma.payment.findUnique({where:{id}});
  if(!payment || payment.status!=="PENDING") return;

  const now=new Date();
  const operations:any[]=[prisma.payment.update({where:{id},data:{status:"PAID",confirmedAt:now,confirmedByUserId:admin.id}})];
  if(payment.product==="PLAYER_PREMIUM_MONTHLY" && payment.playerId){
    const current=await prisma.playerProfile.findUnique({where:{id:payment.playerId},select:{premiumUntil:true}});
    const base=current?.premiumUntil && current.premiumUntil>now ? current.premiumUntil : now;
    const until=new Date(base); until.setDate(until.getDate()+30);
    operations.push(prisma.playerProfile.update({where:{id:payment.playerId},data:{plan:"PREMIUM",planStatus:"ACTIVE",premiumUntil:until,template:"PREMIUM_DARK"}}));
  }
  await prisma.$transaction(operations);
  revalidatePath("/admin/pagamentos"); revalidatePath("/admin/players"); revalidatePath("/responsavel");
}

export async function cancelPayment(formData:FormData){
  await requireSuperAdmin();
  const id=String(formData.get("id")||"");
  if(!id)return;
  await prisma.payment.updateMany({where:{id,status:"PENDING"},data:{status:"CANCELLED"}});
  revalidatePath("/admin/pagamentos");
}
