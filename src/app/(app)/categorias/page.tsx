import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { createCategory, deleteCategory } from "./actions";

export default async function CategoriesPage() {
  const user = await requireOrganizationUser();

  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ birthYear: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          athletes: true,
          staffMembers: true,
          matches: true,
        },
      },
    },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Categorias</h1>
          <p className="muted">Organize as equipes por faixa etária ou nomenclatura própria.</p>
        </div>
        <span className="badge">{categories.length} cadastrada(s)</span>
      </div>

      <div className="two-col">
        <section className="card">
          <h2>Nova categoria</h2>
          <form className="form" action={createCategory}>
            <label>
              Nome
              <input name="name" placeholder="Ex.: Sub-9" required />
            </label>
            <label>
              Ano de referência
              <input name="birthYear" type="number" min="2000" max="2035" placeholder="Ex.: 2018" />
            </label>
            <p className="help">O ano é opcional. Você pode criar categorias como “Iniciação” ou “Equipe A”.</p>
            <button type="submit">Criar categoria</button>
          </form>
        </section>

        <section className="card">
          <h2>Categorias cadastradas</h2>
          {categories.length === 0 ? (
            <div className="empty">Nenhuma categoria cadastrada ainda.</div>
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Categoria</th>
                    <th>Ano</th>
                    <th>Atletas</th>
                    <th>Comissão</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td><strong>{category.name}</strong></td>
                      <td>{category.birthYear ?? "—"}</td>
                      <td>{category._count.athletes}</td>
                      <td>{category._count.staffMembers}</td>
                      <td>
                        <div className="actions">
                          <Link className="btn btn-secondary btn-small" href={`/categorias/${category.id}`}>
                            Editar
                          </Link>
                          <form className="inline-form" action={deleteCategory}>
                            <input type="hidden" name="id" value={category.id} />
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
