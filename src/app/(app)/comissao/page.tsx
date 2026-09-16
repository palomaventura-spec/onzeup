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
  status?: string;
  coachInvite?: string;
};

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

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<StaffFilters>;
}) {
  const user = await requireOrganizationUser();
  const filters = await searchParams;
  const query = (filters.q || "").trim().toLocaleLowerCase("pt-BR");
  const categoryFilter = filters.category || "ALL";
  const statusFilter =
    filters.status === "INACTIVE"
      ? "INACTIVE"
      : filters.status === "ACTIVE"
        ? "ACTIVE"
        : "ALL";

  const [members, categories, coachAccesses] = await Promise.all([
    prisma.staffMember.findMany({
      where: { organizationId: user.organizationId },
      include: { category: true },
      orderBy: [{ active: "desc" }, { roleTitle: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
    prisma.coachOrganizationAccess.findMany({
      where: { organizationId: user.organizationId },
      include: { coach: { include: { owner: true } }, category: true },
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
      `${member.name} ${member.roleTitle} ${member.education || ""} ${member.specialties || ""}`.toLocaleLowerCase(
        "pt-BR",
      );
    return (
      (!query || searchable.includes(query)) &&
      (categoryFilter === "ALL" ||
        (categoryFilter === "GENERAL"
          ? !member.categoryId
          : member.categoryId === categoryFilter)) &&
      (statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" ? member.active : !member.active))
    );
  });
  const activeCount = members.filter((item) => item.active).length;
  const linkedCount = members.filter(
    (item) =>
      item.coachEmail && activeCoachEmails.has(item.coachEmail.toLowerCase()),
  ).length;

  const notices: Record<string, string> = {
    sent: "Convite enviado ao ONZEUP Coach. O acesso será ativado após o aceite.",
    saved:
      "Profissional salvo. O vínculo será localizado quando a conta Coach usar o mesmo e-mail.",
    approved: "Solicitação do Coach aprovada.",
    rejected: "Solicitação do Coach recusada.",
  };

  return (
    <>
      <div className="page-head staff-premium-head">
        <div>
          <span className="page-eyebrow">EQUIPE MULTIDISCIPLINAR</span>
          <h1>Comissão técnica</h1>
          <p className="muted">
            Profissionais, responsabilidades e acessos organizados por
            categoria.
          </p>
        </div>
        <span className="badge">{activeCount} profissional(is) ativo(s)</span>
      </div>
      {filters.coachInvite && notices[filters.coachInvite] ? (
        <div className="notice">{notices[filters.coachInvite]}</div>
      ) : null}

      <section className="staff-kpis">
        <article>
          <small>PROFISSIONAIS</small>
          <strong>{activeCount}</strong>
          <span>ativos na organização</span>
        </article>
        <article>
          <small>CATEGORIAS ATENDIDAS</small>
          <strong>
            {
              new Set(
                members
                  .filter((item) => item.categoryId)
                  .map((item) => item.categoryId),
              ).size
            }
          </strong>
          <span>com equipe vinculada</span>
        </article>
        <article>
          <small>ONZEUP COACH</small>
          <strong>{linkedCount}</strong>
          <span>vínculos ativos</span>
        </article>
        <article className={coachRequests.length ? "attention" : ""}>
          <small>SOLICITAÇÕES</small>
          <strong>{coachRequests.length}</strong>
          <span>aguardando análise</span>
        </article>
      </section>

      {coachRequests.length ? (
        <section className="card staff-request-panel">
          <div className="section-title-row">
            <div>
              <span className="page-eyebrow">SOLICITAÇÕES COACH</span>
              <h2>Aguardando aprovação</h2>
            </div>
            <span className="badge">{coachRequests.length}</span>
          </div>
          <div className="coach-access-list">
            {coachRequests.map((access) => (
              <article key={access.id}>
                <div>
                  <strong>
                    {access.coach.professionalName || access.coach.name}
                  </strong>
                  <p>
                    {access.coach.owner.email} •{" "}
                    {access.category?.name || "Todas as categorias"}
                  </p>
                </div>
                <div className="coach-invite-actions">
                  <form action={approveCoachAccessRequest}>
                    <input type="hidden" name="accessId" value={access.id} />
                    <PendingSubmitButton
                      className="btn btn-small"
                      pendingText="Aprovando..."
                    >
                      Aprovar
                    </PendingSubmitButton>
                  </form>
                  <form action={rejectCoachAccessRequest}>
                    <input type="hidden" name="accessId" value={access.id} />
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

      <details className="card staff-create-drawer" open={!members.length}>
        <summary>
          <div>
            <span className="page-eyebrow">NOVO PROFISSIONAL</span>
            <h2>Adicionar à comissão</h2>
            <p>
              O acesso Coach será individual e nunca compartilhará o login do
              clube.
            </p>
          </div>
          <span className="btn">＋ Novo profissional</span>
        </summary>
        <form className="staff-create-form" action={createStaffMember}>
          <fieldset>
            <legend>Identificação profissional</legend>
            <label>
              Nome
              <input name="name" required />
            </label>
            <label>
              Função
              <input name="roleTitle" placeholder="Ex.: Treinador" required />
            </label>
            <label>
              Telefone / WhatsApp
              <input name="phone" />
            </label>
            <label>
              Registro profissional
              <input name="professionalRegistration" placeholder="Ex.: CREF" />
            </label>
            <label>
              Formação
              <input name="education" placeholder="Ex.: Educação Física" />
            </label>
            <label>
              Especialidades
              <input name="specialties" placeholder="Ex.: Futsal, iniciação" />
            </label>
            <label>
              Data de entrada
              <input name="joinedAt" type="date" />
            </label>
            <div className="staff-photo-field">
              <ImageUpload name="photoUrl" label="Foto profissional" />
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
                    {category.name}
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
              E-mail do ONZEUP Coach
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
      </details>

      <section className="card staff-filter-bar">
        <form method="get">
          <label className="staff-search">
            Buscar
            <input
              name="q"
              defaultValue={filters.q || ""}
              placeholder="Nome, função ou especialidade"
            />
          </label>
          <label>
            Categoria
            <select name="category" defaultValue={categoryFilter}>
              <option value="ALL">Todas</option>
              <option value="GENERAL">Geral</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select name="status" defaultValue={statusFilter}>
              <option value="ALL">Todos</option>
              <option value="ACTIVE">Ativos</option>
              <option value="INACTIVE">Inativos</option>
            </select>
          </label>
          <button className="btn-secondary" type="submit">
            Filtrar
          </button>
          <Link href="/comissao">Limpar</Link>
        </form>
        <span>{filteredMembers.length} resultado(s)</span>
      </section>

      <section className="staff-premium-grid">
        {filteredMembers.map((member) => {
          const coachLinked = Boolean(
            member.coachEmail &&
            activeCoachEmails.has(member.coachEmail.toLowerCase()),
          );
          return (
            <article
              className={`staff-profile-card ${!member.active ? "inactive" : ""}`}
              key={member.id}
            >
              <div className="staff-profile-photo">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.name} />
                ) : (
                  <span>{initials(member.name)}</span>
                )}
                <i className={member.active ? "active" : ""}>
                  {member.active ? "Ativo" : "Inativo"}
                </i>
              </div>
              <div className="staff-profile-body">
                <small>{member.category?.name || "ATUAÇÃO GERAL"}</small>
                <h2>{member.name}</h2>
                <strong>{member.roleTitle}</strong>
                <p>
                  {member.bio ||
                    member.education ||
                    "Dados profissionais ainda não informados."}
                </p>
                <div className="staff-tags">
                  <span>{sportLabel(member.sport)}</span>
                  {member.professionalRegistration ? (
                    <span>{member.professionalRegistration}</span>
                  ) : null}
                  {member.specialties ? (
                    <span>{member.specialties}</span>
                  ) : null}
                </div>
                <div className="staff-contact">
                  <span>{member.phone || "Telefone não informado"}</span>
                  <span>
                    {member.coachEmail || "E-mail Coach não informado"}
                  </span>
                </div>
                <div className="staff-profile-footer">
                  <b className={coachLinked ? "linked" : ""}>
                    {coachLinked ? "Coach vinculado ✓" : "Coach não vinculado"}
                  </b>
                  <Link
                    className="btn btn-small"
                    href={`/comissao/${member.id}`}
                  >
                    Abrir perfil
                  </Link>
                </div>
                <details>
                  <summary>Gerenciar</summary>
                  <form action={deleteStaffMember}>
                    <input type="hidden" name="id" value={member.id} />
                    <button className="btn-danger btn-small" type="submit">
                      Excluir profissional
                    </button>
                  </form>
                </details>
              </div>
            </article>
          );
        })}
      </section>
      {!filteredMembers.length ? (
        <div className="card empty">Nenhum profissional encontrado.</div>
      ) : null}
    </>
  );
}
