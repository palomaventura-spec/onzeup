import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import styles from "./Agenda.module.css";
import JustificarFaltaForm from "./JustificarFaltaForm";

export const dynamic = "force-dynamic";

type AgendaItem = {
  key: string;
  at: Date;
  kind: "TREINO" | "JOGO";
  title: string;
  club: string;
  category: string;
  location: string | null;
  sport: string;
  status: string;
  details?: string[];
  callUp?: string;
  scheduleId?: string;
};

// O Club atualmente registra horários de partidas no formato UTC-as-wallclock.
// O Player deve exibir a mesma hora oficial que o Club, sem subtrair 3 horas.
function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" }).format(value);
}
function formatHour(value: Date) {
  return `${String(value.getUTCHours()).padStart(2, "0")}:${String(value.getUTCMinutes()).padStart(2, "0")}`;
}
function clubDay(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || "0");
  return new Date(Date.UTC(get("year"), get("month") - 1, get("day") + offsetDays));
}

// TrainingSchedule.date é gravado ao meio-dia local pelo Club.
// Convertê-lo para o calendário de São Paulo preserva o dia oficial do treino.
function scheduleDateTime(date: Date, hhmm: string): Date | null {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return null;
  const [hour, minute] = hhmm.split(":").map(Number);
  if (hour > 23 || minute > 59) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return new Date(Date.UTC(part("year"), part("month") - 1, part("day"), hour, minute));
}

