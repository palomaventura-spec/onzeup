import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
  }).format(date).replace(".", "");
}

function fmtTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export default async function PublicCategoryPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  const org = await prisma.organization.findFirst({
    where: { slug, active: true },
    select: {
      id: true,
      name: true,
      publicName: true,
      logoUrl: true,
      accentColor: true,
      secondaryColor: true,
      publicBackground: true,
      publicTheme: true,
      city: true,
      state: true,
      showAthletesPublicly: true,
      showStaffPublicly: true,
      showTrainingsPublicly: true,
      showMatchesPublicly: true,
    },
  });

  if (!org) notFound();

  const category = await prisma.category.findFirst({
    where: {
      id,
      organizationId: org.id,
    },
    include: {
      athletes: {
        where: { active: true },
        orderBy: [{ jerseyNumber: "asc" }, { name: "asc" }],
      },
      staffMembers: {
        orderBy: [{ roleTitle: "asc" }, { name: "asc" }],
      },
      trainingSchedules: {
        orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
      },
      matches: {
        orderBy: { startsAt: "asc" },
      },
    },
  });

  if (!category) notFound();

  const publicName = org.publicName || org.name;
  const theme = org.publicTheme === "LIGHT" ? "light" : "dark";
  const upcoming = category.matches.filter((match) => match.status === "SCHEDULED");
  const results = category.matches.filter((match) => match.status === "FINISHED").reverse();

  return (
    <main
      className={`club-site club-site-${theme}`}
      style={{
        "--club-accent": org.accentColor || "#9DDB16",
        "--club-secondary": org.secondaryColor || "#FFFFFF",
        "--club-bg":
          org.publicBackground || (theme === "light" ? "#F5F7F8" : "#070B10"),
      } as React.CSSProperties}
    >
      <header className="club-nav category-public-nav">
        <div className="club-container club-nav-inner">
          <Link href={`/o/${slug}`} className="club-nav-brand">
            {org.logoUrl ? <img src={org.logoUrl} alt="" /> : <span>OU</span>}
            <strong>{publicName}</strong>
          </Link>

          <nav>
            <Link href={`/o/${slug}`}>Início</Link>
            <Link href={`/o/${slug}#categorias`}>Categorias</Link>
            <Link href={`/o/${slug}#jogos`}>Jogos</Link>
            <Link href={`/o/${slug}#elenco`}>Elenco</Link>
          </nav>
        </div>
      </header>

      <section className="category-hero">
        <div className="club-container category-hero-inner">
          <div>
            <span className="club-eyebrow">CATEGORIA • {publicName}</span>
            <h1>{category.name}</h1>
            <p>
              {category.birthYear
                ? `Atletas nascidos em ${category.birthYear}`
                : "Categoria de formação"}
            </p>
          </div>

          <div className="category-hero-stats">
            <div>
              <strong>{category.athletes.length}</strong>
              <span>Atletas</span>
            </div>
            <div>
              <strong>{category.staffMembers.length}</strong>
              <span>Comissão</span>
            </div>
            <div>
              <strong>{upcoming.length}</strong>
              <span>Próximos jogos</span>
            </div>
          </div>
        </div>
      </section>

      <div className="club-container club-body">
        {org.showAthletesPublicly && (
          <section className="club-section">
            <div className="club-heading club-heading-row">
              <div>
                <span>ELENCO {category.name.toUpperCase()}</span>
                <h2>Atletas</h2>
              </div>
              <p>Conheça quem representa esta categoria.</p>
            </div>

            {category.athletes.length ? (
              <div className="squad-grid">
                {category.athletes.map((athlete) => (
                  <Link
                    href={`/o/${slug}/atletas/${athlete.id}`}
                    className="player-card"
                    key={athlete.id}
                  >
                    <div className="player-photo">
                      {athlete.photoUrl ? (
                        <img src={athlete.photoUrl} alt={athlete.name} />
                      ) : (
                        <div className="player-placeholder">
                          {(athlete.nickname || athlete.name)
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}

                      {athlete.jerseyNumber != null && (
                        <span className="player-number">
                          {athlete.jerseyNumber}
                        </span>
                      )}
                    </div>

                    <div className="player-info">
                      <small>{category.name}</small>
                      <h3>{athlete.nickname || athlete.name}</h3>
                      {athlete.nickname ? <p>{athlete.name}</p> : null}
                      <span>{athlete.position || "Atleta"}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="club-empty">Nenhum atleta publicado nesta categoria.</p>
            )}
          </section>
        )}

        {org.showStaffPublicly && (
          <section className="club-section">
            <div className="club-heading">
              <span>QUEM COMANDA</span>
              <h2>Comissão técnica</h2>
            </div>

            {category.staffMembers.length ? (
              <div className="staff-showcase">
                {category.staffMembers.map((member) => (
                  <article className="staff-card" key={member.id}>
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} />
                    ) : (
                      <div className="staff-placeholder">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <small>{category.name}</small>
                      <h3>{member.name}</h3>
                      <p>{member.roleTitle}</p>
                      {member.bio ? <span>{member.bio}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="club-empty">
                Nenhum membro da comissão publicado nesta categoria.
              </p>
            )}
          </section>
        )}

        {(org.showTrainingsPublicly || org.showMatchesPublicly) && (
          <section className="club-section">
            <div className="club-heading">
              <span>PROGRAMAÇÃO</span>
              <h2>Rotina da categoria</h2>
            </div>

            <div className="category-program-grid">
              {org.showTrainingsPublicly && (
                <div>
                  <h3>Treinos</h3>
                  <div className="category-training-list">
                    {category.trainingSchedules.length ? (
                      category.trainingSchedules.map((training) => (
                        <article key={training.id}>
                          <strong>{WEEKDAYS[training.weekday]}</strong>
                          <span>
                            {training.startTime} – {training.endTime}
                          </span>
                          <small>{training.location || "Local a definir"}</small>
                        </article>
                      ))
                    ) : (
                      <p className="club-empty">Nenhum treino publicado.</p>
                    )}
                  </div>
                </div>
              )}

              {org.showMatchesPublicly && (
                <div>
                  <h3>Próximos jogos</h3>
                  <div className="game-list">
                    {upcoming.length ? (
                      upcoming.slice(0, 5).map((match) => (
                        <article className="game-row" key={match.id}>
                          <div className="game-date">
                            <strong>{fmtDate(match.startsAt)}</strong>
                            <span>{fmtTime(match.startsAt)}</span>
                          </div>

                          <div>
                            <small>{match.competition || "Jogo"}</small>
                            <strong>
                              {publicName} <em>×</em> {match.opponent}
                            </strong>
                            <span>{match.location || "Local a definir"}</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="club-empty">Nenhum próximo jogo publicado.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {org.showMatchesPublicly && results.length > 0 && (
              <div className="category-results">
                <h3>Últimos resultados</h3>
                <div className="game-list">
                  {results.slice(0, 4).map((match) => (
                    <article className="result-row" key={match.id}>
                      <div>
                        <small>{fmtDate(match.startsAt)}</small>
                        <strong>
                          {publicName} <b>{match.goalsFor ?? 0}</b>
                          <em>×</em>
                          <b>{match.goalsAgainst ?? 0}</b> {match.opponent}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        <div className="category-back-link">
          <Link href={`/o/${slug}`}>← Voltar para o site do clube</Link>
        </div>
      </div>

      <footer className="club-footer">
        <div className="club-container">
          <div>
            {org.logoUrl ? <img src={org.logoUrl} alt="" /> : null}
            <strong>{publicName}</strong>
          </div>
          <span>Powered by <b>ONZEUP</b></span>
        </div>
      </footer>
    </main>
  );
}
