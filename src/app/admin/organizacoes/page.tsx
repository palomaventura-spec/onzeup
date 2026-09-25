import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function planLabel(plan: string | null | undefined) {
  return ({ STARTER: "Essencial", PRO: "Pro", BUSINESS: "Elite" } as Record<string, string>)[plan || ""] || plan || "Sem plano";
}

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
    <main className="onzeup-admin-plans">
      <style>{`
        .onzeup-admin-plans { color: #e5e7eb; background: #111827; padding: clamp(12px, 2vw, 24px); border-radius: 16px; min-width: 0; }
        .onzeup-admin-plans h1, .onzeup-admin-plans h2, .onzeup-admin-plans strong,
        .onzeup-admin-plans label { color: #f8fafc !important; }
        .onzeup-admin-plans .card { background: #1e293b !important; color: #e5e7eb; border: 1px solid #475569; }
        .onzeup-admin-plans .muted, .onzeup-admin-plans .help,
        .onzeup-admin-plans .page-eyebrow { color: #cbd5e1 !important; }
        .onzeup-admin-plans input, .onzeup-admin-plans select {
          background: #0f172a !important; color: #f8fafc !important; border: 1px solid #64748b; max-width: 100%; min-width: 0; color-scheme: dark;
        }
        .onzeup-admin-plans input::placeholder { color: #94a3b8; }
        .onzeup-admin-plans .table th, .onzeup-admin-plans .table td { color: #e5e7eb !important; background: #1e293b; }
        .onzeup-admin-plans .table-wrap { overflow-x: auto; }
        .onzeup-admin-plans .admin-plan-form { display: flex; gap: 16px; flex-wrap: wrap; align-items: end; margin-top: 16px; }
        .onzeup-admin-plans .admin-plan-form label { display: grid; gap: 8px; flex: 1 1 220px; }
        .onzeup-admin-plans .admin-plan-form select { width: 100%; padding: 12px; border-radius: 8px; }
        .onzeup-admin-plans .admin-plan-card { margin-bottom: 20px; }
        @media (max-width: 640px) {
          .onzeup-admin-plans .admin-access-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .onzeup-admin-plans .admin-access-form { display: grid; grid-template-columns: minmax(0, 1fr); }
          .onzeup-admin-plans .admin-access-form > * { grid-column: 1; min-width: 0; }
          .onzeup-admin-plans .admin-plan-form button { width: 100%; }
        }
      `}</style>

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
                    {planLabel(org.subscription?.plan)}
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
    </main>
  );
}
