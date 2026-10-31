import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Plus,
  Pencil,
  ShieldCheck,
  Trash2,
  Trophy,
} from "lucide-react";

import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createPlayerDiaryEntry,
  deletePlayerDiaryEntry,
  deletePlayerHistoryPeriod,
  savePlayerHistoryPeriod,
} from "../actions";
import styles from "./Performance.module.css";

type SearchParams = { player?: string };

function sportLabel(sport: "FOOTBALL" | "FUTSAL" | "BOTH") {
  if (sport === "FUTSAL") return "Futsal";
  if (sport === "BOTH") return "Campo e futsal";
  return "Futebol de campo";
}

function diaryTypeLabel(type: "MATCH" | "TOURNAMENT" | "ACHIEVEMENT") {
  if (type === "TOURNAMENT") return "Torneio";
  if (type === "ACHIEVEMENT") return "Conquista";
  return "Jogo";
}

function dateLabel(value: Date) {
  return value.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function reportFrequency(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  const value = (snapshot as Record<string, unknown>).frequencyPercentage;
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% de presença`
    : null;
}

export default async function PlayerPerformancePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") redirect("/dashboard");

  const query = await searchParams;
  const guardian = await prisma.guardianProfile.findUnique({
    where: { userId: user.id },
    include: {
      players: {
        orderBy: { createdAt: "asc" },
        include: {
          athleteLinks: {
            where: { active: true, verified: true },
            select: { athleteId: true },
          },
        },
      },
    },
  });

  const players = guardian?.players || [];
  const selected = players.find((player) => player.id === query.player) || players[0];

  if (!selected) {
    redirect("/responsavel/pagina?new=1");
  }

  const athleteIds = selected.athleteLinks.map((link) => link.athleteId);

  const [diaryEntries, historyPeriods, officialStats, reports] = await Promise.all([
    prisma.playerDiaryEntry.findMany({
      where: { playerId: selected.id },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
      take: 30,
    }),
    prisma.playerHistoryPeriod.findMany({
      where: { playerId: selected.id },
      orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    }),
    athleteIds.length
      ? prisma.matchAthleteStat.findMany({
          where: {
            athleteId: { in: athleteIds },
            match: {
              status: "FINISHED",
              matchSheetStatus: "FINALIZED",
            },
          },
          include: {
            match: {
              select: {
                opponent: true,
                competition: true,
                startsAt: true,
                sport: true,
                goalsFor: true,
                goalsAgainst: true,
                organization: { select: { publicName: true, name: true } },
              },
            },
          },
          orderBy: { match: { startsAt: "desc" } },
          take: 50,
        })
      : Promise.resolve([]),
    athleteIds.length
      ? prisma.monthlyAthleteReport.findMany({
          where: {
            athleteId: { in: athleteIds },
            status: "SENT",
          },
          include: {
            organization: { select: { publicName: true, name: true } },
          },
          orderBy: { sentAt: "desc" },
          take: 12,
        })
      : Promise.resolve([]),
  ]);

  const officialTotals = officialStats.reduce(
    (totals, stat) => ({
      matches: totals.matches + (['ABSENT', 'NOT_RELATED', 'INJURED', 'SUSPENDED'].includes(stat.participation) ? 0 : 1),
      goals: totals.goals + stat.goals,
      assists: totals.assists + stat.assists,
      minutes: totals.minutes + (stat.minutesPlayed || 0),
    }),
    { matches: 0, goals: 0, assists: 0, minutes: 0 },
  );
  const diaryTotals = diaryEntries.reduce(
    (totals, entry) => ({
      matches: totals.matches + (entry.entryType === "MATCH" ? 1 : 0),
      goals: totals.goals + entry.goals,
      assists: totals.assists + entry.assists,
    }),
    { matches: 0, goals: 0, assists: 0 },
  );
  const historyTotals = historyPeriods.reduce(
    (totals, item) => ({
      matches: totals.matches + item.matches,
      goals: totals.goals + item.goals,
      assists: totals.assists + item.assists,
    }),
    { matches: 0, goals: 0, assists: 0 },
  );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/responsavel" className={styles.brand}>
          11<span>UP</span> <b>PLAYER</b>
        </Link>
        <Link href={`/responsavel?player=${selected.id}`} className={styles.backLink}>
          Voltar ao início
        </Link>
      </header>

      <div className={styles.container}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>DESEMPENHO</p>
            <h1>Trajetória de {selected.nickname || selected.name}</h1>
            <p>Dados oficiais do clube e registros particulares, sempre identificados pela sua origem.</p>
          </div>
          {players.length > 1 ? (
            <nav className={styles.playerSwitch} aria-label="Trocar atleta">
              {players.map((player) => (
                <Link key={player.id} href={`/responsavel/desempenho?player=${player.id}`} className={player.id === selected.id ? styles.switchActive : ""}>
                  {player.nickname || player.name}
                </Link>
              ))}
            </nav>
          ) : null}
        </section>

        <section className={styles.notice}>
          <ShieldCheck size={20} aria-hidden="true" />
          <p><strong>Dados oficiais do clube</strong> são somente os enviados pelo Club via súmula e relatórios. O <strong>Meu Diário Esportivo</strong> é privado da família e não altera os registros do clube.</p>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <div><span className={styles.officialTag}>OFICIAL DO CLUBE</span><h2>Desempenho enviado pelo Club</h2></div>
            <ClipboardCheck size={24} aria-hidden="true" />
          </div>
          {athleteIds.length === 0 ? (
            <div className={styles.empty}>Quando houver um vínculo ativo com um clube que usa o 11UP, as súmulas finalizadas e os relatórios enviados aparecerão aqui.</div>
          ) : (
            <>
              <div className={styles.kpis}>
                <article><span>Jogos</span><strong>{officialTotals.matches}</strong></article>
                <article><span>Gols</span><strong>{officialTotals.goals}</strong></article>
                <article><span>Assistências</span><strong>{officialTotals.assists}</strong></article>
                <article><span>Minutos</span><strong>{officialTotals.minutes}</strong></article>
              </div>
              <div className={styles.officialGrid}>
                <div className={styles.panel}>
                  <h3><FileText size={17} aria-hidden="true" /> Relatórios recebidos</h3>
                  {reports.length ? reports.map((report) => (
                    <article key={report.id} className={styles.reportItem}>
                      <div>
                        <strong>{report.title || "Relatório de desempenho"}</strong>
                        <span>{report.organization.publicName || report.organization.name} · {dateLabel(report.periodStart)} a {dateLabel(report.periodEnd)}</span>
                      </div>
                      <small>{reportFrequency(report.presenceSnapshot) || "Relatório enviado"}</small>
                      {report.professionalComment || report.managerComment ? <p>{report.professionalComment || report.managerComment}</p> : null}
                    </article>
                  )) : <p className={styles.muted}>O clube ainda não enviou relatórios para este atleta.</p>}
                </div>
                <div className={styles.panel}>
                  <h3><BarChart3 size={17} aria-hidden="true" /> Últimas súmulas finalizadas</h3>
                  {officialStats.length ? officialStats.slice(0, 5).map((stat) => (
                    <article key={stat.id} className={styles.matchItem}>
                      <div><strong>{stat.match.opponent}</strong><span>{stat.match.organization.publicName || stat.match.organization.name} · {sportLabel(stat.match.sport)} · {dateLabel(stat.match.startsAt)}</span></div>
                      <small>{stat.goals} G · {stat.assists} A{stat.minutesPlayed ? ` · ${stat.minutesPlayed} min` : ""}</small>
                    </article>
                  )) : <p className={styles.muted}>Não há súmulas finalizadas para mostrar.</p>}
                </div>
              </div>
            </>
          )}
        </section>

        <section className={styles.section}>
          <div className={styles.sectionTitle}>
            <div><span className={styles.personalTag}>REGISTRO PARTICULAR</span><h2>Histórico e Diário Esportivo</h2><p>Organize o passado por período e mantenha os próximos jogos no diário.</p></div>
            <Trophy size={24} aria-hidden="true" />
          </div>
          <div className={styles.kpis}>
            <article><span>Jogos no histórico</span><strong>{historyTotals.matches}</strong></article>
            <article><span>Gols no histórico</span><strong>{historyTotals.goals}</strong></article>
            <article><span>Assistências no histórico</span><strong>{historyTotals.assists}</strong></article>
            <article><span>Períodos</span><strong>{historyPeriods.length}</strong></article>
          </div>

          <p className={styles.diaryRule}>Use o histórico para 2025 e 2026. A partir de 2027, registre cada jogo no diário. Não cadastre um período consolidado e os mesmos jogos individuais ao mesmo tempo.</p>

          <details className={styles.entryForm}>
            <summary><Plus size={18} aria-hidden="true" /> Adicionar histórico</summary>
            <form action={savePlayerHistoryPeriod} className={styles.form}>
              <input type="hidden" name="playerId" value={selected.id} />
              <label>Formato<select name="periodType" defaultValue="SEASON"><option value="SEASON">Temporada completa</option><option value="SEMESTER">Semestre</option><option value="CUSTOM_PERIOD">Período personalizado</option></select></label>
              <label>Temporada<input required name="season" placeholder="Ex.: 2025" /></label>
              <label>Nome do período<input name="label" placeholder="Ex.: 1º semestre de 2026" /></label>
              <label>Início<input required type="date" name="startedAt" /></label>
              <label>Fim<input required type="date" name="endedAt" /></label>
              <label>Modalidade<select name="sport" defaultValue="FOOTBALL"><option value="FOOTBALL">Futebol de campo</option><option value="FUTSAL">Futsal</option></select></label>
              <label>Clube / equipe<input name="clubName" placeholder="Opcional" /></label>
              <label>Competição<input name="competition" placeholder="Opcional" /></label>
              <label>Jogos<input required min="0" inputMode="numeric" type="number" name="matches" defaultValue="0" /></label>
              <label>Gols<input required min="0" inputMode="numeric" type="number" name="goals" defaultValue="0" /></label>
              <label>Assistências<input required min="0" inputMode="numeric" type="number" name="assists" defaultValue="0" /></label>
              <label className={styles.fullField}>Observações<textarea name="notes" rows={2} placeholder="Torneios, artilharias ou contexto do período." /></label>
              <button type="submit">Salvar histórico</button>
            </form>
          </details>

          <div className={styles.historyList}>
            {historyPeriods.length ? historyPeriods.map((item) => (
              <details key={item.id} className={styles.historyItem}>
                <summary><div><span>{item.periodType === "SEASON" ? "TEMPORADA" : item.periodType === "SEMESTER" ? "SEMESTRE" : "PERÍODO"} · {sportLabel(item.sport)}</span><h3>{item.label}</h3><p>{dateLabel(item.startedAt)} a {dateLabel(item.endedAt)}{item.clubName ? ` · ${item.clubName}` : ""}</p></div><div className={styles.diaryStats}><strong>{item.matches} J</strong><strong>{item.goals} G</strong><strong>{item.assists} A</strong></div><Pencil size={16} aria-hidden="true" /></summary>
                <div className={styles.historyEdit}>
                  <form action={savePlayerHistoryPeriod} className={styles.form}>
                    <input type="hidden" name="playerId" value={selected.id} /><input type="hidden" name="historyPeriodId" value={item.id} />
                    <label>Formato<select name="periodType" defaultValue={item.periodType}><option value="SEASON">Temporada completa</option><option value="SEMESTER">Semestre</option><option value="CUSTOM_PERIOD">Período personalizado</option></select></label>
                    <label>Temporada<input required name="season" defaultValue={item.season} /></label><label>Nome do período<input name="label" defaultValue={item.label} /></label>
                    <label>Início<input required type="date" name="startedAt" defaultValue={item.startedAt.toISOString().slice(0, 10)} /></label><label>Fim<input required type="date" name="endedAt" defaultValue={item.endedAt.toISOString().slice(0, 10)} /></label>
                    <label>Modalidade<select name="sport" defaultValue={item.sport}><option value="FOOTBALL">Futebol de campo</option><option value="FUTSAL">Futsal</option></select></label><label>Clube / equipe<input name="clubName" defaultValue={item.clubName || ""} /></label><label>Competição<input name="competition" defaultValue={item.competition || ""} /></label>
                    <label>Jogos<input required min="0" type="number" name="matches" defaultValue={item.matches} /></label><label>Gols<input required min="0" type="number" name="goals" defaultValue={item.goals} /></label><label>Assistências<input required min="0" type="number" name="assists" defaultValue={item.assists} /></label>
                    <label className={styles.fullField}>Observações<textarea name="notes" rows={2} defaultValue={item.notes || ""} /></label><button type="submit">Salvar alterações</button>
                  </form>
                  <form action={deletePlayerHistoryPeriod}><input type="hidden" name="historyPeriodId" value={item.id} /><input type="hidden" name="playerId" value={selected.id} /><button className={styles.deleteTextButton} type="submit">Excluir histórico</button></form>
                </div>
              </details>
            )) : <div className={styles.empty}>Nenhuma temporada histórica cadastrada.</div>}
          </div>

          <div className={styles.diaryHeading}><div><span className={styles.personalTag}>JOGO A JOGO</span><h3>Diário a partir de 2027</h3><p>{diaryTotals.matches} jogos · {diaryTotals.goals} gols · {diaryTotals.assists} assistências registrados individualmente.</p></div></div>

          <details className={styles.entryForm}>
            <summary><Plus size={18} aria-hidden="true" /> Adicionar ao diário</summary>
            <form action={createPlayerDiaryEntry} className={styles.form}>
              <input type="hidden" name="playerId" value={selected.id} />
              <label>Tipo<select name="entryType" defaultValue="MATCH"><option value="MATCH">Jogo</option><option value="TOURNAMENT">Torneio</option><option value="ACHIEVEMENT">Conquista</option></select></label>
              <label>Data<input required type="date" name="occurredAt" defaultValue={new Date().toISOString().slice(0, 10)} /></label>
              <label>Modalidade<select name="sport" defaultValue="FOOTBALL"><option value="FOOTBALL">Futebol de campo</option><option value="FUTSAL">Futsal</option></select></label>
              <label>Título<input name="title" placeholder="Ex.: Jogo da rodada" /></label>
              <label>Equipe<input name="teamName" placeholder="Nome da equipe" /></label>
              <label>Adversário<input name="opponent" placeholder="Nome do adversário" /></label>
              <label>Torneio / competição<input name="competition" placeholder="Opcional" /></label>
              <label>Placar a favor<input min="0" inputMode="numeric" type="number" name="scoreFor" /></label>
              <label>Placar adversário<input min="0" inputMode="numeric" type="number" name="scoreAgainst" /></label>
              <label>Gols<input min="0" inputMode="numeric" type="number" name="goals" defaultValue="0" /></label>
              <label>Assistências<input min="0" inputMode="numeric" type="number" name="assists" defaultValue="0" /></label>
              <label>Posição<input name="position" placeholder="Opcional" /></label>
              <label>Minutos jogados<input min="0" inputMode="numeric" type="number" name="minutesPlayed" /></label>
              <label className={styles.fullField}>Observações<textarea name="notes" rows={3} placeholder="Destaques, contexto do jogo ou conquista." /></label>
              <button type="submit">Salvar registro</button>
            </form>
          </details>

          <div className={styles.diaryList}>
            {diaryEntries.length ? diaryEntries.map((entry) => (
              <article key={entry.id} className={styles.diaryItem}>
                <div className={styles.diaryDate}><CalendarDays size={15} aria-hidden="true" /> {dateLabel(entry.occurredAt)}</div>
                <div className={styles.diaryMain}><span>{diaryTypeLabel(entry.entryType)} · {sportLabel(entry.sport)}</span><h3>{entry.title}</h3><p>{[entry.teamName, entry.opponent ? `x ${entry.opponent}` : null, entry.competition].filter(Boolean).join(" · ") || "Registro pessoal"}</p>{entry.notes ? <small>{entry.notes}</small> : null}</div>
                <div className={styles.diaryStats}><strong>{entry.goals} G</strong><strong>{entry.assists} A</strong></div>
                <form action={deletePlayerDiaryEntry}><input type="hidden" name="entryId" value={entry.id} /><input type="hidden" name="playerId" value={selected.id} /><button className={styles.deleteButton} type="submit" aria-label="Excluir registro"><Trash2 size={16} aria-hidden="true" /></button></form>
              </article>
            )) : <div className={styles.empty}>Ainda não há registros no diário. Comece pelo próximo jogo ou torneio.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}

