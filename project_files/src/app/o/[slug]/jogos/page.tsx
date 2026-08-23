import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function fmt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default async function PublicGamesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const org = await prisma.organization.findFirst({
    where: { slug, active: true },
    include: { matches: { include: { category: true }, orderBy: { startsAt: "asc" } } },
  });
  if (!org || !org.showMatchesPublicly) notFound();

  const name = org.publicName || org.name;
  const upcoming = org.matches.filter((m) => m.status === "SCHEDULED");
  const results = org.matches.filter((m) => m.status === "FINISHED").reverse();
  const theme = org.publicTheme === "LIGHT" ? "light" : "dark";

  return (
    <main className={`club-site club-site-${theme}`} style={{
      "--club-accent": org.accentColor || "#9DDB16",
      "--club-secondary": org.secondaryColor || "#FFFFFF",
      "--club-bg": org.publicBackground || (theme === "light" ? "#F5F7F8" : "#070B10"),
    } as React.CSSProperties}>
      <header className="club-nav"><div className="club-container club-nav-inner"><Link href={`/o/${slug}`} className="club-nav-brand">{org.logoUrl ? <img src={org.logoUrl} alt="" /> : <span>OU</span>}<strong>{name}</strong></Link><nav><Link href={`/o/${slug}`}>← Site do clube</Link></nav></div></header>

      <section className="club-games-page-hero"><div className="club-container"><span className="club-eyebrow">CALENDÁRIO</span><h1>Jogos & resultados</h1><p>{name}</p></div></section>

      <div className="club-container club-body">
        <section className="club-section">
          <div className="club-heading"><span>AGENDA</span><h2>Próximos jogos</h2><p>{upcoming.length} jogo{upcoming.length === 1 ? "" : "s"} programado{upcoming.length === 1 ? "" : "s"}.</p></div>
          <div className="public-games-list">
            {upcoming.length ? upcoming.map((m) => (
              <article key={m.id} className="public-game-card">
                <div><small>{m.category.name}{m.competition ? ` • ${m.competition}` : ""}</small><h3>{name} <em>×</em> {m.opponent}</h3><p>{m.location || "Local a definir"}</p></div>
                <strong>{fmt(m.startsAt)}</strong>
              </article>
            )) : <p className="club-empty">Nenhum próximo jogo cadastrado.</p>}
          </div>
        </section>

        <section className="club-section">
          <div className="club-heading"><span>PLACARES</span><h2>Últimos resultados</h2></div>
          <div className="public-games-list">
            {results.length ? results.map((m) => (
              <article key={m.id} className="public-game-card result">
                <div><small>{m.category.name}{m.competition ? ` • ${m.competition}` : ""}</small><h3>{name} <b>{m.goalsFor ?? 0}</b> <em>×</em> <b>{m.goalsAgainst ?? 0}</b> {m.opponent}</h3><p>{m.location || ""}</p></div>
                <strong>{fmt(m.startsAt)}</strong>
              </article>
            )) : <p className="club-empty">Nenhum resultado publicado.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
