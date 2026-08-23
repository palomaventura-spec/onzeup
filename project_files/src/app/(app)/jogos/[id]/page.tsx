import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { updateMatch } from "../actions";

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toTimeInput(date: Date) {
  return date.toISOString().slice(11, 16);
}

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrganizationUser();
  const { id } = await params;

  const [match, categories] = await Promise.all([
    prisma.match.findFirst({
      where: { id, organizationId: user.organizationId },
      include: { category: true, callUps: true },
    }),
    prisma.category.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!match) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Editar jogo</h1>
          <p className="muted">Atualize informações e resultado da partida.</p>
        </div>
        <Link className="btn btn-secondary" href="/jogos">Voltar</Link>
      </div>

      <section className="card match-callup-hub">
        <div>
          <span className="page-eyebrow">CONVOCAÇÃO</span>
          <h2>Atletas convocados: {match.callUps.length}</h2>
          <p className="muted">Selecione atletas, acompanhe confirmações e envie a convocação deste jogo.</p>
        </div>
        <Link className="btn" href={`/convocacoes/${match.id}`}>Gerenciar convocação</Link>
      </section>

      <section className="card">
        <form className="form" action={updateMatch}>
          <input type="hidden" name="id" value={match.id} />

          <label>
            Categoria
            <select name="categoryId" defaultValue={match.categoryId} required>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </label>

          <label>
            Competição
            <input name="competition" defaultValue={match.competition ?? ""} />
          </label>

          <label>
            Adversário
            <input name="opponent" defaultValue={match.opponent} required />
          </label>

          <label>
            Data
            <input name="matchDate" type="date" defaultValue={toDateInput(match.startsAt)} required />
          </label>

          <label>
            Horário
            <input name="matchTime" type="time" defaultValue={toTimeInput(match.startsAt)} required />
          </label>

          <label>
            Local
            <input name="location" defaultValue={match.location ?? ""} />
          </label>

          <label>
            Mandante / visitante
            <select name="homeAway" defaultValue={match.homeAway ?? ""}>
              <option value="">Não informado</option>
              <option value="HOME">Mandante</option>
              <option value="AWAY">Visitante</option>
              <option value="NEUTRAL">Campo neutro</option>
            </select>
          </label>

          <label>
            Status
            <select name="status" defaultValue={match.status}>
              <option value="SCHEDULED">Agendado</option>
              <option value="FINISHED">Finalizado</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>

          <label>
            Gols da organização
            <input name="goalsFor" type="number" min="0" defaultValue={match.goalsFor ?? ""} />
          </label>

          <label>
            Gols do adversário
            <input name="goalsAgainst" type="number" min="0" defaultValue={match.goalsAgainst ?? ""} />
          </label>

          <label>
            Observações
            <textarea name="notes" rows={5} defaultValue={match.notes ?? ""} />
          </label>

          <button type="submit">Salvar alterações</button>
        </form>
      </section>
    </>
  );
}
