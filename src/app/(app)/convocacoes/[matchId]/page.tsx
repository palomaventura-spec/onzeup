import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import CallUpSubmitButton from "@/components/CallUpSubmitButton";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import {
  createCallUps,
  deleteCallUp,
  updateCallUpStatus,
  markCallUpsSent,
} from "../actions";

function fmt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function whatsappUrl(phone: string | null, text: string) {
  if (!phone) return null;
  const number = phone.replace(/\D/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export default async function MatchCallUpsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await requireOrganizationUser();
  const { matchId } = await params;

  const match = await prisma.match.findFirst({
    where: { id: matchId, organizationId: user.organizationId },
    include: {
      category: true,
      callUps: {
        include: { athlete: true },
        orderBy: { athlete: { name: "asc" } },
      },
    },
  });

  if (!match) notFound();

  const alreadyCalled = new Set(match.callUps.map(c => c.athleteId));

  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      active: true,
      id: { notIn: Array.from(alreadyCalled) },
    },
    include: { category: true },
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });

  const orgName = user.organization?.publicName || user.organization?.name || "OnzeUp";
  const location = match.location || "Local a definir";
  const baseMessage = (athleteName: string) =>
`⚽ CONVOCAÇÃO — ${match.category.name}

Olá! ${athleteName} está convocado(a) para a próxima partida.

🆚 ${match.opponent}
📅 ${fmt(match.startsAt)}
📍 ${location}
🏆 ${match.competition || "Jogo"}

Por favor, confirme a presença com o coordenador.

${orgName}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Convocação — {match.category.name}</h1>
          <p className="muted">
            {orgName} × {match.opponent} • {fmt(match.startsAt)}
          </p>
        </div>
        <Link className="btn btn-secondary" href={`/jogos/${match.id}`}>Voltar ao jogo</Link>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Selecionar atletas</h2>

          {athletes.length === 0 ? (
            <div className="empty">Todos os atletas ativos desta categoria já foram adicionados.</div>
          ) : (
            <form className="form" action={createCallUps}>
              <input type="hidden" name="matchId" value={match.id} />

              <div className="stack">
                {athletes.map((athlete) => (
                  <label className="check athlete-check" key={athlete.id}>
                    <input type="checkbox" name="athleteIds" value={athlete.id} />
                    <span>
                      <strong>{athlete.nickname || athlete.name}</strong>
                      <small>{athlete.position || "Atleta"} {athlete.jerseyNumber != null ? `• #${athlete.jerseyNumber}` : ""}</small>
                    </span>
                  </label>
                ))}
              </div>

              <CallUpSubmitButton />
            </form>
          )}

          <div className="private-note">
            Esta lista é privada e não aparece no site público da organização.
          </div>
        </section>

        <section className="card">
          <div className="page-head compact">
            <div>
              <h2>Convocados</h2>
              <p className="muted">{match.callUps.length} atleta(s)</p>
            </div>

            {match.callUps.length > 0 && (
              <form action={markCallUpsSent}>
                <input type="hidden" name="matchId" value={match.id} />
                <button className="btn-secondary" type="submit">Marcar mensagens como enviadas</button>
              </form>
            )}
          </div>

          {match.callUps.length === 0 ? (
            <div className="empty">Nenhum atleta convocado ainda.</div>
          ) : (
            <div className="stack">
              {match.callUps.map((callUp) => {
                const athlete = callUp.athlete;
                const message = baseMessage(athlete.nickname || athlete.name);
                const wa = whatsappUrl(athlete.guardianPhone, message);

                return (
                  <article className="callup-card" key={callUp.id}>
                    <div className="callup-main">
                      <div>
                        <strong>{athlete.nickname || athlete.name}</strong>
                        {athlete.nickname ? <small>{athlete.name}</small> : null}
                      </div>

                      <span className={`status status-${callUp.status.toLowerCase()}`}>
                        {callUp.status === "CONFIRMED"
                          ? "Confirmado"
                          : callUp.status === "DECLINED"
                          ? "Não poderá"
                          : "Aguardando"}
                      </span>
                    </div>

                    <div className="callup-meta">
                      <span>Responsável: {athlete.guardianName || "Não informado"}</span>
                      <span>Telefone: {athlete.guardianPhone || "Não informado"}</span>
                      {callUp.sentAt ? <span>Mensagem marcada como enviada</span> : null}
                    </div>

                    <div className="actions">
                      <CopyButton text={message} />
                      {wa ? (
                        <a className="btn btn-small" href={wa} target="_blank">
                          Abrir WhatsApp
                        </a>
                      ) : (
                        <span className="help">Cadastre o telefone do responsável para abrir o WhatsApp.</span>
                      )}

                      <form action={updateCallUpStatus}>
                        <input type="hidden" name="id" value={callUp.id} />
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="status" value="CONFIRMED" />
                        <button className="btn-secondary btn-small" type="submit">Confirmar</button>
                      </form>

                      <form action={updateCallUpStatus}>
                        <input type="hidden" name="id" value={callUp.id} />
                        <input type="hidden" name="matchId" value={match.id} />
                        <input type="hidden" name="status" value="DECLINED" />
                        <button className="btn-danger btn-small" type="submit">Não poderá</button>
                      </form>

                      <form action={deleteCallUp}>
                        <input type="hidden" name="id" value={callUp.id} />
                        <input type="hidden" name="matchId" value={match.id} />
                        <button className="btn-secondary btn-small" type="submit">Remover</button>
                      </form>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
