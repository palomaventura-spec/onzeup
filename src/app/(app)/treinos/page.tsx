import Link from "next/link";

import {

  SportType,

  TrainingSessionStatus,

} from "@prisma/client";

import { requireClubPermission } from "@/lib/club-access";

import { hasClubPermission } from "@/lib/club-permissions";

import { prisma } from "@/lib/prisma";

import { createTraining } from "./actions";

import TrainingDeleteButton from "./TrainingDeleteButton";
import TrainingCreateButton from "./TrainingCreateButton";

type TrainingView = "upcoming" | "active" | "history";

type TrainingFilters = {

  sport?: string;

  view?: string;

  category?: string;

  criado?: string;

};

type TrainingIcon =

  | "field"

  | "futsal"

  | "calendar"

  | "active"

  | "history"

  | "category"

  | "clock"

  | "users"

  | "location"

  | "arrow";

const ATTENDED = new Set(["PRESENT", "LATE", "PARTIAL"]);

function Icon({

  name,

  size = 18,

}: {

  name: TrainingIcon;

  size?: number;

}) {

  const common = {

    width: size,

    height: size,

    viewBox: "0 0 24 24",

    fill: "none",

    stroke: "currentColor",

    strokeWidth: 1.9,

    strokeLinecap: "round" as const,

    strokeLinejoin: "round" as const,

    "aria-hidden": true,

  };

  if (name === "field") {

    return (

      <svg {...common}>

        <rect x="3" y="5" width="18" height="14" rx="2" />

        <path d="M12 5v14M3 12h18" />

        <circle cx="12" cy="12" r="2.2" />

      </svg>

    );

  }

  if (name === "futsal") {

    return (

      <svg {...common}>

        <circle cx="12" cy="12" r="8" />

        <path d="m9.2 9.2 2.8-2 2.8 2-1.1 3.2h-3.4L9.2 9.2Z" />

      </svg>

    );

  }

  if (name === "calendar") {

    return (

      <svg {...common}>

        <rect x="4" y="5" width="16" height="15" rx="2" />

        <path d="M8 3v4M16 3v4M4 10h16" />

      </svg>

    );

  }

  if (name === "active") {

    return (

      <svg {...common}>

        <circle cx="12" cy="12" r="8" />

        <path d="M12 8v4l3 2" />

      </svg>

    );

  }

  if (name === "history") {

    return (

      <svg {...common}>

        <path d="M4 7v5h5" />

        <path d="M5.2 16.5A8 8 0 1 0 4 9" />

        <path d="M12 8v4l3 2" />

      </svg>

    );

  }

  if (name === "category") {

    return (

      <svg {...common}>

        <rect x="4" y="4" width="6" height="6" rx="1" />

        <rect x="14" y="4" width="6" height="6" rx="1" />

        <rect x="4" y="14" width="6" height="6" rx="1" />

        <rect x="14" y="14" width="6" height="6" rx="1" />

      </svg>

    );

  }

  if (name === "clock") {

    return (

      <svg {...common}>

        <circle cx="12" cy="12" r="8" />

        <path d="M12 8v5l3 2" />

      </svg>

    );

  }

  if (name === "users") {

    return (

      <svg {...common}>

        <circle cx="9" cy="8" r="3" />

        <path d="M4 18c0-3 2.2-5 5-5s5 2 5 5" />

        <path d="M16 7a2.5 2.5 0 0 1 0 5M16 14c2.4.2 4 1.8 4 4" />

      </svg>

    );

  }

  if (name === "location") {

    return (

      <svg {...common}>

        <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />

        <circle cx="12" cy="10" r="2" />

      </svg>

    );

  }

  return (

    <svg {...common}>

      <path d="M5 12h14" />

      <path d="m14 7 5 5-5 5" />

    </svg>

  );

}

