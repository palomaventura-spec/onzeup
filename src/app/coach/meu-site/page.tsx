import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function youtubeEmbed(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
    if (u.pathname.includes("/embed/")) return url;
  } catch {}
  return null;
}

export default async function MeuSiteCoach() {
  const user = await requireUser();
  if (user.role !== "COACH") redirect("/dashboard");

  const c = await prisma.coachProfile.findUnique({
    where: { ownerUserId: user.id },
    include: {
      organizationAccesses: {
        where: { active: true },
        include: { organization: true, category: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!c) redirect("/cadastro-coach");

  const displayName = c.professionalName || c.name;
  const location = [c.city, c.state, c.country].filter(Boolean).join(" • ");
  const role = [c.roleTitle, c.currentClub].filter(Boolean).join(" • ");
  const video = youtubeEmbed(c.youtubeUrl);

  return (
    <main className="coach-site">
      <div className="notice" style={{ borderRadius: 0, margin: 0 }}>
        {c.isPublic
          ? "Seu site profissional está publicado."
          : "Prévia privada: seu site ainda não está publicado."}
        {" "}
        <Link href="/coach/editar">Editar / publicar</Link>
        {c.isPublic ? <> • <Link href={`/coach-profile/${c.slug}`}>Abrir versão pública ↗</Link></> : null}
      </div>

      <header className="coach-site-nav">
        <Link className="brand" href="/coach/dashboard">ONZE<span>UP</span> COACH</Link>
        <nav>
          <a href="#sobre">Sobre</a>
          <a href="#carreira">Carreira</a>
          <a href="#formacao">Formação</a>
          <a href="#metodologia">Metodologia</a>
          <Link href="/coach/dashboard">Dashboard</Link>
        </nav>
      </header>

      <section
        className="coach-site-hero"
        style={c.coverUrl ? { backgroundImage: `url("${c.coverUrl}")` } : undefined}
      >
        <div className="coach-site-hero-inner">
          <div className="coach-site-photo">
            {c.photoUrl ? <img src={c.photoUrl} alt={displayName}/> : <span>{displayName.slice(0,2).toUpperCase()}</span>}
          </div>
          <div>
            <span className="page-eyebrow">PERFIL PROFISSIONAL • ONZEUP COACH</span>
            <h1>{displayName}</h1>
            <div className="coach-site-role">{role || "Profissional do futebol"}</div>
            {location ? <div className="coach-site-location">{location}</div> : null}
            <div className="coach-site-actions">
              {c.contactEmail ? <a className="primary" href={`mailto:${c.contactEmail}`}>Contato profissional</a> : null}
              {c.instagramUrl ? <a href={c.instagramUrl} target="_blank">Instagram ↗</a> : null}
              {c.linkedinUrl ? <a href={c.linkedinUrl} target="_blank">LinkedIn ↗</a> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="coach-site-section" id="sobre">
        <span>SOBRE O PROFISSIONAL</span>
        <h2>Quem sou.</h2>
        <p>{c.bio || "Apresentação profissional em atualização."}</p>
      </section>

      <section className="coach-site-section" id="carreira">
        <span>TRAJETÓRIA</span>
        <h2>Experiência no futebol.</h2>
        <div className="coach-site-grid">
          <article className="coach-site-card"><small>EXPERIÊNCIA</small><h3>Carreira</h3><p>{c.experience || "Em atualização."}</p></article>
          <article className="coach-site-card"><small>CLUBES</small><h3>Histórico</h3><p>{c.clubsHistory || c.currentClub || "Em atualização."}</p></article>
          <article className="coach-site-card"><small>CATEGORIAS</small><h3>Atuação</h3><p>{c.categories || "Em atualização."}</p></article>
          <article className="coach-site-card"><small>CONQUISTAS</small><h3>Resultados</h3><p>{c.achievements || "Em atualização."}</p></article>
        </div>
      </section>

      {c.organizationAccesses.length ? (
        <section className="coach-site-section">
          <span>VÍNCULOS ATUAIS</span>
          <h2>Equipes conectadas no ONZEUP.</h2>
          <div className="coach-site-grid">
            {c.organizationAccesses.map((access) => (
              <article className="coach-site-card" key={access.id}>
                <small>VÍNCULO VERIFICADO</small>
                <h3>{access.organization.publicName || access.organization.name}</h3>
                <p>{[access.roleTitle, access.category?.name].filter(Boolean).join(" • ")}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="coach-site-section" id="formacao">
        <span>DESENVOLVIMENTO PROFISSIONAL</span>
        <h2>Formação e competências.</h2>
        <div className="coach-site-grid">
          <article className="coach-site-card"><small>LICENÇAS E CERTIFICAÇÕES</small><h3>Certificações</h3><p>{c.licenses || "Em atualização."}</p></article>
          <article className="coach-site-card"><small>FORMAÇÃO</small><h3>Educação</h3><p>{c.education || "Em atualização."}</p></article>
          <article className="coach-site-card"><small>IDIOMAS</small><h3>Comunicação</h3><p>{c.languages || "Em atualização."}</p></article>
          <article className="coach-site-card"><small>NACIONALIDADE</small><h3>Perfil</h3><p>{c.nationality || "Em atualização."}</p></article>
        </div>
      </section>

      <section className="coach-site-section" id="metodologia">
        <span>FILOSOFIA DE TRABALHO</span>
        <h2>Metodologia.</h2>
        <p>{c.methodology || "Metodologia profissional em atualização."}</p>
      </section>

      {video ? (
        <section className="coach-site-section">
          <span>EM CAMPO</span>
          <h2>Conheça o trabalho.</h2>
          <div className="coach-site-video">
            <iframe src={video} title={`Vídeo de ${displayName}`} allowFullScreen />
          </div>
        </section>
      ) : null}

      <footer className="coach-site-footer">
        <span>{displayName}</span>
        <span>Powered by <b>ONZEUP COACH</b></span>
      </footer>
    </main>
  );
}
