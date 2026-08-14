import { prisma } from "@/lib/prisma";
export default async function CoachesHome({searchParams}:{searchParams:Promise<{q?:string;role?:string;location?:string}>}){
 const query=await searchParams;
 const where:any={isPublic:true,directoryVisible:true,
   ...(query.role?{roleTitle:{contains:query.role,mode:"insensitive"}}:{}),
   AND:[
     ...(query.q?[{OR:[{name:{contains:query.q,mode:"insensitive"}},{professionalName:{contains:query.q,mode:"insensitive"}},{currentClub:{contains:query.q,mode:"insensitive"}}]}]:[]),
     ...(query.location?[{OR:[{city:{contains:query.location,mode:"insensitive"}},{state:{contains:query.location,mode:"insensitive"}},{country:{contains:query.location,mode:"insensitive"}}]}]:[])
   ]};
 const [featured,coaches]=await Promise.all([
   prisma.coachProfile.findMany({where:{isPublic:true,directoryVisible:true,isFeatured:true,OR:[{featuredUntil:null},{featuredUntil:{gt:new Date()}}]},orderBy:{updatedAt:"desc"},take:6}),
   prisma.coachProfile.findMany({where,orderBy:[{isFeatured:"desc"},{updatedAt:"desc"}],take:100})
 ]);
 const roles=Array.from(new Set(coaches.map(c=>c.roleTitle).filter(Boolean))) as string[];
 return <main className="catalog-first-page coach-catalog-page">
   <header className="catalog-nav"><a href="/coaches" className="player-brand">ONZE<span>UP</span> <b>COACHES</b></a><nav><a href="#todos">Profissionais</a><a href="https://onzeup.com.br/coach">Sobre o Coach</a><a href="https://onzeup.com.br/login?perfil=coach">Entrar</a><a className="btn" href="/cadastro-coach">Criar perfil grátis</a></nav></header>
   <section className="catalog-title"><span className="page-eyebrow">ONZEUP COACHES</span><h1>Profissionais do futebol.</h1><p>Treinadores, auxiliares, scouts e profissionais que desenvolvem atletas e projetos.</p></section>
   {featured.length?<section className="catalog-featured"><div className="catalog-section-title"><div><span className="page-eyebrow">SELEÇÃO ONZEUP</span><h2>Profissionais em destaque</h2></div></div><div className="featured-coach-grid">{featured.map(c=><a href={`/coach-profile/${c.slug}`} key={c.id} className="featured-coach-card"><div className="catalog-photo">{c.photoUrl?<img src={c.photoUrl} alt={c.name}/>:<span>{c.name.slice(0,2)}</span>}</div><span>★ DESTAQUE ONZEUP</span><h3>{c.professionalName||c.name}</h3><p>{[c.roleTitle,c.currentClub,c.city].filter(Boolean).join(" • ")}</p><strong>Ver perfil →</strong></a>)}</div></section>:null}
   <section className="catalog-search-zone" id="todos"><div className="catalog-section-title"><div><span className="page-eyebrow">PESQUISA</span><h2>Encontre um profissional</h2></div><span className="badge">{coaches.length} perfil(is)</span></div>
    <form className="catalog-filter-form coach-filter"><input name="q" defaultValue={query.q||""} placeholder="Nome ou clube"/><select name="role" defaultValue={query.role||""}><option value="">Função</option>{roles.map(x=><option key={x}>{x}</option>)}</select><input name="location" defaultValue={query.location||""} placeholder="Cidade, estado ou país"/><button className="btn">Buscar</button></form>
    <div className="catalog-grid">{coaches.map(c=><a href={`/coach-profile/${c.slug}`} className="catalog-person-card coach" key={c.id}><div className="catalog-photo">{c.photoUrl?<img src={c.photoUrl} alt={c.name}/>:<span>{c.name.slice(0,2).toUpperCase()}</span>}</div><small>ONZEUP COACH</small><h3>{c.professionalName||c.name}</h3><p>{[c.roleTitle,c.currentClub,c.city].filter(Boolean).join(" • ")}</p><strong>Ver perfil →</strong></a>)}{!coaches.length?<div className="catalog-empty"><h3>Nenhum profissional encontrado.</h3><p>Crie seu perfil gratuito e seja um dos primeiros Coaches da plataforma.</p></div>:null}</div>
   </section>
   <section className="catalog-conversion"><div><span className="page-eyebrow">ONZEUP COACH • 100% GRATUITO</span><h2>Construa sua presença profissional.</h2><p>Crie seu perfil e use seu link de parceiro para indicar o ONZEUP Player às famílias.</p></div><div><a className="btn" href="/cadastro-coach">Criar Coach grátis</a><a className="players-secondary-cta" href="https://onzeup.com.br/coach">Como funciona a parceria →</a></div></section>
 </main>
}