function formatDate(date: Date | null, weekday: number) {

  if (!date) {

    const weekdays = [

      "Domingo",

      "Segunda-feira",

      "Terça-feira",

      "Quarta-feira",

      "Quinta-feira",

      "Sexta-feira",

      "Sábado",

    ];

    return `Legado · ${weekdays[weekday]}`;

  }

  return new Intl.DateTimeFormat("pt-BR", {

    weekday: "short",

    day: "2-digit",

    month: "2-digit",

    year: "numeric",

  }).format(date);

}

function timeLabel(value: Date | null) {

  if (!value) return "—";

  return new Intl.DateTimeFormat("pt-BR", {

    hour: "2-digit",

    minute: "2-digit",

  }).format(value);

}

function durationMinutes(start: Date | null, end: Date | null) {

  if (!start || !end || end <= start) return null;

  return Math.round((end.getTime() - start.getTime()) / 60_000);

}

function normalizeView(value?: string): TrainingView {

  if (value === "active" || value === "history") return value;

  return "upcoming";

}

function sportLabel(sport: SportType) {

  return sport === SportType.FUTSAL ? "Futsal" : "Futebol";

}

function trainingUrl({

  sport,

  view,

  category,

}: {

  sport: SportType;

  view?: TrainingView;

  category?: string;

}) {

  const params = new URLSearchParams();

  params.set("sport", sport);

  if (view && view !== "upcoming") params.set("view", view);

  if (category) params.set("category", category);

  return `/treinos?${params.toString()}`;

}

