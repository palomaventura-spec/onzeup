import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { googleCalendarUrl } from "@/lib/google-calendar";

type AgendaItem = {
  id: string;
  type: "TRAINING" | "MATCH";
  startsAt: Date;
  endsAt?: Date;
  title: string;
  subtitle: string;
  location?: string | null;
  href: string;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function labelDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function time(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function eventAt(
  date: Date,
  clock: string
) {
  const day =
    date.toISOString().slice(0, 10);

  return new Date(
    `${day}T${clock}:00`
  );
}

function nextOccurrences(
  weekday: number,
  startTime: string,
  endTime: string,
  from: Date,
  days: number
) {
  const occurrences: {
    start: Date;
    end: Date;
  }[] = [];

  for (
    let i = 0;
    i < days;
    i++
  ) {
    const date =
      new Date(from);

    date.setHours(
      0,
      0,
      0,
      0
    );

    date.setDate(
      date.getDate() + i
    );

    if (
      date.getDay() !==
      weekday
    ) {
      continue;
    }

    occurrences.push({
      start: eventAt(
        date,
        startTime
      ),

      end: eventAt(
        date,
        endTime
      ),
    });
  }

  return occurrences;
}

export default async function AgendaPage() {
  const user =
    await requireClubPermission(
      "AGENDA_VIEW"
    );

  const canEdit =
    hasClubPermission(
      user,
      "AGENDA_EDIT"
    );

  const from =
    new Date();

  from.setHours(
    0,
    0,
    0,
    0
  );

  const horizon =
    new Date(from);

  horizon.setDate(
    horizon.getDate() + 35
  );

  const [
    trainings,
    matches,
  ] = await Promise.all([
    prisma.trainingSchedule.findMany({
      where: {
        organizationId:
          user.organizationId,

        OR: [
          {
            date: {
              gte: from,
              lte: horizon,
            },
          },

          {
            date: null,
          },
        ],
      },

      include: {
        category: true,
      },

      orderBy: [
        {
          date: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    }),

    prisma.match.findMany({
      where: {
        organizationId:
          user.organizationId,

        status:
          "SCHEDULED",

        startsAt: {
          gte: from,
          lte: horizon,
        },
      },

      include: {
        category: true,
      },

      orderBy: {
        startsAt: "asc",
      },
    }),
  ]);

  const items: AgendaItem[] = [];

  trainings.forEach(
    (training) => {
      if (training.date) {
        const start =
          eventAt(
            training.date,
            training.startTime
          );

        const end =
          eventAt(
            training.date,
            training.endTime
          );

        items.push({
          id:
            `training-${training.id}`,

          type:
            "TRAINING",

          startsAt:
            start,

          endsAt:
            end,

          title:
            `Treino • ${training.category.name}`,

          subtitle:
            `${training.startTime} – ${training.endTime}`,

          location:
            training.location,

          href:
            `/treinos/${training.id}`,
        });

        return;
      }

      // Compatibilidade temporária:
      // registros antigos sem data
      // continuam visíveis até serem
      // editados e convertidos ao novo calendário.
      nextOccurrences(
        training.weekday,
        training.startTime,
        training.endTime,
        from,
        35
      ).forEach(
        (
          occurrence,
          index
        ) => {
          items.push({
            id:
              `training-${training.id}-legacy-${index}`,

            type:
              "TRAINING",

            startsAt:
              occurrence.start,

            endsAt:
              occurrence.end,

            title:
              `Treino • ${training.category.name}`,

            subtitle:
              `${training.startTime} – ${training.endTime} • registro antigo`,

            location:
              training.location,

            href:
              `/treinos/${training.id}`,
          });
        }
      );
    }
  );

  matches.forEach(
    (match) => {
      items.push({
        id:
          `match-${match.id}`,

        type:
          "MATCH",

        startsAt:
          match.startsAt,

        title:
          `${match.category.name} × ${match.opponent}`,

        subtitle:
          match.competition ||
          "Jogo",

        location:
          match.location,

        href:
          `/jogos/${match.id}`,
      });
    }
  );

  items.sort(
    (a, b) =>
      a.startsAt.getTime() -
      b.startsAt.getTime()
  );

  const groups =
    new Map<
      string,
      AgendaItem[]
    >();

  items.forEach(
    (item) => {
      const key =
        dateKey(
          item.startsAt
        );

      groups.set(
        key,
        [
          ...(groups.get(key) ||
            []),

          item,
        ]
      );
    }
  );

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">
            PRÓXIMOS 35 DIAS
          </span>

          <h1>
            Agenda
          </h1>

          <p className="muted">
            Treinos e jogos organizados
            pelas datas reais do calendário.
          </p>
        </div>

        {canEdit ? (
          <div className="agenda-shortcuts">
            <span>
              ADICIONAR / GERENCIAR
            </span>

            <div className="agenda-shortcut-group">
              <Link href="/treinos#novo-treino">
                <span>＋</span>
                Novo treino
              </Link>

              <Link href="/jogos#novo-jogo">
                <span>＋</span>
                Novo jogo
              </Link>
            </div>
          </div>
        ) : (
          <div className="agenda-shortcuts">
            <span>
              SOMENTE VISUALIZAÇÃO
            </span>
          </div>
        )}
      </div>

      <div className="agenda-shell">
        {[...groups.entries()].map(
          (
            [
              key,
              dayItems,
            ]
          ) => {
            const date =
              new Date(
                `${key}T12:00:00`
              );

            return (
              <section
                className="agenda-day"
                key={key}
              >
                <div className="agenda-day-label">
                  <strong>
                    {new Intl.DateTimeFormat(
                      "pt-BR",
                      {
                        day: "2-digit",
                      }
                    ).format(date)}
                  </strong>

                  <div>
                    <span>
                      {new Intl.DateTimeFormat(
                        "pt-BR",
                        {
                          month:
                            "short",
                        }
                      )
                        .format(
                          date
                        )
                        .replace(
                          ".",
                          ""
                        )}
                    </span>

                    <small>
                      {new Intl.DateTimeFormat(
                        "pt-BR",
                        {
                          weekday:
                            "short",
                        }
                      )
                        .format(
                          date
                        )
                        .replace(
                          ".",
                          ""
                        )}
                    </small>
                  </div>
                </div>

                <div className="agenda-day-events">
                  <h2>
                    {labelDate(
                      date
                    )}
                  </h2>

                  {dayItems.map(
                    (item) => {
                      const calendarUrl =
                        googleCalendarUrl({
                          title:
                            item.title,

                          start:
                            item.startsAt,

                          end:
                            item.endsAt,

                          location:
                            item.location,

                          details:
                            item.type ===
                            "TRAINING"
                              ? "Treino cadastrado no ONZEUP"
                              : item.subtitle,
                        });

                      return (
                        <article
                          className={`agenda-event agenda-${item.type.toLowerCase()}`}
                          key={
                            item.id
                          }
                        >
                          <div className="agenda-event-time">
                            {time(
                              item.startsAt
                            )}
                          </div>

                          <div className="agenda-event-content">
                            <small>
                              {item.type ===
                              "TRAINING"
                                ? "TREINO"
                                : "JOGO"}
                            </small>

                            <strong>
                              {
                                item.title
                              }
                            </strong>

                            <span>
                              {
                                item.subtitle
                              }

                              {item.location
                                ? ` • ${item.location}`
                                : ""}
                            </span>

                            <div className="agenda-event-actions">
                              {canEdit ? (
                                <Link
                                  href={
                                    item.href
                                  }
                                >
                                  Editar informações
                                </Link>
                              ) : (
                                <span className="help">
                                  Somente visualização
                                </span>
                              )}

                              <a
                                href={
                                  calendarUrl
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Adicionar ao Google Agenda
                              </a>
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              </section>
            );
          }
        )}

        {!items.length ? (
          <div className="card empty">
            Nenhuma atividade programada
            nos próximos 35 dias.
          </div>
        ) : null}
      </div>
    </>
  );
}