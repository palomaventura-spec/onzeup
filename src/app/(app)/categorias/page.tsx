import Link from "next/link";
import type React from "react";

import ModuleHero from "@/components/ModuleHero";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createCategory, deleteCategory } from "./actions";

type CategoryFilter = "ALL" | "FOOTBALL" | "FUTSAL" | "EVALUATION";

function sportLabel(sport: string) {
  if (sport === "FOOTBALL") return "Campo";
  if (sport === "FUTSAL") return "Futsal";
  return "Modalidade pendente";
}

function SportIcon({ sport }: { sport: string }) {
  if (sport === "FUTSAL") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="m9.2 9.2 2.8-2 2.8 2-1.1 3.2h-3.4L9.2 9.2Z" />
        <path d="m10.3 12.4-2.7 2m6.1-2 2.7 2M12 7.2V4.6M7.6 14.4l-1 2.8m9.8-2.8 1 2.8" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M12 5v14M3 12h18" />
      <circle cx="12" cy="12" r="2.2" />
    </svg>
  );
}

function KpiIcon({ kind }: { kind: "categories" | "athletes" | "field" | "futsal" }) {
  if (kind === "athletes") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="8" r="3" />
        <path d="M6.5 19c.7-3.4 2.5-5.2 5.5-5.2s4.8 1.8 5.5 5.2" />
      </svg>
    );
  }

  if (kind === "field") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M12 5v14M3 12h18" />
        <circle cx="12" cy="12" r="2.2" />
      </svg>
    );
  }

  if (kind === "futsal") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" />
        <path d="m9.2 9.2 2.8-2 2.8 2-1.1 3.2h-3.4L9.2 9.2Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.5" />
      <rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" />
      <rect x="14" y="14" width="6" height="6" rx="1.5" />
    </svg>
  );
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireOrganizationUser();
  const query = await searchParams;

  const requestedFilter = String(query.filter || "ALL").toUpperCase();
  const activeFilter: CategoryFilter =
    requestedFilter === "FOOTBALL" ||
    requestedFilter === "FUTSAL" ||
    requestedFilter === "EVALUATION"
      ? requestedFilter
      : "ALL";

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [
      { active: "desc" },
      { sport: "asc" },
      { type: "asc" },
      { birthYear: "desc" },
      { name: "asc" },
    ],
    include: {
      athletes: {
        where: { active: true },
        select: { id: true },
      },
      staffMembers: {
        where: { active: true },
        select: { id: true, photoUrl: true },
      },
      trainingSchedules: {
        select: { id: true },
      },
      matches: {
        where: {
          status: "SCHEDULED",
          startsAt: { gte: new Date() },
        },
        select: { id: true, startsAt: true },
        orderBy: { startsAt: "asc" },
        take: 1,
      },
    },
  });

  const activeCategories = categories.filter((item) => item.active);
  const athleteTotal = activeCategories.reduce(
    (total, item) => total + item.athletes.length,
    0,
  );
  const activeCount = activeCategories.length;
  const footballCount = activeCategories.filter((item) => item.sport === "FOOTBALL").length;
  const futsalCount = activeCategories.filter((item) => item.sport === "FUTSAL").length;
  const evaluationCount = activeCategories.filter((item) => item.type === "EVALUATION").length;
  const pendingSportCount = activeCategories.filter((item) => item.sport === "BOTH").length;

  const filteredCategories = categories.filter((category) => {
    if (activeFilter === "FOOTBALL") return category.sport === "FOOTBALL";
    if (activeFilter === "FUTSAL") return category.sport === "FUTSAL";
    if (activeFilter === "EVALUATION") return category.type === "EVALUATION";
    return true;
  });

  const filters: Array<{ value: CategoryFilter; label: string }> = [
    { value: "ALL", label: "Todas" },
    { value: "FOOTBALL", label: "Campo" },
    { value: "FUTSAL", label: "Futsal" },
    { value: "EVALUATION", label: "Avaliação" },
  ];

  return (
    <div className="category-v2-page">
      <ModuleHero
        eyebrow="ESTRUTURA ESPORTIVA"
        title="Categorias"
        description={
          <p>
            Organize as categorias do clube por modalidade, elenco, comissão e rotina esportiva.
          </p>
        }
        aside={
          <div className="category-v2-hero-aside">
            <strong>{activeCount}</strong>
            <span>Categorias ativas</span>
            {evaluationCount > 0 ? (
              <small>{evaluationCount} em avaliação</small>
            ) : null}
          </div>
        }
      />

      <section className="category-v2-kpis">
        <article>
          <span className="category-v2-kpi-icon"><KpiIcon kind="categories" /></span>
          <div>
            <small>CATEGORIAS ATIVAS</small>
            <strong>{activeCount}</strong>
            <span>estrutura esportiva</span>
          </div>
        </article>

        <article>
          <span className="category-v2-kpi-icon"><KpiIcon kind="athletes" /></span>
          <div>
            <small>ATLETAS</small>
            <strong>{athleteTotal}</strong>
            <span>nas categorias ativas</span>
          </div>
        </article>

        <article>
          <span className="category-v2-kpi-icon"><KpiIcon kind="field" /></span>
          <div>
            <small>CAMPO</small>
            <strong>{footballCount}</strong>
            <span>categoria(s)</span>
          </div>
        </article>

        <article>
          <span className="category-v2-kpi-icon"><KpiIcon kind="futsal" /></span>
          <div>
            <small>FUTSAL</small>
            <strong>{futsalCount}</strong>
            <span>categoria(s)</span>
          </div>
        </article>
      </section>

      {pendingSportCount > 0 ? (
        <div className="category-v2-migration-note">
          <span>!</span>
          <div>
            <strong>{pendingSportCount} categoria(s) ainda sem modalidade definida</strong>
            <p>
              São categorias existentes antes da separação entre Campo e Futsal.
              Abra a categoria e escolha a modalidade correta.
            </p>
          </div>
        </div>
      ) : null}

      <section className="category-v2-toolbar">
        <div>
          <span className="page-eyebrow">ESTRUTURA DO CLUBE</span>
          <h2>Categorias do clube</h2>
          <p>
            Campo e Futsal permanecem separados em treinos, jogos, avaliações, GPS e performance.
          </p>
        </div>

        <div className="category-v2-filter-row">
          {filters.map((filter) => (
            <Link
              key={filter.value}
              href={filter.value === "ALL" ? "/categorias" : `/categorias?filter=${filter.value}`}
              className={activeFilter === filter.value ? "is-active" : ""}
            >
              {filter.label}
            </Link>
          ))}
        </div>
      </section>

      <details className="category-v2-create" open={!categories.length}>
        <summary>
          <div>
            <span className="category-v2-create-icon">＋</span>
            <span>
              <strong>Nova categoria</strong>
              <small>Cadastre uma categoria de Campo ou Futsal</small>
            </span>
          </div>
          <b>Adicionar</b>
        </summary>

        <form className="category-v2-create-form" action={createCategory}>
          <label>
            Modalidade
            <select name="sport" defaultValue="" required>
              <option value="" disabled>Selecione</option>
              <option value="FOOTBALL">Futebol de Campo</option>
              <option value="FUTSAL">Futsal</option>
            </select>
          </label>

          <label>
            Nome
            <input name="name" placeholder="Ex.: Sub-9" required />
          </label>

          <label>
            Tipo
            <select name="type" defaultValue="STANDARD">
              <option value="STANDARD">Categoria do elenco</option>
              <option value="EVALUATION">Avaliação</option>
            </select>
          </label>

          <label>
            Ano de referência
            <input name="birthYear" type="number" min="2000" max="2035" placeholder="2017" />
          </label>

          <label>
            Cor de identificação
            <input name="accentColor" type="color" defaultValue="#9DDB16" />
          </label>

          <label className="category-v2-description">
            Descrição
            <textarea name="description" rows={3} placeholder="Objetivos, faixa etária ou observações." />
          </label>

          <button type="submit">Criar categoria</button>
        </form>
      </details>

      <section className="category-v2-grid">
        {filteredCategories.map((category) => {
          const nextMatch = category.matches[0];
          const isEvaluation = category.type === "EVALUATION";
          const isPendingSport = category.sport === "BOTH";

          return (
            <article
              className={`category-v2-card ${!category.active ? "is-inactive" : ""} ${isEvaluation ? "is-evaluation" : ""}`}
              key={category.id}
              style={{ "--category-accent": category.accentColor } as React.CSSProperties}
            >
              <div className="category-v2-card-top">
                <span className={`category-v2-sport ${isPendingSport ? "is-pending" : ""}`}>
                  <i><SportIcon sport={category.sport} /></i>
                  {sportLabel(category.sport)}
                </span>

                <span className={`category-v2-status ${!category.active ? "is-off" : ""}`}>
                  {!category.active ? "Inativa" : isEvaluation ? "Avaliação" : "Ativa"}
                </span>
              </div>

              <div className="category-v2-card-title">
                <div>
                  <span className="page-eyebrow">
                    {isEvaluation ? "CATEGORIA DE AVALIAÇÃO" : "CATEGORIA DO ELENCO"}
                  </span>
                  <h3>{category.name}</h3>
                </div>

                <div className="category-v2-year">
                  <small>ANO</small>
                  <strong>{category.birthYear || "—"}</strong>
                </div>
              </div>

              <p className="category-v2-card-description">
                {category.description ||
                  (isEvaluation
                    ? "Atletas em processo de avaliação para esta modalidade."
                    : "Categoria esportiva do clube.")}
              </p>

              <div className="category-v2-card-stats">
                <span><b>{category.athletes.length}</b><small>{isEvaluation ? "Em avaliação" : "Atletas"}</small></span>
                <span><b>{category.staffMembers.length}</b><small>Profissionais</small></span>
                <span><b>{category.trainingSchedules.length}</b><small>Treinos</small></span>
              </div>

              <div className="category-v2-next">
                <span>{isEvaluation ? "PROCESSO" : "PRÓXIMO JOGO"}</span>
                {isEvaluation ? (
                  <strong>Avaliação esportiva</strong>
                ) : nextMatch ? (
                  <strong>
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(nextMatch.startsAt)}
                  </strong>
                ) : (
                  <strong>Nenhum jogo agendado</strong>
                )}
              </div>

              {isPendingSport ? (
                <div className="category-v2-card-warning">
                  Defina Campo ou Futsal antes de usar esta categoria nos novos registros de performance.
                </div>
              ) : null}

              <div className="category-v2-card-actions">
                <Link className="category-v2-primary" href={`/categorias/${category.id}`}>
                  Abrir categoria <span>→</span>
                </Link>
                <Link href={`/atletas?category=${category.id}`}>
                  {isEvaluation ? "Avaliados" : "Elenco"}
                </Link>
                <Link href={`/agenda?category=${category.id}`}>Agenda</Link>
              </div>

              <details className="category-v2-manage">
                <summary>Gerenciar</summary>
                <form action={deleteCategory}>
                  <input type="hidden" name="id" value={category.id} />
                  <button className="btn-danger btn-small" type="submit">
                    Inativar categoria
                  </button>
                </form>
              </details>
            </article>
          );
        })}
      </section>

      {!filteredCategories.length ? (
        <div className="card empty category-v2-empty">
          Nenhuma categoria encontrada neste filtro.
        </div>
      ) : null}
    </div>
  );
}
