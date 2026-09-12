import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import AdminConfirmSubmit from "../AdminConfirmSubmit";
import {
  deactivateCoach,
  reactivateCoach,
  deleteInactiveCoach,
} from "./actions";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
};

function accountStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "ACTIVE": return "Conta ativa";
    case "PENDING_VERIFICATION": return "Aguardando verificação";
    case "INACTIVE": return "Conta inativa";
    case "SUSPENDED": return "Conta suspensa";
    default: return status || "—";
  }
}

export default async function AdminCoachesPage({ searchParams }: PageProps) {
  await requireSuperAdmin();

  const params = searchParams ? await searchParams : {};
  const term = (params.q || "").trim().toLowerCase();
  const status = (params.status || "ALL").toUpperCase();

  const coaches = await prisma.coachProfile.findMany({ orderBy: { createdAt: "desc" } });
  const ownerUserIds = coaches.map((coach) => coach.ownerUserId).filter(Boolean);
  const users = ownerUserIds.length
    ? await prisma.user.findMany({
        where: { id: { in: ownerUserIds } },
        select: { id: true, name: true, email: true, active: true, accountStatus: true },
      })
    : [];

  const usersById = new Map(users.map((user) => [user.id, user]));

  const filteredCoaches = coaches.filter((coach) => {
    const user = usersById.get(coach.ownerUserId);
    if (status === "ACTIVE" && !user?.active) return false;
    if (status === "PENDING" && user?.accountStatus !== "PENDING_VERIFICATION") return false;
    if (status === "INACTIVE" && user?.accountStatus !== "INACTIVE") return false;

    if (term) {
      const searchable = [
        coach.name,
        coach.professionalName,
        coach.slug,
        coach.currentClub,
        coach.roleTitle,
        user?.name,
        user?.email,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!searchable.includes(term)) return false;
    }

    return true;
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>ONZEUP Coaches</h1>
          <p className="muted">Perfis profissionais, visibilidade e gestão de cadastros de treinadores.</p>
        </div>
        <span className="badge">{filteredCoaches.length} coach(es)</span>
      </div>

      {params.saved ? (
        <div className="admin-success">
          {params.saved === "deactivated" ? "Coach desativado com sucesso." : "Coach reativado com sucesso."}
        </div>
      ) : null}

      {params.deleted === "1" ? <div className="admin-success">Coach excluído definitivamente.</div> : null}

      {params.error ? (
        <div className="notice error">
          {params.error === "must_deactivate"
            ? "Desative o Coach antes de excluí-lo."
            : params.error === "verification_required"
              ? "Esta conta ainda precisa confirmar o e-mail. A reativação manual não substitui a verificação."
            : params.error === "has_links"
              ? "Este Coach possui vínculos e não pode ser excluído."
              : params.error === "not_found"
                ? "Coach não encontrado."
                : "Não foi possível concluir a ação solicitada."}
        </div>
      ) : null}

      <form className="admin-entity-filter-v171" method="get">
        <input name="q" defaultValue={params.q || ""} placeholder="Buscar nome, e-mail, clube ou slug" />
        <select name="status" defaultValue={status}>
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="PENDING">Aguardando confirmação</option>
          <option value="INACTIVE">Inativos</option>
        </select>
        <button className="btn" type="submit">Filtrar</button>
        {(params.q || status !== "ALL") ? <Link className="btn-secondary" href="/admin/coaches">Limpar</Link> : null}
      </form>

      <section className="card">
        <div className="table-wrap">
          <table className="table admin-entity-table-v171">
            <thead>
              <tr>
                <th>Coach</th>
                <th>E-mail</th>
                <th>Atuação</th>
                <th>Status</th>
                <th>Visibilidade</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoaches.map((coach) => {
                const user = usersById.get(coach.ownerUserId);
                const isActive = user?.active === true;
                const isPending = user?.accountStatus === "PENDING_VERIFICATION";
                const isInactive = user?.accountStatus === "INACTIVE";

                return (
                  <tr key={coach.id}>
                    <td>
                      <strong>{coach.professionalName || coach.name || user?.name || "Coach"}</strong>
                      <div className="help">@{coach.slug}</div>
                    </td>
                    <td>
                      {user?.email || "—"}
                      <div className="help">{accountStatusLabel(user?.accountStatus)}</div>
                    </td>
                    <td>
                      <strong>{coach.roleTitle || "Treinador"}</strong>
                      <div className="help">{coach.currentClub || "Sem clube informado"}</div>
                    </td>
                    <td>
                      <span className={`badge ${isActive ? "admin-status-active" : "admin-status-inactive"}`}>
                        {isPending ? "Aguardando e-mail" : isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      {coach.isPublic ? "Público" : "Privado"}
                      <div className="help">{coach.directoryVisible ? "No catálogo" : "Fora do catálogo"}</div>
                    </td>
                    <td>
                      <div className="admin-row-actions-v171">
                        {coach.isPublic ? (
                          <Link href={`/coach-profile/${coach.slug}`} className="btn-secondary btn-small">Abrir</Link>
                        ) : null}

                        {isActive ? (
                          <form action={deactivateCoach}>
                            <input type="hidden" name="coachId" value={coach.id} />
                            <AdminConfirmSubmit
                              label="Desativar"
                              confirmText={`Desativar ${coach.professionalName || coach.name}? O acesso do Coach será bloqueado e o perfil sairá do catálogo.`}
                            />
                          </form>
                        ) : (
                          <>
                            {isInactive ? (
                              <form action={reactivateCoach}>
                                <input type="hidden" name="coachId" value={coach.id} />
                                <button className="btn-secondary btn-small" type="submit">Reativar</button>
                              </form>
                            ) : null}
                            <form action={deleteInactiveCoach}>
                              <input type="hidden" name="coachId" value={coach.id} />
                              <AdminConfirmSubmit
                                label="Excluir"
                                className="btn-danger-v171 btn-small"
                                confirmText={`EXCLUIR DEFINITIVAMENTE ${coach.professionalName || coach.name}? Esta ação não pode ser desfeita.`}
                              />
                            </form>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!filteredCoaches.length ? (
                <tr><td colSpan={6} className="admin-empty-cell-v171">Nenhum Coach encontrado.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
