import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function label(status: string) {
  return ({
    ACTIVE: "Ativo",
    COMPLIMENTARY: "Cortesia",
    SUSPENDED: "Suspenso",
    CANCELLED: "Cancelado",
  } as Record<string, string>)[status] || status;
}

export default async function OrganizationsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; deleted?: string; error?: string }>;
}) {
  await requireSuperAdmin();
  const query = await searchParams;
  const term = String(query.q || "").trim();
  const status = String(query.status || "ALL").toUpperCase();

  const organizations = await prisma.organization.findMany({
    where: {
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { publicName: { contains: term, mode: "insensitive" as const } },
              { slug: { contains: term, mode: "insensitive" as const } },
              { email: { contains: term, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(status !== "ALL" ? { accessStatus: status } : {}),
    },
    include: {
      subscription: true,
      _count: { select: { users: true, athletes: true, categories: true, matches: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Organizações</h1>
          <p className="muted">Clientes, planos, cortesias, suspensão e limpeza de cadastros inativos.</p>
        </div>
        <span className="badge">{organizations.length} organização(ões)</span>
      </div>

      {query.deleted ? <div className="admin-success">Organização excluída definitivamente.</div> : null}
      {query.error ? <div className="notice error">Não foi possível concluir a ação solicitada.</div> : null}

      <form className="admin-entity-filter-v171" method="get">
        <input name="q" defaultValue={term} placeholder="Buscar por nome, slug ou e-mail" />
        <select name="status" defaultValue={status}>
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="COMPLIMENTARY">Cortesia</option>
          <option value="SUSPENDED">Suspensos</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
        <button className="btn" type="submit">Filtrar</button>
        {(term || status !== "ALL") ? (
          <Link className="btn-secondary" href="/admin/organizacoes">Limpar</Link>
        ) : null}
      </form>

      <section className="card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Organização</th>
                <th>Plano</th>
                <th>Atletas</th>
                <th>Status</th>
                <th>Cortesia</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr key={org.id}>
                  <td>
                    <strong>{org.publicName || org.name}</strong>
                    <div className="help">{org.slug}</div>
                  </td>
                  <td>
                    {org.subscription?.plan ?? "Sem plano"}
                    <div className="help">{org.subscription?.status ?? "—"}</div>
                  </td>
                  <td>
                    {org._count.athletes}
                    <div className="help">{org._count.users} usuário(s)</div>
                  </td>
                  <td>
                    <span className={`badge access-${org.accessStatus.toLowerCase()}`}>
                      {label(org.accessStatus)}
                    </span>
                    {!org.active ? <div className="help">Cadastro inativo</div> : null}
                  </td>
                  <td>
                    {org.accessStatus === "COMPLIMENTARY"
                      ? org.complimentaryUntil
                        ? `até ${org.complimentaryUntil.toLocaleDateString("pt-BR")}`
                        : "sem prazo"
                      : "—"}
                  </td>
                  <td>
                    <Link href={`/admin/organizacoes/${org.id}`} className="btn-secondary btn-small">
                      Gerenciar
                    </Link>
                  </td>
                </tr>
              ))}

              {!organizations.length ? (
                <tr><td colSpan={6} className="admin-empty-cell-v171">Nenhuma organização encontrada.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
