import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import PlayerPublicActions from "@/components/PlayerPublicActions";
import { reconcileExpiredSimplePlayerCourtesies } from "@/lib/player-simple-courtesy";
import { reconcileExpiredPlayerPremiums } from "@/lib/billing-entitlements";

function lines(value?: string | null) {
  return String(value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function career(value?: string | null) {
  return lines(value).map((line) => {
    const [period, club] = line.split("|").map((v) => v.trim());
    return { period: club ? period : "", club: club || period };
  });
}


type PublicVideo = { url: string; title: string; description: string };

function parsePublicVideos(value?: string | null): PublicVideo[] {
  const raw = String(value || "").trim();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({ url: String(item.url || "").trim(), title: String(item.title || "").trim(), description: String(item.description || "").trim() }))
        .filter((item) => item.url);
    }
  } catch { /* links anteriores sao salvos em linhas */ }
  return lines(raw).map((url) => ({ url, title: "", description: "" }));
}

function youtubeEmbed(input: string): string | null {
  try {
    const u = new URL(input);
    const host = u.hostname.toLowerCase();
    let id = "";
    if (host === "youtu.be" || host === "www.youtu.be") id = u.pathname.split("/")[1] || "";
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host)) {
      if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
      else if (/^\/(shorts|embed|live)\//.test(u.pathname)) id = u.pathname.split("/")[2] || "";
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}

function instagramProfile(input?: string | null): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  let username = raw.replace(/^@/, "");
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (!["instagram.com", "www.instagram.com"].includes(url.hostname.toLowerCase())) return null;
      username = url.pathname.split("/").filter(Boolean)[0] || "";
    } catch { return null; }
  }
  return /^[a-zA-Z0-9._]{1,30}$/.test(username) ? `https://www.instagram.com/${username}/` : null;
}
export default async function PlayerPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await reconcileExpiredSimplePlayerCourtesies({ slug });
  await reconcileExpiredPlayerPremiums({ slug });
  const player = await prisma.playerProfile.findFirst({
    where: { slug, isPublic: true },
    include: {
      athleteLinks: {
        where: { verified: true },
        include: { athlete: { include: { organization: true, category: true } } },
      },
    },
  });

  if (!player) notFound();

  const gallery = lines(player.gallery);
  const videos = parsePublicVideos(player.videos);
  const achievements = lines(player.achievements);
  const careerItems = career(player.careerHistory);
  const light = player.template === "CLEAN_LIGHT";
  const publicName = player.nickname?.trim() || "Atleta 11UP";
  const instagramUrl = instagramProfile(player.instagram);

  const statItems = [
    { label: "Jogos", value: player.matches },
    { label: "Gols", value: player.goals },
    { label: "Assistências", value: player.assists },
    { label: "Conquistas", value: player.titles },
  ].filter((item) => item.value !== null && item.value !== undefined);

  return (
    <main className={`athlete-site ${light ? "athlete-site-light" : "athlete-site-dark"}`}>
      <header className="athlete-nav">
        <Link href="/" className="player-brand">ONZE<span>UP</span> <b>PLAYER</b></Link>
        <nav><a href="#sobre">Sobre</a><a href="#carreira">Carreira</a><a href="#videos">Vídeos</a><a href="#galeria">Galeria</a></nav>
        <PlayerPublicActions name={publicName} />
      </header>

      <section className="athlete-hero" style={player.coverUrl ? { backgroundImage: `linear-gradient(90deg, rgba(4,8,12,.97), rgba(4,8,12,.7)), url(${player.coverUrl})` } : undefined}>
        <div className="athlete-wrap athlete-hero-grid">
          <div className="athlete-portrait">
            {player.photoUrl ? <img src={player.photoUrl} alt={publicName} /> : <span>{publicName.slice(0,2).toUpperCase()}</span>}
          </div>

          <div className="athlete-identity">
            <span className="athlete-kicker">ATLETA • 11UP PLAYER</span>
            <h1>{publicName}</h1>
            {/* Nome completo nao e divulgado por padrao. */}

            <div className="athlete-tags">
              {player.position ? <span>{player.position}</span> : null}
              {player.secondaryPosition ? <span>{player.secondaryPosition}</span> : null}
              {player.currentClub ? <span>{player.currentClub}</span> : null}
              {player.nationality ? <span>{player.nationality}</span> : null}
            </div>

            {instagramUrl ? (
              <a className="athlete-instagram" target="_blank" href={instagramUrl} rel="noopener noreferrer">
                Seguir no Instagram ↗
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="athlete-wrap">
        <section className="athlete-data-bar">
          <div><small>NASCIMENTO</small><strong>{player.birthYear || "—"}</strong></div>
          <div><small>POSIÇÃO</small><strong>{player.position || "—"}</strong></div>
          <div><small>PÉ DOMINANTE</small><strong>{player.dominantFoot || "—"}</strong></div>
          <div><small>ALTURA</small><strong>{player.height || "—"}</strong></div>
          <div><small>PESO</small><strong>{player.weight || "—"}</strong></div>
        </section>

        {statItems.length ? (
          <section className="athlete-number-section">
            {statItems.map((item) => (
              <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>
            ))}
          </section>
        ) : null}

        {player.bio ? (
          <section id="sobre" className="athlete-section athlete-about">
            <div className="athlete-section-label"><span>01</span><b>SOBRE</b></div>
            <div><h2>Perfil do atleta</h2><p>{player.bio}</p></div>
          </section>
        ) : null}

        {(careerItems.length || player.athleteLinks.length) ? (
          <section id="carreira" className="athlete-section">
            <div className="athlete-section-label"><span>02</span><b>CARREIRA</b></div>
            <div>
              <h2>Trajetória esportiva</h2>
              <div className="athlete-career">
                {careerItems.map((item, index) => (
                  <article key={`${item.club}-${index}`}><span>{item.period || "—"}</span><strong>{item.club}</strong></article>
                ))}
                {player.athleteLinks.map((link) => (
                  <article className="verified-career" key={link.id}>
                    <span>VERIFICADO</span>
                    <strong>{link.athlete.organization.publicName || link.athlete.organization.name}</strong>
                    <b>✓ Organização 11UP</b>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {achievements.length ? (
          <section className="athlete-section athlete-achievements">
            <div className="athlete-section-label"><span>03</span><b>CONQUISTAS</b></div>
            <div><h2>Marcos da trajetória</h2><div>{achievements.map((item,index)=><article key={`${item}-${index}`}><span>{String(index+1).padStart(2,"0")}</span><strong>{item}</strong></article>)}</div></div>
          </section>
        ) : null}

        {videos.length ? (
          <section id="videos" className="athlete-section">
            <div className="athlete-section-label"><span>04</span><b>VÍDEOS</b></div>
            <div><h2>Melhores momentos</h2><div className="athlete-videos">{videos.map((video, index) => {
              const embed = youtubeEmbed(video.url);
              return <article key={`${video.url}-${index}`} style={{ width: "100%", minWidth: 0 }}>
                {embed ? <div style={{ aspectRatio: "16 / 9", width: "100%", overflow: "hidden", borderRadius: 12, background: "#080b0c" }}>
                  <iframe src={embed} title={video.title || `Melhores momentos ${index + 1}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ display: "block", border: 0, width: "100%", height: "100%" }} />
                </div> : <p>Este endereço de vídeo não é compatível com a reprodução incorporada.</p>}
                <div style={{ padding: "10px 0 16px" }}><small>VÍDEO {String(index+1).padStart(2,"0")}</small><strong style={{ display: "block" }}>{video.title || "Melhores momentos"}</strong>{video.description ? <p>{video.description}</p> : null}</div>
              </article>;
            })}</div></div>
          </section>
        ) : null}

        {gallery.length ? (
          <section id="galeria" className="athlete-gallery-section">
            <div><span className="athlete-kicker">EM CAMPO</span><h2>Galeria</h2></div>
            <div className="athlete-gallery">{gallery.slice(0,12).map((url,index)=><img src={url} key={`${url}-${index}`} alt={`${player.name} ${index+1}`} />)}</div>
          </section>
        ) : null}

        {player.athleteLinks.length ? (
          <section className="athlete-verified-section">
            <span className="athlete-kicker">VÍNCULOS VERIFICADOS</span>
            <h2>Organizações que confirmaram este atleta</h2>
            <div>
              {player.athleteLinks.map((link) => (
                <article key={link.id}>
                  <figure>{link.athlete.organization.logoUrl ? <img src={link.athlete.organization.logoUrl} alt="" /> : <span>CL</span>}</figure>
                  <section><strong>{link.athlete.organization.publicName || link.athlete.organization.name}</strong><p>{link.athlete.category?.name || "Categoria"} • {link.athlete.position || player.position || "Atleta"}</p></section>
                  <b>✓ VERIFICADO</b>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <footer className="athlete-footer">
        <div className="athlete-wrap"><div><strong>ONZE<span>UP</span> PLAYER</strong><p>Perfil esportivo administrado pela família.</p></div><PlayerPublicActions name={publicName} /></div>
      </footer>
    </main>
  );
}
