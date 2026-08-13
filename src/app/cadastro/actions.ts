"use server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { redirect } from "next/navigation";

const clean=(v:FormDataEntryValue|null)=>String(v||"").trim();

export async function registerGuardian(formData:FormData){
  const name=clean(formData.get("name"));
  const email=clean(formData.get("email")).toLowerCase();
  const phone=clean(formData.get("phone"));
  const password=clean(formData.get("password"));
  const confirm=clean(formData.get("confirm"));
  const legal=formData.get("legal")==="on";

  if(!name||!email||password.length<8||password!==confirm||!legal) redirect("/cadastro?erro=dados");
  const exists=await prisma.user.findUnique({where:{email}});
  if(exists) redirect("/cadastro?status=verifique");

  const passwordHash=await hash(password,12);
  await prisma.user.create({data:{
    name,email,passwordHash,role:"GUARDIAN",active:false,accountStatus:"PENDING_VERIFICATION",
    guardianProfile:{create:{phone:phone||null}}
  }});

  // v1.1.0 leaves the account pending until transactional email is configured.
  // The next patch will generate/send a one-time verification token through the verified ONZEUP domain.
  redirect("/cadastro?status=verifique");
}