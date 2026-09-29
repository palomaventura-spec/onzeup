import Link from "next/link";

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
  month?: string;
};

type IconName =
  | "calendar"
  | "clock"
  | "match"
  | "eye"
  | "plus"
  | "chevron-left"
  | "chevron-right"
  | "grid"
  | "list";

function Icon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    );
  }

  if (name === "match") {
    return (
      <svg {...common}>
        <path d="M8 4h8l2 4-2 4H8L6 8l2-4Z" />
        <path d="m9 12-2 8M15 12l2 8M6 20h12" />
      </svg>
    );
  }

  if (name === "eye") {
    return (
      <svg {...common}>
        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
        <circle cx="12" cy="12" r="2.5" />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (name === "chevron-left") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === "chevron-right") {
    return (
      <svg {...common}>
        <path d="m9 18 6-6-6-6" />
      </svg>
    );
  }

  if (name === "list") {
    return (
      <svg {...common}>
        <path d="M8 6h13M8 12h13M8 18h13" />
        <path d="M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

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

function addMonths(date: Date, amount: number) {
  const result = new Date(date.getFullYear(), date.getMonth() + amount, 1);
  result.setHours(0, 0, 0, 0);
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

function monthLabel(date: Date) {
  const label = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function parseMonth(value: string | undefined, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }

  const [year, month] = value.split("-").map(Number);
  if (month < 1 || month > 12) {
    return new Date(fallback.getFullYear(), fallback.getMonth(), 1);
  }

  const parsed = new Date(year, month - 1, 1);
  parsed.setHours(0, 0, 0, 0);
  return parsed;
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

function agendaUrl(
  view: string,
  type: string,
  category: string,
  month?: string,
) {
  const query = new URLSearchParams();

  if (view !== "calendar") query.set("view", view);
  if (type !== "ALL") query.set("type", type);
  if (category !== "ALL") query.set("category", category);
  if (month) query.set("month", month);

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visibleMonth = parseMonth(filters.month, today);
  const visibleMonthKey = monthKey(visibleMonth);
  const currentMonthKey = monthKey(today);

  const firstOfMonth = new Date(
    visibleMonth.getFullYear(),
    visibleMonth.getMonth(),
    1,
  );
  const calendarStart = addDays(firstOfMonth, -firstOfMonth.getDay());
  const calendarEnd = addDays(calendarStart, 41);
  const todayWeekEnd = addDays(today, 7);

  const queryStart =
    calendarStart.getTime() < today.getTime() ? calendarStart : today;
  const queryEnd =
    calendarEnd.getTime() > todayWeekEnd.getTime()
      ? calendarEnd
      : todayWeekEnd;

  const horizonDays =
    Math.ceil((queryEnd.getTime() - queryStart.getTime()) / 86400000) + 1;

  const [trainings, matches, categories] = await Promise.all([
    prisma.trainingSchedule.findMany({
      where: {
        organizationId: user.organizationId,
        OR: [
          { date: { gte: queryStart, lte: queryEnd } },
          { date: null },
        ],
      },
      include: { category: true },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.match.findMany({
      where: {
        organizationId: user.organizationId,
        status: "SCHEDULED",
        startsAt: { gte: queryStart, lte: queryEnd },
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
        queryStart,
        horizonDays,
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

  const visibleItems = allItems.filter(
    (item) =>
      item.startsAt >= calendarStart &&
      item.startsAt <= addDays(calendarEnd, 1) &&
      (type === "ALL" || item.type === type) &&
      (categoryFilter === "ALL" || item.categoryId === categoryFilter),
  );

  const todayKey = dateKey(today);

  const todayCount = allItems.filter(
    (item) => dateKey(item.startsAt) === todayKey,
  ).length;

  const weekTrainings = allItems.filter(
    (item) =>
      item.type === "TRAINING" &&
      item.startsAt >= today &&
      item.startsAt < todayWeekEnd,
  ).length;

  const weekMatches = allItems.filter(
    (item) =>
      item.type === "MATCH" &&
      item.startsAt >= today &&
      item.startsAt < todayWeekEnd,
  ).length;

  const groups = new Map<string, AgendaItem[]>();

  visibleItems.forEach((item) => {
    const key = dateKey(item.startsAt);
    groups.set(key, [...(groups.get(key) || []), item]);
  });

  const calendarDays = Array.from({ length: 42 }, (_, index) =>
    addDays(calendarStart, index),
  );

  const filteredUpcoming = allItems.filter(
    (item) =>
      item.startsAt >= today &&
      (type === "ALL" || item.type === type) &&
      (categoryFilter === "ALL" || item.categoryId === categoryFilter),
  );

  const nextItems = filteredUpcoming.slice(0, 4);

  const previousMonth = addMonths(visibleMonth, -1);
  const nextMonth = addMonths(visibleMonth, 1);

  return (
    <div className="agenda-v4">
      <section className="agenda-v4-hero">
        <div className="agenda-v4-hero-copy">
          <span className="agenda-v4-eyebrow">CENTRAL OPERACIONAL</span>
          <div className="agenda-v4-title-line">
            <span className="agenda-v4-title-icon">
              <Icon name="calendar" />
            </span>
            <div>
              <h1>Agenda do clube</h1>
              <p>Treinos, jogos e compromissos organizados em uma única visão.</p>
            </div>
          </div>
        </div>

        <div className="agenda-v4-hero-actions">
          {canEdit ? (
            <>
              <Link className="agenda-v4-primary-button" href="/treinos#novo-treino">
                <Icon name="plus" />
                Novo treino
              </Link>
              <Link className="agenda-v4-secondary-button" href="/jogos#novo-jogo">
                <Icon name="plus" />
                Novo jogo
              </Link>
              <Link
                className="agenda-v4-secondary-button"
                href="/agenda/repetir"
              >
                <span aria-hidden="true">↻</span>
                Repetir programação
              </Link>
            </>
          ) : (
            <span className="agenda-v4-readonly">Somente visualização</span>
          )}
        </div>
      </section>

      <section className="agenda-v4-kpis" aria-label="Indicadores da Agenda">
        <article>
          <span className="agenda-v4-kpi-icon">
            <Icon name="calendar" />
          </span>
          <div>
            <small>HOJE</small>
            <strong>{todayCount}</strong>
            <span>compromisso(s)</span>
          </div>
        </article>

        <article>
          <span className="agenda-v4-kpi-icon">
            <Icon name="clock" />
          </span>
          <div>
            <small>PRÓXIMOS 7 DIAS</small>
            <strong>{weekTrainings}</strong>
            <span>treino(s)</span>
          </div>
        </article>

        <article>
          <span className="agenda-v4-kpi-icon">
            <Icon name="match" />
          </span>
          <div>
            <small>JOGOS DA SEMANA</small>
            <strong>{weekMatches}</strong>
            <span>partida(s)</span>
          </div>
        </article>

        <article>
          <span className="agenda-v4-kpi-icon">
            <Icon name="eye" />
          </span>
          <div>
            <small>AGENDA VISÍVEL</small>
            <strong>{visibleItems.length}</strong>
            <span>eventos filtrados</span>
          </div>
        </article>
      </section>

      <section className="agenda-v4-toolbar">
        <form method="get" className="agenda-v4-filter-form">
          <input type="hidden" name="view" value={view} />
          {visibleMonthKey !== currentMonthKey ? (
            <input type="hidden" name="month" value={visibleMonthKey} />
          ) : null}

          <label>
            <span>Tipo</span>
            <select name="type" defaultValue={type}>
              <option value="ALL">Todos</option>
              <option value="TRAINING">Treinos</option>
              <option value="MATCH">Jogos</option>
            </select>
          </label>

          <label>
            <span>Categoria</span>
            <select name="category" defaultValue={categoryFilter}>
              <option value="ALL">Todas as categorias</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="agenda-v4-filter-button">
            Aplicar filtros
          </button>

          {type !== "ALL" || categoryFilter !== "ALL" ? (
            <Link
              className="agenda-v4-clear"
              href={agendaUrl(view, "ALL", "ALL", filters.month)}
            >
              Limpar
            </Link>
          ) : null}
        </form>

        <div className="agenda-v4-view-switch" aria-label="Visualização da agenda">
          <Link
            className={view === "calendar" ? "active" : ""}
            href={agendaUrl("calendar", type, categoryFilter, filters.month)}
          >
            <Icon name="grid" />
            Calendário
          </Link>
          <Link
            className={view === "list" ? "active" : ""}
            href={agendaUrl("list", type, categoryFilter, filters.month)}
          >
            <Icon name="list" />
            Lista
          </Link>
        </div>
      </section>

      <section className="agenda-v4-upcoming">
        <div className="agenda-v4-upcoming-heading">
          <div>
            <span className="agenda-v4-eyebrow">A SEGUIR</span>
            <h2>Próximos eventos</h2>
          </div>
          <span>{nextItems.length ? `${nextItems.length} em destaque` : "Agenda livre"}</span>
        </div>

        <div className="agenda-v4-upcoming-grid">
          {nextItems.length ? (
            nextItems.map((item) => (
              <Link href={item.href} key={`next-${item.id}`}>
                <span
                  className={`agenda-v4-event-dot ${
                    item.type === "TRAINING" ? "training" : "match"
                  }`}
                />
                <div>
                  <small>
                    {item.type === "TRAINING" ? "TREINO" : "JOGO"} ·{" "}
                    {shortMonth(item.startsAt)} {item.startsAt.getDate()}
                  </small>
                  <strong>{item.title}</strong>
                  <span>
                    {time(item.startsAt)} · {item.location || "Local a definir"}
                  </span>
                </div>
              </Link>
            ))
          ) : (
            <div className="agenda-v4-empty-upcoming">
              Nenhum evento encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </section>

      <section className="agenda-v4-calendar-card">
        <header className="agenda-v4-calendar-header">
          <div>
            <span className="agenda-v4-eyebrow">CALENDÁRIO</span>
            <h2>{monthLabel(visibleMonth)}</h2>
          </div>

          <div className="agenda-v4-calendar-nav">
            <Link
              className="agenda-v4-today-button"
              href={agendaUrl(view, type, categoryFilter)}
            >
              Hoje
            </Link>
            <Link
              aria-label="Mês anterior"
              href={agendaUrl(
                view,
                type,
                categoryFilter,
                monthKey(previousMonth),
              )}
            >
              <Icon name="chevron-left" />
            </Link>
            <Link
              aria-label="Próximo mês"
              href={agendaUrl(view, type, categoryFilter, monthKey(nextMonth))}
            >
              <Icon name="chevron-right" />
            </Link>
          </div>
        </header>

        {view === "calendar" ? (
          <div className="agenda-v4-calendar-scroll">
            <div className="agenda-v4-calendar">
              <div className="agenda-v4-weekdays" aria-hidden="true">
                <span>DOM</span>
                <span>SEG</span>
                <span>TER</span>
                <span>QUA</span>
                <span>QUI</span>
                <span>SEX</span>
                <span>SÁB</span>
              </div>

              <div className="agenda-v4-month-grid">
                {calendarDays.map((date) => {
                  const key = dateKey(date);
                  const dayItems = groups.get(key) || [];
                  const inVisibleMonth =
                    date.getMonth() === visibleMonth.getMonth() &&
                    date.getFullYear() === visibleMonth.getFullYear();

                  return (
                    <section
                      key={key}
                      className={[
                        "agenda-v4-day",
                        key === todayKey ? "today" : "",
                        inVisibleMonth ? "" : "outside",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <header>
                        <strong>{date.getDate()}</strong>
                        {key === todayKey ? <span>Hoje</span> : null}
                      </header>

                      <div className="agenda-v4-day-events">
                        {dayItems.slice(0, 3).map((item) => (
                          <Link
                            title={item.title}
                            className={`agenda-v4-calendar-event ${
                              item.type === "TRAINING" ? "training" : "match"
                            }`}
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
            </div>
          </div>
        ) : (
          <div className="agenda-v4-list">
            {[...groups.entries()].map(([key, dayItems]) => {
              const date = new Date(`${key}T12:00:00`);

              return (
                <section className="agenda-v4-list-day" key={key}>
                  <div className="agenda-v4-list-date">
                    <strong>{date.getDate()}</strong>
                    <span>{shortMonth(date)}</span>
                    <small>
                      {new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
                        .format(date)
                        .replace(".", "")}
                    </small>
                  </div>

                  <div className="agenda-v4-list-events">
                    <h3>{longDate(date)}</h3>

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
                          className={`agenda-v4-list-event ${
                            item.type === "TRAINING" ? "training" : "match"
                          }`}
                          key={item.id}
                        >
                          <time>{time(item.startsAt)}</time>

                          <span
                            className={`agenda-v4-event-dot ${
                              item.type === "TRAINING" ? "training" : "match"
                            }`}
                          />

                          <div className="agenda-v4-list-copy">
                            <small>
                              {item.type === "TRAINING" ? "TREINO" : "JOGO"} ·{" "}
                              {item.categoryName}
                            </small>
                            <strong>{item.title}</strong>
                            <span>
                              {item.subtitle} · {item.location || "Local a definir"}
                            </span>
                          </div>

                          <div className="agenda-v4-list-actions">
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

        {!visibleItems.length ? (
          <div className="agenda-v4-empty">
            Nenhuma atividade encontrada para os filtros selecionados.
          </div>
        ) : null}
      </section>

      <style>{`
        .agenda-v4 {
          --agenda-ink: #07131d;
          --agenda-panel: #ffffff;
          --agenda-line: #dfe6ea;
          --agenda-muted: #667786;
          --agenda-lime: #99e600;
          --agenda-lime-soft: #eff9d8;
          --agenda-amber: #f5b81b;
          display: grid;
          gap: 18px;
          padding: 28px 34px 44px;
          background:
            radial-gradient(circle at 92% 3%, rgba(153, 230, 0, 0.08), transparent 24rem),
            #f4f7f8;
        }

        .agenda-v4 * {
          box-sizing: border-box;
        }

        .agenda-v4-hero {
          min-height: 194px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          padding: 30px 34px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 26px;
          color: white;
          background:
            linear-gradient(104deg, rgba(5,20,31,.98) 0%, rgba(6,29,37,.98) 58%, rgba(20,76,30,.97) 100%);
          box-shadow: 0 20px 45px rgba(7, 19, 29, .12);
          overflow: hidden;
          position: relative;
        }

        .agenda-v4-hero::after {
          content: "";
          position: absolute;
          width: 360px;
          height: 360px;
          right: -110px;
          top: -180px;
          border-radius: 999px;
          border: 1px solid rgba(153,230,0,.18);
          box-shadow:
            0 0 0 42px rgba(153,230,0,.025),
            0 0 0 84px rgba(153,230,0,.018);
          pointer-events: none;
        }

        .agenda-v4-hero-copy,
        .agenda-v4-hero-actions {
          position: relative;
          z-index: 1;
        }

        .agenda-v4-eyebrow {
          display: block;
          margin-bottom: 10px;
          color: #7db600;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .16em;
          line-height: 1.1;
        }

        .agenda-v4-hero .agenda-v4-eyebrow {
          color: var(--agenda-lime);
        }

        .agenda-v4-title-line {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .agenda-v4-title-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          flex: 0 0 54px;
          border: 1px solid rgba(153,230,0,.28);
          border-radius: 16px;
          color: var(--agenda-lime);
          background: rgba(153,230,0,.08);
        }

        .agenda-v4-title-line h1 {
          color: #ffffff !important;
          margin: 0;
          font-size: clamp(34px, 4vw, 58px);
          line-height: .98;
          letter-spacing: -.045em;
        }

        .agenda-v4-title-line p {
          margin: 12px 0 0;
          color: rgba(255,255,255,.78);
          font-size: 16px;
        }

        .agenda-v4-hero-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 18px;
          background: rgba(4, 24, 35, .66);
          backdrop-filter: blur(8px);
        }

        .agenda-v4-primary-button,
        .agenda-v4-secondary-button {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 900;
          text-decoration: none;
          transition: transform .18s ease, box-shadow .18s ease;
        }

        .agenda-v4-primary-button:hover,
        .agenda-v4-secondary-button:hover {
          transform: translateY(-1px);
        }

        .agenda-v4-primary-button {
          color: #07120a;
          background: var(--agenda-lime);
          box-shadow: 0 10px 25px rgba(153,230,0,.14);
        }

        .agenda-v4-secondary-button {
          color: var(--agenda-ink);
          background: white;
        }

        .agenda-v4-primary-button svg,
        .agenda-v4-secondary-button svg {
          width: 17px;
          height: 17px;
        }

        .agenda-v4-readonly {
          padding: 10px 14px;
          border-radius: 999px;
          color: rgba(255,255,255,.8);
          background: rgba(255,255,255,.08);
          font-size: 13px;
          font-weight: 800;
        }

        .agenda-v4-kpis {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .agenda-v4-kpis article {
          min-height: 126px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 20px;
          border: 1px solid var(--agenda-line);
          border-radius: 19px;
          background: var(--agenda-panel);
          box-shadow: 0 10px 30px rgba(8, 26, 38, .045);
        }

        .agenda-v4-kpi-icon {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          flex: 0 0 42px;
          border-radius: 12px;
          color: #76aa00;
          background: var(--agenda-lime-soft);
        }

        .agenda-v4-kpis article div {
          display: grid;
        }

        .agenda-v4-kpis small {
          color: #72808b;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .12em;
        }

        .agenda-v4-kpis strong {
          margin-top: 2px;
          color: var(--agenda-ink);
          font-size: 31px;
          line-height: 1.05;
          letter-spacing: -.04em;
        }

        .agenda-v4-kpis article div > span {
          margin-top: 3px;
          color: var(--agenda-muted);
          font-size: 12px;
          font-weight: 700;
        }

        .agenda-v4-toolbar {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          padding: 16px;
          border: 1px solid var(--agenda-line);
          border-radius: 18px;
          background: white;
          box-shadow: 0 8px 28px rgba(8, 26, 38, .035);
        }

        .agenda-v4-filter-form {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          flex-wrap: wrap;
        }

        .agenda-v4-filter-form label {
          display: grid;
          gap: 6px;
          min-width: 220px;
          color: #465561;
          font-size: 11px;
          font-weight: 900;
        }

        .agenda-v4-filter-form select {
          min-height: 44px;
          padding: 0 38px 0 13px;
          border: 1px solid #d9e2e7;
          border-radius: 12px;
          outline: none;
          color: #101820;
          background: white;
          font: inherit;
          font-size: 14px;
          font-weight: 700;
        }

        .agenda-v4-filter-form select:focus {
          border-color: #94d700;
          box-shadow: 0 0 0 3px rgba(153,230,0,.12);
        }

        .agenda-v4-filter-button,
        .agenda-v4-clear {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 16px;
          border: 1px solid #d9e2e7;
          border-radius: 12px;
          color: var(--agenda-ink);
          background: #f8fafb;
          font-size: 13px;
          font-weight: 900;
          text-decoration: none;
          cursor: pointer;
        }

        .agenda-v4-clear {
          color: #667786;
          background: transparent;
        }

        .agenda-v4-view-switch {
          display: flex;
          gap: 4px;
          padding: 4px;
          border-radius: 13px;
          background: #edf1f3;
        }

        .agenda-v4-view-switch a {
          min-height: 38px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 0 13px;
          border-radius: 10px;
          color: #61717e;
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }

        .agenda-v4-view-switch a svg {
          width: 16px;
          height: 16px;
        }

        .agenda-v4-view-switch a.active {
          color: var(--agenda-ink);
          background: white;
          box-shadow: 0 2px 8px rgba(7,19,29,.08);
        }

        .agenda-v4-upcoming,
        .agenda-v4-calendar-card {
          border: 1px solid var(--agenda-line);
          border-radius: 20px;
          background: white;
          box-shadow: 0 10px 30px rgba(8,26,38,.04);
        }

        .agenda-v4-upcoming {
          padding: 18px 20px 20px;
        }

        .agenda-v4-upcoming-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .agenda-v4-upcoming-heading .agenda-v4-eyebrow {
          margin-bottom: 5px;
        }

        .agenda-v4-upcoming-heading h2,
        .agenda-v4-calendar-header h2 {
          margin: 0;
          color: var(--agenda-ink);
          font-size: 22px;
          letter-spacing: -.025em;
        }

        .agenda-v4-upcoming-heading > span {
          color: #81909a;
          font-size: 11px;
          font-weight: 800;
        }

        .agenda-v4-upcoming-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .agenda-v4-upcoming-grid > a {
          min-width: 0;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px;
          border: 1px solid #e4eaed;
          border-radius: 14px;
          color: inherit;
          background: #fbfcfc;
          text-decoration: none;
          transition: border-color .18s ease, transform .18s ease;
        }

        .agenda-v4-upcoming-grid > a:hover {
          transform: translateY(-1px);
          border-color: #cbd8de;
        }

        .agenda-v4-event-dot {
          width: 9px;
          height: 9px;
          flex: 0 0 9px;
          margin-top: 4px;
          border-radius: 999px;
        }

        .agenda-v4-event-dot.training {
          background: #86c700;
          box-shadow: 0 0 0 4px rgba(134,199,0,.12);
        }

        .agenda-v4-event-dot.match {
          background: var(--agenda-amber);
          box-shadow: 0 0 0 4px rgba(245,184,27,.13);
        }

        .agenda-v4-upcoming-grid > a div {
          min-width: 0;
          display: grid;
          gap: 3px;
        }

        .agenda-v4-upcoming-grid small {
          color: #7b8993;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .agenda-v4-upcoming-grid strong {
          overflow: hidden;
          color: var(--agenda-ink);
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .agenda-v4-upcoming-grid a div > span {
          overflow: hidden;
          color: #73828d;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .agenda-v4-empty-upcoming {
          grid-column: 1 / -1;
          padding: 18px;
          border: 1px dashed #d9e2e7;
          border-radius: 14px;
          color: #7a8994;
          font-size: 13px;
        }

        .agenda-v4-calendar-card {
          overflow: hidden;
        }

        .agenda-v4-calendar-header {
          min-height: 78px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--agenda-line);
        }

        .agenda-v4-calendar-header .agenda-v4-eyebrow {
          margin-bottom: 4px;
        }

        .agenda-v4-calendar-nav {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .agenda-v4-calendar-nav a {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border: 1px solid #dce4e8;
          border-radius: 11px;
          color: var(--agenda-ink);
          background: #f9fbfb;
          text-decoration: none;
        }

        .agenda-v4-calendar-nav a:hover {
          border-color: #bfcdd4;
        }

        .agenda-v4-calendar-nav .agenda-v4-today-button {
          width: auto;
          padding: 0 14px;
          font-size: 12px;
          font-weight: 900;
        }

        .agenda-v4-calendar-scroll {
          overflow-x: auto;
        }

        .agenda-v4-calendar {
          min-width: 840px;
        }

        .agenda-v4-weekdays,
        .agenda-v4-month-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
        }

        .agenda-v4-weekdays {
          min-height: 38px;
          align-items: center;
          background: #f7f9fa;
          border-bottom: 1px solid var(--agenda-line);
        }

        .agenda-v4-weekdays span {
          padding: 0 12px;
          color: #71808b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .1em;
        }

        .agenda-v4-month-grid {
          background: #e4eaed;
          gap: 1px;
        }

        .agenda-v4-day {
          min-width: 0;
          height: 112px;
          padding: 9px;
          background: white;
          overflow: hidden;
        }

        .agenda-v4-day.outside {
          background: #fafbfb;
        }

        .agenda-v4-day.today {
          background: linear-gradient(180deg, #f5fde6 0%, #ffffff 78%);
          box-shadow: inset 0 3px 0 #96dc00;
        }

        .agenda-v4-day > header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 7px;
        }

        .agenda-v4-day > header strong {
          width: 26px;
          height: 26px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          color: var(--agenda-ink);
          font-size: 12px;
        }

        .agenda-v4-day.outside > header strong {
          color: #a7b1b8;
        }

        .agenda-v4-day.today > header strong {
          color: #0b1605;
          background: var(--agenda-lime);
        }

        .agenda-v4-day > header span {
          color: #649100;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .agenda-v4-day-events {
          display: grid;
          gap: 4px;
        }

        .agenda-v4-calendar-event {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          height: 20px;
          padding: 0 6px;
          border-radius: 6px;
          text-decoration: none;
          overflow: hidden;
        }

        .agenda-v4-calendar-event.training {
          color: #4c7400;
          background: #edf9d4;
          border-left: 3px solid #8bc900;
        }

        .agenda-v4-calendar-event.match {
          color: #845d00;
          background: #fff3ce;
          border-left: 3px solid #f1b514;
        }

        .agenda-v4-calendar-event b {
          flex: 0 0 auto;
          font-size: 9px;
        }

        .agenda-v4-calendar-event span {
          overflow: hidden;
          font-size: 9px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .agenda-v4-day-events > small {
          color: #73818c;
          font-size: 9px;
          font-weight: 800;
        }

        .agenda-v4-list {
          padding: 8px 20px 20px;
        }

        .agenda-v4-list-day {
          display: grid;
          grid-template-columns: 72px minmax(0, 1fr);
          gap: 20px;
          padding: 18px 0;
          border-bottom: 1px solid var(--agenda-line);
        }

        .agenda-v4-list-day:last-child {
          border-bottom: 0;
        }

        .agenda-v4-list-date {
          min-height: 72px;
          display: grid;
          align-content: center;
          justify-items: center;
          border-radius: 15px;
          background: #f3f7f8;
        }

        .agenda-v4-list-date strong {
          color: var(--agenda-ink);
          font-size: 25px;
          line-height: 1;
        }

        .agenda-v4-list-date span,
        .agenda-v4-list-date small {
          color: #72818b;
          font-size: 9px;
          font-weight: 900;
        }

        .agenda-v4-list-events {
          min-width: 0;
        }

        .agenda-v4-list-events h3 {
          margin: 0 0 10px;
          color: var(--agenda-ink);
          font-size: 15px;
          text-transform: capitalize;
        }

        .agenda-v4-list-event {
          display: grid;
          grid-template-columns: 54px 10px minmax(0,1fr) auto;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-top: 1px solid #edf1f3;
        }

        .agenda-v4-list-event time {
          color: var(--agenda-ink);
          font-size: 13px;
          font-weight: 900;
        }

        .agenda-v4-list-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
        }

        .agenda-v4-list-copy small {
          color: #71808b;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .agenda-v4-list-copy strong {
          color: var(--agenda-ink);
          font-size: 13px;
        }

        .agenda-v4-list-copy > span {
          color: #75848e;
          font-size: 11px;
        }

        .agenda-v4-list-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          flex-wrap: wrap;
        }

        .agenda-v4-list-actions a {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          padding: 0 10px;
          border: 1px solid #dce4e8;
          border-radius: 9px;
          color: #33434f;
          background: #fafbfb;
          font-size: 10px;
          font-weight: 900;
          text-decoration: none;
        }

        .agenda-v4-empty {
          margin: 18px 20px 20px;
          padding: 20px;
          border: 1px dashed #d8e1e5;
          border-radius: 14px;
          color: #788791;
          background: #fafcfc;
          font-size: 13px;
          text-align: center;
        }

        @media (max-width: 1180px) {
          .agenda-v4 {
            padding: 24px;
          }

          .agenda-v4-hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .agenda-v4-hero-actions {
            width: 100%;
          }

          .agenda-v4-kpis,
          .agenda-v4-upcoming-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .agenda-v4-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .agenda-v4-view-switch {
            width: max-content;
          }
        }

        @media (max-width: 760px) {
          .agenda-v4 {
            gap: 14px;
            padding: 16px 12px 32px;
          }

          .agenda-v4-hero {
            min-height: auto;
            padding: 24px 20px;
            border-radius: 20px;
          }

          .agenda-v4-title-line {
            align-items: flex-start;
          }

          .agenda-v4-title-icon {
            width: 44px;
            height: 44px;
            flex-basis: 44px;
          }

          .agenda-v4-title-line h1 {
          color: #ffffff !important;
            font-size: 34px;
          }

          .agenda-v4-title-line p {
            font-size: 13px;
          }

          .agenda-v4-hero-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            padding: 8px;
          }

          .agenda-v4-primary-button,
          .agenda-v4-secondary-button {
            padding: 0 10px;
            font-size: 12px;
          }

          .agenda-v4-kpis,
          .agenda-v4-upcoming-grid {
            grid-template-columns: 1fr 1fr;
          }

          .agenda-v4-kpis article {
            min-height: 108px;
            gap: 10px;
            padding: 15px;
          }

          .agenda-v4-kpi-icon {
            width: 36px;
            height: 36px;
            flex-basis: 36px;
          }

          .agenda-v4-kpis strong {
            font-size: 25px;
          }

          .agenda-v4-filter-form {
            display: grid;
            grid-template-columns: 1fr;
          }

          .agenda-v4-filter-form label {
            min-width: 0;
          }

          .agenda-v4-filter-button,
          .agenda-v4-clear {
            width: 100%;
          }

          .agenda-v4-view-switch {
            width: 100%;
          }

          .agenda-v4-view-switch a {
            flex: 1;
            justify-content: center;
          }

          .agenda-v4-upcoming-grid > a {
            padding: 11px;
          }

          .agenda-v4-calendar-header {
            align-items: flex-start;
          }

          .agenda-v4-list {
            padding-inline: 14px;
          }

          .agenda-v4-list-day {
            grid-template-columns: 52px minmax(0,1fr);
            gap: 12px;
          }

          .agenda-v4-list-date {
            min-height: 64px;
          }

          .agenda-v4-list-event {
            grid-template-columns: 44px 8px minmax(0,1fr);
          }

          .agenda-v4-list-actions {
            grid-column: 3;
            justify-content: flex-start;
          }
        }

        @media (max-width: 520px) {
          .agenda-v4-kpis,
          .agenda-v4-upcoming-grid {
            grid-template-columns: 1fr;
          }

          .agenda-v4-title-icon {
            display: none;
          }

          .agenda-v4-hero-actions {
            grid-template-columns: 1fr;
          }

          .agenda-v4-upcoming-heading {
            align-items: flex-start;
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}
