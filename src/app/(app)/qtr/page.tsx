import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";
import { hasClubPermission } from "@/lib/club-permissions";

import { generateQtr, saveQtr } from "./actions";
import QtrEditor from "@/components/qtr/QtrEditor";
import QtrGenerateButton from "@/components/qtr/QtrGenerateButton";

type SearchParams = {
  week?: string;
  category?: string;
  gerado?: string;
  salvo?: string;
  erro?: string;
};

type QtsIcon =
  | "calendar"
  | "category"
  | "training"
  | "match"
  | "sync"
  | "left"
  | "right";

function Icon({
  name,
  size = 18,
}: {
  name: QtsIcon;
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

  if (name === "calendar") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
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

  if (name === "training") {
    return (
      <svg {...common}>
        <path d="M5 18.5 11.5 12 8 8.5l2-2 7.5 7.5-2 2-3.5-3.5L5 18.5Z" />
        <path d="M13.5 4.5 19.5 10.5" />
      </svg>
    );
  }

  if (name === "match") {
    return (
      <svg {...common}>
        <rect x="4" y="6" width="16" height="10" rx="2" />
        <circle cx="12" cy="11" r="2" />
        <path d="M7 18h10M9 16v2M15 16v2" />
      </svg>
    );
  }

  if (name === "sync") {
    return (
      <svg {...common}>
        <path d="M20 7v5h-5" />
        <path d="M4 17v-5h5" />
        <path d="M7.5 7.5A7 7 0 0 1 19 10M5 14a7 7 0 0 0 11.5 2.5" />
      </svg>
    );
  }

  if (name === "left") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);

  return d;
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function qtrHref(week: string, category: string) {
  return `/qtr?week=${encodeURIComponent(
    week,
  )}&category=${encodeURIComponent(category)}`;
}

function countEvents(rows: any[], type?: string) {
  const dayKeys = [
    "mon",
    "tue",
    "wed",
    "thu",
    "fri",
    "sat",
    "sun",
  ];

  return rows.reduce((total, row) => {
    const events = dayKeys.flatMap((day) =>
      Array.isArray(row?.[day]) ? row[day] : [],
    );

    if (!type) return total + events.length;

    return (
      total +
      events.filter(
        (event) => event?.type === type,
      ).length
    );
  }, 0);
}

export default async function QtrPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireClubPermission("QTR_VIEW");
  const canEdit = hasClubPermission(user, "QTR_EDIT");
  const params = await searchParams;

  const requested = params.week
    ? new Date(`${params.week}T12:00:00`)
    : new Date();

  const weekStart = mondayOf(requested);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const previous = new Date(weekStart);
  previous.setDate(previous.getDate() - 7);

  const next = new Date(weekStart);
  next.setDate(next.getDate() + 7);

  const [qtr, categories] = await Promise.all([
    prisma.qtr.findUnique({
      where: {
        organizationId_weekStart: {
          organizationId: user.organizationId,
          weekStart,
        },
      },
    }),

    prisma.category.findMany({
      where: {
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        name: true,
        birthYear: true,
      },
      orderBy: [
        {
          birthYear: "desc",
        },
        {
          name: "asc",
        },
      ],
    }),
  ]);

  const validCategory =
    params.category &&
    (params.category === "__all__" ||
      categories.some(
        (category) =>
          category.name === params.category,
      ))
      ? params.category
      : null;

  const selectedCategory =
    validCategory ||
    categories[0]?.name ||
    "__all__";

  if (!qtr && categories.length > 0 && canEdit) {
    const formData = new FormData();

    formData.set(
      "weekStart",
      isoDate(weekStart),
    );

    formData.set(
      "category",
      selectedCategory,
    );

    await generateQtr(formData);
  }

  let initialRows: any[] = [];

  if (qtr?.dataJson) {
    try {
      const parsed = JSON.parse(qtr.dataJson);
      initialRows = Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      initialRows = [];
    }
  }

  const activityCount = countEvents(initialRows);
  const trainingCount = countEvents(
    initialRows,
    "TRAINING",
  );
  const matchCount =
    countEvents(initialRows, "MATCH") +
    countEvents(initialRows, "FRIENDLY");

  return (
    <main className="qts-v11">
      <section className="qts-v11-hero">
        <div>
          <span className="qts-v11-eyebrow">
            11UP CLUB · PLANEJAMENTO SEMANAL
          </span>

          <h1>QTS</h1>

          <p>
            Organização semanal de treinos, jogos e atividades por categoria.
          </p>
        </div>

        <div className="qts-v11-hero-aside">
          <small>SEMANA</small>
          <strong>
            {formatDate(weekStart)}
          </strong>
          <span>
            até {formatDate(weekEnd)}
          </span>
        </div>
      </section>

      <section className="qts-v11-week-nav">
        <div>
          <span className="qts-v11-eyebrow">
            NAVEGAÇÃO
          </span>
          <strong>
            {formatDate(weekStart)} a{" "}
            {formatDate(weekEnd)}
          </strong>
        </div>

        <div>
          <Link
            href={qtrHref(
              isoDate(previous),
              selectedCategory,
            )}
          >
            <Icon name="left" size={16} />
            Semana anterior
          </Link>

          <Link
            className="primary"
            href={qtrHref(
              isoDate(next),
              selectedCategory,
            )}
          >
            Próxima semana
            <Icon name="right" size={16} />
          </Link>
        </div>
      </section>

      <section className="qts-v11-kpis">
        <article>
          <span className="qts-v11-kpi-icon">
            <Icon name="category" />
          </span>

          <div>
            <small>CATEGORIAS</small>
            <strong>
              {categories.length}
            </strong>
            <span>no quadro semanal</span>
          </div>
        </article>

        <article>
          <span className="qts-v11-kpi-icon">
            <Icon name="calendar" />
          </span>

          <div>
            <small>ATIVIDADES</small>
            <strong>
              {activityCount}
            </strong>
            <span>na semana</span>
          </div>
        </article>

        <article>
          <span className="qts-v11-kpi-icon">
            <Icon name="training" />
          </span>

          <div>
            <small>TREINOS</small>
            <strong>
              {trainingCount}
            </strong>
            <span>programados</span>
          </div>
        </article>

        <article>
          <span className="qts-v11-kpi-icon">
            <Icon name="match" />
          </span>

          <div>
            <small>JOGOS</small>
            <strong>
              {matchCount}
            </strong>
            <span>oficiais + amistosos</span>
          </div>
        </article>
      </section>

      {params.gerado === "1" ||
      params.salvo === "1" ? (
        <div
          className="qts-v11-notice success"
          role="status"
        >
          <strong>✓</strong>
          <span>
            {params.gerado === "1"
              ? "QTS atualizado com a agenda."
              : "Alterações salvas com sucesso."}
          </span>
        </div>
      ) : null}

      {params.erro ? (
        <div
          className="qts-v11-notice"
          role="alert"
        >
          Não foi possível concluir a operação do QTS.
        </div>
      ) : null}

      {canEdit ? (
        <section className="qts-v11-sync">
          <div className="qts-v11-sync-icon">
            <Icon name="sync" size={21} />
          </div>

          <div>
            <span className="qts-v11-eyebrow">
              SINCRONIZAÇÃO
            </span>

            <h2>Atualizar com a agenda</h2>

            <p>
              Recria esta semana com os treinos e jogos cadastrados.
              Ajustes manuais feitos somente no QTS podem ser substituídos.
            </p>
          </div>

          <form action={generateQtr}>
            <input
              type="hidden"
              name="weekStart"
              value={isoDate(weekStart)}
            />

            <input
              type="hidden"
              name="category"
              value={selectedCategory}
            />

            <QtrGenerateButton />
          </form>
        </section>
      ) : (
        <div className="qts-v11-notice neutral">
          <strong>Somente visualização.</strong>
          <span>
            O QTS é atualizado pelo Gestor ou Coordenador.
          </span>
        </div>
      )}

      {!qtr && !canEdit ? (
        <div className="qts-v11-empty">
          <strong>
            QTS ainda não disponível
          </strong>

          <p>
            O Gestor ou Coordenador ainda não gerou o QTS desta semana.
          </p>
        </div>
      ) : null}

      <section className="qts-v11-editor">
        <QtrEditor
          key={`${isoDate(weekStart)}-${
            qtr?.updatedAt?.getTime() ?? 0
          }-${selectedCategory}`}
          weekStart={isoDate(weekStart)}
          qtrId={qtr?.id ?? null}
          initialRows={initialRows}
          categories={categories}
          initialCategory={selectedCategory}
          saveAction={saveQtr}
          canEdit={canEdit}
        />
      </section>
    </main>
  );
}
