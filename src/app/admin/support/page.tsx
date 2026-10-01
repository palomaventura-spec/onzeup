import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatDate(value: Date) {
  return value.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatDuration(startedAt: Date, endedAt: Date | null) {
  const end = endedAt ?? new Date();
  const totalMinutes = Math.max(
    0,
    Math.round((end.getTime() - startedAt.getTime()) / 60000),
  );

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes ? `${hours}h ${minutes}min` : `${hours}h`;
}

export default async function AdminSupportPage() {
  await requireSuperAdmin();

  const sessions = await prisma.adminSupportSession.findMany({
    include: {
      adminUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      organization: {
        select: {
          id: true,
          name: true,
          publicName: true,
          slug: true,
        },
      },
    },
    orderBy: {
      startedAt: "desc",
    },
    take: 200,
  });

  const activeSessions = sessions.filter(
    (session) => !session.endedAt,
  );

  const history = sessions.filter(
    (session) => session.endedAt,
  );

  return (
    <main className="admin-access-page admin-support-page">
      <style>{`
        .admin-support-page {
          color: #e5e7eb;
        }

        .admin-support-page h1,
        .admin-support-page h2,
        .admin-support-page strong {
          color: #f8fafc !important;
        }

        .admin-support-page .muted {
          color: #cbd5e1 !important;
        }

        .admin-support-page .page-eyebrow {
          color: #9be20d !important;
        }

        .admin-support-page .table th {
          color: #94a3b8 !important;
        }

        .admin-support-page .table td {
          color: #e5e7eb !important;
        }

        .admin-support-page .table tr {
          border-color: #334155 !important;
        }
      `}</style>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">SUPORTE 11UP</span>
          <h1>Histórico de acessos</h1>
          <p className="muted">
            Acompanhe quem entrou remotamente em cada organização,
            quando entrou, quando saiu e o motivo do atendimento.
          </p>
        </div>
      </div>

      <section className="card admin-access-card">
        <div>
          <span className="page-eyebrow">AGORA</span>
          <h2>Sessões ativas</h2>
          <p className="muted">
            Acessos de suporte que ainda não foram encerrados.
          </p>
        </div>

        {activeSessions.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Suporte</th>
                  <th>Organização</th>
                  <th>Motivo</th>
                  <th>Entrada</th>
                  <th>Duração</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {activeSessions.map((session) => (
                  <tr key={session.id}>
                    <td>
                      <strong>
                        {session.adminUser.name ||
                          session.adminUser.email ||
                          "Super Admin"}
                      </strong>
                    </td>

                    <td>
                      <strong>
                        {session.organization.publicName ||
                          session.organization.name}
                      </strong>
                    </td>

                    <td>
                      {session.reason || "Sem motivo informado"}
                    </td>

                    <td>{formatDate(session.startedAt)}</td>

                    <td>
                      {formatDuration(
                        session.startedAt,
                        session.endedAt,
                      )}
                    </td>

                    <td>
                      <strong>Ativa</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Nenhuma sessão de suporte ativa no momento.
          </p>
        )}
      </section>

      <section className="card admin-access-card">
        <div>
          <span className="page-eyebrow">AUDITORIA</span>
          <h2>Histórico</h2>
          <p className="muted">
            Últimos acessos de suporte registrados pela plataforma.
          </p>
        </div>

        {history.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Suporte</th>
                  <th>Organização</th>
                  <th>Motivo</th>
                  <th>Entrada</th>
                  <th>Saída</th>
                  <th>Duração</th>
                </tr>
              </thead>

              <tbody>
                {history.map((session) => (
                  <tr key={session.id}>
                    <td>
                      {session.adminUser.name ||
                        session.adminUser.email ||
                        "Super Admin"}
                    </td>

                    <td>
                      {session.organization.publicName ||
                        session.organization.name}
                    </td>

                    <td>
                      {session.reason || "Sem motivo informado"}
                    </td>

                    <td>{formatDate(session.startedAt)}</td>

                    <td>
                      {session.endedAt
                        ? formatDate(session.endedAt)
                        : "—"}
                    </td>

                    <td>
                      {formatDuration(
                        session.startedAt,
                        session.endedAt,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Ainda não existem sessões de suporte encerradas.
          </p>
        )}
      </section>
    </main>
  );
}