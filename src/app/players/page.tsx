import { prisma } from "@/lib/prisma";

const PLAYER_CATEGORIES = Array.from({ length: 14 }, (_, index) => {
  const number = index + 7;
  return { value: `sub ${number}`, label: `Sub-${number}` };
});

const PLAYER_POSITIONS = [
  "Goleiro",
  "Zagueiro",
  "Fixo",
  "Lateral",
  "Ala",
  "Volante",
  "Meio-campo",
  "Meia",
  "Ponta",
  "Atacante",
  "Pivô",
];

export default async function PlayersHome({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    position?: string;
    category?: string;
    year?: string;
  }>;
}) {
  const query = await searchParams;
  const year = Number(query.year) || undefined;

  const where: any = {
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
    ...(query.category
      ? { categoryLabel: { contains: query.category, mode: "insensitive" } }
      : {}),
    ...(year ? { birthYear: year } : {}),
  };

  const [featured, players] = await Promise.all([
    prisma.playerProfile.findMany({
      where: {
        isPublic: true,
        directoryVisible: true,
        isFeatured: true,
        OR: [{ featuredUntil: null }, { featuredUntil: { gt: new Date() } }],
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.playerProfile.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { updatedAt: "desc" }],
      take: 100,
    }),
  ]);

  const hasFilters = Boolean(
    query.q || query.category || query.position || query.year
  );

  return (
    <main className="catalog-first-page">
      <header className="catalog-nav">
        <a href="https://players.onzeup.com.br" className="player-brand">
          ONZE<span>UP</span> <b>PLAYERS</b>
        </a>

        <nav>
          <a href="#todos">Atletas</a>
          <a href="https://onzeup.com.br/player">Sobre o Player</a>
          <a href="https://onzeup.com.br/login?perfil=player">Entrar</a>
          <a className="btn" href="https://onzeup.com.br/cadastro">
            Criar perfil grátis
          </a>
        </nav>
      </header>

      <section className="catalog-title">
        <span className="page-eyebrow">ONZEUP PLAYERS</span>

        <h1>Atletas da base.</h1>

        <p>
          Descubra perfis esportivos públicos cadastrados e administrados por
          suas famílias.
        </p>
      </section>

      {featured.length ? (
        <section className="catalog-featured">
          <div className="catalog-section-title">
            <div>
              <span className="page-eyebrow">SELEÇÃO ONZEUP</span>
              <h2>Atletas em destaque</h2>
            </div>
          </div>

          <div className="featured-player-grid">
            {featured.map((p) => (
              <a
                href={`https://players.onzeup.com.br/${p.slug}`}
                key={p.id}
                className="featured-player-card"
              >
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name} />
                ) : (
                  <div className="featured-placeholder">
                    {p.name.slice(0, 2)}
                  </div>
                )}

                <div className="featured-player-shade" />

                <div className="featured-player-copy">
                  <span>★ DESTAQUE ONZEUP</span>

                  <h3>{p.nickname || p.name}</h3>

                  <p>
                    {[
                      p.name !== p.nickname ? p.name : null,
                      p.position,
                      p.categoryLabel,
                      p.currentClub,
                    ]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>

                  {p.matches || p.goals ? (
                    <div className="featured-mini-stats">
                      {p.matches != null ? (
                        <b>
                          {p.matches}
                          <small>JOGOS</small>
                        </b>
                      ) : null}

                      {p.goals != null ? (
                        <b>
                          {p.goals}
                          <small>GOLS</small>
                        </b>
                      ) : null}
                    </div>
                  ) : null}

                  <strong>Ver Player →</strong>
                </div>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="catalog-search-zone" id="todos">
        <div className="catalog-section-title">
          <div>
            <span className="page-eyebrow">PESQUISA</span>
            <h2>Encontre um atleta</h2>
          </div>

          <span className="badge">{players.length} perfil(is)</span>
        </div>

        <form className="catalog-filter-form">
          <input
            name="q"
            defaultValue={query.q || ""}
            placeholder="Nome, apelido ou clube"
          />

          <select name="category" defaultValue={query.category || ""}>
            <option value="">Todas as categorias</option>

            {PLAYER_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select name="position" defaultValue={query.position || ""}>
            <option value="">Todas as posições</option>

            {PLAYER_POSITIONS.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>

          <input
            name="year"
            type="number"
            min="2000"
            max="2030"
            defaultValue={query.year || ""}
            placeholder="Ano"
            inputMode="numeric"
          />

          <button className="btn">Buscar</button>

          {hasFilters ? (
            <a className="players-secondary-cta" href="/players#todos">
              Limpar filtros
            </a>
          ) : null}
        </form>

        <div className="catalog-grid">
          {players.map((p) => (
            <a
              href={`https://players.onzeup.com.br/${p.slug}`}
              className={`catalog-person-card ${
                p.plan === "PREMIUM" ? "premium" : ""
              }`}
              key={p.id}
            >
              <div className="catalog-photo">
                {p.photoUrl ? (
                  <img src={p.photoUrl} alt={p.name} />
                ) : (
                  <span>{p.name.slice(0, 2).toUpperCase()}</span>
                )}

                {p.plan === "PREMIUM" ? <b>PREMIUM</b> : null}
              </div>

              <small>ONZEUP PLAYER</small>

              <h3>{p.nickname || p.name}</h3>

              {p.nickname ? (
                <p className="catalog-real-name">{p.name}</p>
              ) : null}

              <p>
                {[p.position, p.categoryLabel, p.currentClub]
                  .filter(Boolean)
                  .join(" • ")}
              </p>

              <strong>Ver perfil →</strong>
            </a>
          ))}

          {!players.length ? (
            <div className="catalog-empty">
              <h3>Nenhum atleta encontrado.</h3>
              <p>Tente remover um filtro ou buscar por outro termo.</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="catalog-conversion">
        <div>
          <span className="page-eyebrow">ONZEUP PLAYER</span>

          <h2>Seu atleta também pode estar aqui.</h2>

          <p>
            Crie gratuitamente a identidade esportiva e publique o perfil
            quando quiser.
          </p>
        </div>

        <div>
          <a className="btn" href="https://onzeup.com.br/cadastro">
            Criar perfil grátis
          </a>

          <a
            className="players-secondary-cta"
            href="https://onzeup.com.br/player"
          >
            Conhecer Free e Premium →
          </a>
        </div>
      </section>
    </main>
  );
}