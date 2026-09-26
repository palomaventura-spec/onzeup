import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

import CopyButton from "@/components/CopyButton";
import {
  getClubCallUpCategoryAccess,
  requireClubPermission,
} from "@/lib/club-access";
import { googleCalendarUrl } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

import CallUpConfigurationForm from "../CallUpConfigurationForm";
import CallUpLineupEditor from "../CallUpLineupEditor";
import CallUpSelectionForm from "../CallUpSelectionForm";
import CallUpSubmitButton from "../CallUpSubmitButton";
import {
  deleteCallUp,
  markCallUpsSent,
  updateCallUpStatus,
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
      formationTemplate: {
        include: {
          slots: {
            where: { active: true },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
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
      active: true,
      id: { notIn: Array.from(alreadyCalled) },
      OR: [
        { categoryId: match.categoryId },
        {
          memberships: {
            some: {
              organizationId: user.organizationId,
              categoryId: match.categoryId,
              status: "ACTIVE",
              sport: { in: ["BOTH", match.sport] },
            },
          },
        },
      ],
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

  const legacySlots = isFutsal
    ? [
        { code: "GOALKEEPER", label: "Goleiro", slotType: "GOALKEEPER", x: 50, y: 88, sortOrder: 0 },
        { code: "FIXO", label: "Fixo", slotType: "OUTFIELD", x: 50, y: 65, sortOrder: 1 },
        { code: "ALA_LEFT", label: "Ala esquerdo", slotType: "OUTFIELD", x: 24, y: 43, sortOrder: 2 },
        { code: "ALA_RIGHT", label: "Ala direito", slotType: "OUTFIELD", x: 76, y: 43, sortOrder: 3 },
        { code: "PIVO", label: "Pivô", slotType: "OUTFIELD", x: 50, y: 18, sortOrder: 4 },
      ]
    : [
        { code: "GOALKEEPER", label: "Goleiro", slotType: "GOALKEEPER", x: 50, y: 88, sortOrder: 0 },
        { code: "DEFENDER_LEFT", label: "Defensor esquerdo", slotType: "OUTFIELD", x: 22, y: 69, sortOrder: 1 },
        { code: "DEFENDER_CENTER", label: "Defensor central", slotType: "OUTFIELD", x: 50, y: 66, sortOrder: 2 },
        { code: "DEFENDER_RIGHT", label: "Defensor direito", slotType: "OUTFIELD", x: 78, y: 69, sortOrder: 3 },
        { code: "MIDFIELDER_LEFT", label: "Meia esquerdo", slotType: "OUTFIELD", x: 19, y: 45, sortOrder: 4 },
        { code: "MIDFIELDER_CENTER", label: "Meia central", slotType: "OUTFIELD", x: 50, y: 49, sortOrder: 5 },
        { code: "MIDFIELDER_RIGHT", label: "Meia direito", slotType: "OUTFIELD", x: 81, y: 45, sortOrder: 6 },
        { code: "FORWARD_LEFT", label: "Atacante esquerdo", slotType: "OUTFIELD", x: 34, y: 18, sortOrder: 7 },
        { code: "FORWARD_RIGHT", label: "Atacante direito", slotType: "OUTFIELD", x: 66, y: 18, sortOrder: 8 },
      ];

  const formationSlots = match.formationTemplate?.slots.length
    ? match.formationTemplate.slots.map((slot) => ({
        code: slot.code,
        label: slot.label,
        slotType: slot.slotType,
        x: slot.x,
        y: slot.y,
        sortOrder: slot.sortOrder,
      }))
    : legacySlots;

  const configuredGoalkeepers =
    match.starterGoalkeeperCount ?? 1;

  const configuredOutfield =
    match.starterOutfieldCount ??
    Math.max(0, formationSlots.length - configuredGoalkeepers);

  const configuredStarters =
    configuredGoalkeepers + configuredOutfield;

  const configuredReserves =
    match.reserveCount ??
    Math.max(0, match.callUpLimit - configuredStarters);

  const squadLimit =
    match.starterGoalkeeperCount != null &&
    match.starterOutfieldCount != null &&
    match.reserveCount != null
      ? configuredStarters + configuredReserves
      : match.callUpLimit;

  const formationName =
    match.formationTemplate?.name ||
    match.formation ||
    (isFutsal ? "1-2-1" : "3-3-2");

  const requiredSlots = formationSlots.map((slot) => slot.code);
  const usedSlots = new Set(lineupAthletes.map((item) => item.slot));
  const startersReady = requiredSlots.every((slot) => usedSlots.has(slot));
  const artworkComplete = match.callUps.length === squadLimit && startersReady;

  const defaultRule = await prisma.competitionCallUpRule.findFirst({
    where: {
      organizationId: user.organizationId,
      categoryId: match.categoryId,
      competitionName: match.competition,
      sport: match.sport,
      active: true,
    },
    include: {
      defaultFormation: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const formGoalkeepers =
    match.starterGoalkeeperCount ??
    defaultRule?.goalkeeperStarterCount ??
    configuredGoalkeepers;

  const formOutfield =
    match.starterOutfieldCount ??
    defaultRule?.outfieldStarterCount ??
    configuredOutfield;

  const formReserves =
    match.reserveCount ??
    defaultRule?.reserveCount ??
    configuredReserves;

  const formFormation =
    match.formationTemplate?.name ||
    match.formation ||
    defaultRule?.defaultFormation?.name ||
    formationName;

  const orgName =
    user.organization?.publicName || user.organization?.name || "11UP";
  const location = match.location || "Local a definir";
  const requestHeaders = await headers();
  const requestHost =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host");
  const requestProtocol = requestHeaders.get("x-forwarded-proto") || "https";
  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (requestHost ? `${requestProtocol}://${requestHost}` : "")
  ).replace(/\/$/, "");
  const calendarUrl = googleCalendarUrl({
    title: `${match.category.name} × ${match.opponent}`,
    start: match.startsAt,
    location: match.location,
    details: `Convocação • ${match.competition || "Jogo"} • ${orgName}`,
  });
  const baseMessage = (name: string, token: string | null) => {
    const confirmationUrl =
      token && appBaseUrl
        ? `${appBaseUrl}/confirmar-convocacao/${token}`
        : null;
    const ending =
      match.callUpMode === "INFORMATION_ONLY"
        ? "Esta convocação é somente informativa e não exige confirmação."
        : confirmationUrl
          ? `Confirme a presença ou informe a ausência:\n${confirmationUrl}`
          : "Por favor, confirme a presença com a comissão técnica.";

    const footwear =
      match.footwearType === "SOCIETY_CLEATS"
        ? "Chuteira society"
        : match.footwearType === "FUTSAL_SHOES"
          ? "Tênis/chuteira de futsal"
          : "Chuteira de trava";
    // A comissão específica por jogo ainda será persistida no schema em uma
    // próxima etapa. Não consultar uma relação inexistente mantém a página
    // compatível com o Prisma Client gerado no deploy.
    const staff = "A definir";

    return `⚽ CONVOCAÇÃO — ${match.category.name}\n\nOlá! ${name} está convocado(a) para a próxima partida.\n\n🆚 ${match.opponent}\n📅 ${fmt(match.startsAt)}\n⏰ Chegada: ${match.presentationTime || "A definir"}\n📍 ${location}\n🏆 ${match.competition || "Jogo"}\n👕 ${match.arrivalAttire === "TRAINING_UNIFORM" ? "Chegar com uniforme de treino; troca no local" : "Chegar uniformizado para o jogo"}\n🧦 ${match.sockRequirement || "Meião oficial"}\n🛡️ ${match.shinGuardsRequired ? "Caneleira obrigatória" : "Caneleira opcional"}\n👟 ${footwear}\n👥 Comissão: ${staff}\n${match.equipmentNotes ? `📌 ${match.equipmentNotes}\n` : ""}\n${ending}\n\n${orgName}`;
  };

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
          <span className="status status-informed">
            {match.callUpMode === "INFORMATION_ONLY"
              ? "Somente informativa"
              : "Confirmação obrigatória"}
          </span>
          {match.callUpMode === "CONFIRMATION_REQUIRED" ? (
            <small className="help">
              As respostas de presença são acompanhadas separadamente e não
              bloqueiam a lista nem a arte da convocação.
            </small>
          ) : null}
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
              title={`Adicione ${squadLimit} atletas e complete as posições titulares`}
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
      <section className="card match-operation-summary">
        <div>
          <span className="help">Horário do jogo</span>
          <strong>{fmt(match.startsAt)}</strong>
        </div>
        <div>
          <span className="help">Chegada</span>
          <strong>{match.presentationTime || "A definir"}</strong>
        </div>
        <div>
          <span className="help">Uniforme</span>
          <strong>
            {match.arrivalAttire === "TRAINING_UNIFORM"
              ? "Treino — troca no local"
              : "Jogo — já uniformizado"}
          </strong>
          <small>{match.uniform || "Padrão a definir"}</small>
        </div>
        <div>
          <span className="help">Equipamentos</span>
          <strong>{match.sockRequirement || "Meião oficial"}</strong>
          <small>
            {match.shinGuardsRequired
              ? "Caneleira obrigatória"
              : "Caneleira opcional"}
          </small>
        </div>
        <div>
          <span className="help">Comissão presente</span>
          <strong>A definir</strong>
        </div>
      </section>

      {canManage ? (
        <CallUpConfigurationForm
          matchId={match.id}
          competitionLabel={match.competition}
          categoryName={match.category.name}
          initialGoalkeepers={formGoalkeepers}
          initialOutfield={formOutfield}
          initialReserves={formReserves}
          initialFormation={formFormation}
          currentCallUps={match.callUps.length}
          isActive={
            match.starterOutfieldCount != null &&
            match.starterGoalkeeperCount != null &&
            match.reserveCount != null
          }
          defaultRuleSummary={defaultRule
            ? `${defaultRule.goalkeeperStarterCount + defaultRule.outfieldStarterCount} titulares • ${defaultRule.reserveCount} reservas${defaultRule.defaultFormation ? ` • formação ${defaultRule.defaultFormation.name}` : ""}`
            : null}
        />
      ) : (
        <section
          className="card"
          style={{
            marginTop: 16,
            border: "1px solid rgba(157, 219, 22, .22)",
          }}
        >
          <span className="page-eyebrow">REGRA DA CONVOCAÇÃO</span>
          <h2>Configuração de titulares e reservas</h2>

          <div className="stack" style={{ marginTop: 14 }}>
            <div>
              <span className="help">Titulares</span>
              <strong>{configuredStarters}</strong>
            </div>

            <div>
              <span className="help">Reservas</span>
              <strong>{configuredReserves}</strong>
            </div>

            <div>
              <span className="help">Formação</span>
              <strong>{formationName}</strong>
            </div>
          </div>
        </section>
      )}

      <div className="two-col">
        <section className="card">
          <h2>Selecionar atletas</h2>
          <p className="muted">
            {configuredStarters} titulares • {configuredReserves} reservas •
            formação {formationName}.
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
              <strong>Nenhum atleta disponível nesta categoria.</strong>
              <p className="help" style={{ margin: "8px 0 12px" }}>
                O 11UP procura atletas vinculados diretamente à categoria
                ou por vínculo ativo no clube.
              </p>
              <Link className="btn btn-secondary btn-small" href="/atletas">
                Ver atletas
              </Link>
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
                <CallUpSubmitButton
                  className="btn-secondary"
                  pendingText="Marcando..."
                >
                  Marcar mensagens como enviadas
                </CallUpSubmitButton>
              </form>
            ) : null}
          </div>
          {!match.callUps.length ? (
            <div className="empty">Nenhum atleta convocado ainda.</div>
          ) : (
            <div className="stack">
              {match.callUps.map((callUp) => {
                const name = callUp.athlete.nickname || callUp.athlete.name;
                const message = baseMessage(name, callUp.responseToken);
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
                            : callUp.status === "INFORMED"
                              ? "Informado"
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
                      {callUp.respondedAt ? (
                        <span>Resposta: {fmt(callUp.respondedAt)}</span>
                      ) : null}
                      {callUp.responseByName ? (
                        <span>Respondido por: {callUp.responseByName}</span>
                      ) : null}
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
                          {match.callUpMode === "CONFIRMATION_REQUIRED" ? (
                            <>
                              <form action={updateCallUpStatus}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={callUp.id}
                                />
                                <input
                                  type="hidden"
                                  name="status"
                                  value="CONFIRMED"
                                />
                                <CallUpSubmitButton
                                  className="btn-secondary btn-small"
                                  pendingText="Confirmando..."
                                >
                                  Confirmar
                                </CallUpSubmitButton>
                              </form>
                              <form action={updateCallUpStatus}>
                                <input
                                  type="hidden"
                                  name="id"
                                  value={callUp.id}
                                />
                                <input
                                  type="hidden"
                                  name="status"
                                  value="DECLINED"
                                />
                                <CallUpSubmitButton
                                  className="btn-danger btn-small"
                                  pendingText="Salvando..."
                                >
                                  Não poderá
                                </CallUpSubmitButton>
                              </form>
                            </>
                          ) : null}
                          <form action={deleteCallUp}>
                            <input type="hidden" name="id" value={callUp.id} />
                            <CallUpSubmitButton
                              className="btn-secondary btn-small"
                              pendingText="Removendo..."
                            >
                              Remover
                            </CallUpSubmitButton>
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
          formationName={formationName}
          starterCount={configuredStarters}
          reserveCount={configuredReserves}
          slots={formationSlots}
        />
      ) : null}
    </main>
  );
}
