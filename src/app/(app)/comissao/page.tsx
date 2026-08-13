import ImageUpload from "@/components/ImageUpload";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { createStaffMember, deleteStaffMember } from "./actions";

export default async function StaffPage() {
  const user = await requireOrganizationUser();

  const [members, categories] = await Promise.all([
    prisma.staffMember.findMany({
      where: { organizationId: user.organizationId },
      include: { category: true },
      orderBy: [{ roleTitle: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
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
    </>
  );
}
