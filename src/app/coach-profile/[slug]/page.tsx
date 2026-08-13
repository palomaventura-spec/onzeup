import { notFound } from "next/navigation"; import { prisma } from "@/lib/prisma";
export default async function CoachProfile({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params; const c=await prisma.coachProfile.findUnique({where:{slug}});
 if(!c?.isPublic) notFound();
 return <main className="coach-public">
  <nav><a className="player-brand" href="https://coach.onzeup.com.br">ONZE<span>UP</span> <b>COACH</b></a></nav>
  <header><span className="page-eyebrow">PERFIL PROFISSIONAL</span><h1>{c.professionalName||c.name}</h1><h2>{[c.roleTitle,c.currentClub].filter(Boolean).join(" • ")}</h2><p>{c.bio}</p></header>
  <section className="coach-public-grid">
   <article><small>EXPERIÊNCIA</small><p>{c.experience||"Em atualização."}</p></article>
   <article><small>CLUBES</small><p>{c.clubsHistory||c.currentClub||"Em atualização."}</p></article>
   <article><small>LICENÇAS</small><p>{c.licenses||"Em atualização."}</p></article>
   <article><small>FORMAÇÃO</small><p>{c.education||"Em atualização."}</p></article>
   <article><small>METODOLOGIA</small><p>{c.methodology||"Em atualização."}</p></article>
   <article><small>CONQUISTAS</small><p>{c.achievements||"Em atualização."}</p></article>
  </section>
 </main>
}
