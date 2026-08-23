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
        <div><span className="page-eyebrow">ONZEUP PLAYER • PERFIL ESPORTIVO</span><h1>{player.name}</h1>{player.nickname?<h2>{player.nickname}</h2>:null}
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

  return <main className="premium-athlete-site">
    <nav className="premium-topbar">
      <a href="https://players.onzeup.com.br" className="player-brand">ONZE<span>UP</span> <b>PLAYER</b></a>
      <div className="premium-nav-links">
        <a href="#perfil">Perfil</a>
        <a href="#trajetoria">Trajetória</a>
        <a href="#videos">Vídeos</a>
        <a href="#conquistas">Conquistas</a>
        {insta?<a href={insta} target="_blank" rel="noreferrer">Instagram ↗</a>:null}
      </div>
    </nav>

    <section className="premium-hero-modern">
      {heroImage?<img src={heroImage} alt={player.name}/>:null}
      <div className="premium-hero-shade"/>
      <div className="premium-hero-inner">
        <div className="premium-hero-copy">
          <span className="premium-kicker">ONZEUP PLAYER PREMIUM</span>
          <h1>{player.name.toUpperCase()}</h1>
          {player.nickname?<strong>{player.nickname}</strong>:null}
          <p>{[player.position,player.secondaryPosition,player.currentClub,player.birthYear].filter(Boolean).join(" • ")}</p>
          <div className="premium-hero-actions">
            {videos[0]?<a href="#videos" className="btn">▶ Assistir melhores momentos</a>:null}
            {insta?<a className="premium-outline-btn" href={insta} target="_blank" rel="noreferrer">Instagram ↗</a>:null}
          </div>
        </div>
      </div>
    </section>

    <section className="premium-stats-strip">
      {player.matches!=null?<article><small>JOGOS OFICIAIS</small><strong>{player.matches}</strong></article>:null}
      {player.goals!=null?<article><small>GOLS OFICIAIS</small><strong>{player.goals}</strong></article>:null}
      {player.titles!=null?<article><small>CONQUISTAS</small><strong>{player.titles}</strong></article>:null}
      {player.matches&&player.goals!=null?<article><small>GOLS / JOGO</small><strong>{(player.goals/player.matches).toFixed(2).replace(".",",")}</strong></article>:null}
    </section>

    <section className="premium-editorial-block light" id="perfil">
      <aside className="premium-section-mark">
        <span>01</span>
        <small>PERFIL</small>
      </aside>
      <div className="premium-section-body">
        <span className="premium-eyebrow">IDENTIDADE ESPORTIVA</span>
        <h2>Quem é o atleta.</h2>
        <p className="premium-lead">{player.bio||"Perfil esportivo em atualização."}</p>
        <div className="premium-info-grid">
          {player.modality?<article><small>Modalidade</small><strong>{player.modality}</strong></article>:null}
          {player.position?<article><small>Posição</small><strong>{player.position}{player.secondaryPosition?` / ${player.secondaryPosition}`:""}</strong></article>:null}
          {player.dominantFoot?<article><small>Pé dominante</small><strong>{player.dominantFoot}</strong></article>:null}
          {player.nationality?<article><small>Nacionalidade</small><strong>{player.nationality}</strong></article>:null}
          {player.height?<article><small>Altura</small><strong>{player.height}</strong></article>:null}
          {player.currentClub?<article><small>Clube atual</small><strong>{player.currentClub}</strong></article>:null}
        </div>
      </div>
    </section>

    {history.length?<section className="premium-editorial-block dark" id="trajetoria">
      <aside className="premium-section-mark">
        <span>02</span>
        <small>TRAJETÓRIA</small>
      </aside>
      <div className="premium-section-body">
        <span className="premium-eyebrow">CARREIRA</span>
        <h2>A história em movimento.</h2>
        <div className="premium-timeline">
          {history.map((x,i)=><article key={i}>
            <span>{String(i+1).padStart(2,"0")}</span>
            <div><strong>{x}</strong></div>
          </article>)}
        </div>
      </div>
    </section>:null}

    {videos.length?<section className="premium-editorial-block light" id="videos">
      <aside className="premium-section-mark">
        <span>03</span>
        <small>VÍDEOS</small>
      </aside>
      <div className="premium-section-body">
        <span className="premium-eyebrow">MELHORES MOMENTOS</span>
        <h2>Veja o atleta em ação.</h2>
        <p className="premium-lead">Gols, jogadas e momentos que mostram características, evolução e presença em jogo.</p>
        <div className={`premium-media-grid ${videos.length===1?"one":""}`}>
          {videos.map((v,i)=>{const emb=youtubeEmbed(v);return emb?<article className={i===0?"featured":""} key={i}>
            <div className="premium-youtube-frame">
              <iframe src={emb} title={`${player.name} vídeo ${i+1}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen/>
            </div>
            <div className="premium-media-caption">
              <span>{i===0?"DESTAQUE":`VÍDEO ${String(i+1).padStart(2,"0")}`}</span>
              <strong>{i===0?"Melhores momentos":`Vídeo ${i+1}`}</strong>
            </div>
          </article>:null})}
        </div>
      </div>
    </section>:null}

    {achievements.length?<section className="premium-editorial-block dark" id="conquistas">
      <aside className="premium-section-mark">
        <span>04</span>
        <small>CONQUISTAS</small>
      </aside>
      <div className="premium-section-body">
        <span className="premium-eyebrow">DESTAQUES</span>
        <h2>Marcos da trajetória.</h2>
        <div className="premium-achievement-grid">
          {achievements.map((x,i)=><article key={i}>
            <span>{String(i+1).padStart(2,"0")}</span>
            <strong>{x}</strong>
          </article>)}
        </div>
      </div>
    </section>:null}

    {gallery.length?<section className="premium-gallery-modern">
      <span className="premium-eyebrow">GALERIA</span>
      <h2>Momentos que contam a história.</h2>
      <div>{gallery.map((url,i)=><img src={url} alt={`${player.name} ${i+1}`} key={i}/>)}</div>
    </section>:null}

    <section className="premium-footer-modern">
      <div>
        <span className="premium-kicker">ONZEUP PLAYER PREMIUM</span>
        <h2>{player.name}</h2>
        <p>{[player.position,player.currentClub].filter(Boolean).join(" • ")}</p>
      </div>
      <div className="premium-footer-actions">
        {insta?<a className="premium-outline-btn dark" href={insta} target="_blank" rel="noreferrer">Instagram ↗</a>:null}
        {player.websiteUrl?<a className="premium-outline-btn dark" href={player.websiteUrl} target="_blank" rel="noreferrer">Site ↗</a>:null}
        <PlayerPublicActions name={player.name}/>
      </div>
    </section>
  </main>;
}