export default async function TrainingPage({

  searchParams,

}: {

  searchParams: Promise<TrainingFilters>;

}) {

  const user = await requireClubPermission("TRAININGS_VIEW");

  const canEdit = hasClubPermission(user, "TRAININGS_EDIT");

  const query = await searchParams;

  const view = normalizeView(query.view);

  const allCategories = await prisma.category.findMany({

    where: {

      organizationId: user.organizationId,

      active: true,

      type: "STANDARD",

    },

    orderBy: [

      { sport: "asc" },

      { birthYear: "desc" },

      { name: "asc" },

    ],

    select: {

      id: true,

      name: true,

      sport: true,

    },

  });

  const hasFootball = allCategories.some(

    (category) => category.sport === SportType.FOOTBALL,

  );

  const hasFutsal = allCategories.some(

    (category) => category.sport === SportType.FUTSAL,

  );

  const requestedSport: SportType | null =

    query.sport === SportType.FOOTBALL

      ? SportType.FOOTBALL

      : query.sport === SportType.FUTSAL

        ? SportType.FUTSAL

        : null;

  const selectedSport: SportType =

    requestedSport ??

    (hasFootball

      ? SportType.FOOTBALL

      : hasFutsal

        ? SportType.FUTSAL

        : SportType.FOOTBALL);

  const categories = allCategories.filter(

    (category) => category.sport === selectedSport,

  );

  const legacyCategoryCount = allCategories.filter(

    (category) => category.sport === SportType.BOTH,

  ).length;

  const requestedCategoryId = String(query.category || "").trim();

  const categoryId = categories.some(

    (category) => category.id === requestedCategoryId,

  )

    ? requestedCategoryId

    : "";

  const trainings = await prisma.trainingSchedule.findMany({

    where: {

      organizationId: user.organizationId,

      category: {

        sport: selectedSport,

        ...(categoryId ? { id: categoryId } : {}),

      },

      OR: [

        { sport: selectedSport },

        { sport: SportType.BOTH },

      ],

    },

    include: {

      category: true,

      sessions: {

        orderBy: {

          createdAt: "desc",

        },

        take: 1,

        include: {

          attendances: {

            select: {

              status: true,

            },

          },

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

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const rows = trainings.map((training) => {

    const session = training.sessions[0] ?? null;

    const status =

      session?.status ?? TrainingSessionStatus.SCHEDULED;

    const isHistory =

      status === TrainingSessionStatus.COMPLETED ||

      status === TrainingSessionStatus.CANCELLED ||

      status === TrainingSessionStatus.ARCHIVED;

    const isPastScheduled =

      !isHistory &&

      status !== TrainingSessionStatus.IN_PROGRESS &&

      Boolean(training.date && training.date < today);

    const bucket: TrainingView = isHistory

      ? "history"

      : status === TrainingSessionStatus.IN_PROGRESS ||

          isPastScheduled

        ? "active"

        : "upcoming";

    const attendances = session?.attendances ?? [];

    const attended = attendances.filter((item) =>

      ATTENDED.has(item.status),

    ).length;

    const actualDuration = durationMinutes(

      session?.actualStartedAt ?? null,

      session?.actualEndedAt ?? null,

    );

    return {

      training,

      session,

      status,

      bucket,

      attended,

      attendanceTotal: attendances.length,

      actualDuration,

      isPastScheduled,

    };

  });

  const upcomingCount = rows.filter(

    (item) => item.bucket === "upcoming",

  ).length;

  const activeCount = rows.filter(

    (item) => item.bucket === "active",

  ).length;

  const historyCount = rows.filter(

    (item) => item.bucket === "history",

  ).length;

  const visibleRows = rows

    .filter((item) => item.bucket === view)

    .sort((a, b) => {

      const aDate = a.training.date?.getTime() ?? 0;

      const bDate = b.training.date?.getTime() ?? 0;

      return view === "history" ? bDate - aDate : aDate - bDate;

    });
function statusCopy(item: (typeof rows)[number]) {

    if (item.status === TrainingSessionStatus.COMPLETED) {

      return { label: "Finalizado", tone: "done" };

    }

    if (item.status === TrainingSessionStatus.CANCELLED) {

      return { label: "Cancelado", tone: "cancelled" };

    }

    if (item.status === TrainingSessionStatus.ARCHIVED) {

      return { label: "Arquivado", tone: "archived" };

    }

    if (item.status === TrainingSessionStatus.IN_PROGRESS) {

      return { label: "Em andamento", tone: "active" };

    }

    if (item.isPastScheduled) {

      return {

        label: "Pendente de fechamento",

        tone: "pending",

      };

    }

    return { label: "Agendado", tone: "scheduled" };

  }

  function actionLabel(item: (typeof rows)[number]) {

    if (item.bucket === "history") return "Ver chamada";

    if (item.status === TrainingSessionStatus.IN_PROGRESS) {

      return "Continuar chamada";

    }

    if (item.isPastScheduled) return "Revisar treino";

    return "Lista de presença";

  }

  const selectedCategory = categories.find(

    (category) => category.id === categoryId,

  );

  return (

    <main className="training-v10">

      <section className="training-v10-hero">

        <div>

          <span className="training-v10-eyebrow">

            11UP CLUB · ROTINA ESPORTIVA

          </span>

          <h1>Treinos</h1>

          <p>

            Planejamento, chamada, minutagem e histórico separados

            por modalidade.

          </p>

        </div>

        <div className="training-v10-hero-aside">

          <small>TREINOS · {sportLabel(selectedSport).toUpperCase()}</small>

          <strong>{trainings.length}</strong>

          <span>registro(s) na modalidade selecionada</span>

        </div>

      </section>

      <section className="training-v10-sport-switch">

        <div>

          <span className="training-v10-eyebrow">MODALIDADE</span>

          <strong>Planejamento separado por esporte</strong>

        </div>

        <div>

          <Link

            className={

              selectedSport === SportType.FOOTBALL ? "is-active" : ""

            }

            href={trainingUrl({

              sport: SportType.FOOTBALL,

              view,

            })}

          >

            <Icon name="field" size={17} />

            Campo

          </Link>

          <Link

            className={

              selectedSport === SportType.FUTSAL ? "is-active" : ""

            }

            href={trainingUrl({

              sport: SportType.FUTSAL,

              view,

            })}

          >

            <Icon name="futsal" size={17} />

            Futsal

          </Link>

        </div>

      </section>

      {legacyCategoryCount > 0 ? (

        <div className="training-v10-notice">

          <strong>{legacyCategoryCount} categoria(s)</strong> ainda estão sem

          modalidade definida e não aparecem para criação de novos treinos.

        </div>

      ) : null}

      {!canEdit ? (

        <div className="training-v10-notice">

          <strong>Somente visualização.</strong> A programação dos treinos é

          alterada por usuários autorizados.

        </div>

      ) : null}

      {query.criado === "1" ? (

        <div className="training-v10-notice" role="status">

          <strong>✓ Treino adicionado com sucesso.</strong> O novo treino já está

          exibido na categoria e na aba correspondentes à data cadastrada.

        </div>

      ) : null}

      <section className="training-v10-kpis">

        <article>

          <span className="training-v10-kpi-icon">

            <Icon name="calendar" />

          </span>

          <div>

            <small>PRÓXIMOS</small>

            <strong>{upcomingCount}</strong>

            <span>agendados</span>

          </div>

        </article>

        <article>

          <span className="training-v10-kpi-icon">

            <Icon name="active" />

          </span>

          <div>

            <small>EM ABERTO</small>

            <strong>{activeCount}</strong>

            <span>em andamento ou pendentes</span>

          </div>

        </article>

        <article>

          <span className="training-v10-kpi-icon">

            <Icon name="history" />

          </span>

          <div>

            <small>HISTÓRICO</small>

            <strong>{historyCount}</strong>

            <span>finalizados ou cancelados</span>

          </div>

        </article>

        <article>

          <span className="training-v10-kpi-icon">

            <Icon name="category" />

          </span>

          <div>

            <small>CATEGORIAS</small>

            <strong>{categories.length}</strong>

            <span>{sportLabel(selectedSport)}</span>

          </div>

        </article>

      </section>

      {canEdit ? (

        <details className="training-v10-create">

          <summary>

            <div>

              <span className="training-v10-eyebrow">PLANEJAMENTO</span>

              <h2>Novo treino</h2>

              <p>

                Cadastre a programação antes de realizar a chamada.

              </p>

            </div>

            <span>+ Novo treino</span>

          </summary>

          <div className="training-v10-create-body">

            {categories.length === 0 ? (

              <div className="training-v10-empty">

                Não há categoria de {sportLabel(selectedSport)} disponível.

              </div>

            ) : (

              <form action={createTraining}>

                <label>

                  <span>Categoria</span>

                  <select name="categoryId" required defaultValue="">

                    <option value="" disabled>

                      Selecione

                    </option>

                    {categories.map((category) => (

                      <option key={category.id} value={category.id}>

                        {category.name}

                      </option>

                    ))}

                  </select>

                </label>

                <label>

                  <span>Data</span>

                  <input

                    name="date"

                    type="date"

                    required

                  />

                </label>

                <label>

                  <span>Início</span>

                  <input name="startTime" type="time" required />

                </label>

                <label>

                  <span>Fim</span>

                  <input name="endTime" type="time" required />

                </label>

                <label>

                  <span>Local</span>

                  <input

                    name="location"

                    placeholder="Ex.: Campo / Ginásio"

                  />

                </label>

                <label className="training-v10-create-notes">

                  <span>Observações</span>

                  <textarea

                    name="notes"

                    rows={3}

                    placeholder="Informações do treino"

                  />

                </label>

                <TrainingCreateButton />

              </form>

            )}

          </div>

        </details>

      ) : null}

      <section className="training-v10-controls">

        <nav aria-label="Visualização dos treinos">

          <Link

            className={view === "upcoming" ? "is-active" : ""}

            href={trainingUrl({

              sport: selectedSport,

              view: "upcoming",

              category: categoryId,

            })}

          >

            Próximos <span>{upcomingCount}</span>

          </Link>

          <Link

            className={view === "active" ? "is-active" : ""}

            href={trainingUrl({

              sport: selectedSport,

              view: "active",

              category: categoryId,

            })}

          >

            Em aberto <span>{activeCount}</span>

          </Link>

          <Link

            className={view === "history" ? "is-active" : ""}

            href={trainingUrl({

              sport: selectedSport,

              view: "history",

              category: categoryId,

            })}

          >

            Histórico <span>{historyCount}</span>

          </Link>

        </nav>

        <form method="get">

          <input type="hidden" name="sport" value={selectedSport} />

          <input type="hidden" name="view" value={view} />

          <label>

            <span>Categoria</span>

            <select name="category" defaultValue={categoryId}>

              <option value="">

                Todas de {sportLabel(selectedSport)}

              </option>

              {categories.map((category) => (

                <option key={category.id} value={category.id}>

                  {category.name}

                </option>

              ))}

            </select>

          </label>

          <button type="submit">Filtrar</button>

        </form>

      </section>

      <section className="training-v10-list-panel">

        <header>

          <div>

            <span className="training-v10-eyebrow">

              {view === "upcoming"

                ? "AGENDA"

                : view === "active"

                  ? "ACOMPANHAMENTO"

                  : "REGISTROS"}

            </span>

            <h2>

              {view === "upcoming"

                ? "Próximos treinos"

                : view === "active"

                  ? "Treinos em aberto"

                  : "Histórico de treinos"}

            </h2>

            <p>

              {selectedCategory

                ? `${selectedCategory.name} · ${sportLabel(selectedSport)}`

                : `Todas as categorias · ${sportLabel(selectedSport)}`}

            </p>

          </div>

          <span>{visibleRows.length} treino(s)</span>

        </header>

        {visibleRows.length === 0 ? (

          <div className="training-v10-empty">

            {view === "upcoming"

              ? "Nenhum treino futuro agendado."

              : view === "active"

                ? "Nenhum treino em andamento ou pendente."

                : "Ainda não há treinos finalizados ou cancelados."}

          </div>

        ) : (

          <>

            <div className="training-v10-table-head">

              <span>Data</span>

              <span>Categoria</span>

              <span>Planejado</span>

              <span>Realizado</span>

              <span>Duração</span>

              <span>Presença</span>

              <span>Status</span>

              <span>Ação</span>

            </div>

            <div className="training-v10-list">

              {visibleRows.map((item) => {

                const status = statusCopy(item);

                const { training, session } = item;

                return (

                  <article

                    className="training-v10-row"

                    key={training.id}

                  >

                    <div className="training-v10-date">

                      <strong>{formatDate(training.date, training.weekday)}</strong>

                      <small>

                        {training.location ?? "Local a definir"}

                      </small>

                    </div>

                    <div className="training-v10-cell">

                      <b>{training.category.name}</b>

                      <small>{sportLabel(selectedSport)}</small>

                    </div>

                    <div className="training-v10-cell">

                      <b>

                        {training.startTime} – {training.endTime}

                      </b>

                    </div>

                    <div className="training-v10-cell">

                      <b>

                        {session?.actualStartedAt || session?.actualEndedAt

                          ? `${timeLabel(

                              session?.actualStartedAt ?? null,

                            )} – ${timeLabel(

                              session?.actualEndedAt ?? null,

                            )}`

                          : "—"}

                      </b>

                    </div>

                    <div className="training-v10-cell">

                      <b>

                        {item.actualDuration !== null

                          ? `${item.actualDuration} min`

                          : "—"}

                      </b>

                    </div>

                    <div className="training-v10-cell">

                      <b>

                        {item.attendanceTotal

                          ? `${item.attended}/${item.attendanceTotal}`

                          : "—"}

                      </b>

                    </div>

                    <div className="training-v10-status">

                      <span className={status.tone}>

                        {status.label}

                      </span>

                    </div>

                    <div className="training-v10-actions">

                      <Link

                        href={`/treinos/${training.id}`}

                        title={actionLabel(item)}

                      >

                        {actionLabel(item)}

                        <Icon name="arrow" size={15} />

                      </Link>

                      {canEdit ? (
                        <TrainingDeleteButton trainingId={training.id} />
                      ) : null}

                    </div>

                  </article>

                );

              })}

            </div>

          </>

        )}

      </section>

    </main>

  );

}
