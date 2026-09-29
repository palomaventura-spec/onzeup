import Link from "next/link";

import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";
import { prisma } from "@/lib/prisma";

import { repeatAgendaWeek } from "../actions";

type SearchParams = {
  month?: string;
  week?: string;
  repeatStatus?: string;
  created?: string;
  skipped?: string;
  mode?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-");
}

function monthKey(date: Date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
  ].join("-");
}

function parseDate(value?: string) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(
    `${value}T12:00:00`,
  );

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function parseMonth(value?: string) {
  if (
    value &&
    /^\d{4}-\d{2}$/.test(value)
  ) {
    const date = new Date(
      `${value}-01T12:00:00`,
    );

    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    1,
    12,
  );
}

function addDays(
  date: Date,
  amount: number,
) {
  const result = new Date(date);

  result.setDate(
    result.getDate() + amount,
  );

  return result;
}

function mondayOf(date: Date) {
  const result = new Date(date);
  const day = result.getDay();

  result.setDate(
    result.getDate() +
      (day === 0 ? -6 : 1 - day),
  );

  result.setHours(12, 0, 0, 0);

  return result;
}

function firstDayNextMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1,
    12,
  );
}

function firstDayMonthAfterNext(
  date: Date,
) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 2,
    1,
    12,
  );
}

function formatShort(date: Date) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
    },
  ).format(date);
}

function formatFull(date: Date) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

function formatMonth(date: Date) {
  const value =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        month: "long",
        year: "numeric",
      },
    ).format(date);

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function signature(input: {
  categoryId: string;
  date: Date;
  startTime: string;
  endTime: string;
}) {
  return [
    input.categoryId,
    dateKey(input.date),
    input.startTime,
    input.endTime,
  ].join("|");
}

