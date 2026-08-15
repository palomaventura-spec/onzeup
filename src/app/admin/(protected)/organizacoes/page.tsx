import { requireSuperAdmin } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function OrganizationsAdminPage() {
  await requireSuperAdmin();
  const organizations = await prisma.organization.findMany({
    include: {
      subscription: true,
      _count: {
        select: {
          users: true,
          athletes: true,
          categories: true,
          matches: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Organizações</h1>
          <p className="muted">Clientes e contas da plataforma.</p>
        </div>
        <span className="badge">{organizations.length} organização(ões)</span>
      </div>

      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Organização</th>
                <th>Tipo</th>
                <th>Plano</th>
                <th>Atletas</th>
                <th>Categorias</th>
                <th>Domínio</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map(org => (
                <tr key={org.id}>
                  <td>
                    <strong>{org.publicName || org.name}</strong>
                    <div className="help">{org.slug}</div>
                  </td>
                  <td>{org.type}</td>
                  <td>{org.subscription?.plan ?? "Sem plano"}</td>
                  <td>{org._count.athletes}</td>
                  <td>{org._count.categories}</td>
                  <td>{org.customDomain || "—"}</td>
                  <td><span className="badge">{org.active ? "Ativa" : "Inativa"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
