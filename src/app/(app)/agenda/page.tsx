import Link from "next/link";

import ModuleFilterBar from "@/components/ModuleFilterBar";
import ModuleHero from "@/components/ModuleHero";
import ModuleKpiGrid from "@/components/ModuleKpiGrid";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { googleCalendarUrl } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";

type AgendaItem = {
  id: string;
  type: "TRAINING" | "MATCH";
  startsAt: Date;
  endsAt?: Date;
  title: string;
  subtitle: string;
  categoryId: string;
  categoryName: string;
  location?: string | null;
  href: string;
  callUpHref?: string;
  sheetHref?: string;
};

type AgendaFilters = {
  view?: string;
  type?: string;
  category?: string;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function eventAt(date: Date, clock: string) {
  return new Date(`${date.toISOString().slice(0, 10)}T${clock}:00`);
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

function time(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function longDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function shortMonth(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(date)
    .replace(".", "")
    .toUpperCase();
}

function nextOccurrences(
  weekday: number,
  startTime: string,
  endTime: string,
  from: Date,
  days: number,
) {
  const occurrences: { start: Date; end: Date }[] = [];
  for (let index = 0; index < days; index += 1) {
    const date = addDays(from, index);
    date.setHours(0, 0, 0, 0);
    if (date.getDay() !== weekday) continue;
    occurrences.push({
      start: eventAt(date, startTime),
      end: eventAt(date, endTime),
    });
  }
  return occurrences;
}

function agendaUrl(view: string, type: string, category: string) {
  const query = new URLSearchParams();
  if (view !== "calendar") query.set("view", view);
  if (type !== "ALL") query.set("type", type);
  if (category !== "ALL") query.set("category", category);
  const suffix = query.toString();
  return suffix ? `/agenda?${suffix}` : "/agenda";
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<AgendaFilters>;
}) {
  const user = await requireClubPermission("AGENDA_VIEW");
  const canEdit = hasClubPermission(user, "AGENDA_EDIT");
  const filters = await searchParams;
  const view = filters.view === "list" ? "list" : "calendar";
  const type = ["TRAINING", "MATCH"].includes(filters.type ?? "")
    ? filters.type!
    : "ALL";
  const categoryFilter = filters.category || "ALL";

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const horizon = addDays(from, 41);

  const [trainings, matches, categories] = await Promise.all([
    prisma.trainingSchedule.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [{ date: { gte: from, lte: horizon } }, { date: null }],
      },
      include: { category: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.match.findMany({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
        startsAt: { gte: from, lte: horizon },
      },
      include: { category: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const allItems: AgendaItem[] = [];
  trainings.forEach((training) => {
    const addTraining = (start: Date, end: Date, legacy = false) =>
      allItems.push({
        id: `training-${training.id}-${dateKey(start)}`,
        type: "TRAINING",
        startsAt: start,
        endsAt: end,
        title: `Treino ${training.category.name}`,
        subtitle: legacy
          ? "Programação recorrente antiga"
          : "Treino programado",
        categoryId: training.categoryId,
        categoryName: training.category.name,
        location: training.location,
        href: `/treinos/${training.id}`,
      });

    if (training.date) {
      addTraining(
        eventAt(training.date, training.startTime),
        eventAt(training.date, training.endTime),
      );
    } else {
      nextOccurrences(
        training.weekday,
        training.startTime,
        training.endTime,
        from,
        42,
      ).forEach((occurrence) =>
        addTraining(occurrence.start, occurrence.end, true),
      );
    }
  });

  matches.forEach((match) =>
    allItems.push({
      id: `match-${match.id}`,
      type: "MATCH",
      startsAt: match.startsAt,
      title: `${match.category.name} × ${match.opponent}`,
      subtitle: match.competition || "Jogo",
      categoryId: match.categoryId,
      categoryName: match.category.name,
      location: match.location,
      href: `/jogos/${match.id}`,
      callUpHref: `/convocacoes/${match.id}`,
      sheetHref: `/jogos/${match.id}/sumula`,
    }),
  );
  allItems.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  const items = allItems.filter(
    (item) =>
      (type === "ALL" || item.type === type) &&
      (categoryFilter === "ALL" || item.categoryId === categoryFilter),
  );
  const todayKey = dateKey(from);
  const weekEnd = addDays(from, 7);
  const todayCount = allItems.filter(
    (item) => dateKey(item.startsAt) === todayKey,
  ).length;
  const weekTrainings = allItems.filter(
    (item) => item.type === "TRAINING" && item.startsAt < weekEnd,
  ).length;
  const weekMatches = allItems.filter(
    (item) => item.type === "MATCH" && item.startsAt < weekEnd,
  ).length;

  const groups = new Map<string, AgendaItem[]>();
  items.forEach((item) => {
    const key = dateKey(item.startsAt);
    groups.set(key, [...(groups.get(key) || []), item]);
  });

  const calendarStart = new Date(from);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) =>
    addDays(calendarStart, index),
  );
  const nextItems = items.slice(0, 5);

  return (
    <>
      <ModuleHero
        eyebrow="CENTRAL OPERACIONAL"
        title="Agenda do clube"
        description={
          <p>
            Treinos, jogos e compromissos organizados em uma única visão.
          </p>
        }
        aside={
          canEdit ? (
            <div className="actions">
              <Link className="btn" href="/treinos#novo-treino">
                ＋ Novo treino
              </Link>
              <Link className="btn btn-secondary" href="/jogos#novo-jogo">
                ＋ Novo jogo
              </Link>
            </div>
          ) : (
            <span className="badge">Somente visualização</span>
          )
        }
      />

      <ModuleKpiGrid
        className="agenda-kpis"
        ariaLabel="Indicadores da Agenda"
        items={[
          {
            label: "HOJE",
            value: todayCount,
            description: "compromisso(s)",
          },
          {
            label: "PRÓXIMOS 7 DIAS",
            value: weekTrainings,
            description: "treino(s)",
          },
          {
            label: "JOGOS DA SEMANA",
            value: weekMatches,
            description: "partida(s)",
          },
          {
            label: "AGENDA VISÍVEL",
            value: items.length,
            description: "eventos filtrados",
          },
        ]}
      />

      <ModuleFilterBar
        className="agenda-toolbar card"
        formClassName="agenda-filter-form"
        ariaLabel="Filtros da Agenda"
        trailing={
          <div
            className="agenda-view-switch"
            aria-label="Visualização da agenda"
          >
            <Link
              className={view === "calendar" ? "active" : ""}
              href={agendaUrl("calendar", type, categoryFilter)}
            >
              Calendário
            </Link>
            <Link
              className={view === "list" ? "active" : ""}
              href={agendaUrl("list", type, categoryFilter)}
            >
              Lista
            </Link>
          </div>
        }
      >
        <input type="hidden" name="view" value={view} />

        <label>
          Tipo
          <select name="type" defaultValue={type}>
            <option value="ALL">Todos</option>
            <option value="TRAINING">Treinos</option>
            <option value="MATCH">Jogos</option>
          </select>
        </label>

        <label>
          Categoria
          <select name="category" defaultValue={categoryFilter}>
            <option value="ALL">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn-secondary">
          Aplicar filtros
        </button>

        {type !== "ALL" || categoryFilter !== "ALL" ? (
          <Link href={agendaUrl(view, "ALL", "ALL")}>Limpar</Link>
        ) : null}
      </ModuleFilterBar>

      <div className="agenda-premium-layout">
        <aside className="agenda-side stack">
          <section className="card agenda-mini-calendar">
            <span className="page-eyebrow">PERÍODO</span>
            <h2>
              {new Intl.DateTimeFormat("pt-BR", {
                month: "long",
                year: "numeric",
              }).format(from)}
            </h2>
            <div className="agenda-mini-week">
              <span>D</span>
              <span>S</span>
              <span>T</span>
              <span>Q</span>
              <span>Q</span>
              <span>S</span>
              <span>S</span>
            </div>
            <div className="agenda-mini-days">
              {calendarDays.slice(0, 35).map((date) => (
                <span
                  key={dateKey(date)}
                  className={`${dateKey(date) === todayKey ? "today" : ""} ${groups.has(dateKey(date)) ? "has-event" : ""}`}
                >
                  {date.getDate()}
                </span>
              ))}
            </div>
          </section>
          <section className="card agenda-next-card">
            <span className="page-eyebrow">A SEGUIR</span>
            <h2>Próximos eventos</h2>
            {nextItems.length ? (
              nextItems.map((item) => (
                <Link href={item.href} key={`next-${item.id}`}>
                  <i
                    className={`agenda-dot agenda-dot-${item.type.toLowerCase()}`}
                  />
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {time(item.startsAt)} •{" "}
                      {item.location || "Local a definir"}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty">Nenhum evento encontrado.</div>
            )}
          </section>
        </aside>

        <main className="card agenda-main-card">
          {view === "calendar" ? (
            <div className="agenda-month-grid">
              {calendarDays.map((date) => {
                const key = dateKey(date);
                const dayItems = groups.get(key) || [];
                return (
                  <section
                    key={key}
                    className={`agenda-month-day ${key === todayKey ? "today" : ""}`}
                  >
                    <header>
                      <span>
                        {new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
                          .format(date)
                          .replace(".", "")}
                      </span>
                      <strong>{date.getDate()}</strong>
                    </header>
                    <div>
                      {dayItems.slice(0, 3).map((item) => (
                        <Link
                          title={item.title}
                          className={`agenda-calendar-event agenda-calendar-${item.type.toLowerCase()}`}
                          href={item.href}
                          key={item.id}
                        >
                          <b>{time(item.startsAt)}</b>
                          <span>{item.title}</span>
                        </Link>
                      ))}
                      {dayItems.length > 3 ? (
                        <small>+ {dayItems.length - 3} evento(s)</small>
                      ) : null}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="agenda-compact-list">
              {[...groups.entries()].map(([key, dayItems]) => {
                const date = new Date(`${key}T12:00:00`);
                return (
                  <section className="agenda-list-day" key={key}>
                    <div className="agenda-list-date">
                      <strong>{date.getDate()}</strong>
                      <span>{shortMonth(date)}</span>
                      <small>
                        {new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
                          .format(date)
                          .replace(".", "")}
                      </small>
                    </div>
                    <div className="agenda-list-events">
                      <h2>{longDate(date)}</h2>
                      {dayItems.map((item) => {
                        const calendarUrl = googleCalendarUrl({
                          title: item.title,
                          start: item.startsAt,
                          end: item.endsAt,
                          location: item.location,
                          details: item.subtitle,
                        });
                        return (
                          <article
                            className={`agenda-compact-event agenda-${item.type.toLowerCase()}`}
                            key={item.id}
                          >
                            <time>{time(item.startsAt)}</time>
                            <i />
                            <div className="agenda-compact-copy">
                              <small>
                                {item.type === "TRAINING" ? "TREINO" : "JOGO"} •{" "}
                                {item.categoryName}
                              </small>
                              <strong>{item.title}</strong>
                              <span>
                                {item.subtitle} •{" "}
                                {item.location || "Local a definir"}
                              </span>
                            </div>
                            <div className="agenda-compact-actions">
                              <Link href={item.href}>Abrir</Link>
                              {item.callUpHref ? (
                                <Link href={item.callUpHref}>Convocação</Link>
                              ) : null}
                              {item.sheetHref ? (
                                <Link href={item.sheetHref}>Súmula</Link>
                              ) : null}
                              <a
                                href={calendarUrl}
                                target="_blank"
                                rel="noreferrer"
                              >
                                Google
                              </a>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
          {!items.length ? (
            <div className="empty">
              Nenhuma atividade encontrada para os filtros selecionados.
            </div>
          ) : null}
        </main>
      </div>
    </>
  );
}
