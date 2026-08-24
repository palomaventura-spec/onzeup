import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import AdminConfirmSubmit from "../AdminConfirmSubmit";
import {
  deactivatePlayer,
  deleteInactivePlayer,
  reactivatePlayer,
} from "./actions";

function isInactive(status: string) {
  return status === "INACTIVE";
}

function statusLabel(status: string) {
  if (status === "INACTIVE") return "Inativo";
  if (status === "AWAITING_PAYMENT") return "Aguardando pagamento";
  if (status === "PAST_DUE") return "Em atraso";
  return "Ativo";
}

export default async function AdminPlayers({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    plan?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  await requireSuperAdmin();
  const query = await searchParams;
  const term = String(query.q || "").trim();
  const status = String(query.status || "ALL").toUpperCase();
  const plan = String(query.plan || "ALL").toUpperCase();

  const players = await prisma.playerProfile.findMany({
    where: {
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { nickname: { contains: term, mode: "insensitive" as const } },
              { slug: { contains: term, mode: "insensitive" as const } },
              { currentClub: { contains: term, mode: "insensitive" as const } },
              {
                guardian: {
                  user: {
                    email: { contains: term, mode: "insensitive" as const },
                  },
                },
              },
            ],
          }
        : {}),
      ...(status === "ACTIVE" ? { NOT: { planStatus: "INACTIVE" } } : {}),
      ...(status === "INACTIVE" ? { planStatus: "INACTIVE" } : {}),
      ...(plan === "FREE" || plan === "PREMIUM" ? { plan } : {}),
    },
    include: {
      guardian: { include: { user: true } },
      _count: { select: { payments: true, athleteLinks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>ONZEUP Players</h1>
          <p className="muted">
            Perfis esportivos, planos, responsáveis e limpeza de cadastros inativos.
          </p>
        </div>
        <span className="badge">{players.length} perfil(is)</span>
      </div>

      {query.saved ? (
        <div className="admin-success">
          {query.saved === "deactivated"
            ? "Player desativado. Ele saiu do catálogo e agora pode ser excluído definitivamente."
            : "Player reativado com sucesso."}
        </div>
      ) : null}

      {query.deleted ? (
        <div className="admin-success">Player excluído definitivamente.</div>
      ) : null}

      {query.error ? (
        <div className="notice error">
          {query.error === "must_deactivate"
            ? "Para excluir um Player, desative o perfil primeiro."
            : "Não foi possível concluir a ação solicitada."}
        </div>
      ) : null}

      <form className="admin-entity-filter-v171" method="get">
        <input
          name="q"
          defaultValue={term}
          placeholder="Buscar atleta, slug, clube ou e-mail do responsável"
        />
        <select name="status" defaultValue={status}>
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
        </select>
        <select name="plan" defaultValue={plan}>
          <option value="ALL">Todos os planos</option>
          <option value="FREE">Free</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <button className="btn" type="submit">Filtrar</button>
        {(term || status !== "ALL" || plan !== "ALL") ? (
          <Link className="btn-secondary" href="/admin/players">Limpar</Link>
        ) : null}
      </form>

      <section className="card">
        <div className="table-wrap">
          <table className="table admin-entity-table-v171">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Responsável</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Visibilidade</th>
                <th>Vínculos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const inactive = isInactive(p.planStatus);
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="help">{p.nickname || p.slug}</div>
                    </td>
                    <td>
                      {p.guardian.user.name}
                      <div className="help">{p.guardian.user.email}</div>
                    </td>
                    <td>
                      <span className="badge">{p.plan}</span>
                      {p.isComplimentary ? <div className="help">Cortesia</div> : null}
                    </td>
                    <td>
                      <span className={`badge ${inactive ? "admin-status-inactive" : "admin-status-active"}`}>
                        {statusLabel(p.planStatus)}
                      </span>
                    </td>
                    <td>
                      {p.isPublic ? "Público" : "Privado"}
                      <div className="help">
                        {p.directoryVisible ? "No catálogo" : "Fora do catálogo"}
                      </div>
                    </td>
                    <td>
                      {p._count.athleteLinks} vínculo(s)
                      <div className="help">{p._count.payments} pagamento(s)</div>
                    </td>
                    <td>
                      <div className="admin-row-actions-v171">
                        {p.isPublic ? (
                          <Link href={`/player/${p.slug}`} className="btn-secondary btn-small">
                            Abrir
                          </Link>
                        ) : null}

                        {!inactive ? (
                          <form action={deactivatePlayer}>
                            <input type="hidden" name="playerId" value={p.id} />
                            <AdminConfirmSubmit
                              label="Desativar"
                              confirmText={`Desativar ${p.name}? O perfil sairá do catálogo e deixará de ser público.`}
                            />
                          </form>
                        ) : (
                          <>
                            <form action={reactivatePlayer}>
                              <input type="hidden" name="playerId" value={p.id} />
                              <button className="btn-secondary btn-small" type="submit">Reativar</button>
                            </form>
                            <form action={deleteInactivePlayer}>
                              <input type="hidden" name="playerId" value={p.id} />
                              <AdminConfirmSubmit
                                label="Excluir"
                                className="btn-danger-v171 btn-small"
                                confirmText={`EXCLUIR DEFINITIVAMENTE ${p.name}? Esta ação não pode ser desfeita. Os pagamentos permanecem no histórico sem vínculo com o Player.`}
                              />
                            </form>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!players.length ? (
                <tr>
                  <td colSpan={7} className="admin-empty-cell-v171">Nenhum Player encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
