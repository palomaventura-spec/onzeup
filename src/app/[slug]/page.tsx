import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PlayerPublicActions from "@/components/PlayerPublicActions";

const RESERVED = new Set(["admin","api","atletas","categorias","comissao","convocacoes","dashboard","financeiro","integracoes","jogos","login","o","organizacao","player","qtr","responsavel","treinos","cadastro","verificar-email","esqueci-senha","redefinir-senha","exemplos","players","coaches","coach","cadastro-coach","cadastro-clube","onboarding-clube"]);

function lines(value?: string | null) {
  return String(value || "").split(/\r?\n/).map(v => v.trim()).filter(Boolean);
}

function youtubeId(url:string) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v") || u.pathname.split("/").filter(Boolean).pop() || "";
  } catch {}
  return "";
}

function youtubeEmbed(url:string) {
  const id = youtubeId(url);
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

function youtubeThumb(url:string) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "";
}

function instagramUrl(value?:string|null) {
  const v=String(value||"").trim();
  if(!v) return "";
  if(v.startsWith("http://")||v.startsWith("https://")) return v;
  return `https://instagram.com/${v.replace(/^@/,"")}`;
}

export default async function PublicPlayer({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  if (RESERVED.has(slug)) notFound();

  const player=await prisma.playerProfile.findFirst({
    where:{slug,isPublic:true},
    include:{athleteLinks:{where:{verified:true},include:{athlete:{include:{organization:true,category:true}}}}}
  });
  if(!player) notFound();

  const videos=lines(player.videos);
  const history=lines(player.careerHistory);
  const achievements=lines(player.achievements);
  const gallery=lines(player.gallery);
  const insta=instagramUrl(player.instagram);
  const isPremium=player.plan==="PREMIUM";

  if(!isPremium){
    const video=videos[0] ? youtubeEmbed(videos[0]) : "";
    return <main className="free-player-site">
      <header className="free-player-nav">
        <Link href="https://players.onzeup.com.br" className="player-brand">ONZE<span>UP</span> <b>PLAYER</b></Link>
        <div className="public-social-actions">
          {insta?<a className="btn-secondary" href={insta} target="_blank" rel="noreferrer">Instagram ↗</a>:null}
          {player.websiteUrl?<a className="btn-secondary" href={player.websiteUrl} target="_blank" rel="noreferrer">Site ↗</a>:null}
          <Link href="https://onzeup.com.br/cadastro" className="btn">Crie seu Player grátis</Link>
        </div>
      </header>
      <section className="free-player-hero">
        <div className="free-player-photo">{player.photoUrl?<img src={player.photoUrl} alt={player.name}/>:<span>{player.name.slice(0,2)}</span>}</div>
        <div><span className="page-eyebrow">ONZE PLAYER • PERFIL ESPORTIVO</span><h1>{player.name}</h1>{player.nickname?<h2>{player.nickname}</h2>:null}
          <div className="athlete-tags">{player.position?<span>{player.position}</span>:null}{player.secondaryPosition?<span>{player.secondaryPosition}</span>:null}{player.categoryLabel?<span>{player.categoryLabel}</span>:null}{player.nationality?<span>{player.nationality}</span>:null}</div>
        </div>
      </section>
      <section className="free-player-stats">
        {player.matches!=null?<div><strong>{player.matches}</strong><span>Jogos</span></div>:null}
        {player.goals!=null?<div><strong>{player.goals}</strong><span>Gols</span></div>:null}
        {player.assists!=null?<div><strong>{player.assists}</strong><span>Assistências</span></div>:null}
        {player.titles!=null?<div><strong>{player.titles}</strong><span>Conquistas</span></div>:null}
      </section>
      <section className="free-player-content">
        <article className="card"><span className="page-eyebrow">PERFIL</span><h2>Dados esportivos</h2>
          <div className="free-player-data">{player.birthYear?<p><small>Ano</small><b>{player.birthYear}</b></p>:null}{player.modality?<p><small>Modalidade</small><b>{player.modality}</b></p>:null}{player.position?<p><small>Posição</small><b>{player.position}</b></p>:null}{player.dominantFoot?<p><small>Pé dominante</small><b>{player.dominantFoot}</b></p>:null}{player.height?<p><small>Altura</small><b>{player.height}</b></p>:null}{player.currentClub?<p><small>Clube atual</small><b>{player.currentClub}</b></p>:null}</div>
          {player.bio?<p className="free-player-bio">{player.bio}</p>:null}
        </article>
        {history.length?<article className="card"><span className="page-eyebrow">TRAJETÓRIA</span><h2>Histórico esportivo</h2><div className="free-history">{history.map((x,i)=><p key={i}>{x}</p>)}</div></article>:null}
        {video?<article className="card free-video"><span className="page-eyebrow">EM CAMPO</span><h2>Vídeo</h2><iframe src={video} title={`Vídeo de ${player.name}`} allowFullScreen /></article>:null}
      </section>
      <footer className="free-player-footer"><b>ONZE<span>UP</span> PLAYER</b><p>Perfil esportivo administrado pelo responsável do atleta.</p><PlayerPublicActions name={player.name}/></footer>
    </main>;
  }

  const heroImage=player.coverUrl||player.photoUrl;
  return <main className="premium-player-live">
    <nav className="premium-live-nav">
      <a href="https://players.onzeup.com.br" className="player-brand">ONZE<span>UP</span> <b>PLAYER</b></a>
      <div>
        <a href="#carreira">Carreira</a><a href="#videos">Vídeos</a><a href="#conquistas">Conquistas</a>
        {insta?<a href={insta} target="_blank" rel="noreferrer">Instagram ↗</a>:null}
        {player.websiteUrl?<a href={player.websiteUrl} target="_blank" rel="noreferrer">Site ↗</a>:null}
      </div>
    </nav>

    <section className="premium-live-hero">
      {heroImage?<img src={heroImage} alt={player.name}/>:null}<div className="premium-live-overlay"/>
      <div className="premium-live-copy"><span>ONZE PLAYER PREMIUM</span><h1>{player.name.toUpperCase()}</h1>{player.nickname?<h2>{player.nickname}</h2>:null}<p>{[player.position,player.secondaryPosition,player.currentClub,player.birthYear].filter(Boolean).join(" • ")}</p>
        {videos[0]?<a href="#videos" className="btn">▶ Ver melhores momentos</a>:null}
      </div>
    </section>

    <section className="premium-live-numbers">
      {player.matches!=null?<article><strong>{player.matches}</strong><span>Jogos oficiais</span></article>:null}
      {player.goals!=null?<article><strong>{player.goals}</strong><span>Gols oficiais</span></article>:null}
      {player.titles!=null?<article><strong>{player.titles}</strong><span>Conquistas</span></article>:null}
      {player.matches&&player.goals!=null?<article><strong>{(player.goals/player.matches).toFixed(2).replace(".",",")}</strong><span>Gols por jogo</span></article>:null}
    </section>

    <section className="premium-live-intro">
      <div><span>01 — PERFIL</span></div>
      <div><h2>Identidade esportiva.</h2><p>{player.bio||"Perfil esportivo em atualização."}</p>
        <div className="premium-player-tags">{[player.modality,player.position,player.secondaryPosition,player.dominantFoot,player.nationality].filter(Boolean).map((x,i)=><span key={i}>{x}</span>)}</div>
      </div>
    </section>

    {history.length?<section className="premium-live-section dark" id="carreira"><div><span>02 — CARREIRA</span></div><div><h2>Trajetória.</h2><div className="premium-live-career">{history.map((x,i)=><article key={i}><b>{String(i+1).padStart(2,"0")}</b><strong>{x}</strong></article>)}</div></div></section>:null}

    {videos.length?<section className="premium-live-section light" id="videos"><div><span>03 — MOMENTOS</span></div><div><h2>Em campo.</h2><div className="premium-live-videos">{videos.map((v,i)=>{const emb=youtubeEmbed(v);const thumb=youtubeThumb(v);return emb?<article key={i}><div style={thumb?{backgroundImage:`url(${thumb})`}:{}}><span>▶</span></div><h3>{i===0?"Melhores momentos":`Vídeo ${i+1}`}</h3><iframe src={emb} title={`${player.name} vídeo ${i+1}`} allowFullScreen/></article>:null})}</div></div></section>:null}

    {achievements.length?<section className="premium-live-section dark" id="conquistas"><div><span>04 — CONQUISTAS</span></div><div><h2>Marcos da trajetória.</h2><div className="premium-live-achievements">{achievements.map((x,i)=><article key={i}><b>{String(i+1).padStart(2,"0")}</b><strong>{x}</strong></article>)}</div></div></section>:null}

    {gallery.length?<section className="premium-live-gallery"><span>GALERIA</span><h2>Momentos que contam a história.</h2><div>{gallery.map((url,i)=><img src={url} alt={`${player.name} ${i+1}`} key={i}/>)}</div></section>:null}

    <section className="premium-live-footer"><div><span>ONZE PLAYER PREMIUM</span><h2>{player.name}</h2><p>{[player.position,player.currentClub].filter(Boolean).join(" • ")}</p></div><div>{insta?<a className="btn-secondary" href={insta} target="_blank" rel="noreferrer">Instagram ↗</a>:null}{player.websiteUrl?<a className="btn-secondary" href={player.websiteUrl} target="_blank" rel="noreferrer">Site oficial ↗</a>:null}<PlayerPublicActions name={player.name}/></div></section>
  </main>;
}
