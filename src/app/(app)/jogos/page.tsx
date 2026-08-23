import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { deleteMatch, markMatchFinished, createMatch } from "./actions";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export default async function MatchesPage() {
  const user = await requireOrganizationUser();

  const [matches, categories] = await Promise.all([
    prisma.match.findMany({
      where: { organizationId: user.organizationId },
      include: { category: true, callUps: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  const upcoming = matches.filter((m) => m.status === "SCHEDULED");
  const finished = matches.filter((m) => m.status === "FINISHED");
  const cancelled = matches.filter((m) => m.status === "CANCELLED");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Jogos e resultados</h1>
          <p className="muted">
            Cadastre partidas, faça convocações e publique resultados no mesmo fluxo.
          </p>
        </div>
        <span className="badge">{matches.length} jogo(s)</span>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Novo jogo</h2>

          {categories.length === 0 ? (
            <div className="empty">
              Cadastre uma categoria antes de criar jogos.
            </div>
          ) : (
            <form className="form" action={createMatch}>
              <label>
                Categoria
                <select name="categoryId" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Competição
                <input name="competition" placeholder="Ex.: Campeonato Carioca" />
              </label>

              <label>
                Adversário
                <input name="opponent" placeholder="Nome do adversário" required />
              </label>

              <label>
                Data
                <input name="matchDate" type="date" required />
              </label>

              <label>
                Horário
                <input name="matchTime" type="time" required />
              </label>

              <label>
                Local
                <input name="location" placeholder="Campo / ginásio" />
              </label>

              <label>
                Mandante / visitante
                <select name="homeAway" defaultValue="">
                  <option value="">Não informado</option>
                  <option value="HOME">Mandante</option>
                  <option value="AWAY">Visitante</option>
                  <option value="NEUTRAL">Campo neutro</option>
                </select>
              </label>

              <label>
                Observações
                <textarea name="notes" rows={4} placeholder="Informações gerais da partida." />
              </label>

              <button type="submit">Cadastrar jogo</button>
            </form>
          )}
        </section>

        <section className="stack">
          <div className="card">
            <h2>Próximos jogos</h2>
            {upcoming.length === 0 ? (
              <div className="empty">Nenhum próximo jogo cadastrado.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Adversário</th>
                      <th>Resultado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcoming.map((match) => (
                      <tr key={match.id}>
                        <td>
                          {formatDate(match.startsAt)}
                          <div className="help">{formatTime(match.startsAt)}</div>
                        </td>
                        <td>{match.category.name}</td>
                        <td>
                          <strong>{match.opponent}</strong>
                          <div className="help">{match.competition ?? "—"}</div>
                        </td>
                        <td>
                          <form className="actions" action={markMatchFinished}>
                            <input type="hidden" name="id" value={match.id} />
                            <input name="goalsFor" type="number" min="0" placeholder="Nós" style={{width:70}} required />
                            <input name="goalsAgainst" type="number" min="0" placeholder="Eles" style={{width:70}} required />
                            <button className="btn-small" type="submit">Finalizar</button>
                          </form>
                        </td>
                        <td>
                          <div className="actions">
                            <Link className="btn btn-secondary btn-small" href={`/jogos/${match.id}`}>
                              Abrir jogo
                            </Link>
                            <Link className="match-callup-button" href={`/convocacoes/${match.id}`}>
                              {"Convoca\u00e7\u00e3o"} <span className="match-callup-count">{match.callUps.length}</span>
                            </Link>
                            <form className="inline-form" action={deleteMatch}>
                              <input type="hidden" name="id" value={match.id} />
                              <button className="btn-danger btn-small" type="submit">Excluir</button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <h2>Resultados</h2>
            {finished.length === 0 ? (
              <div className="empty">Nenhum resultado registrado.</div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Adversário</th>
                      <th>Placar</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finished.map((match) => (
                      <tr key={match.id}>
                        <td>{formatDate(match.startsAt)}</td>
                        <td>{match.category.name}</td>
                        <td>{match.opponent}</td>
                        <td>
                          <strong>{match.goalsFor ?? 0} × {match.goalsAgainst ?? 0}</strong>
                        </td>
                        <td>
                          <Link className="btn btn-secondary btn-small" href={`/jogos/${match.id}`}>
                            Editar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {cancelled.length > 0 && (
            <div className="card">
              <h2>Cancelados</h2>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Categoria</th>
                      <th>Adversário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancelled.map((match) => (
                      <tr key={match.id}>
                        <td>{formatDate(match.startsAt)}</td>
                        <td>{match.category.name}</td>
                        <td>{match.opponent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
