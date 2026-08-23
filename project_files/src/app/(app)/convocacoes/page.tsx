import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import ModuleTour from "@/components/help/ModuleTour";

function fmt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CallUpsPage() {
  const user = await requireOrganizationUser();

  const matches = await prisma.match.findMany({
    where: {
      organizationId: user.organizationId,
      status: "SCHEDULED",
    },
    include: {
      category: true,
      callUps: true,
    },
    orderBy: { startsAt: "asc" },
  });

  return (
    <>
      <div className="page-head">
        <ModuleTour module="convocacoes" />
        <div>
          <h1>Convocações</h1>
          <p className="muted">
            Selecione atletas por jogo e envie a convocação de forma privada aos responsáveis.
          </p>
        </div>
      </div>

      <section className="card">
        <h2>Jogos agendados</h2>

        {matches.length === 0 ? (
          <div className="empty">Nenhum jogo agendado para convocação.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Categoria</th>
                  <th>Adversário</th>
                  <th>Convocados</th>
                  <th>Confirmados</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((match) => {
                  const confirmed = match.callUps.filter(c => c.status === "CONFIRMED").length;
                  return (
                    <tr key={match.id}>
                      <td>{fmt(match.startsAt)}</td>
                      <td>{match.category.name}</td>
                      <td><strong>{match.opponent}</strong></td>
                      <td>{match.callUps.length}</td>
                      <td>{confirmed}</td>
                      <td>
                        <Link className="btn btn-secondary btn-small" href={`/convocacoes/${match.id}`}>
                          Gerenciar
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}