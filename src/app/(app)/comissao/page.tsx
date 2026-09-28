import ImageUpload from "@/components/ImageUpload";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import Link from "next/link";

import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  approveCoachAccessRequest,
  createStaffMember,
  deleteStaffMember,
  rejectCoachAccessRequest,
} from "./actions";

type StaffFilters = {
  q?: string;
  category?: string;
  sport?: string;
  status?: string;
  coachInvite?: string;
  page?: string;
};

type StaffIcon =
  | "staff"
  | "categories"
  | "coach"
  | "requests"
  | "plus"
  | "search"
  | "arrow"
  | "chevron-left"
  | "chevron-right";

const PAGE_SIZE = 20;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function sportLabel(sport: string) {
  return sport === "FOOTBALL"
    ? "Campo"
    : sport === "FUTSAL"
      ? "Futsal"
      : "Campo + Futsal";
}

function Icon({
  name,
  size = 20,
}: {
  name: StaffIcon;
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

  if (name === "staff") {
    return (
      <svg {...common}>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 20c.7-4 2.7-6 5.5-6s4.8 2 5.5 6" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M15 14.8c2.9.1 4.7 1.8 5.2 5.2" />
      </svg>
    );
  }

  if (name === "categories") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }

  if (name === "coach") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M6.5 19c.7-3.4 2.5-5.2 5.5-5.2s4.8 1.8 5.5 5.2" />
        <path d="m17.5 5.5 1.2 1.2 2.3-2.3" />
      </svg>
    );
  }

  if (name === "requests") {
    return (
      <svg {...common}>
        <path d="M12 3 4 7v5c0 4.5 3.1 7.7 8 9 4.9-1.3 8-4.5 8-9V7l-8-4Z" />
        <path d="M12 8v5M12 17h.01" />
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

  if (name === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h14" />
        <path d="m14 7 5 5-5 5" />
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

  return (
    <svg {...common}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function staffUrl({
  q,
  category,
  sport,
  status,
  page,
}: {
  q?: string;
  category?: string;
  sport?: string;
  status?: string;
  page?: number;
}) {
  const query = new URLSearchParams();

  if (q) query.set("q", q);
  if (category && category !== "ALL") query.set("category", category);
  if (sport && sport !== "ALL") query.set("sport", sport);
  if (status && status !== "ALL") query.set("status", status);
  if (page && page > 1) query.set("page", String(page));

  const suffix = query.toString();
  return suffix ? `/comissao?${suffix}` : "/comissao";
}

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<StaffFilters>;
}) {
  const user = await requireOrganizationUser();
  const filters = await searchParams;

  const query = (filters.q || "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const categoryFilter = filters.category || "ALL";
  const sportFilter = ["FOOTBALL", "FUTSAL", "BOTH"].includes(
    filters.sport || "",
  )
    ? filters.sport!
    : "ALL";

  const statusFilter =
    filters.status === "INACTIVE"
      ? "INACTIVE"
      : filters.status === "ACTIVE"
        ? "ACTIVE"
        : "ALL";

  const requestedPage = Math.max(
    1,
    Number.parseInt(filters.page || "1", 10) || 1,
  );

  const [members, categories, coachAccesses] = await Promise.all([
    prisma.staffMember.findMany({
      where: { organizationId: user.organizationId },
      include: { category: true },
      orderBy: [
        { active: "desc" },
        { roleTitle: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [
        { sport: "asc" },
        { type: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.coachOrganizationAccess.findMany({
      where: { organizationId: user.organizationId },
      include: {
        coach: { include: { owner: true } },
        category: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const coachRequests = coachAccesses.filter(
    (item) => !item.active && item.requestedBy === "COACH",
  );

  const activeCoachEmails = new Set(
    coachAccesses
      .filter((item) => item.active)
      .map((item) => item.coach.owner.email.toLowerCase()),
  );

  const filteredMembers = members.filter((member) => {
    const searchable =
      `${member.name} ${member.roleTitle} ${member.education || ""} ${member.specialties || ""} ${member.coachEmail || ""}`.toLocaleLowerCase(
        "pt-BR",
      );

    return (
      (!query || searchable.includes(query)) &&
      (categoryFilter === "ALL" ||
        (categoryFilter === "GENERAL"
          ? !member.categoryId
          : member.categoryId === categoryFilter)) &&
      (sportFilter === "ALL" || member.sport === sportFilter) &&
      (statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? member.active : !member.active))
    );
  });

  const activeCount = members.filter((item) => item.active).length;

  const categoriesServed = new Set(
    members
      .filter((item) => item.active && item.categoryId)
      .map((item) => item.categoryId),
  ).size;

  const linkedCount = members.filter(
    (item) =>
      item.coachEmail &&
      activeCoachEmails.has(item.coachEmail.toLowerCase()),
  ).length;

  const totalPages = Math.max(
    1,
    Math.ceil(filteredMembers.length / PAGE_SIZE),
  );

  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageMembers = filteredMembers.slice(
    pageStart,
    pageStart + PAGE_SIZE,
  );

  const hasFilters = Boolean(
    query ||
      categoryFilter !== "ALL" ||
      sportFilter !== "ALL" ||
      statusFilter !== "ALL",
  );

  const paginationBase = {
    q: filters.q || "",
    category: categoryFilter,
    sport: sportFilter,
    status: statusFilter,
  };

  const pageNumbers = Array.from(
    { length: totalPages },
    (_, index) => index + 1,
  ).filter(
    (page) =>
      page === 1 ||
      page === totalPages ||
      Math.abs(page - currentPage) <= 1,
  );

  const notices: Record<string, string> = {
    sent: "Convite enviado ao 11UP Coach. O acesso será ativado após o aceite.",
    saved:
      "Profissional salvo. O vínculo será localizado quando a conta Coach usar o mesmo e-mail.",
    approved: "Solicitação do Coach aprovada.",
    rejected: "Solicitação do Coach recusada.",
  };

  return (
    <div className="staff-v4">
      <section className="staff-v4-hero">
        <div>
          <span className="staff-v4-eyebrow">
            11UP CLUB · EQUIPE MULTIDISCIPLINAR
          </span>

          <div className="staff-v4-title-line">
            <span className="staff-v4-title-icon">
              <Icon name="staff" size={24} />
            </span>

            <div>
              <h1>Comissão técnica</h1>
              <p>
                Profissionais, funções, categorias e acessos em uma central
                preparada para estruturas esportivas de qualquer tamanho.
              </p>
            </div>
          </div>
        </div>

        <a className="staff-v4-primary-button" href="#novo-profissional">
          <Icon name="plus" size={17} />
          Novo profissional
        </a>
      </section>

      {filters.coachInvite && notices[filters.coachInvite] ? (
        <div className="notice">{notices[filters.coachInvite]}</div>
      ) : null}

      <section className="staff-v4-kpis">
        <article>
          <span className="staff-v4-kpi-icon">
            <Icon name="staff" />
          </span>
          <div>
            <small>PROFISSIONAIS ATIVOS</small>
            <strong>{activeCount}</strong>
            <span>na organização</span>
          </div>
        </article>

        <article>
          <span className="staff-v4-kpi-icon">
            <Icon name="categories" />
          </span>
          <div>
            <small>CATEGORIAS ATENDIDAS</small>
            <strong>{categoriesServed}</strong>
            <span>com equipe vinculada</span>
          </div>
        </article>

        <article>
          <span className="staff-v4-kpi-icon">
            <Icon name="coach" />
          </span>
          <div>
            <small>11UP COACH</small>
            <strong>{linkedCount}</strong>
            <span>vínculos ativos</span>
          </div>
        </article>

        <article className={coachRequests.length ? "attention" : ""}>
          <span className="staff-v4-kpi-icon attention">
            <Icon name="requests" />
          </span>
          <div>
            <small>SOLICITAÇÕES</small>
            <strong>{coachRequests.length}</strong>
            <span>aguardando análise</span>
          </div>
        </article>
      </section>

      {coachRequests.length ? (
        <section className="staff-v4-requests">
          <header>
            <div>
              <span className="staff-v4-eyebrow">SOLICITAÇÕES COACH</span>
              <h2>Aguardando aprovação</h2>
            </div>
            <span>{coachRequests.length}</span>
          </header>

          <div className="staff-v4-request-list">
            {coachRequests.map((access) => (
              <article key={access.id}>
                <div>
                  <strong>
                    {access.coach.professionalName || access.coach.name}
                  </strong>
                  <p>
                    {access.coach.owner.email} ·{" "}
                    {access.category?.name || "Todas as categorias"}
                  </p>
                </div>

                <div>
                  <form action={approveCoachAccessRequest}>
                    <input
                      type="hidden"
                      name="accessId"
                      value={access.id}
                    />
                    <PendingSubmitButton
                      className="btn btn-small"
                      pendingText="Aprovando..."
                    >
                      Aprovar
                    </PendingSubmitButton>
                  </form>

                  <form action={rejectCoachAccessRequest}>
                    <input
                      type="hidden"
                      name="accessId"
                      value={access.id}
                    />
                    <PendingSubmitButton
                      className="btn-secondary btn-small"
                      pendingText="Recusando..."
                    >
                      Recusar
                    </PendingSubmitButton>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <details
        id="novo-profissional"
        className="staff-v4-create"
        open={!members.length}
      >
        <summary>
          <div className="staff-v4-create-copy">
            <span className="staff-v4-create-icon">
              <Icon name="plus" />
            </span>

            <div>
              <span className="staff-v4-eyebrow">
                NOVO PROFISSIONAL
              </span>
              <h2>Adicionar à comissão</h2>
              <p>
                O acesso Coach é individual e nunca compartilha o login do clube.
              </p>
            </div>
          </div>

          <span className="staff-v4-open-create">
            Abrir cadastro
            <Icon name="arrow" size={16} />
          </span>
        </summary>

        <div className="staff-v4-create-body">
          <form className="staff-create-form" action={createStaffMember}>
            <fieldset>
              <legend>Identificação profissional</legend>

              <label>
                Nome
                <input name="name" required />
              </label>

              <label>
                Função
                <input
                  name="roleTitle"
                  placeholder="Ex.: Treinador"
                  required
                />
              </label>

              <label>
                Telefone / WhatsApp
                <input name="phone" />
              </label>

              <label>
                Registro profissional
                <input
                  name="professionalRegistration"
                  placeholder="Ex.: CREF"
                />
              </label>

              <label>
                Formação
                <input
                  name="education"
                  placeholder="Ex.: Educação Física"
                />
              </label>

              <label>
                Especialidades
                <input
                  name="specialties"
                  placeholder="Ex.: Futsal, iniciação"
                />
              </label>

              <label>
                Data de entrada
                <input name="joinedAt" type="date" />
              </label>

              <div className="staff-photo-field">
                <ImageUpload
                  name="photoUrl"
                  label="Foto profissional"
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>Atuação e acesso</legend>

              <label>
                Categoria
                <select name="categoryId" defaultValue="">
                  <option value="">Geral / todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name} · {sportLabel(category.sport)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Modalidade
                <select name="sport" defaultValue="BOTH">
                  <option value="BOTH">Campo + Futsal</option>
                  <option value="FOOTBALL">Futebol de campo</option>
                  <option value="FUTSAL">Futsal</option>
                </select>
              </label>

              <label>
                E-mail do 11UP Coach
                <input name="coachEmail" type="email" />
              </label>

              <label>
                Mini bio
                <textarea name="bio" rows={5} />
              </label>

              <label className="check-row">
                <input type="checkbox" name="canManageCallUps" />
                <span>Permitir gerenciar convocações</span>
              </label>
            </fieldset>

            <button type="submit">Adicionar à comissão</button>
          </form>
        </div>
      </details>

      <section className="staff-v4-search-card">
        <header>
          <div>
            <span className="staff-v4-eyebrow">
              CENTRAL DA COMISSÃO
            </span>
            <h2>Localizar profissional</h2>
            <p>
              Busque por nome, função ou especialidade e refine por categoria,
              modalidade ou status.
            </p>
          </div>

          <span className="staff-v4-result-count">
            {filteredMembers.length} resultado(s)
          </span>
        </header>

        <form method="get" className="staff-v4-filter-form">
          <label className="staff-v4-search-field">
            <span>Buscar profissional</span>
            <div>
              <Icon name="search" size={18} />
              <input
                name="q"
                defaultValue={filters.q || ""}
                placeholder="Nome, função ou especialidade"
              />
            </div>
          </label>

          <label>
            <span>Categoria</span>
            <select
              name="category"
              defaultValue={categoryFilter}
            >
              <option value="ALL">Todas</option>
              <option value="GENERAL">Geral / todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} · {sportLabel(category.sport)}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Modalidade</span>
            <select name="sport" defaultValue={sportFilter}>
              <option value="ALL">Todas</option>
              <option value="FOOTBALL">Campo</option>
              <option value="FUTSAL">Futsal</option>
              <option value="BOTH">Campo + Futsal</option>
            </select>
          </label>

          <label>
            <span>Status</span>
            <select name="status" defaultValue={statusFilter}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </label>

          <button type="submit" className="staff-v4-filter-button">
            Filtrar
          </button>

          {hasFilters ? (
            <Link className="staff-v4-clear" href="/comissao">
              Limpar
            </Link>
          ) : null}
        </form>
      </section>

      <section className="staff-v4-roster">
        <header className="staff-v4-roster-head">
          <div>
            <span className="staff-v4-eyebrow">
              EQUIPE MULTIDISCIPLINAR
            </span>
            <h2>Profissionais encontrados</h2>
          </div>

          <span>
            Exibindo{" "}
            {filteredMembers.length ? pageStart + 1 : 0}
            {" – "}
            {Math.min(
              pageStart + PAGE_SIZE,
              filteredMembers.length,
            )}{" "}
            de {filteredMembers.length}
          </span>
        </header>

        {pageMembers.length ? (
          <>
            <div className="staff-v4-table-head">
              <span>Profissional</span>
              <span>Função</span>
              <span>Categoria</span>
              <span>Modalidade</span>
              <span>11UP Coach</span>
              <span>Contato</span>
              <span>Status</span>
              <span aria-hidden="true" />
            </div>

            <div className="staff-v4-list">
              {pageMembers.map((member) => {
                const coachLinked = Boolean(
                  member.coachEmail &&
                  activeCoachEmails.has(
                    member.coachEmail.toLowerCase(),
                  ),
                );

                return (
                  <article
                    className={`staff-v4-row ${
                      !member.active ? "inactive" : ""
                    }`}
                    key={member.id}
                  >
                    <Link
                      href={`/comissao/${member.id}`}
                      className="staff-v4-person"
                    >
                      <span className="staff-v4-avatar">
                        {member.photoUrl ? (
                          <img
                            src={member.photoUrl}
                            alt={member.name}
                          />
                        ) : (
                          <b>{initials(member.name)}</b>
                        )}
                      </span>

                      <div>
                        <strong>{member.name}</strong>
                        <small>
                          {member.education ||
                            member.specialties ||
                            "Dados profissionais não informados"}
                        </small>
                      </div>
                    </Link>

                    <span className="staff-v4-cell">
                      <b>{member.roleTitle}</b>
                    </span>

                    <span className="staff-v4-cell">
                      {member.category ? (
                        <b>{member.category.name}</b>
                      ) : (
                        <b>Geral</b>
                      )}
                    </span>

                    <span className="staff-v4-cell">
                      <span className="staff-v4-pill">
                        {sportLabel(member.sport)}
                      </span>
                    </span>

                    <span className="staff-v4-cell">
                      <span
                        className={`staff-v4-coach ${
                          coachLinked ? "linked" : ""
                        }`}
                      >
                        {coachLinked
                          ? "Vinculado"
                          : "Não vinculado"}
                      </span>
                    </span>

                    <span className="staff-v4-contact">
                      <b>
                        {member.phone ||
                          "Telefone não informado"}
                      </b>
                      <small>
                        {member.coachEmail ||
                          "E-mail Coach não informado"}
                      </small>
                    </span>

                    <span className="staff-v4-cell">
                      <span
                        className={`staff-v4-status ${
                          member.active ? "active" : ""
                        }`}
                      >
                        {member.active ? "Ativo" : "Inativo"}
                      </span>
                    </span>

                    <Link
                      className="staff-v4-open"
                      href={`/comissao/${member.id}`}
                      aria-label={`Abrir perfil de ${member.name}`}
                    >
                      <Icon name="arrow" size={17} />
                    </Link>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <nav
                className="staff-v4-pagination"
                aria-label="Paginação da comissão"
              >
                <Link
                  className={
                    currentPage === 1 ? "disabled" : ""
                  }
                  href={staffUrl({
                    ...paginationBase,
                    page: Math.max(1, currentPage - 1),
                  })}
                  aria-disabled={currentPage === 1}
                >
                  <Icon name="chevron-left" size={16} />
                  Anterior
                </Link>

                <div>
                  {pageNumbers.map((page, index) => {
                    const previous = pageNumbers[index - 1];
                    const showDots =
                      previous && page - previous > 1;

                    return (
                      <span key={page}>
                        {showDots ? <i>…</i> : null}
                        <Link
                          className={
                            page === currentPage
                              ? "is-active"
                              : ""
                          }
                          href={staffUrl({
                            ...paginationBase,
                            page,
                          })}
                        >
                          {page}
                        </Link>
                      </span>
                    );
                  })}
                </div>

                <Link
                  className={
                    currentPage === totalPages
                      ? "disabled"
                      : ""
                  }
                  href={staffUrl({
                    ...paginationBase,
                    page: Math.min(
                      totalPages,
                      currentPage + 1,
                    ),
                  })}
                  aria-disabled={
                    currentPage === totalPages
                  }
                >
                  Próxima
                  <Icon name="chevron-right" size={16} />
                </Link>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="staff-v4-empty">
            Nenhum profissional encontrado.
          </div>
        )}
      </section>

      {pageMembers.length ? (
        <section className="staff-v4-management-note">
          <span>
            Para editar dados, acessos ou inativar um profissional,
            abra o perfil individual.
          </span>
        </section>
      ) : null}
    </div>
  );
}
