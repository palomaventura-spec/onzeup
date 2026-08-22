"use server";
import {redirect} from "next/navigation";
import {requireOrganizationUser} from "@/lib/auth";
import {prisma} from "@/lib/prisma";
import {asaasIsSandbox,createAsaasClubCheckout,writeAsaasData} from "@/lib/asaas";
import {CLUB_PLANS,clubPrice,clubProduct,type ClubBillingCycle,type ClubCommercialPlan} from "@/lib/club-plans";
const APP_URL=(process.env.APP_URL||"https://www.onzeup.com.br").replace(/\/$/,"");
const isPlan=(v:string):v is ClubCommercialPlan=>["ESSENTIAL","PRO","ELITE"].includes(v);
const isCycle=(v:string):v is ClubBillingCycle=>["MONTHLY","ANNUAL"].includes(v);
export async function createClubAsaasCheckout(fd:FormData){
 const u=await requireOrganizationUser();if(!u.organizationId||!u.organization)redirect("/dashboard");
 const plan=String(fd.get("plan")||""),cycle=String(fd.get("cycle")||""),method=String(fd.get("method")||"");
 if(!isPlan(plan)||!isCycle(cycle)||!["CARD","PIX"].includes(method))redirect("/planos?paymentStatus=invalid");
 const cents=clubPrice(plan,cycle),product=clubProduct(plan,cycle),base=`${APP_URL}/checkout/asaas/retorno`;
 const p=await prisma.payment.create({data:{userId:u.id,organizationId:u.organizationId,product,amountCents:cents,method:"ASAAS",pixTxid:`CLUB${Date.now()}`,note:`ONZEUP Club ${CLUB_PLANS[plan].label}`}});
 try{
  const c=await createAsaasClubCheckout({externalReference:p.id,organizationName:u.organization.publicName||u.organization.name,planLabel:CLUB_PLANS[plan].label,value:cents/100,cycle,method,successUrl:`${base}?status=success&origin=club`,cancelUrl:`${base}?status=cancel&origin=club`,expiredUrl:`${base}?status=expired&origin=club`});
  if(!c.link)throw new Error("Asaas não retornou o link.");
  await prisma.payment.update({where:{id:p.id},data:{pixPayload:writeAsaasData({provider:"ASAAS",environment:asaasIsSandbox()?"SANDBOX":"PRODUCTION",checkoutId:c.id,checkoutUrl:c.link,checkoutStatus:c.status||"ACTIVE",processedEventIds:[],paymentMethod:method as any,billingCycle:cycle,commercialPlan:plan})}});
  redirect(c.link);
 }catch(e){console.error("CLUB_ASAAS_CREATE_ERROR",e instanceof Error?e.message:e);redirect("/planos?paymentStatus=erro");}
}
