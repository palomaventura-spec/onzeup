import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PlayersHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; position?: string; year?: string }>;
}) {
  const query = await searchParams;
  const year = Number(query.year) || undefined;

  const players = await prisma.playerProfile.findMany({
    where: {
      isPublic: true,
      directoryVisible: true,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { nickname: { contains: query.q, mode: "insensitive" } },
              { currentClub: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.position
        ? { position: { contains: query.position, mode: "insensitive" } }
        : {}),
      ...(year ? { birthYear: year } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <main className="players-standalone">
      <header className="standalone-nav">
        <a href="https://players.onzeup.com.br" className="player-brand">
          ONZE<span>UP</span> <b>PLAYER</b>
        </a>
        <nav>
          <a href="#atletas">Atletas</a>
          <a href="#como-funciona">Como funciona</a>
          <a href="https://onzeup.com.br/login">Entrar</a>
          <a className="btn" href="https://onzeup.com.br/cadastro">Criar perfil grátis</a>
        </nav>
      </header>

      <section className="standalone-hero player-standalone-hero">
        <div>
          <span className="page-eyebrow">ONZE PLAYER</span>
          <h1>A trajetória do atleta merece ser vista.</h1>
          <p>
            Crie uma identidade esportiva, organize números, vídeos e trajetória
            e compartilhe o perfil do atleta com quem acompanha o futebol de base.
          </p>
          <div className="players-hero-actions">
            <a className="btn" href="https://onzeup.com.br/cadastro">Criar ONZE Player grátis</a>
            <a className="players-secondary-cta" href="#atletas">Explorar atletas ↓</a>
          </div>
          <small>Plano Free permanente • sem cartão</small>
        </div>

        <aside className="standalone-feature-card">
          <span>ONZE PLAYER FREE</span>
          <h2>Seu atleta também pode estar aqui.</h2>
          <ul>
            <li>Foto e identidade esportiva</li>
            <li>Posição, categoria e clube</li>
            <li>Estatísticas e trajetória</li>
            <li>1 vídeo por link do YouTube</li>
            <li>Perfil compartilhável</li>
            <li>Participação opcional no catálogo</li>
          </ul>
          <a className="btn" href="https://onzeup.com.br/cadastro">Cadastre-se conosco →</a>
        </aside>
      </section>

      <section className="standalone-directory" id="atletas">
        <div className="standalone-section-head">
          <div><span className="page-eyebrow">CATÁLOGO</span><h2>ONZE Players</h2></div>
          <span className="badge">{players.length} perfil(is)</span>
        </div>

        <form className="directory-search">
          <input name="q" defaultValue={query.q || ""} placeholder="Buscar atleta, apelido ou clube" />
          <input name="position" defaultValue={query.position || ""} placeholder="Posição" />
          <input name="year" defaultValue={query.year || ""} placeholder="Ano de nascimento" />
          <button className="btn">Buscar</button>
        </form>

        <div className="directory-grid">
          {players.map((p) => (
            <a href={`https://players.onzeup.com.br/${p.slug}`} className="directory-player-card" key={p.id}>
              <div>
                {p.photoUrl ? <img src={p.photoUrl} alt={p.name} /> : <span>{p.name.slice(0,2).toUpperCase()}</span>}
              </div>
              <small>{p.plan === "PREMIUM" ? "★ ONZE PLAYER PREMIUM" : "ONZE PLAYER"}</small>
              <h2>{p.name}</h2>
              {p.nickname ? <b>{p.nickname}</b> : null}
              <p>{[p.position, p.categoryLabel, p.currentClub].filter(Boolean).join(" • ")}</p>
              <strong>Ver perfil →</strong>
            </a>
          ))}

          {!players.length ? (
            <div className="card directory-empty">
              <span className="page-eyebrow">SEJA UM DOS PRIMEIROS</span>
              <h2>Os atletas publicados aparecerão aqui.</h2>
              <p>Crie gratuitamente o primeiro perfil esportivo e escolha se deseja aparecer no catálogo.</p>
              <a className="btn" href="https://onzeup.com.br/cadastro">Cadastrar atleta grátis</a>
            </div>
          ) : null}
        </div>
      </section>

      <section className="standalone-how" id="como-funciona">
        <span className="page-eyebrow">COMO FUNCIONA</span>
        <h2>Da família para o futebol.</h2>
        <div>
          <article><b>01</b><h3>Crie a conta</h3><p>O responsável administra o perfil.</p></article>
          <article><b>02</b><h3>Cadastre o atleta</h3><p>Somente informações relacionadas à vida esportiva.</p></article>
          <article><b>03</b><h3>Publique</h3><p>O atleta ganha um endereço público na ONZEUP.</p></article>
          <article><b>04</b><h3>Compartilhe</h3><p>Envie o perfil por link e redes sociais.</p></article>
        </div>
      </section>

      <section className="standalone-final-cta">
        <span className="page-eyebrow">ONZE PLAYER</span>
        <h2>Comece gratuitamente.</h2>
        <p>Depois, se quiser uma presença ainda mais completa, evolua para o Premium.</p>
        <a className="btn" href="https://onzeup.com.br/cadastro">Criar perfil grátis</a>
      </section>
    </main>
  );
}
