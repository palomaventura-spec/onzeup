import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClubMatchCarousel from "@/components/ClubMatchCarousel";

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date).replace(".", "");
}
function fmtTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

export default async function PublicOrganizationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await prisma.organization.findFirst({
    where: { slug, active: true },
    include: {
      categories: { orderBy: [{ birthYear: "desc" }, { name: "asc" }] },
      staffMembers: { include: { category: true }, orderBy: [{ roleTitle: "asc" }, { name: "asc" }] },
      athletes: { where: { active: true }, include: { category: true }, orderBy: [{ category: { name: "asc" } }, { name: "asc" }] },
      matches: { include: { category: true }, orderBy: { startsAt: "asc" } },
    },
  });
  if (!org) notFound();

  const publicName = org.publicName || org.name;
  const upcoming = org.matches.filter((m) => m.status === "SCHEDULED");
  const results = org.matches.filter((m) => m.status === "FINISHED").reverse();
  const location = [org.city, org.state].filter(Boolean).join(" • ");
  const theme = org.publicTheme === "LIGHT" ? "light" : "dark";

  return (
    <main className={`club-site club-site-${theme}`} style={{
      "--club-accent": org.accentColor || "#9DDB16",
      "--club-secondary": org.secondaryColor || "#FFFFFF",
      "--club-bg": org.publicBackground || (theme === "light" ? "#F5F7F8" : "#070B10"),
    } as React.CSSProperties}>
      <header className="club-nav">
        <div className="club-container club-nav-inner">
          <a href="#inicio" className="club-nav-brand">
            {org.logoUrl ? <img src={org.logoUrl} alt="" /> : <span>OU</span>}
            <strong>{publicName}</strong>
          </a>
          <nav>
            <a href="#categorias">Categorias</a>
            {org.showMatchesPublicly && <a href="#jogos">Jogos</a>}
            {org.showAthletesPublicly && <a href="#elenco">Elenco</a>}
            {org.showStaffPublicly && <a href="#comissao">Comissão</a>}
            <a href="#clube">Clube</a>
          </nav>
        </div>
      </header>

      <section id="inicio" className={`club-hero ${org.coverUrl ? "has-cover" : ""}`} style={org.coverUrl ? {
        backgroundImage: `linear-gradient(90deg,rgba(3,7,11,${Math.min(.96, (org.coverOverlay + 18) / 100)}),rgba(3,7,11,${org.coverOverlay / 100}),rgba(3,7,11,${Math.min(.94, (org.coverOverlay + 10) / 100)})),url(${org.coverUrl})`,
        backgroundPosition: org.coverPosition === "TOP" ? "center top" : org.coverPosition === "BOTTOM" ? "center bottom" : "center center",
      } : undefined}>
        <div className="club-container club-hero-grid">
          <div className="club-hero-copy">
            <div className="club-eyebrow">FUTEBOL • FUTSAL • FORMAÇÃO</div>
            <div className="club-title-row">
              {org.logoUrl && <img src={org.logoUrl} alt={`Escudo ${publicName}`} className="club-crest" />}
              <div><h1>{publicName}</h1>{location && <p className="club-location">{location}</p>}</div>
            </div>
            <p className="club-lead">{org.description || "Formação, competição e paixão pelo futebol. Acompanhe nossas categorias, atletas e jogos."}</p>
            <div className="club-hero-actions">
              {org.showAthletesPublicly && org.athletes.length > 0 && <a href="#elenco" className="club-primary-btn">Conheça o elenco</a>}
              {org.instagram && <a href={`https://instagram.com/${org.instagram.replace("@", "")}`} target="_blank" className="club-ghost-btn">Instagram ↗</a>}
            </div>
          </div>

          {org.showMatchesPublicly && upcoming.length > 0 && (
            <ClubMatchCarousel
              matches={upcoming.map((m) => ({
                id: m.id,
                category: m.category.name,
                competition: m.competition,
                opponent: m.opponent,
                startsAt: m.startsAt.toISOString(),
                location: m.location,
              }))}
              clubName={publicName}
              logoUrl={org.logoUrl}
              allGamesHref={`/o/${slug}/jogos`}
            />
          )}
        </div>
      </section>

      <div className="club-container club-body">
        <section id="categorias" className="club-section">
          <div className="club-heading"><span>NOSSA BASE</span><h2>Categorias</h2><p>Da formação aos desafios de cada etapa.</p></div>
          <div className="category-showcase">
            {org.categories.map((category, i) => (
              <Link href={`/o/${slug}/categorias/${category.id}`} key={category.id} className="category-tile">
                <span>0{i + 1}</span>
                <div>
                  <h3>{category.name}</h3>
                  <p>{category.birthYear ? `Nascidos em ${category.birthYear}` : "Categoria esportiva"}</p>
                </div>
                <b>→</b>
              </Link>
            ))}
          </div>
        </section>

        {org.showMatchesPublicly && <section id="jogos" className="club-section club-games-section">
          <div className="club-heading"><span>EM CAMPO</span><h2>Jogos & resultados</h2></div>
          <div className="club-games-grid">
            <div><div className="club-list-title-row"><h3>Próximos jogos</h3>{upcoming.length > 4 ? <Link href={`/o/${slug}/jogos`}>Ver todos →</Link> : null}</div><div className="game-list">{upcoming.length ? upcoming.slice(0,4).map(m => <article className="game-row" key={m.id}><div className="game-date"><strong>{fmtDate(m.startsAt)}</strong><span>{fmtTime(m.startsAt)}</span></div><div><small>{m.category.name} • {m.competition || "Jogo"}</small><strong>{publicName} <em>×</em> {m.opponent}</strong><span>{m.location || "Local a definir"}</span></div></article>) : <p className="club-empty">Nenhum próximo jogo cadastrado.</p>}</div></div>
            <div><h3>Últimos resultados</h3><div className="game-list">{results.length ? results.slice(0,4).map(m => <article className="result-row" key={m.id}><div><small>{m.category.name} • {fmtDate(m.startsAt)}</small><strong>{publicName} <b>{m.goalsFor ?? 0}</b><em>×</em><b>{m.goalsAgainst ?? 0}</b> {m.opponent}</strong></div></article>) : <p className="club-empty">Nenhum resultado publicado.</p>}</div></div>
          </div>
        </section>}

        {org.showAthletesPublicly && org.categories.length > 0 && <section id="elenco" className="club-section">
          <div className="club-heading club-heading-row">
            <div><span>QUEM VESTE A CAMISA</span><h2>Nosso elenco</h2></div>
            <p>Escolha uma categoria para conhecer atletas e comissão técnica.</p>
          </div>

          <div className="squad-category-grid">
            {org.categories.map((category) => {
              const athletes = org.athletes.filter((athlete) => athlete.categoryId === category.id);
              const staff = org.staffMembers.filter((member) => member.categoryId === category.id);

              return (
                <Link
                  href={`/o/${slug}/categorias/${category.id}`}
                  key={category.id}
                  className="squad-category-card"
                >
                  <div className="squad-category-top">
                    <span>{category.birthYear ? `NASC. ${category.birthYear}` : "CATEGORIA"}</span>
                    <b>→</b>
                  </div>

                  <div>
                    <h3>{category.name}</h3>
                    <p>{athletes.length} atleta{athletes.length === 1 ? "" : "s"} • {staff.length} membro{staff.length === 1 ? "" : "s"} da comissão</p>
                  </div>

                  <div className="squad-category-preview">
                    {athletes.slice(0, 4).map((athlete) => (
                      <div key={athlete.id} className="squad-mini-avatar">
                        {athlete.photoUrl ? (
                          <img src={athlete.photoUrl} alt="" />
                        ) : (
                          <span>{(athlete.nickname || athlete.name).slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                    ))}
                    {athletes.length > 4 ? <small>+{athletes.length - 4}</small> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>}

        {org.showStaffPublicly && org.staffMembers.length > 0 && <section id="comissao" className="club-section">
          <div className="club-heading"><span>FORA DAS QUATRO LINHAS</span><h2>Comissão técnica</h2></div>
          <div className="staff-showcase">{org.staffMembers.map(m => <article className="staff-card" key={m.id}>{m.photoUrl ? <img src={m.photoUrl} alt={m.name} /> : <div className="staff-placeholder">{m.name.slice(0,2).toUpperCase()}</div>}<div><small>{m.category?.name || "CLUBE"}</small><h3>{m.name}</h3><p>{m.roleTitle}</p>{m.bio && <span>{m.bio}</span>}</div></article>)}</div>
        </section>}

        <section id="clube" className="club-section club-about">
          <div className="club-about-mark">{org.logoUrl ? <img src={org.logoUrl} alt="" /> : <strong>ONZEUP</strong>}</div>
          <div><div className="club-heading"><span>NOSSO CLUBE</span><h2>Mais que um time.</h2></div><p>{org.description || `${publicName} é uma organização dedicada ao desenvolvimento esportivo e à formação de atletas.`}</p><div className="club-contact-row">{location && <span>📍 {location}</span>}{org.email && <a href={`mailto:${org.email}`}>{org.email}</a>}{org.whatsapp && <a href={`https://wa.me/${org.whatsapp.replace(/\D/g, "")}`} target="_blank">WhatsApp</a>}</div></div>
        </section>
      </div>

      <footer className="club-footer"><div className="club-container"><div>{org.logoUrl && <img src={org.logoUrl} alt="" />}<strong>{publicName}</strong></div><span>Powered by <b>ONZEUP</b></span></div></footer>
    </main>
  );
}
