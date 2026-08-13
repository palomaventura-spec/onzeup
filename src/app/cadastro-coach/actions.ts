"use server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { redirect } from "next/navigation";

const clean=(v:FormDataEntryValue|null)=>String(v||"").trim();
const slugify=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");

export async function registerCoach(formData:FormData){
  const name=clean(formData.get("name"));
  const email=clean(formData.get("email")).toLowerCase();
  const password=clean(formData.get("password"));
  const confirm=clean(formData.get("confirm"));
  if(!name||!email||password.length<8||password!==confirm) redirect("/cadastro-coach?erro=dados");
  if(await prisma.user.findUnique({where:{email}})) redirect("/cadastro-coach?erro=email");

  let slug=slugify(name)||`coach-${Date.now()}`, base=slug, n=2;
  while(await prisma.coachProfile.findUnique({where:{slug}})) slug=`${base}-${n++}`;

  const user=await prisma.user.create({
    data:{
      name,email,passwordHash:await hash(password,12),role:"COACH",active:true,accountStatus:"ACTIVE",
      coachProfile:{create:{name,slug,directoryVisible:true,isPublic:false}}
    }
  });
  await createSession(user.id);
  redirect("/coach/editar");
}
