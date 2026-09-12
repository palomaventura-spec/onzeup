import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
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
    case "ACTIVE":
      return "Conta ativa";
    case "PENDING_VERIFICATION":
      return "Aguardando verificação";
    case "INACTIVE":
      return "Conta inativa";
    case "SUSPENDED":
      return "Conta suspensa";
    default:
      return status || "—";
  }
}

export default async function AdminCoachesPage({
  searchParams,
}: PageProps) {
  await requireSuperAdmin();

  const params = searchParams ? await searchParams : {};

  const term = (params.q || "").trim().toLowerCase();
  const status = (params.status || "ALL").toUpperCase();

  /*
   * O CoachProfile possui ownerUserId, mas não possui
   * uma relação Prisma chamada ownerUser.
   *
   * Por isso buscamos profiles e users separadamente.
   */
  const coaches = await prisma.coachProfile.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });

  const ownerUserIds = coaches
    .map((coach) => coach.ownerUserId)
    .filter(Boolean);

  const users =
    ownerUserIds.length > 0
      ? await prisma.user.findMany({
          where: {
            id: {
              in: ownerUserIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
            active: true,
            accountStatus: true,
          },
        })
      : [];

  const usersById = new Map(users.map((user) => [user.id, user]));

  const filteredCoaches = coaches.filter((coach) => {
    const user = usersById.get(coach.ownerUserId);

    /*
     * Filtro de status.
     * O ativo/inativo pertence ao User.
     */
    if (status === "ACTIVE" && !user?.active) {
      return false;
    }

    if (status === "INACTIVE" && user?.active !== false) {
      return false;
    }

    /*
     * Busca.
     */
    if (term) {
      const searchable = [
        coach.name,
        coach.professionalName,
        coach.slug,
        coach.currentClub,
        coach.roleTitle,
        user?.name,
        user?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(term)) {
        return false;
      }
    }

    return true;
  });

  return (
    <main className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">SUPER ADMIN</p>
          <h1>Coaches</h1>
          <p className="help">
            Gerencie os treinadores cadastrados na plataforma ONZEUP.
          </p>
        </div>
      </div>

      {params.saved === "deactivated" && (
        <div className="admin-notice success">
          Coach desativado com sucesso.
        </div>
      )}

      {params.saved === "reactivated" && (
        <div className="admin-notice success">
          Coach reativado com sucesso.
        </div>
      )}

      {params.deleted === "1" && (
        <div className="admin-notice success">
          Coach excluído definitivamente.
        </div>
      )}

      {params.error === "must_deactivate" && (
        <div className="admin-notice error">
          Desative o Coach antes de excluí-lo.
        </div>
      )}

      {params.error === "has_links" && (
        <div className="admin-notice error">
          Este Coach possui vínculos e não pode ser excluído.
        </div>
      )}

      {params.error === "not_found" && (
        <div className="admin-notice error">
          Coach não encontrado.
        </div>
      )}

      <section className="admin-card">
        <form method="GET" className="admin-filter-row admin-coaches-filters">
          <input
            type="search"
            name="q"
            defaultValue={params.q || ""}
            placeholder="Buscar por nome, e-mail, clube..."
          />

          <select name="status" defaultValue={status}>
            <option value="ALL">Todos</option>
            <option value="ACTIVE">Ativos</option>
            <option value="INACTIVE">Inativos</option>
          </select>

          <button type="submit" className="btn btn-primary">
            Buscar
          </button>

          {(params.q || status !== "ALL") && (
            <a href="/admin/coaches" className="btn btn-secondary">
              Limpar
            </a>
          )}
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-section-heading">
          <div>
            <h2>Coaches cadastrados</h2>
            <p className="help">
              {filteredCoaches.length} resultado
              {filteredCoaches.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {filteredCoaches.length === 0 ? (
          <div className="admin-empty">
            Nenhum Coach encontrado.
          </div>
        ) : (
          <div className="admin-table-wrap admin-coaches-table-wrap">
            <table className="admin-table admin-coaches-table">
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

                  return (
                    <tr key={coach.id}>
                      <td>
                        <strong>
                          {coach.professionalName ||
                            coach.name ||
                            user?.name ||
                            "Coach"}
                        </strong>

                        <div className="help">
                          @{coach.slug}
                        </div>
                      </td>

                      <td>
                        {user?.email || "—"}

                        <div className="help">
                          {accountStatusLabel(user?.accountStatus)}
                        </div>
                      </td>

                      <td>
                        <strong>
                          {coach.roleTitle || "Treinador"}
                        </strong>

                        <div className="help">
                          {coach.currentClub || "Sem clube informado"}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            isActive
                              ? "admin-status-active"
                              : "admin-status-inactive"
                          }`}
                        >
                          {isActive ? "Ativo" : "Inativo"}
                        </span>
                      </td>

                      <td>
                        <div>
                          {coach.isPublic ? "Perfil público" : "Privado"}
                        </div>

                        <div className="help">
                          {coach.directoryVisible
                            ? "No catálogo"
                            : "Fora do catálogo"}
                        </div>
                      </td>

                      <td>
                        <div className="admin-actions">
                          {isActive ? (
                            <form action={deactivateCoach}>
                              <input
                                type="hidden"
                                name="coachId"
                                value={coach.id}
                              />

                              <button
                                type="submit"
                                className="btn btn-secondary"
                              >
                                Desativar
                              </button>
                            </form>
                          ) : (
                            <>
                              <form action={reactivateCoach}>
                                <input
                                  type="hidden"
                                  name="coachId"
                                  value={coach.id}
                                />

                                <button
                                  type="submit"
                                  className="btn btn-secondary"
                                >
                                  Reativar
                                </button>
                              </form>

                              <form action={deleteInactiveCoach}>
                                <input
                                  type="hidden"
                                  name="coachId"
                                  value={coach.id}
                                />

                                <button
                                  type="submit"
                                  className="btn btn-danger"
                                >
                                  Excluir
                                </button>
                              </form>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}