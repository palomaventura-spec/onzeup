import Link from "next/link";
import type React from "react";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { createCategory, deleteCategory } from "./actions";

export default async function CategoriesPage() {
  const user = await requireOrganizationUser();

  const categories = await prisma.category.findMany({
    where: {
      organizationId: user.organizationId,
    },
    orderBy: [
      { active: "desc" },
      { type: "asc" },
      { birthYear: "desc" },
      { name: "asc" },
    ],
    include: {
      athletes: {
        where: {
          active: true,
        },
        select: {
          id: true,
        },
      },
      staffMembers: {
        where: {
          active: true,
        },
        select: {
          id: true,
          photoUrl: true,
        },
      },
      trainingSchedules: {
        select: {
          id: true,
        },
      },
      matches: {
        where: {
          status: "SCHEDULED",
          startsAt: {
            gte: new Date(),
          },
        },
        select: {
          id: true,
          startsAt: true,
        },
        orderBy: {
          startsAt: "asc",
        },
        take: 1,
      },
    },
  });

  const athleteTotal = categories.reduce(
    (total, item) => total + item.athletes.length,
    0,
  );

  const staffTotal = categories.reduce(
    (total, item) => total + item.staffMembers.length,
    0,
  );

  const activeCount = categories.filter((item) => item.active).length;

  const evaluationCount = categories.filter(
    (item) => item.active && item.type === "EVALUATION",
  ).length;

  return (
    <>
      <div className="page-head category-premium-head">
        <div>
          <span className="page-eyebrow">ESTRUTURA ESPORTIVA</span>
          <h1>Categorias</h1>
          <p className="muted">
            Organize elenco, avaliação, comissão, agenda e competições com
            identidade própria por categoria.
          </p>
        </div>

        <span className="badge">{activeCount} categoria(s) ativa(s)</span>
      </div>

      <section className="category-kpis">
        <article>
          <small>CATEGORIAS</small>
          <strong>{activeCount}</strong>
          <span>ativas</span>
        </article>

        <article>
          <small>ATLETAS</small>
          <strong>{athleteTotal}</strong>
          <span>distribuídos</span>
        </article>

        <article>
          <small>PROFISSIONAIS</small>
          <strong>{staffTotal}</strong>
          <span>vinculados</span>
        </article>

        <article>
          <small>AVALIAÇÃO</small>
          <strong>{evaluationCount}</strong>
          <span>categoria(s) de entrada</span>
        </article>
      </section>

      <details
        className="card category-create-drawer"
        open={!categories.length}
      >
        <summary>
          <div>
            <span className="page-eyebrow">NOVA EQUIPE</span>
            <h2>Criar categoria</h2>
            <p>Defina tipo, identidade visual e faixa de referência.</p>
          </div>

          <span className="btn">＋ Nova categoria</span>
        </summary>

        <form className="category-create-form" action={createCategory}>
          <label>
            Nome
            <input
              name="name"
              placeholder="Ex.: Sub-8 ou Avaliação"
              required
            />
          </label>

          <label>
            Tipo da categoria
            <select name="type" defaultValue="STANDARD">
              <option value="STANDARD">Categoria do elenco</option>
              <option value="EVALUATION">Avaliação</option>
            </select>
          </label>

          <label>
            Ano de referência
            <input
              name="birthYear"
              type="number"
              min="2000"
              max="2035"
              placeholder="2018"
            />
          </label>

          <label>
            Cor de identificação
            <input
              name="accentColor"
              type="color"
              defaultValue="#9DDB16"
            />
          </label>

          <label className="category-description">
            Descrição
            <textarea
              name="description"
              rows={3}
              placeholder="Objetivos, faixa etária ou observações."
            />
          </label>

          <button type="submit">Criar categoria</button>
        </form>
      </details>

      <section className="category-premium-grid">
        {categories.map((category) => {
          const nextMatch = category.matches[0];
          const isEvaluation = category.type === "EVALUATION";

          return (
            <article
              className={`category-profile-card ${
                !category.active ? "inactive" : ""
              }`}
              key={category.id}
              style={
                {
                  "--category-accent": category.accentColor,
                } as React.CSSProperties
              }
            >
              <header>
                <div>
                  <span className="page-eyebrow">
                    {!category.active
                      ? "INATIVA"
                      : isEvaluation
                        ? "CATEGORIA DE AVALIAÇÃO"
                        : "CATEGORIA DO ELENCO"}
                  </span>

                  <h2>{category.name}</h2>

                  <p>
                    {category.description ||
                      (category.birthYear
                        ? `Ano de referência ${category.birthYear}`
                        : isEvaluation
                          ? "Atletas em processo de avaliação"
                          : "Categoria de formação")}
                  </p>
                </div>

                <strong>{category.birthYear || "—"}</strong>
              </header>

              <div className="category-profile-stats">
                <span>
                  <b>{category.athletes.length}</b>
                  <small>{isEvaluation ? "Em avaliação" : "Atletas"}</small>
                </span>

                <span>
                  <b>{category.staffMembers.length}</b>
                  <small>Comissão</small>
                </span>

                <span>
                  <b>{category.trainingSchedules.length}</b>
                  <small>Treinos</small>
                </span>
              </div>

              <div className="category-next-match">
                {nextMatch ? (
                  <>
                    <small>PRÓXIMO JOGO</small>
                    <strong>
                      {new Intl.DateTimeFormat("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(nextMatch.startsAt)}
                    </strong>
                  </>
                ) : (
                  <span>
                    {isEvaluation
                      ? "Categoria destinada ao processo de avaliação"
                      : "Nenhum jogo agendado"}
                  </span>
                )}
              </div>

              <div className="category-card-actions">
                <Link
                  className="btn"
                  href={`/categorias/${category.id}`}
                >
                  Abrir central
                </Link>

                <Link href={`/agenda?category=${category.id}`}>
                  Agenda
                </Link>

                <Link href={`/atletas?category=${category.id}`}>
                  {isEvaluation ? "Avaliados" : "Elenco"}
                </Link>
              </div>

              <details>
                <summary>Gerenciar categoria</summary>

                <form action={deleteCategory}>
                  <input
                    type="hidden"
                    name="id"
                    value={category.id}
                  />

                  <button
                    className="btn-danger btn-small"
                    type="submit"
                  >
                    Excluir categoria
                  </button>
                </form>
              </details>
            </article>
          );
        })}
      </section>

      {!categories.length ? (
        <div className="card empty">
          Nenhuma categoria cadastrada.
        </div>
      ) : null}
    </>
  );
}
