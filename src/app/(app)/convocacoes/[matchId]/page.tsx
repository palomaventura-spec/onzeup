import Link from "next/link";
import { notFound } from "next/navigation";

import CopyButton from "@/components/CopyButton";
import {
  getClubCallUpCategoryAccess,
  requireClubPermission,
} from "@/lib/club-access";
import { googleCalendarUrl } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

import CallUpLineupEditor from "../CallUpLineupEditor";
import CallUpSelectionForm from "../CallUpSelectionForm";
import { deleteCallUp, markCallUpsSent, updateCallUpStatus } from "../actions";

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
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

export default async function MatchCallUpsPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const user = await requireClubPermission("CALLUPS_VIEW");
  const { matchId } = await params;
  const match = await prisma.match.findFirst({
    where: { id: matchId, organizationId: user.organizationId },
    include: {
      category: true,
      callUps: {
        include: { athlete: true },
        orderBy: { athlete: { name: "asc" } },
      },
      athleteStats: true,
    },
  });
  if (!match) notFound();

  const categoryAccess = await getClubCallUpCategoryAccess(
    user,
    match.categoryId,
  );
  if (!categoryAccess.canView) notFound();
  const canManage = categoryAccess.canManage;
  const alreadyCalled = new Set(match.callUps.map((item) => item.athleteId));
  const athletes = await prisma.athlete.findMany({
    where: {
      organizationId: user.organizationId,
      categoryId: match.categoryId,
      active: true,
      id: { notIn: Array.from(alreadyCalled) },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nickname: true,
      position: true,
      jerseyNumber: true,
    },
  });

  const statByAthlete = new Map(
    match.athleteStats.map((stat) => [stat.athleteId, stat]),
  );
  const lineupAthletes = match.callUps.map((callUp) => {
    const stat = statByAthlete.get(callUp.athleteId);
    return {
      id: callUp.athleteId,
      name: callUp.athlete.name,
      nickname: callUp.athlete.nickname,
      photoUrl: callUp.athlete.photoUrl,
      defaultNumber: callUp.athlete.jerseyNumber,
      slot: stat?.positionPlayed || "SUBSTITUTE",
      jerseyNumber: stat?.jerseyNumber ?? null,
      isCaptain: stat?.isCaptain || false,
    };
  });
  const isFutsal = match.sport === "FUTSAL";
  const squadLimit = match.callUpLimit;
  const requiredSlots = isFutsal
    ? ["GOALKEEPER", "FIXO", "ALA_LEFT", "ALA_RIGHT", "PIVO"]
    : [
        "GOALKEEPER",
        "DEFENDER_LEFT",
        "DEFENDER_CENTER",
        "DEFENDER_RIGHT",
        "MIDFIELDER_LEFT",
        "MIDFIELDER_CENTER",
        "MIDFIELDER_RIGHT",
        "FORWARD_LEFT",
        "FORWARD_RIGHT",
      ];
  const usedSlots = new Set(lineupAthletes.map((item) => item.slot));
  const startersReady = requiredSlots.every((slot) => usedSlots.has(slot));
  const artworkComplete = match.callUps.length === squadLimit && startersReady;
  const orgName =
    user.organization?.publicName || user.organization?.name || "ONZEUP";
  const location = match.location || "Local a definir";
  const calendarUrl = googleCalendarUrl({
    title: `${match.category.name} × ${match.opponent}`,
    start: match.startsAt,
    location: match.location,
    details: `Convocação • ${match.competition || "Jogo"} • ${orgName}`,
  });
  const baseMessage = (name: string) =>
    `⚽ CONVOCAÇÃO — ${match.category.name}\n\nOlá! ${name} está convocado(a) para a próxima partida.\n\n🆚 ${match.opponent}\n📅 ${fmt(match.startsAt)}\n📍 ${location}\n🏆 ${match.competition || "Jogo"}\n\nPor favor, confirme a presença com o coordenador.\n\n${orgName}`;

  return (
    <main className="callup-detail-premium">
      <div className="page-head">
        <div>
          <span className="page-eyebrow">
            CONVOCAÇÃO • {isFutsal ? "FUTSAL" : "CAMPO"}
          </span>
          <h1>
            {match.category.name} × {match.opponent}
          </h1>
          <p className="muted">
            {fmt(match.startsAt)} • {match.callUps.length}/{squadLimit} atletas
          </p>
        </div>
        <div className="actions">
          {startersReady ? (
            <Link className="btn" href={`/convocacoes/${match.id}/arte`}>
              {artworkComplete
                ? "Abrir arte e PDF"
                : "Visualizar prévia da arte"}
            </Link>
          ) : (
            <span
              className="btn btn-disabled"
              title="Adicione 18 atletas e complete as oito posições"
            >
              Escalação incompleta
            </span>
          )}
          <a
            className="btn btn-secondary"
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
          >
            Google Agenda
          </a>
          <Link className="btn btn-secondary" href={`/jogos/${match.id}`}>
            Voltar ao jogo
          </Link>
        </div>
      </div>

      {!canManage ? (
        <div className="notice">
          <strong>Somente visualização.</strong> Você pode consultar a
          convocação, mas não alterá-la.
        </div>
      ) : null}
      <div className="two-col">
        <section className="card">
          <h2>Selecionar atletas</h2>
          <p className="muted">
            {isFutsal
              ? `Futsal: 5 titulares e ${Math.max(0, squadLimit - 5)} reservas.`
              : `Campo: 9 titulares e ${Math.max(0, squadLimit - 9)} reservas.`}
          </p>
          {!canManage ? (
            <div className="empty">
              Sem permissão para gerenciar esta categoria.
            </div>
          ) : match.callUps.length >= squadLimit ? (
            <div className="empty">
              Lista completa com {squadLimit} atletas.
            </div>
          ) : athletes.length === 0 ? (
            <div className="empty">
              Não há outros atletas ativos nesta categoria.
            </div>
          ) : (
            <CallUpSelectionForm
              matchId={match.id}
              athletes={athletes}
              currentCount={match.callUps.length}
              squadLimit={squadLimit}
            />
          )}
          <div className="private-note">
            Esta lista é privada e não aparece no site público da organização.
          </div>
        </section>

        <section className="card">
          <div className="page-head compact">
            <div>
              <h2>Convocados</h2>
              <p className="muted">
                {match.callUps.length} de {squadLimit} atletas
              </p>
            </div>
            {canManage && match.callUps.length ? (
              <form action={markCallUpsSent}>
                <input type="hidden" name="matchId" value={match.id} />
                <button className="btn-secondary" type="submit">
                  Marcar mensagens como enviadas
                </button>
              </form>
            ) : null}
          </div>
          {!match.callUps.length ? (
            <div className="empty">Nenhum atleta convocado ainda.</div>
          ) : (
            <div className="stack">
              {match.callUps.map((callUp) => {
                const name = callUp.athlete.nickname || callUp.athlete.name;
                const message = baseMessage(name);
                const wa = whatsappUrl(callUp.athlete.guardianPhone, message);
                return (
                  <article className="callup-card" key={callUp.id}>
                    <div className="callup-main">
                      <div>
                        <strong>{name}</strong>
                        {callUp.athlete.nickname ? (
                          <small>{callUp.athlete.name}</small>
                        ) : null}
                      </div>
                      <span
                        className={`status status-${callUp.status.toLowerCase()}`}
                      >
                        {callUp.status === "CONFIRMED"
                          ? "Confirmado"
                          : callUp.status === "DECLINED"
                            ? "Não poderá"
                            : "Aguardando"}
                      </span>
                    </div>
                    <div className="callup-meta">
                      <span>
                        Responsável:{" "}
                        {callUp.athlete.guardianName || "Não informado"}
                      </span>
                      <span>
                        Telefone:{" "}
                        {callUp.athlete.guardianPhone || "Não informado"}
                      </span>
                    </div>
                    <div className="actions">
                      <CopyButton text={message} />
                      {wa ? (
                        <a
                          className="btn btn-small"
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                      {canManage ? (
                        <>
                          <form action={updateCallUpStatus}>
                            <input type="hidden" name="id" value={callUp.id} />
                            <input
                              type="hidden"
                              name="status"
                              value="CONFIRMED"
                            />
                            <button
                              className="btn-secondary btn-small"
                              type="submit"
                            >
                              Confirmar
                            </button>
                          </form>
                          <form action={updateCallUpStatus}>
                            <input type="hidden" name="id" value={callUp.id} />
                            <input
                              type="hidden"
                              name="status"
                              value="DECLINED"
                            />
                            <button
                              className="btn-danger btn-small"
                              type="submit"
                            >
                              Não poderá
                            </button>
                          </form>
                          <form action={deleteCallUp}>
                            <input type="hidden" name="id" value={callUp.id} />
                            <button
                              className="btn-secondary btn-small"
                              type="submit"
                            >
                              Remover
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {match.callUps.length ? (
        <CallUpLineupEditor
          matchId={match.id}
          athletes={lineupAthletes}
          canEdit={canManage}
          sport={isFutsal ? "FUTSAL" : "FOOTBALL"}
          squadLimit={squadLimit}
        />
      ) : null}
    </main>
  );
}
