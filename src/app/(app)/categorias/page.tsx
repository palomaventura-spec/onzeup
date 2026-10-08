import Link from "next/link";
import type React from "react";

import ModuleHero from "@/components/ModuleHero";
import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createCategory,
  createCategoryDocumentRequirement,
  deleteCategory,
  toggleCategoryDocumentRequirement,
} from "./actions";
import CategoryEvaluationFields from "./CategoryEvaluationFields";
import CategoryOpenLink from "./CategoryOpenLink";
import CategoryDocumentsCloseButton from "./CategoryDocumentsCloseButton";

type CategoryFilter = "ALL" | "FOOTBALL" | "FUTSAL" | "EVALUATION";

function sportLabel(sport: string) {
  if (sport === "FOOTBALL") return "Futebol";
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


const documentRequirementLibrary = [
  {
    key: "medical_clearance",
    label: "Atestado médico",
    documentCategory: "MEDICAL_CLEARANCE",
    subject: "ATHLETE",
    requiresExpiry: true,
  },
  {
    key: "school_declaration",
    label: "Declaração escolar",
    documentCategory: "SCHOOL_DECLARATION",
    subject: "ATHLETE",
    requiresExpiry: true,
  },
  {
    key: "athlete_identity",
    label: "Documento de identidade do atleta",
    documentCategory: "IDENTITY",
    subject: "ATHLETE",
    requiresExpiry: false,
  },
  {
    key: "athlete_cpf",
    label: "CPF do atleta",
    documentCategory: "IDENTITY",
    subject: "ATHLETE",
    requiresExpiry: false,
  },
  {
    key: "guardian_identity",
    label: "Documento de identidade do responsável",
    documentCategory: "IDENTITY",
    subject: "GUARDIAN",
    requiresExpiry: false,
  },
  {
    key: "guardian_cpf",
    label: "CPF do responsável",
    documentCategory: "IDENTITY",
    subject: "GUARDIAN",
    requiresExpiry: false,
  },
  {
    key: "birth_certificate",
    label: "Certidão de nascimento",
    documentCategory: "IDENTITY",
    subject: "ATHLETE",
    requiresExpiry: false,
  },
  {
    key: "health_card",
    label: "Plano de saúde / Cartão SUS",
    documentCategory: "OTHER",
    subject: "ATHLETE",
    requiresExpiry: false,
  },
  {
    key: "vaccination_card",
    label: "Carteira de vacinação",
    documentCategory: "MEDICAL_EXAM",
    subject: "ATHLETE",
    requiresExpiry: false,
  },
  {
    key: "blood_count",
    label: "Hemograma completo",
    documentCategory: "MEDICAL_EXAM",
    subject: "ATHLETE",
    requiresExpiry: false,
  },
  {
    key: "electrocardiogram",
    label: "Eletrocardiograma",
    documentCategory: "ELECTROCARDIOGRAM",
    subject: "ATHLETE",
    requiresExpiry: true,
  },
  {
    key: "echocardiogram",
    label: "Ecocardiograma",
    documentCategory: "ECHOCARDIOGRAM",
    subject: "ATHLETE",
    requiresExpiry: true,
  },
] as const;
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
      documentRequirements: {
        orderBy: [
          { active: "desc" },
          { sortOrder: "asc" },
          { label: "asc" },
        ],
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
    { value: "FOOTBALL", label: "Futebol" },
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
            <small>FUTEBOL</small>
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
            Futebol e Futsal permanecem separados em treinos, jogos, avaliações, GPS e performance.
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
            <span className="category-v2-create-icon">+</span>
            <span>
              <strong>Nova categoria</strong>
              <small>Cadastre uma categoria de Futebol ou Futsal</small>
            </span>
          </div>
          <b>Adicionar</b>
        </summary>

        <form className="category-v2-create-form" action={createCategory}>

          <label>
            Nome
            <input name="name" placeholder="Ex.: Sub-9" required />
          </label>
          <CategoryEvaluationFields
            categories={categories.map((category) => ({
              id: category.id,
              name: category.name,
              type: category.type,
              sport: category.sport,
              active: category.active,
              accentColor: category.accentColor,
            }))}
          />

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
                  Defina Futebol ou Futsal antes de usar esta categoria nos novos registros de performance.
                </div>
              ) : null}

              {!isEvaluation ? (
                <details className="category-v2-documents">
                  <summary>
                    <span>
                      <strong>Documentos obrigatórios</strong>
                      <small>
                        {category.documentRequirements.filter(
                          (requirement) => requirement.active,
                        ).length} ativo(s)
                      </small>
                    </span>
                    <b>Configurar</b>
                  </summary>

                  <div className="category-v2-documents-body">
                    <div className="category-v2-document-current">
                      <span className="page-eyebrow">
                        CONFIGURAÇÃO ATUAL
                      </span>

                      {!category.documentRequirements.length ? (
                        <p className="muted">
                          Nenhum documento obrigatório configurado para esta categoria.
                        </p>
                      ) : (
                        <div className="category-v2-document-list">
                          {category.documentRequirements.map(
                            (requirement) => (
                              <div
                                key={requirement.id}
                                className={`category-v2-document-item ${
                                  !requirement.active ? "is-off" : ""
                                }`}
                              >
                                <div>
                                  <strong>{requirement.label}</strong>
                                  <small>
                                    {requirement.subject === "GUARDIAN"
                                      ? "Responsável"
                                      : "Atleta"}
                                    {" · "}
                                    {requirement.requiresApproval
                                      ? "Exige aprovação"
                                      : "Sem aprovação"}
                                    {" · "}
                                    {requirement.requiresExpiry
                                      ? "Exige validade"
                                      : "Sem validade obrigatória"}
                                  </small>

                                  {requirement.instructions ? (
                                    <p>{requirement.instructions}</p>
                                  ) : null}
                                </div>

                                <form
                                  action={
                                    toggleCategoryDocumentRequirement
                                  }
                                >
                                  <input
                                    type="hidden"
                                    name="requirementId"
                                    value={requirement.id}
                                  />
                                  <button
                                    type="submit"
                                    className="btn btn-secondary btn-small"
                                  >
                                    {requirement.active
                                      ? "Desativar"
                                      : "Ativar"}
                                  </button>
                                </form>
                              </div>
                            ),
                          )}
                        </div>
                      )}
                    </div>

                    <div className="category-v2-document-library">
                      <span className="page-eyebrow">
                        BIBLIOTECA 11UP
                      </span>

                      <p className="muted">
                        Adicione somente os documentos que o clube considera
                        obrigatórios nesta categoria.
                      </p>

                      <div className="category-v2-document-library-grid">
                        {documentRequirementLibrary.map((item) => {
                          const alreadyExists =
                            category.documentRequirements.some(
                              (requirement) =>
                                requirement.key === item.key &&
                                requirement.active,
                            );

                          return (
                            <form
                              key={item.key}
                              action={
                                createCategoryDocumentRequirement
                              }
                              className="category-v2-library-item"
                            >
                              <input
                                type="hidden"
                                name="categoryId"
                                value={category.id}
                              />
                              <input
                                type="hidden"
                                name="key"
                                value={item.key}
                              />
                              <input
                                type="hidden"
                                name="label"
                                value={item.label}
                              />
                              <input
                                type="hidden"
                                name="documentCategory"
                                value={item.documentCategory}
                              />
                              <input
                                type="hidden"
                                name="subject"
                                value={item.subject}
                              />
                              <input
                                type="hidden"
                                name="required"
                                value="true"
                              />
                              <input
                                type="hidden"
                                name="requiresApproval"
                                value="true"
                              />
                              <input
                                type="hidden"
                                name="requiresExpiry"
                                value={String(item.requiresExpiry)}
                              />

                              <span>
                                <strong>{item.label}</strong>
                                <small>
                                  {item.subject === "GUARDIAN"
                                    ? "Do responsável"
                                    : "Do atleta"}
                                </small>
                              </span>

                              <button
                                type="submit"
                                className="btn btn-secondary btn-small"
                                disabled={alreadyExists}
                              >
                                {alreadyExists
                                  ? "Adicionado"
                                  : "＋ Adicionar"}
                              </button>
                            </form>
                          );
                        })}
                      </div>
                    </div>

                    <div className="category-v2-document-custom">
                      <span className="page-eyebrow">
                        DOCUMENTO PERSONALIZADO
                      </span>

                      <h4>Adicionar outro documento obrigatório</h4>

                      <form
                        action={
                          createCategoryDocumentRequirement
                        }
                        className="category-v2-document-custom-form"
                      >
                        <input
                          type="hidden"
                          name="categoryId"
                          value={category.id}
                        />

                        <label>
                          Nome do documento
                          <input
                            name="label"
                            required
                            placeholder="Ex.: Termo de uso de imagem"
                          />
                        </label>

                        <label>
                          Tipo
                          <select
                            name="documentCategory"
                            defaultValue="OTHER"
                          >
                            <option value="IDENTITY">
                              Identificação
                            </option>
                            <option value="MEDICAL_EXAM">
                              Exame médico
                            </option>
                            <option value="MEDICAL_CLEARANCE">
                              Atestado médico
                            </option>
                            <option value="ELECTROCARDIOGRAM">
                              Eletrocardiograma
                            </option>
                            <option value="ECHOCARDIOGRAM">
                              Ecocardiograma
                            </option>
                            <option value="AUTHORIZATION">
                              Autorização
                            </option>
                            <option value="SPORTS_REGISTRATION">
                              Registro esportivo
                            </option>
                            <option value="SCHOOL">
                              Documento escolar
                            </option>
                            <option value="SCHOOL_DECLARATION">
                              Declaração escolar
                            </option>
                            <option value="OTHER">
                              Outro
                            </option>
                          </select>
                        </label>

                        <label>
                          Referente a
                          <select
                            name="subject"
                            defaultValue="ATHLETE"
                          >
                            <option value="ATHLETE">
                              Atleta
                            </option>
                            <option value="GUARDIAN">
                              Responsável
                            </option>
                          </select>
                        </label>

                        <label>
                          Exige aprovação
                          <select
                            name="requiresApproval"
                            defaultValue="true"
                          >
                            <option value="true">Sim</option>
                            <option value="false">Não</option>
                          </select>
                        </label>

                        <label>
                          Exige data de validade
                          <select
                            name="requiresExpiry"
                            defaultValue="false"
                          >
                            <option value="false">Não</option>
                            <option value="true">Sim</option>
                          </select>
                        </label>

                        <label className="category-v2-document-instructions">
                          Instruções
                          <textarea
                            name="instructions"
                            rows={3}
                            placeholder="Ex.: Deve estar assinado pelo responsável legal."
                          />
                        </label>

                        <input
                          type="hidden"
                          name="required"
                          value="true"
                        />

                        <button type="submit">
                          ＋ Adicionar documento obrigatório
                        </button>
                      </form>
                    </div>

                    <div className="category-v2-documents-footer">
                      <CategoryDocumentsCloseButton />
                    </div>
                  </div>
                </details>
              ) : null}

              <div className="category-v2-card-actions">
                <CategoryOpenLink href={`/categorias/${category.id}`} />
                <Link href={`/atletas?category=${category.id}`}>
                  {isEvaluation ? "Avaliados" : "Elenco"}
                </Link>
                <Link href={`/agenda?category=${category.id}`}>Agenda</Link>
              </div>

              <details className="category-v2-manage">
                <summary>
                   <span className="category-v2-manage-open-label">Gerenciar</span>
                   <span className="category-v2-manage-back-label">→</span>
                 </summary>
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
      <style>{`
        .category-v2-documents {
          margin-top: 16px;
          border: 1px solid var(--line);
          border-radius: 14px;
          background: #fff;
          overflow: hidden;
        }

        .category-v2-documents > summary {
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          list-style: none;
        }

        .category-v2-documents > summary::-webkit-details-marker {
          display: none;
        }

        .category-v2-documents > summary span {
          display: grid;
          gap: 3px;
        }

        .category-v2-documents > summary small {
          color: var(--muted);
          font-weight: 600;
        }

        .category-v2-documents > summary b {
          font-size: 13px;
        }

        .category-v2-documents-body {
          display: grid;
          gap: 20px;
          padding: 16px;
          border-top: 1px solid var(--line);
          background: #f8fafb;
        }

        .category-v2-document-list,
        .category-v2-document-library-grid {
          display: grid;
          gap: 8px;
          margin-top: 12px;
        }

        .category-v2-document-item,
        .category-v2-library-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border: 1px solid var(--line);
          border-radius: 12px;
          background: #fff;
        }

        .category-v2-document-item > div,
        .category-v2-library-item > span {
          display: grid;
          gap: 4px;
        }

        .category-v2-document-item small,
        .category-v2-library-item small {
          color: var(--muted);
        }

        .category-v2-document-item p {
          margin: 3px 0 0;
          font-size: 13px;
          color: var(--muted);
        }

        .category-v2-document-item.is-off {
          opacity: .55;
        }

        .category-v2-document-custom {
          padding-top: 4px;
        }

        .category-v2-document-custom h4 {
          margin: 5px 0 14px;
        }

        .category-v2-document-custom-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .category-v2-document-custom-form label {
          display: grid;
          gap: 6px;
          font-size: 13px;
          font-weight: 700;
        }

        .category-v2-document-instructions,
        .category-v2-document-custom-form button {
          grid-column: 1 / -1;
        }

        @media (max-width: 760px) {
          .category-v2-document-custom-form {
            grid-template-columns: 1fr;
          }

          .category-v2-document-instructions,
          .category-v2-document-custom-form button {
            grid-column: auto;
          }

          .category-v2-document-item,
          .category-v2-library-item {
            align-items: flex-start;
            flex-direction: column;
          }
        }
        .category-v2-manage-back-label { display: none; }
        .category-v2-manage[open] .category-v2-manage-open-label { display: none; }
        .category-v2-manage[open] .category-v2-manage-back-label { display: inline; }
        .category-v2-manage > summary { cursor: pointer; }
      `}</style>
    </div>
  );
}