export default async function GuardianAgendaPage({ searchParams }: {
  searchParams: Promise<{ player?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") redirect("/dashboard");
  const query = await searchParams;
  const guardian = await prisma.guardianProfile.findUnique({
    where: { userId: user.id },
    include: { players: { select: { id: true, name: true, nickname: true }, orderBy: { createdAt: "asc" } } },
  });
  const players = guardian?.players || [];
  const selected = players.find((player) => player.id === query.player) || players[0] || null;
  const start = clubDay();
  const end = clubDay(8);
  let items: AgendaItem[] = [];
  let hasApprovedPlayerLink = false;
  let hasActiveCategory = false;

  if (selected) {
    // A seleção do Player vem exclusivamente do responsável autenticado.
    const links = await prisma.playerAthleteLink.findMany({
      where: { playerId: selected.id, verified: true, active: true },
      select: { athleteId: true },
    });
    const athleteIds = [...new Set(links.map((link) => link.athleteId))];
    hasApprovedPlayerLink = athleteIds.length > 0;
    if (athleteIds.length) {
      // O vínculo Player–Club é a autorização de acesso. A categoria esportiva
      // pode vir de AthleteMembership ou da categoria principal do Athlete.
      const now = new Date();
      const [athletes, memberships] = await Promise.all([
        prisma.athlete.findMany({
          where: { id: { in: athleteIds }, active: true },
          select: { id: true, organizationId: true, categoryId: true },
        }),
        prisma.athleteMembership.findMany({
          where: {
            athleteId: { in: athleteIds },
            status: "ACTIVE",
            OR: [{ endedAt: null }, { endedAt: { gte: now } }],
            AND: [{ OR: [{ startedAt: null }, { startedAt: { lte: now } }] }],
          },
          select: { athleteId: true, organizationId: true, categoryId: true, sport: true },
        }),
      ]);
      const authorizedAthletes = new Map(athletes.map((athlete) => [athlete.id, athlete]));
      // Não confiamos em um vínculo de categoria que aponte para outra organização.
      const allowed = memberships.filter((membership) => {
        const athlete = authorizedAthletes.get(membership.athleteId);
        return athlete && athlete.organizationId === membership.organizationId && membership.categoryId;
      }).map((membership) => ({
        organizationId: membership.organizationId,
        categoryId: membership.categoryId!,
        sport: String(membership.sport),
      }));
      for (const athlete of athletes) {
        // Fallback apenas para a categoria principal do mesmo atleta e clube,
        // quando não há categoria utilizável no vínculo esportivo ativo.
        const hasMembershipCategory = memberships.some((membership) =>
          membership.athleteId === athlete.id &&
          membership.organizationId === athlete.organizationId &&
          membership.categoryId !== null
        );
        if (athlete.categoryId && !hasMembershipCategory) {
          allowed.push({ organizationId: athlete.organizationId, categoryId: athlete.categoryId, sport: "BOTH" });
        }
      }
      hasActiveCategory = allowed.length > 0;
      if (allowed.length) {
        const keys = allowed.map((m) => ({ organizationId: m.organizationId, categoryId: m.categoryId! }));
        const [trainings, schedules, matches] = await Promise.all([
          prisma.trainingSession.findMany({
            where: { OR: keys, startsAt: { gte: start, lt: end } },
            select: { id: true, scheduleId: true, organizationId: true, categoryId: true, sport: true, startsAt: true,
              location: true, trainingType: true, status: true,
              organization: { select: { name: true } }, category: { select: { name: true } } },
            orderBy: { startsAt: "asc" }, take: 200,
          }),
          prisma.trainingSchedule.findMany({
            // Margem de 1 dia: date foi armazenada como meio-dia em fuso local.
            // O filtro exato é aplicado depois sobre o dia/hora oficial.
            where: { OR: keys, date: { gte: new Date(start.getTime() - 86_400_000), lt: new Date(end.getTime() + 86_400_000) } },
            select: { id: true, organizationId: true, categoryId: true, sport: true,
              date: true, startTime: true, endTime: true, location: true, trainingType: true,
              organization: { select: { name: true } }, category: { select: { name: true } } },
            orderBy: { date: "asc" }, take: 200,
          }),
          prisma.match.findMany({
            where: { OR: keys, startsAt: { gte: start, lt: end } },
            select: { id: true, organizationId: true, categoryId: true, sport: true, startsAt: true,
              location: true, opponent: true, competition: true, status: true,
              presentationTime: true, uniform: true, equipmentNotes: true,
              organization: { select: { name: true } }, category: { select: { name: true } },
              callUps: { where: { athleteId: { in: athleteIds } }, select: { athleteId: true, status: true } } },
            orderBy: { startsAt: "asc" }, take: 200,
          }),
        ]);
        const applies = (org: string, cat: string, sport: string) =>
          allowed.some((membership) => membership.organizationId === org && membership.categoryId === cat &&
            (String(membership.sport) === "BOTH" || sport === "BOTH" || String(membership.sport) === sport));
        const trainingItems: AgendaItem[] = trainings.filter((session) =>
          applies(session.organizationId, session.categoryId, String(session.sport))
        ).map((session) => ({ key: `treino-${session.id}`, at: session.startsAt, kind: "TREINO",
          title: session.trainingType || "Treino da equipe", club: session.organization.name,
          category: session.category.name, location: session.location, sport: String(session.sport),
          status: String(session.status), scheduleId: session.scheduleId ?? undefined }));
        // Treinos programados aparecem mesmo antes de existir sessão de presença/avaliação.
        // Se a sessão correspondente já existir, ela é a fonte prioritária.
        const sessionScheduleIds = new Set(trainings.map((session) => session.scheduleId).filter(Boolean));
        const scheduledItems: AgendaItem[] = schedules.flatMap((schedule) => {
          if (!schedule.date || sessionScheduleIds.has(schedule.id) ||
              !applies(schedule.organizationId, schedule.categoryId, String(schedule.sport))) return [];
          const at = scheduleDateTime(schedule.date, schedule.startTime);
          if (!at || at < start || at >= end) return [];
          return [{ key: `programacao-${schedule.id}`, at, kind: "TREINO" as const,
            title: schedule.trainingType || "Treino da equipe", club: schedule.organization.name,
            category: schedule.category.name, location: schedule.location, sport: String(schedule.sport),
            status: "PROGRAMADO", scheduleId: schedule.id, details: [`Horário: ${schedule.startTime} – ${schedule.endTime}`] }];
        });
        const matchItems: AgendaItem[] = matches.filter((match) =>
          applies(match.organizationId, match.categoryId, String(match.sport))
        ).map((match) => ({ key: `jogo-${match.id}`, at: match.startsAt, kind: "JOGO",
          title: `${match.organization.name} × ${match.opponent}`, club: match.organization.name,
          category: match.category.name, location: match.location, sport: String(match.sport),
          status: String(match.status),
          callUp: match.callUps.length ? match.callUps.map((callUp) => String(callUp.status)).join(" / ") : "SEM CONVOCAÇÃO INDIVIDUAL",
          details: [match.competition ? `Competição: ${match.competition}` : "",
            match.presentationTime ? `Apresentação: ${match.presentationTime}` : "",
            match.uniform ? `Uniforme: ${match.uniform}` : "",
            match.equipmentNotes ? `Orientações: ${match.equipmentNotes}` : ""].filter(Boolean),
        }));
        items = [...trainingItems, ...scheduledItems, ...matchItems].sort((a, b) => a.at.getTime() - b.at.getTime());
      }
    }
  }
  const today = items.filter((item) => item.at >= start && item.at < clubDay(1));
  const upcoming = items.filter((item) => item.at >= clubDay(1));

  function cards(list: AgendaItem[]) {
    return list.map((item) => (
      <article className={styles.event} key={item.key}>
        <div className={styles.eventTop}>
          <span className={styles.kind}>{item.kind === "JOGO" ? "⚽ Jogo" : "🏃 Treino"}</span>
          <span className={styles.when}>{formatDate(item.at)} · {formatHour(item.at)}</span>
        </div>
        <h3>{item.title}</h3>
        <p>{item.club} · {item.category} · {item.sport === "FOOTBALL" ? "Futebol" : item.sport === "FUTSAL" ? "Futsal" : "Multimodalidade"}</p>
        {item.location ? <p>Local: {item.location}</p> : null}
        <p>Situação: {(item.status === "SCHEDULED" ? "PROGRAMADO" : item.status.replaceAll("_", " "))}</p>
        {item.kind === "JOGO" ? <p className={styles.callUp}>Convocação: {item.callUp === "SEM CONVOCAÇÃO INDIVIDUAL" ? "Ainda não consta convocação individual" : item.callUp?.replaceAll("_", " ")}</p> : null}
        {item.details?.map((detail) => <p key={detail}>{detail}</p>)}
        {item.kind === "TREINO" && item.scheduleId && selected ? (
          <JustificarFaltaForm scheduleId={item.scheduleId} playerId={selected.id} />
        ) : null}
      </article>
    ));
  }

  return (
    <main className={styles.portal}>
      <header className={styles.nav}>
        <Link href="/responsavel" className={styles.brand}>11<span>UP</span> PLAYER</Link>
        <Link href={selected ? `/responsavel?player=${selected.id}` : "/responsavel"} className={styles.back}>← Voltar ao painel</Link>
      </header>
      <div className={styles.content}>
        <span className={styles.eyebrow}>ÁREA PRIVADA DO RESPONSÁVEL</span>
        <h1>Minha Agenda Esportiva</h1>
        <p className={styles.intro}>Treinos, jogos e convocações informados pelo clube para os próximos oito dias.</p>
        {players.length > 1 ? <nav className={styles.athletes} aria-label="Selecionar atleta">
          {players.map((player) => <Link key={player.id} className={player.id === selected?.id ? styles.activeAthlete : styles.athlete} href={`/responsavel/agenda?player=${player.id}`}>{player.nickname || player.name}</Link>)}
        </nav> : null}
        {selected ? <p className={styles.selected}>Atleta: <strong>{selected.nickname || selected.name}</strong></p> : null}
        {!selected ? <div className={styles.empty}>Cadastre um atleta para visualizar sua agenda esportiva.</div> :
          !hasApprovedPlayerLink ? <div className={styles.empty}>Ainda não há vínculo Player–Club ativo e aprovado para este atleta.</div> :
          !hasActiveCategory ? <div className={styles.empty}>O vínculo com o clube está aprovado, mas ainda não encontramos uma categoria esportiva ativa para apresentar os compromissos.</div> :
          <>
            <section className={styles.section}><h2>Hoje</h2>{today.length ? <div className={styles.list}>{cards(today)}</div> : <p className={styles.empty}>Nenhum compromisso para hoje.</p>}</section>
            <section className={styles.section}><h2>Próximos 7 dias</h2>{upcoming.length ? <div className={styles.list}>{cards(upcoming)}</div> : <p className={styles.empty}>Nenhum compromisso cadastrado para os próximos dias.</p>}</section>
          </>}
        <p className={styles.note}>A consulta da agenda está ativa. O envio de justificativas será habilitado após a conclusão da API segura e da aprovação pelo Club.</p>
      </div>
    </main>
  );
}
