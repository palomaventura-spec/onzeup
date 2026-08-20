import ImageUpload from "@/components/ImageUpload";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { createStaffMember, deleteStaffMember } from "./actions";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ coachInvite?: string }> }) {
  const user = await requireOrganizationUser();
  const query = await searchParams;

  const [members, categories, coachAccesses] = await Promise.all([
    prisma.staffMember.findMany({
      where: { organizationId: user.organizationId },
      include: { category: true },
      orderBy: [{ roleTitle: "asc" }, { name: "asc" }],
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Comissão técnica</h1>
          <p className="muted">Cadastre coordenadores, treinadores, auxiliares e outros profissionais.</p>
        </div>
        <span className="badge">{members.length} membro(s)</span>
      </div>

      {query.coachInvite === "sent" ? <div className="notice">Convite de vínculo enviado ao ONZEUP Coach. O acesso só será ativado depois que o profissional aceitar.</div> : null}
      {query.coachInvite === "not-found" ? <div className="notice error">O membro foi adicionado à comissão, mas nenhum ONZEUP Coach foi encontrado com esse e-mail. O profissional pode criar o perfil Coach gratuitamente e depois ser vinculado.</div> : null}

      <section className="card coach-club-access-explainer">
        <span className="page-eyebrow">ACESSO INDIVIDUAL</span>
        <h2>Treinador não compartilha o login do clube.</h2>
        <p className="muted">Informe o mesmo e-mail usado no ONZEUP Coach. O profissional recebe um convite no próprio dashboard e, ao aceitar, acessa somente a equipe/categoria e as permissões liberadas.</p>
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Novo membro</h2>
          <form className="form" action={createStaffMember}>
            <label>
              Nome
              <input name="name" placeholder="Nome completo" required />
            </label>
            <label>
              Função
              <input name="roleTitle" placeholder="Ex.: Treinador" required />
            </label>
            <label>
              Categoria
              <select name="categoryId" defaultValue="">
                <option value="">Geral / todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
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
              <input name="coachEmail" type="email" placeholder="coach@email.com" />
              <small className="field-help">Use o mesmo e-mail da conta ONZEUP Coach. O sistema enviará um convite de vínculo; o acesso não é ativado automaticamente.</small>
            </label>
            <label className="check-row">
              <input type="checkbox" name="canManageCallUps" />
              <span>Permitir gerenciar convocações desta categoria</span>
            </label>
            <ImageUpload name="photoUrl" label="Foto (JPEG/PNG/WEBP)" />
            <label>
              Mini bio
              <textarea name="bio" rows={4} placeholder="Experiência, função ou apresentação." />
            </label>
            <button type="submit">Adicionar à comissão</button>
          </form>
        </section>

        <section className="card">
          <h2>Equipe cadastrada</h2>
          {members.length === 0 ? (
            <div className="empty">Nenhum membro da comissão cadastrado.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Função</th>
                    <th>Categoria</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td><strong>{member.name}</strong></td>
                      <td>{member.roleTitle}</td>
                      <td>{member.category?.name ?? "Geral"}</td>
                      <td>
                        <div className="actions">
                          <Link className="btn btn-secondary btn-small" href={`/comissao/${member.id}`}>
                            Editar
                          </Link>
                          <form className="inline-form" action={deleteStaffMember}>
                            <input type="hidden" name="id" value={member.id} />
                            <button className="btn-danger btn-small" type="submit">Excluir</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card coach-access-admin-list">
        <div className="section-title-row">
          <div><span className="page-eyebrow">ONZEUP COACH</span><h2>Acessos vinculados</h2></div>
          <span className="badge">{coachAccesses.length}</span>
        </div>
        {coachAccesses.length ? (
          <div className="coach-access-list">
            {coachAccesses.map((access) => (
              <article key={access.id}>
                <div>
                  <strong>{access.coach.professionalName || access.coach.name}</strong>
                  <p>{access.coach.owner.email} • {access.category?.name || "Todas as categorias"}</p>
                </div>
                <div>
                  <span>{access.roleTitle || "Comissão técnica"}</span>
                  <b>{access.active ? "Vínculo ativo" : "Aguardando aceite"}</b>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="muted">Nenhum ONZEUP Coach vinculado a esta organização.</p>}
      </section>
    </>
  );
}
