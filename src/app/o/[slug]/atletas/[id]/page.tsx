import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function PublicAthletePage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const org = await prisma.organization.findFirst({ where: { slug, active: true, showAthletesPublicly: true } });
  if (!org) notFound();
  const athlete = await prisma.athlete.findFirst({ where: { id, organizationId: org.id, active: true }, include: { category: true } });
  if (!athlete) notFound();
  return <main className="athlete-public" style={{"--club-accent": org.accentColor || "#9DDB16"} as React.CSSProperties}>
    <div className="athlete-public-wrap">
      <Link href={`/o/${slug}#elenco`} className="athlete-back">← Voltar ao elenco</Link>
      <section className="athlete-profile-hero">
        <div className="athlete-profile-photo">{athlete.photoUrl ? <img src={athlete.photoUrl} alt={athlete.name}/> : <span>{(athlete.nickname || athlete.name).slice(0,2).toUpperCase()}</span>}</div>
        <div><small>{athlete.category?.name || "ELENCO"} • {org.publicName || org.name}</small><h1>{athlete.nickname || athlete.name}</h1>{athlete.nickname && <p className="athlete-full-name">{athlete.name}</p>}<div className="athlete-public-tags">{athlete.position && <span>{athlete.position}</span>}{athlete.jerseyNumber != null && <span>Camisa #{athlete.jerseyNumber}</span>}{athlete.dominantFoot && <span>Pé {athlete.dominantFoot}</span>}{athlete.birthYear && <span>Nasc. {athlete.birthYear}</span>}</div></div>
      </section>
      <section className="athlete-public-note"><strong>Perfil oficial do clube</strong><p>As informações exibidas nesta página são publicadas e administradas por {org.publicName || org.name}. O perfil pessoal do atleta/responsável é independente.</p></section>
      <footer>Powered by <b>ONZEUP</b></footer>
    </div>
  </main>;
}
