import { prisma } from "@/lib/prisma";

export default async function CoachesHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = await searchParams;

  const coaches = await prisma.coachProfile.findMany({
    where: {
      isPublic: true,
      directoryVisible: true,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { professionalName: { contains: query.q, mode: "insensitive" } },
              { roleTitle: { contains: query.q, mode: "insensitive" } },
              { currentClub: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="players-standalone coach-standalone">
      <header className="standalone-nav">
        <a href="https://coach.onzeup.com.br" className="player-brand">
          ONZE<span>UP</span> <b>COACH</b>
        </a>
        <nav>
          <a href="#profissionais">Profissionais</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="https://onzeup.com.br/login">Entrar</a>
          <a className="btn" href="https://onzeup.com.br/cadastro-coach">Criar perfil grátis</a>
        </nav>
      </header>

      <section className="standalone-hero coach-standalone-hero">
        <div>
          <span className="page-eyebrow">ONZEUP COACH</span>
          <h1>Sua carreira no futebol merece presença profissional.</h1>
          <p>
            Apresente experiência, clubes, formação, licenças, metodologia e
            conquistas em um perfil profissional esportivo.
          </p>
          <div className="players-hero-actions">
            <a className="btn" href="https://onzeup.com.br/cadastro-coach">Criar perfil Coach grátis</a>
            <a className="players-secondary-cta" href="#profissionais">Explorar profissionais ↓</a>
          </div>
          <small>Grátis no lançamento • sem cartão</small>
        </div>

        <aside className="standalone-feature-card coach-feature-card">
          <span>PERFIL PROFISSIONAL</span>
          <h2>Mostre mais do que um currículo.</h2>
          <ul>
            <li>Experiência e histórico de clubes</li>
            <li>Licenças e certificações</li>
            <li>Formação e idiomas</li>
            <li>Metodologia de trabalho</li>
            <li>Conquistas e vídeo</li>
            <li>Instagram, LinkedIn e contato</li>
          </ul>
          <a className="btn" href="https://onzeup.com.br/cadastro-coach">Cadastre-se conosco →</a>
        </aside>
      </section>

      <section className="standalone-directory" id="profissionais">
        <div className="standalone-section-head">
          <div><span className="page-eyebrow">CATÁLOGO</span><h2>ONZEUP Coaches</h2></div>
          <span className="badge">{coaches.length} perfil(is)</span>
        </div>

        <form className="directory-search">
          <input name="q" defaultValue={query.q || ""} placeholder="Nome, função ou clube" />
          <button className="btn">Buscar</button>
        </form>

        <div className="directory-grid">
          {coaches.map((c) => (
            <a href={`https://coach.onzeup.com.br/${c.slug}`} className="directory-player-card" key={c.id}>
              <div>
                {c.photoUrl ? <img src={c.photoUrl} alt={c.name} /> : <span>{c.name.slice(0,2).toUpperCase()}</span>}
              </div>
              <small>ONZEUP COACH</small>
              <h2>{c.professionalName || c.name}</h2>
              <p>{[c.roleTitle, c.currentClub, c.city].filter(Boolean).join(" • ")}</p>
              <strong>Ver perfil →</strong>
            </a>
          ))}

          {!coaches.length ? (
            <div className="card directory-empty">
              <span className="page-eyebrow">PRIMEIROS PERFIS</span>
              <h2>Profissionais publicados aparecerão aqui.</h2>
              <p>Crie seu perfil profissional gratuitamente e faça parte do lançamento da ONZEUP.</p>
              <a className="btn" href="https://onzeup.com.br/cadastro-coach">Criar Coach grátis</a>
            </div>
          ) : null}
        </div>
      </section>

      <section className="standalone-how" id="como-funciona">
        <span className="page-eyebrow">ONZEUP COACH</span>
        <h2>Sua trajetória organizada.</h2>
        <div>
          <article><b>01</b><h3>Crie a conta</h3><p>Cadastro profissional gratuito.</p></article>
          <article><b>02</b><h3>Monte o perfil</h3><p>Experiência, formação, licenças e metodologia.</p></article>
          <article><b>03</b><h3>Publique</h3><p>Ganhe um endereço profissional compartilhável.</p></article>
          <article><b>04</b><h3>Conecte-se</h3><p>Apresente sua trajetória para clubes e profissionais.</p></article>
        </div>
      </section>
    </main>
  );
}
