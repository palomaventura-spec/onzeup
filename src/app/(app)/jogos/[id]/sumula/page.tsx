import Link from "next/link";
import { notFound } from "next/navigation";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";
import SumulaPrintButton from "./SumulaPrintButton";

import {
  addMatchEvent,
  deleteMatchEvent,
  finalizeMatchSheet,
  reopenMatchSheet,
  saveMatchSheet,
} from "./actions";

const participationOptions = [
  ["RELATED", "Relacionado"],
  ["PRESENT", "Presente"],
  ["ABSENT", "Ausente"],
  ["INJURED", "Lesionado"],
  ["SUSPENDED", "Suspenso"],
  ["NOT_RELATED", "Não relacionado"],
] as const;

const eventLabels: Record<string, string> = {
  GOAL: "Gol",
  ASSIST: "Assistência",
  YELLOW_CARD: "Cartão amarelo",
  RED_CARD: "Cartão vermelho",
  SUBSTITUTION: "Substituição",
  INJURY: "Lesão",
  PENALTY: "Pênalti",
  OWN_GOAL: "Gol contra",
  OTHER: "Outra ocorrência",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

export default async function MatchSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("MATCHES_VIEW");
  const canEdit = hasClubPermission(user, "MATCHES_EDIT");
  const { id } = await params;

  const match = await prisma.match.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      organization: { select: { name: true, publicName: true } },
      category: true,
      callUps: {
        include: { athlete: true },
        orderBy: { athlete: { name: "asc" } },
      },
      athleteStats: true,
      events: {
        include: { athlete: { select: { name: true, nickname: true } } },
        orderBy: [{ minute: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!match) notFound();

  const editable = canEdit && match.matchSheetStatus === "DRAFT";
  const stats = new Map(
    match.athleteStats.map((item) => [item.athleteId, item]),
  );

  return (
    <>
      <div className="page-head match-sheet-head">
        <div>
          <span className="page-eyebrow">SÚMULA DA PARTIDA</span>
          <h1>
            {match.category.name} × {match.opponent}
          </h1>
          <p className="muted">
            {formatDate(match.startsAt)} • {match.location || "Local a definir"}
          </p>
        </div>
        <div className="actions convocation-no-print">
          <span
            className={`badge match-sheet-status-${match.matchSheetStatus.toLowerCase()}`}
          >
            {match.matchSheetStatus === "DRAFT"
              ? "Rascunho"
              : match.matchSheetStatus === "FINALIZED"
                ? "Finalizada"
                : "Arquivada"}
          </span>
          <SumulaPrintButton />
          <Link className="btn btn-secondary" href={`/jogos/${match.id}`}>
            Voltar ao jogo
          </Link>
        </div>
      </div>

      <section className="card match-sheet-scoreboard">
        <div>
          <small>
            {match.organization.publicName || match.organization.name}
          </small>
          <strong>{match.goalsFor ?? "—"}</strong>
        </div>
        <span>×</span>
        <div>
          <small>{match.opponent}</small>
          <strong>{match.goalsAgainst ?? "—"}</strong>
        </div>
      </section>

      <form action={saveMatchSheet} className="stack">
        <input type="hidden" name="matchId" value={match.id} />
        <section className="card">
          <div className="section-head">
            <div>
              <span className="page-eyebrow">FICHA DO JOGO</span>
              <h2>Informações oficiais</h2>
            </div>
          </div>
          <div className="match-sheet-grid">
            <label>
              Gols do clube
              <input
                type="number"
                min="0"
                name="goalsFor"
                defaultValue={match.goalsFor ?? ""}
                disabled={!editable}
                required
              />
            </label>
            <label>
              Gols do adversário
              <input
                type="number"
                min="0"
                name="goalsAgainst"
                defaultValue={match.goalsAgainst ?? ""}
                disabled={!editable}
                required
              />
            </label>
            <label>
              Horário de apresentação
              <input
                name="presentationTime"
                type="time"
                defaultValue={match.presentationTime ?? ""}
                disabled={!editable}
              />
            </label>
            <label>
              Uniforme
              <input
                name="uniform"
                defaultValue={match.uniform ?? ""}
                disabled={!editable}
                placeholder="Ex.: Alvinegro"
              />
            </label>
            <label>
              Árbitro
              <input
                name="referee"
                defaultValue={match.referee ?? ""}
                disabled={!editable}
              />
            </label>
            <label>
              Assistente / mesário
              <input
                name="assistantReferee"
                defaultValue={match.assistantReferee ?? ""}
                disabled={!editable}
              />
            </label>
          </div>
          <label>
            Relato e observações da súmula
            <textarea
              name="matchSheetNotes"
              rows={4}
              defaultValue={match.matchSheetNotes ?? ""}
              disabled={!editable}
            />
          </label>
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <span className="page-eyebrow">ELENCO</span>
              <h2>Participação e estatísticas</h2>
            </div>
            <span className="badge">{match.callUps.length} convocado(s)</span>
          </div>
          {match.callUps.length ? (
            <div className="table-wrap">
              <table className="table match-sheet-table">
                <thead>
                  <tr>
                    <th>Atleta</th>
                    <th>Presença</th>
                    <th>Função</th>
                    <th>Nº</th>
                    <th>Min.</th>
                    <th>G</th>
                    <th>A</th>
                    <th>CA</th>
                    <th>CV</th>
                    <th>Cap.</th>
                  </tr>
                </thead>
                <tbody>
                  {match.callUps.map(({ athlete }) => {
                    const stat = stats.get(athlete.id);
                    return (
                      <tr key={athlete.id}>
                        <td>
                          <input
                            type="hidden"
                            name="athleteId"
                            value={athlete.id}
                          />
                          <strong>{athlete.nickname || athlete.name}</strong>
                          <div className="help">
                            {athlete.position || "Posição não informada"}
                          </div>
                        </td>
                        <td>
                          <select
                            name={`participation_${athlete.id}`}
                            defaultValue={stat?.participation ?? "RELATED"}
                            disabled={!editable}
                          >
                            {participationOptions.map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <select
                            name={`lineupRole_${athlete.id}`}
                            defaultValue={stat?.lineupRole ?? ""}
                            disabled={!editable}
                          >
                            <option value="">—</option>
                            <option value="STARTER">Titular</option>
                            <option value="SUBSTITUTE">Reserva</option>
                            <option value="DID_NOT_PLAY">Não entrou</option>
                          </select>
                        </td>
                        <td>
                          <input
                            className="sheet-number"
                            type="number"
                            min="1"
                            name={`jerseyNumber_${athlete.id}`}
                            defaultValue={
                              stat?.jerseyNumber ?? athlete.jerseyNumber ?? ""
                            }
                            disabled={!editable}
                          />
                        </td>
                        <td>
                          <input
                            className="sheet-number"
                            type="number"
                            min="0"
                            name={`minutesPlayed_${athlete.id}`}
                            defaultValue={stat?.minutesPlayed ?? ""}
                            disabled={!editable}
                          />
                        </td>
                        {(
                          [
                            "goals",
                            "assists",
                            "yellowCards",
                            "redCards",
                          ] as const
                        ).map((field) => (
                          <td key={field}>
                            <input
                              className="sheet-number"
                              type="number"
                              min="0"
                              name={`${field}_${athlete.id}`}
                              defaultValue={stat?.[field] ?? 0}
                              disabled={!editable}
                            />
                          </td>
                        ))}
                        <td>
                          <input
                            type="radio"
                            name="captainId"
                            value={athlete.id}
                            defaultChecked={stat?.isCaptain}
                            disabled={!editable}
                            aria-label={`Definir ${athlete.name} como capitão`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">
              Faça a convocação antes de preencher a súmula.
            </div>
          )}
          {editable ? (
            <button type="submit">Salvar rascunho da súmula</button>
          ) : null}
        </section>
      </form>

      <section className="card">
        <div className="section-head">
          <div>
            <span className="page-eyebrow">CRONOLOGIA</span>
            <h2>Ocorrências da partida</h2>
          </div>
        </div>
        {editable ? (
          <form action={addMatchEvent} className="match-event-form">
            <input type="hidden" name="matchId" value={match.id} />
            <label>
              Ocorrência
              <select name="type" defaultValue="GOAL">
                {Object.entries(eventLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Equipe
              <select name="team" defaultValue="OURS">
                <option value="OURS">Nosso clube</option>
                <option value="OPPONENT">Adversário</option>
              </select>
            </label>
            <label>
              Atleta
              <select name="athleteId" defaultValue="">
                <option value="">Não se aplica</option>
                {match.callUps.map(({ athlete }) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.nickname || athlete.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Minuto
              <input name="minute" type="number" min="0" />
            </label>
            <label>
              Período
              <input name="period" placeholder="Ex.: 1º tempo" />
            </label>
            <label>
              Observação
              <input name="notes" />
            </label>
            <button type="submit">Adicionar</button>
          </form>
        ) : null}
        <div className="match-event-list">
          {match.events.length ? (
            match.events.map((event) => (
              <div className="match-event" key={event.id}>
                <span className="match-event-minute">
                  {event.minute === null ? "—" : `${event.minute}'`}
                </span>
                <div>
                  <strong>{eventLabels[event.type] || event.type}</strong>
                  <p>
                    {event.team === "OPPONENT"
                      ? match.opponent
                      : event.athlete?.nickname ||
                        event.athlete?.name ||
                        match.organization.publicName ||
                        match.organization.name}
                    {event.period ? ` • ${event.period}` : ""}
                    {event.notes ? ` • ${event.notes}` : ""}
                  </p>
                </div>
                {editable ? (
                  <form action={deleteMatchEvent}>
                    <input type="hidden" name="matchId" value={match.id} />
                    <input type="hidden" name="eventId" value={event.id} />
                    <button className="btn-danger btn-small" type="submit">
                      Excluir
                    </button>
                  </form>
                ) : null}
              </div>
            ))
          ) : (
            <div className="empty">Nenhuma ocorrência registrada.</div>
          )}
        </div>
      </section>

      {canEdit ? (
        <section className="card match-sheet-finish convocation-no-print">
          {match.matchSheetStatus === "DRAFT" ? (
            <>
              <div>
                <h2>Finalizar súmula</h2>
                <p className="muted">
                  Confira o placar e salve o rascunho antes de finalizar. A
                  partida será marcada como encerrada.
                </p>
              </div>
              <form action={finalizeMatchSheet}>
                <input type="hidden" name="matchId" value={match.id} />
                <button type="submit">Finalizar súmula</button>
              </form>
            </>
          ) : (
            <>
              <div>
                <h2>Súmula finalizada</h2>
                <p className="muted">
                  Reabra somente se for necessário fazer alguma correção.
                </p>
              </div>
              <form action={reopenMatchSheet}>
                <input type="hidden" name="matchId" value={match.id} />
                <button className="btn-secondary" type="submit">
                  Reabrir súmula
                </button>
              </form>
            </>
          )}
        </section>
      ) : null}
    </>
  );
}