export default async function RepeatAgendaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user =
    await requireClubPermission(
      "AGENDA_VIEW",
    );

  const canEdit = hasClubPermission(
    user,
    "TRAININGS_EDIT",
  );

  const params = await searchParams;

  const monthStart =
    parseMonth(params.month);

  const previousMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() - 1,
    1,
    12,
  );

  const nextMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    1,
    12,
  );

  const calendarStart =
    mondayOf(monthStart);

  const calendarDays =
    Array.from(
      { length: 42 },
      (_, index) =>
        addDays(
          calendarStart,
          index,
        ),
    );

  const calendarEnd =
    addDays(calendarStart, 42);

  const requestedWeek =
    parseDate(params.week);

  const today = new Date();

  const defaultWeek =
    monthKey(monthStart) ===
    monthKey(today)
      ? mondayOf(today)
      : mondayOf(monthStart);

  const selectedWeekStart =
    requestedWeek
      ? mondayOf(requestedWeek)
      : defaultWeek;

  const selectedWeekEnd =
    addDays(
      selectedWeekStart,
      6,
    );

  const trainings =
    await prisma.trainingSchedule.findMany({
      where: {
        organizationId:
          user.organizationId,

        date: {
          gte: calendarStart,
          lt: calendarEnd,
        },
      },

      select: {
        id: true,
        date: true,
        weekday: true,
        startTime: true,
        endTime: true,
        location: true,
        notes: true,
        sport: true,
        trainingType: true,
        categoryId: true,
        responsibleStaffMemberId: true,

        category: {
          select: {
            name: true,
            accentColor: true,
          },
        },
      },

      orderBy: [
        {
          date: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });

  const byDate =
    new Map<
      string,
      typeof trainings
    >();

  for (const training of trainings) {
    if (!training.date) continue;

    const key =
      dateKey(training.date);

    byDate.set(
      key,
      [
        ...(byDate.get(key) || []),
        training,
      ],
    );
  }

  const sourceTrainings =
    trainings.filter(
      (training) =>
        Boolean(
          training.date &&
            training.date >=
              selectedWeekStart &&
            training.date <
              addDays(
                selectedWeekStart,
                7,
              ),
        ),
    );

  type SourceTraining =
    (typeof sourceTrainings)[number];

  function buildCandidates(
    mode:
      | "NEXT_WEEK"
      | "REST_MONTH"
      | "NEXT_MONTH",
  ) {
    const result: {
      source: SourceTraining;
      targetDate: Date;
    }[] = [];

    if (mode === "NEXT_WEEK") {
      for (
        const source
        of sourceTrainings
      ) {
        if (!source.date) continue;

        result.push({
          source,
          targetDate: addDays(
            source.date,
            7,
          ),
        });
      }
    }

    if (mode === "REST_MONTH") {
      const targetStart =
        addDays(
          selectedWeekStart,
          7,
        );

      const targetEnd =
        firstDayNextMonth(
          selectedWeekStart,
        );

      for (
        let date =
          new Date(targetStart);
        date < targetEnd;
        date = addDays(date, 1)
      ) {
        for (
          const source
          of sourceTrainings
        ) {
          if (
            source.weekday !==
            date.getDay()
          ) {
            continue;
          }

          result.push({
            source,
            targetDate:
              new Date(date),
          });
        }
      }
    }

    if (mode === "NEXT_MONTH") {
      const targetStart =
        firstDayNextMonth(
          selectedWeekStart,
        );

      const targetEnd =
        firstDayMonthAfterNext(
          selectedWeekStart,
        );

      for (
        let date =
          new Date(targetStart);
        date < targetEnd;
        date = addDays(date, 1)
      ) {
        for (
          const source
          of sourceTrainings
        ) {
          if (
            source.weekday !==
            date.getDay()
          ) {
            continue;
          }

          result.push({
            source,
            targetDate:
              new Date(date),
          });
        }
      }
    }

    return result;
  }

  const modeCandidates = {
    NEXT_WEEK:
      buildCandidates("NEXT_WEEK"),

    REST_MONTH:
      buildCandidates("REST_MONTH"),

    NEXT_MONTH:
      buildCandidates("NEXT_MONTH"),
  };

  const allCandidates = [
    ...modeCandidates.NEXT_WEEK,
    ...modeCandidates.REST_MONTH,
    ...modeCandidates.NEXT_MONTH,
  ];

  const allDates =
    allCandidates.map(
      (item) => item.targetDate,
    );

  const existing =
    allDates.length
      ? await prisma.trainingSchedule.findMany({
          where: {
            organizationId:
              user.organizationId,

            date: {
              gte: new Date(
                Math.min(
                  ...allDates.map(
                    (date) =>
                      date.getTime(),
                  ),
                ),
              ),

              lte: new Date(
                Math.max(
                  ...allDates.map(
                    (date) =>
                      date.getTime(),
                  ),
                ),
              ),
            },
          },

          select: {
            categoryId: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        })
      : [];

  const existingSet =
    new Set<string>();

  for (const training of existing) {
    if (!training.date) continue;

    existingSet.add(
      signature({
        categoryId:
          training.categoryId,

        date:
          training.date,

        startTime:
          training.startTime,

        endTime:
          training.endTime,
      }),
    );
  }

  function preview(
    mode:
      | "NEXT_WEEK"
      | "REST_MONTH"
      | "NEXT_MONTH",
  ) {
    const candidates =
      modeCandidates[mode];

    let skipped = 0;

    for (const candidate of candidates) {
      if (
        existingSet.has(
          signature({
            categoryId:
              candidate.source
                .categoryId,

            date:
              candidate.targetDate,

            startTime:
              candidate.source
                .startTime,

            endTime:
              candidate.source
                .endTime,
          }),
        )
      ) {
        skipped += 1;
      }
    }

    return {
      total:
        candidates.length,

      create:
        candidates.length -
        skipped,

      skipped,
    };
  }

  const nextWeekPreview =
    preview("NEXT_WEEK");

  const restMonthPreview =
    preview("REST_MONTH");

  const nextMonthPreview =
    preview("NEXT_MONTH");

  const weeks =
    Array.from(
      { length: 6 },
      (_, index) =>
        Array.from(
          { length: 7 },
          (_, day) =>
            addDays(
              calendarStart,
              index * 7 + day,
            ),
        ),
    );

  const status =
    params.repeatStatus;

  const successCreated =
    Number(params.created || 0);

  const successSkipped =
    Number(params.skipped || 0);

  return (
    <main className="repeat-v4">
      <section className="repeat-v4-hero">
        <div className="repeat-v4-hero-copy">
          <span className="repeat-v4-eyebrow">
            11UP CLUB · PLANEJAMENTO
          </span>

          <div className="repeat-v4-title-line">
            <span className="repeat-v4-title-icon">
              ↻
            </span>

            <div>
              <h1>
                Repetir programação
              </h1>

              <p>
                Use uma semana como
                modelo para programar
                novos treinos sem
                recadastrar tudo.
              </p>
            </div>
          </div>
        </div>

        <Link
          className="repeat-v4-back"
          href={`/agenda?month=${monthKey(
            monthStart,
          )}`}
        >
          ← Voltar para Agenda
        </Link>
      </section>

      {status === "success" ? (
        <section className="repeat-v4-success">
          <span>✓</span>

          <div>
            <strong>
              Programação repetida
              com sucesso
            </strong>

            <p>
              {successCreated} treino(s)
              criado(s)
              {successSkipped
                ? ` · ${successSkipped} já existente(s) ignorado(s)`
                : ""}
              .
            </p>
          </div>
        </section>
      ) : null}

      {status === "empty" ? (
        <section className="repeat-v4-alert">
          A semana selecionada não
          possui treinos programados.
        </section>
      ) : null}

      {status === "nothing" ? (
        <section className="repeat-v4-alert">
          Não existem novas datas
          disponíveis para essa
          repetição.
        </section>
      ) : null}

      <section className="repeat-v4-calendar-card">
        <header className="repeat-v4-calendar-head">
          <div>
            <span className="repeat-v4-section-kicker">
              CALENDÁRIO
            </span>

            <h2>
              {formatMonth(monthStart)}
            </h2>
          </div>

          <div className="repeat-v4-month-nav">
            <Link
              href={`/agenda/repetir?month=${monthKey(
                previousMonth,
              )}`}
              aria-label="Mês anterior"
            >
              ‹
            </Link>

            <Link
              href={`/agenda/repetir?month=${monthKey(
                nextMonth,
              )}`}
              aria-label="Próximo mês"
            >
              ›
            </Link>
          </div>
        </header>

        <div className="repeat-v4-calendar-scroll">
          <div className="repeat-v4-calendar">
            <div className="repeat-v4-weekdays">
              {[
                "SEG",
                "TER",
                "QUA",
                "QUI",
                "SEX",
                "SÁB",
                "DOM",
              ].map((day) => (
                <span key={day}>
                  {day}
                </span>
              ))}

              <span />
            </div>

            {weeks.map(
              (week, weekIndex) => {
                const weekStart =
                  week[0];

                const weekEnd =
                  week[6];

                const selected =
                  dateKey(
                    weekStart,
                  ) ===
                  dateKey(
                    selectedWeekStart,
                  );

                const weekTrainingCount =
                  trainings.filter(
                    (training) =>
                      Boolean(
                        training.date &&
                          training.date >=
                            weekStart &&
                          training.date <
                            addDays(
                              weekStart,
                              7,
                            ),
                      ),
                  ).length;

                return (
                  <div
                    className={`repeat-v4-week ${
                      selected
                        ? "selected"
                        : ""
                    }`}
                    key={weekIndex}
                  >
                    {week.map((date) => {
                      const key =
                        dateKey(date);

                      const dayTrainings =
                        byDate.get(key) ||
                        [];

                      const outside =
                        date.getMonth() !==
                        monthStart.getMonth();

                      return (
                        <article
                          className={`repeat-v4-day ${
                            outside
                              ? "outside"
                              : ""
                          }`}
                          key={key}
                        >
                          <div className="repeat-v4-day-number">
                            {date.getDate()}
                          </div>

                          <div className="repeat-v4-day-events">
                            {dayTrainings
                              .slice(0, 3)
                              .map(
                                (
                                  training,
                                ) => (
                                  <span
                                    className="repeat-v4-event"
                                    key={
                                      training.id
                                    }
                                    style={{
                                      borderLeftColor:
                                        training
                                          .category
                                          .accentColor,
                                    }}
                                  >
                                    <strong>
                                      {
                                        training
                                          .startTime
                                      }
                                    </strong>

                                    {
                                      training
                                        .category
                                        .name
                                    }
                                  </span>
                                ),
                              )}

                            {dayTrainings.length >
                            3 ? (
                              <small>
                                +
                                {dayTrainings.length -
                                  3}{" "}
                                treino(s)
                              </small>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}

                    <div className="repeat-v4-week-action">
                      <Link
                        className={
                          selected
                            ? "active"
                            : ""
                        }
                        href={`/agenda/repetir?month=${monthKey(
                          monthStart,
                        )}&week=${dateKey(
                          weekStart,
                        )}`}
                      >
                        {selected
                          ? "Selecionada"
                          : "Usar semana"}

                        <small>
                          {weekTrainingCount}{" "}
                          treino(s)
                        </small>
                      </Link>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </section>

      <section className="repeat-v4-selection">
        <div>
          <span className="repeat-v4-section-kicker">
            SEMANA MODELO
          </span>

          <h2>
            {formatFull(
              selectedWeekStart,
            )}{" "}
            →{" "}
            {formatFull(
              selectedWeekEnd,
            )}
          </h2>

          <p>
            {sourceTrainings.length}{" "}
            treino(s) encontrado(s)
            nesta semana.
          </p>
        </div>

        <div className="repeat-v4-selection-days">
          {Array.from(
            { length: 7 },
            (_, index) =>
              addDays(
                selectedWeekStart,
                index,
              ),
          ).map((date) => (
            <span key={dateKey(date)}>
              <small>
                {new Intl.DateTimeFormat(
                  "pt-BR",
                  {
                    weekday: "short",
                  },
                )
                  .format(date)
                  .replace(".", "")
                  .toUpperCase()}
              </small>

              <strong>
                {formatShort(date)}
              </strong>
            </span>
          ))}
        </div>
      </section>

      {canEdit ? (
        <form
          action={repeatAgendaWeek}
          className="repeat-v4-form"
        >
          <input
            type="hidden"
            name="sourceDate"
            value={dateKey(
              selectedWeekStart,
            )}
          />

          <header>
            <span className="repeat-v4-section-kicker">
              DESTINO
            </span>

            <h2>
              Onde deseja repetir?
            </h2>

            <p>
              O 11UP ignora
              automaticamente treinos
              que já existam na data,
              categoria e horário.
            </p>
          </header>

          <div className="repeat-v4-options">
            <label>
              <input
                type="radio"
                name="repeatMode"
                value="NEXT_WEEK"
                defaultChecked
              />

              <span>
                <i>01</i>

                <strong>
                  Próxima semana
                </strong>

                <small>
                  Repete uma única vez,
                  mantendo os mesmos
                  dias e horários.
                </small>

                <em>
                  {
                    nextWeekPreview.create
                  }{" "}
                  novo(s)
                  {nextWeekPreview.skipped
                    ? ` · ${nextWeekPreview.skipped} já existente(s)`
                    : ""}
                </em>
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="repeatMode"
                value="REST_MONTH"
              />

              <span>
                <i>02</i>

                <strong>
                  Restante do mês
                </strong>

                <small>
                  Repete o padrão
                  semanal até o último
                  dia deste mês.
                </small>

                <em>
                  {
                    restMonthPreview.create
                  }{" "}
                  novo(s)
                  {restMonthPreview.skipped
                    ? ` · ${restMonthPreview.skipped} já existente(s)`
                    : ""}
                </em>
              </span>
            </label>

            <label>
              <input
                type="radio"
                name="repeatMode"
                value="NEXT_MONTH"
              />

              <span>
                <i>03</i>

                <strong>
                  Próximo mês inteiro
                </strong>

                <small>
                  Usa esta semana como
                  padrão para todas as
                  semanas do próximo
                  mês.
                </small>

                <em>
                  {
                    nextMonthPreview.create
                  }{" "}
                  novo(s)
                  {nextMonthPreview.skipped
                    ? ` · ${nextMonthPreview.skipped} já existente(s)`
                    : ""}
                </em>
              </span>
            </label>
          </div>

          <section className="repeat-v4-rules">
            <div>
              <strong>
                Será copiado
              </strong>

              <p>
                Categoria, modalidade,
                horário, local, tipo de
                treino, responsável e
                observações.
              </p>
            </div>

            <div>
              <strong>
                Não será copiado
              </strong>

              <p>
                Presença, faltas,
                minutagem, sessões
                realizadas, jogos,
                convocações, GPS ou
                súmulas.
              </p>
            </div>
          </section>

          <footer>
            <Link
              href="/agenda"
              className="repeat-v4-cancel"
            >
              Cancelar
            </Link>

            <button
              type="submit"
              className="repeat-v4-confirm"
              disabled={
                sourceTrainings.length ===
                0
              }
            >
              ↻ Confirmar repetição
            </button>
          </footer>
        </form>
      ) : (
        <section className="repeat-v4-readonly">
          Somente usuários com
          permissão para editar treinos
          podem repetir a programação.
        </section>
      )}

      <style>{`
        .repeat-v4 {
          --repeat-lime: #99e600;
          --repeat-lime-soft: #eff9d8;
          --repeat-ink: #07131d;
          --repeat-muted: #70808b;
          --repeat-line: #dfe6ea;

          display: grid;
          gap: 18px;
          min-width: 0;
          padding: 28px 34px 44px;
          background:
            radial-gradient(
              circle at 92% 2%,
              rgba(153,230,0,.07),
              transparent 25rem
            ),
            #f4f7f8;
        }

        .repeat-v4 * {
          box-sizing: border-box;
        }

        .repeat-v4-hero {
          min-height: 190px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          position: relative;
          overflow: hidden;
          padding: 30px 34px;
          border-radius: 26px;
          color: #fff;
          background:
            linear-gradient(
              104deg,
              rgba(5,20,31,.99) 0%,
              rgba(6,29,37,.98) 58%,
              rgba(20,76,30,.97) 100%
            );
          box-shadow:
            0 20px 45px
            rgba(7,19,29,.12);
        }

        .repeat-v4-hero::after {
          content: "";
          width: 360px;
          height: 360px;
          position: absolute;
          right: -110px;
          top: -180px;
          border:
            1px solid
            rgba(153,230,0,.18);
          border-radius: 999px;
          box-shadow:
            0 0 0 42px
            rgba(153,230,0,.025),
            0 0 0 84px
            rgba(153,230,0,.018);
          pointer-events: none;
        }

        .repeat-v4-hero-copy,
        .repeat-v4-back {
          position: relative;
          z-index: 1;
        }

        .repeat-v4-eyebrow,
        .repeat-v4-section-kicker {
          display: block;
          margin-bottom: 9px;
          color: #79a900;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .15em;
        }

        .repeat-v4-hero
          .repeat-v4-eyebrow {
          color: var(--repeat-lime);
        }

        .repeat-v4-title-line {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .repeat-v4-title-icon {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          flex: 0 0 54px;
          border:
            1px solid
            rgba(153,230,0,.28);
          border-radius: 16px;
          color: var(--repeat-lime);
          background:
            rgba(153,230,0,.08);
          font-size: 27px;
          font-weight: 900;
        }

        .repeat-v4-title-line h1 {
          margin: 0;
          color: #fff;
          font-size:
            clamp(34px,4vw,56px);
          line-height: .98;
          letter-spacing: -.045em;
        }

        .repeat-v4-title-line p {
          max-width: 650px;
          margin: 11px 0 0;
          color:
            rgba(255,255,255,.76);
          font-size: 15px;
          line-height: 1.5;
        }

        .repeat-v4-back {
          min-height: 46px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 17px;
          border:
            1px solid
            rgba(255,255,255,.15);
          border-radius: 12px;
          color: #eaf0f3;
          background:
            rgba(4,24,35,.62);
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
          white-space: nowrap;
        }

        .repeat-v4-success,
        .repeat-v4-alert,
        .repeat-v4-readonly {
          border-radius: 16px;
          padding: 16px 18px;
        }

        .repeat-v4-success {
          display: flex;
          align-items: center;
          gap: 13px;
          border:
            1px solid #d7e8b5;
          color: #436800;
          background: #f5fbe8;
        }

        .repeat-v4-success > span {
          width: 36px;
          height: 36px;
          display: grid;
          place-items: center;
          flex: 0 0 36px;
          border-radius: 10px;
          background:
            var(--repeat-lime);
          color: #0e1b07;
          font-weight: 900;
        }

        .repeat-v4-success strong {
          font-size: 14px;
        }

        .repeat-v4-success p {
          margin: 3px 0 0;
          font-size: 12px;
        }

        .repeat-v4-alert {
          border: 1px solid #f0db9b;
          color: #825f00;
          background: #fff8e4;
          font-size: 13px;
          font-weight: 800;
        }

        .repeat-v4-calendar-card,
        .repeat-v4-selection,
        .repeat-v4-form,
        .repeat-v4-readonly {
          border:
            1px solid
            var(--repeat-line);
          border-radius: 20px;
          background: #fff;
          box-shadow:
            0 10px 30px
            rgba(8,26,38,.045);
        }

        .repeat-v4-calendar-head {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 20px;
          padding: 20px 22px;
          border-bottom:
            1px solid #e8edef;
        }

        .repeat-v4-calendar-head h2,
        .repeat-v4-selection h2,
        .repeat-v4-form h2 {
          margin: 0;
          color: var(--repeat-ink);
          letter-spacing: -.03em;
        }

        .repeat-v4-calendar-head h2 {
          font-size: 25px;
        }

        .repeat-v4-month-nav {
          display: flex;
          gap: 7px;
        }

        .repeat-v4-month-nav a {
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border:
            1px solid #dce4e8;
          border-radius: 11px;
          color: #42535e;
          background: #fff;
          font-size: 25px;
          text-decoration: none;
        }

        .repeat-v4-calendar-scroll {
          overflow-x: auto;
        }

        .repeat-v4-calendar {
          min-width: 900px;
          padding: 16px;
        }

        .repeat-v4-weekdays,
        .repeat-v4-week {
          display: grid;
          grid-template-columns:
            repeat(7,minmax(0,1fr))
            112px;
        }

        .repeat-v4-weekdays span {
          padding: 8px 8px 10px;
          color: #87949c;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .12em;
          text-align: center;
        }

        .repeat-v4-week {
          position: relative;
          border-radius: 14px;
        }

        .repeat-v4-week.selected {
          outline:
            2px solid
            var(--repeat-lime);
          outline-offset: -2px;
          background:
            rgba(153,230,0,.035);
        }

        .repeat-v4-day {
          min-height: 106px;
          padding: 9px;
          border-top:
            1px solid #edf1f3;
          border-right:
            1px solid #edf1f3;
          background: #fff;
        }

        .repeat-v4-week
          .repeat-v4-day:first-child {
          border-left:
            1px solid #edf1f3;
        }

        .repeat-v4-day.outside {
          background: #fafbfb;
          opacity: .55;
        }

        .repeat-v4-day-number {
          margin-bottom: 7px;
          color: #566570;
          font-size: 11px;
          font-weight: 900;
        }

        .repeat-v4-day-events {
          display: grid;
          gap: 4px;
        }

        .repeat-v4-event {
          min-width: 0;
          display: flex;
          gap: 5px;
          padding: 5px 6px;
          overflow: hidden;
          border-left: 3px solid;
          border-radius: 6px;
          color: #41515c;
          background: #f5f7f8;
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .repeat-v4-event strong {
          color: #17242d;
        }

        .repeat-v4-day-events small {
          color: #87949c;
          font-size: 8px;
        }

        .repeat-v4-week-action {
          min-height: 106px;
          display: grid;
          place-items: center;
          padding: 8px;
          border-top:
            1px solid #edf1f3;
        }

        .repeat-v4-week-action a {
          width: 100%;
          min-height: 50px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 3px;
          padding: 7px;
          border:
            1px solid #dce4e8;
          border-radius: 10px;
          color: #52636e;
          background: #fafcfc;
          font-size: 9px;
          font-weight: 900;
          text-decoration: none;
          text-align: center;
        }

        .repeat-v4-week-action
          a.active {
          border-color:
            var(--repeat-lime);
          color: #324d00;
          background:
            var(--repeat-lime-soft);
        }

        .repeat-v4-week-action small {
          font-size: 8px;
          opacity: .72;
        }

        .repeat-v4-selection {
          display: flex;
          align-items: center;
          justify-content:
            space-between;
          gap: 22px;
          padding: 20px 22px;
        }

        .repeat-v4-selection h2 {
          font-size: 20px;
        }

        .repeat-v4-selection p,
        .repeat-v4-form header p {
          margin: 6px 0 0;
          color: var(--repeat-muted);
          font-size: 12px;
        }

        .repeat-v4-selection-days {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .repeat-v4-selection-days span {
          min-width: 57px;
          display: grid;
          place-items: center;
          gap: 3px;
          padding: 8px 9px;
          border:
            1px solid #e1e7ea;
          border-radius: 10px;
          background: #fafcfc;
        }

        .repeat-v4-selection-days small {
          color: #87949c;
          font-size: 8px;
          font-weight: 900;
        }

        .repeat-v4-selection-days strong {
          color: #354650;
          font-size: 10px;
        }

        .repeat-v4-form {
          display: grid;
          gap: 20px;
          padding: 22px;
        }

        .repeat-v4-form h2 {
          font-size: 22px;
        }

        .repeat-v4-options {
          display: grid;
          grid-template-columns:
            repeat(3,minmax(0,1fr));
          gap: 12px;
        }

        .repeat-v4-options label {
          position: relative;
          cursor: pointer;
        }

        .repeat-v4-options input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .repeat-v4-options label > span {
          min-height: 178px;
          display: grid;
          align-content: start;
          gap: 8px;
          padding: 17px;
          border:
            1px solid #dfe6ea;
          border-radius: 16px;
          background: #fff;
          transition: .15s ease;
        }

        .repeat-v4-options
          label:has(input:checked)
          > span {
          border-color:
            var(--repeat-lime);
          background:
            var(--repeat-lime-soft);
          box-shadow:
            inset 0 0 0 1px
            rgba(153,230,0,.22);
        }

        .repeat-v4-options i {
          width: 31px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          color: #648c00;
          background: #f0f6df;
          font-size: 9px;
          font-style: normal;
          font-weight: 900;
        }

        .repeat-v4-options strong {
          color: var(--repeat-ink);
          font-size: 14px;
        }

        .repeat-v4-options small {
          min-height: 48px;
          color: #72818b;
          font-size: 11px;
          line-height: 1.45;
        }

        .repeat-v4-options em {
          margin-top: auto;
          color: #587d00;
          font-size: 10px;
          font-style: normal;
          font-weight: 900;
        }

        .repeat-v4-rules {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .repeat-v4-rules div {
          padding: 14px 15px;
          border:
            1px solid #e2e8eb;
          border-radius: 13px;
          background: #f8fafb;
        }

        .repeat-v4-rules strong {
          color: #344650;
          font-size: 11px;
        }

        .repeat-v4-rules p {
          margin: 5px 0 0;
          color: #71808a;
          font-size: 10px;
          line-height: 1.5;
        }

        .repeat-v4-form footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 9px;
          padding-top: 2px;
        }

        .repeat-v4-cancel,
        .repeat-v4-confirm {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 17px;
          border-radius: 11px;
          font-size: 11px;
          font-weight: 900;
          text-decoration: none;
        }

        .repeat-v4-cancel {
          border:
            1px solid #dce4e8;
          color: #53646f;
          background: #fff;
        }

        .repeat-v4-confirm {
          border:
            1px solid
            var(--repeat-lime);
          color: #0d1806;
          background:
            var(--repeat-lime);
          cursor: pointer;
        }

        .repeat-v4-confirm:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .repeat-v4-readonly {
          color: #687781;
          font-size: 13px;
        }

        @media(max-width:900px) {
          .repeat-v4 {
            padding:
              20px 18px 36px;
          }

          .repeat-v4-hero {
            align-items:
              flex-start;
            flex-direction:
              column;
            padding: 26px 24px;
          }

          .repeat-v4-options {
            grid-template-columns:
              1fr;
          }

          .repeat-v4-options
            label > span {
            min-height: 0;
          }

          .repeat-v4-rules {
            grid-template-columns:
              1fr;
          }
        }

        @media(max-width:620px) {
          .repeat-v4 {
            padding:
              14px 12px 30px;
          }

          .repeat-v4-hero {
            min-height: 0;
            border-radius: 20px;
          }

          .repeat-v4-title-icon {
            display: none;
          }

          .repeat-v4-title-line h1 {
            font-size: 34px;
          }

          .repeat-v4-selection {
            align-items:
              flex-start;
            flex-direction:
              column;
          }

          .repeat-v4-selection-days {
            width: 100%;
          }

          .repeat-v4-selection-days
            span {
            flex: 1;
            min-width: 54px;
          }

          .repeat-v4-form footer {
            align-items: stretch;
            flex-direction: column;
          }

          .repeat-v4-cancel,
          .repeat-v4-confirm {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}