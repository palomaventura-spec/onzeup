import Link from "next/link";

import ModuleTour from "@/components/help/ModuleTour";
import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

function day(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date);
}
function month(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}
function time(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CallUpsPage() {
  const user = await requireClubPermission("CALLUPS_VIEW");
  const matches = await prisma.match.findMany({
    where: { organizationId: user.organizationId, status: "SCHEDULED" },
    include: { category: true, callUps: true },
    orderBy: { startsAt: "asc" },
  });
  const totalCalled = matches.reduce((n, m) => n + m.callUps.length, 0);
  const confirmed = matches.reduce(
    (n, m) => n + m.callUps.filter((c) => c.status === "CONFIRMED").length,
    0,
  );
  const pending = matches.reduce(
    (n, m) => n + m.callUps.filter((c) => c.status === "PENDING").length,
    0,
  );

  return (
    <main className="callups-premium">
      <header className="module-premium-head">
        <div>
          <span className="page-eyebrow">FUTEBOL • GESTÃO DE ELENCO</span>
          <h1>Convocações</h1>
          <p>
            Organize o grupo, acompanhe confirmações e gere a arte oficial de
            cada partida.
          </p>
        </div>
        <ModuleTour module="convocacoes" />
      </header>
      <section className="module-kpis">
        <article>
          <span>JOGOS ABERTOS</span>
          <strong>{matches.length}</strong>
          <small>aguardando convocação</small>
        </article>
        <article>
          <span>CONVOCADOS</span>
          <strong>{totalCalled}</strong>
          <small>em todos os jogos</small>
        </article>
        <article>
          <span>CONFIRMADOS</span>
          <strong>{confirmed}</strong>
          <small>presenças confirmadas</small>
        </article>
        <article>
          <span>AGUARDANDO</span>
          <strong>{pending}</strong>
          <small>respostas pendentes</small>
        </article>
      </section>
      <section className="module-premium-panel">
        <div className="module-section-title">
          <div>
            <span className="page-eyebrow">PRÓXIMAS PARTIDAS</span>
            <h2>Central de convocações</h2>
          </div>
          <span className="badge">{matches.length} jogo(s)</span>
        </div>
        {matches.length ? (
          <div className="callup-match-grid">
            {matches.map((match) => {
              const yes = match.callUps.filter(
                (c) => c.status === "CONFIRMED",
              ).length;
              const limit =
                match.callUpLimit || (match.sport === "FUTSAL" ? 14 : 18);
              const percent = Math.min(
                100,
                Math.round((match.callUps.length / limit) * 100),
              );
              return (
                <article key={match.id} className="callup-match-card">
                  <div className="callup-date">
                    <strong>{day(match.startsAt)}</strong>
                    <span>{month(match.startsAt)}</span>
                    <small>{time(match.startsAt)}</small>
                  </div>
                  <div className="callup-game">
                    <span>
                      {match.category.name} •{" "}
                      {match.sport === "FUTSAL" ? "Futsal" : "Campo"}
                    </span>
                    <h3>
                      ONZEUP <i>×</i> {match.opponent}
                    </h3>
                    <p>
                      {match.competition || "Competição não informada"} •{" "}
                      {match.location || "Local a definir"}
                    </p>
                  </div>
                  <div className="callup-progress">
                    <div>
                      <span>Lista</span>
                      <strong>
                        {match.callUps.length}/{limit}
                      </strong>
                    </div>
                    <div className="mini-track">
                      <i style={{ width: `${percent}%` }} />
                    </div>
                    <small>{yes} confirmado(s)</small>
                  </div>
                  <Link href={`/convocacoes/${match.id}`}>
                    Gerenciar convocação <b>→</b>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty">Nenhum jogo agendado para convocação.</div>
        )}
      </section>
    </main>
  );
}
