import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { updateStaffMember } from "../actions";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrganizationUser();
  const { id } = await params;

  const [member, categories] = await Promise.all([
    prisma.staffMember.findFirst({
      where: { id, organizationId: user.organizationId },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!member) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Editar comissão</h1>
          <p className="muted">Atualize os dados públicos do profissional.</p>
        </div>
        <Link className="btn btn-secondary" href="/comissao">Voltar</Link>
      </div>

      <section className="card">
        <form className="form" action={updateStaffMember}>
          <input type="hidden" name="id" value={member.id} />
          <label>
            Nome
            <input name="name" defaultValue={member.name} required />
          </label>
          <label>
            Função
            <input name="roleTitle" defaultValue={member.roleTitle} required />
          </label>
          <label>
            Categoria
            <select name="categoryId" defaultValue={member.categoryId ?? ""}>
              <option value="">Geral / todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>
          <label>
            URL da foto
            <input name="photoUrl" type="url" defaultValue={member.photoUrl ?? ""} />
          </label>
          <label>
            Mini bio
            <textarea name="bio" rows={5} defaultValue={member.bio ?? ""} />
          </label>
          <button type="submit">Salvar alterações</button>
        </form>
      </section>
    </>
  );
}
