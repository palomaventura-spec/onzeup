import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { updateCategory } from "../actions";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function fmt(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default async function CategoryHubPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireOrganizationUser();
  const { id } = await params;

  const category = await prisma.category.findFirst({
    where: { id, organizationId: user.organizationId },
    include: {
      athletes: {
        where: { active: true },
        orderBy: [{ jerseyNumber: "asc" }, { name: "asc" }],
      },
      staffMembers: { orderBy: [{ roleTitle: "asc" }, { name: "asc" }] },
      trainingSchedules: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
      matches: {
        where: { status: "SCHEDULED", startsAt: { gte: new Date() } },
        orderBy: { startsAt: "asc" },
        take: 5,
      },
    },
  });

  if (!category) notFound();

  return (
    <>
      <div className="page-head category-hub-head">
        <div>
          <span className="page-eyebrow">CENTRAL DA CATEGORIA</span>
          <h1>{category.name}</h1>
          <p className="muted">
            {category.birthYear ? `Ano de referência ${category.birthYear}` : "Categoria de formação"}
          </p>
        </div>
        <div className="actions">
          <Link className="btn-secondary" href="/categorias">Todas as categorias</Link>
          <Link className="btn" href={`/o/${user.organization?.slug}/categorias/${category.id}`} target="_blank">
            Ver página pública
          </Link>
        </div>
      </div>

      <div className="category-hub-stats">
        <div><strong>{category.athletes.length}</strong><span>Atletas</span></div>
        <div><strong>{category.staffMembers.length}</strong><span>Comissão</span></div>
        <div><strong>{category.trainingSchedules.length}</strong><span>Treinos</span></div>
        <div><strong>{category.matches.length}</strong><span>Próximos jogos</span></div>
      </div>

      <div className="category-hub-layout">
        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">ELENCO</span><h2>Atletas</h2></div>
            <Link href="/atletas">Gerenciar</Link>
          </div>

          <div className="mini-player-grid">
            {category.athletes.map((athlete) => (
              <Link href={`/atletas/${athlete.id}`} key={athlete.id} className="mini-player-card">
                <div className="mini-player-photo">
                  {athlete.photoUrl ? <img src={athlete.photoUrl} alt="" /> : <span>{(athlete.nickname || athlete.name).slice(0,2).toUpperCase()}</span>}
                  {athlete.jerseyNumber != null ? <b>#{athlete.jerseyNumber}</b> : null}
                </div>
                <div>
                  <strong>{athlete.nickname || athlete.name}</strong>
                  <span>{athlete.position || "Atleta"}</span>
                </div>
              </Link>
            ))}
          </div>
          {!category.athletes.length ? <div className="empty compact-empty">Nenhum atleta ativo.</div> : null}
        </section>

        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">COMISSÃO</span><h2>Equipe técnica</h2></div>
            <Link href="/comissao">Gerenciar</Link>
          </div>

          <div className="category-staff-list">
            {category.staffMembers.map((member) => (
              <Link href={`/comissao/${member.id}`} key={member.id}>
                <div className="staff-mini-avatar">{member.photoUrl ? <img src={member.photoUrl} alt="" /> : member.name.slice(0,2).toUpperCase()}</div>
                <span><strong>{member.name}</strong><small>{member.roleTitle}</small></span>
                <b>→</b>
              </Link>
            ))}
          </div>
          {!category.staffMembers.length ? <div className="empty compact-empty">Nenhuma comissão vinculada.</div> : null}
        </section>

        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">ROTINA</span><h2>Treinos</h2></div>
            <Link href="/treinos">Gerenciar</Link>
          </div>
          <div className="category-training-admin">
            {category.trainingSchedules.map((training) => (
              <Link href={`/treinos/${training.id}`} key={training.id}>
                <strong>{WEEKDAYS[training.weekday]}</strong>
                <span>{training.startTime} – {training.endTime}</span>
                <small>{training.location || "Local a definir"}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-title-row">
            <div><span className="page-eyebrow">COMPETIÇÃO</span><h2>Próximos jogos</h2></div>
            <Link href="/jogos">Gerenciar</Link>
          </div>
          <div className="category-match-admin">
            {category.matches.map((match) => (
              <Link href={`/jogos/${match.id}`} key={match.id}>
                <span>{fmt(match.startsAt)}</span>
                <strong>× {match.opponent}</strong>
                <small>{match.competition || "Jogo"} • {match.location || "Local a definir"}</small>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="section-title-row">
          <div><span className="page-eyebrow">CONFIGURAÇÃO</span><h2>Dados da categoria</h2></div>
        </div>
        <form className="form" action={updateCategory}>
          <input type="hidden" name="id" value={category.id} />
          <label>Nome<input name="name" defaultValue={category.name} required /></label>
          <label>Ano de referência<input name="birthYear" type="number" defaultValue={category.birthYear ?? ""} /></label>
          <button type="submit">Salvar alterações</button>
        </form>
      </section>
    </>
  );
}
