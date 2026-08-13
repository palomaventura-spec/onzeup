import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrganizationUser } from "@/lib/auth";
import { approvePlayerLink, rejectPlayerLink } from "./actions";

export default async function PlayerLinksPage() {
  const user = await requireOrganizationUser();

  const links = await prisma.playerAthleteLink.findMany({
    where: {
      athlete: { organizationId: user.organizationId },
    },
    include: {
      player: {
        include: {
          guardian: { include: { user: true } },
        },
      },
      athlete: { include: { category: true } },
    },
    orderBy: [{ verified: "asc" }, { createdAt: "desc" }],
  });

  const pending = links.filter((link) => !link.verified);
  const verified = links.filter((link) => link.verified);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">ONZE PLAYER ↔ CLUBE</span>
          <h1>Vínculos Player</h1>
          <p className="muted">
            A família controla o Player. Você apenas confirma se aquele perfil corresponde ao atleta cadastrado no clube.
          </p>
        </div>
        <span className="badge">{pending.length} pendente(s)</span>
      </div>

      <section className="card">
        <div className="section-title-row">
          <div><span className="page-eyebrow">REVISAR</span><h2>Solicitações</h2></div>
        </div>

        <div className="player-link-approval-list">
          {pending.map((link) => (
            <article key={link.id}>
              <div className="approval-player">
                {link.player.photoUrl ? <img src={link.player.photoUrl} alt="" /> : <span>{(link.player.nickname || link.player.name).slice(0,2).toUpperCase()}</span>}
                <section>
                  <small>ONZE PLAYER</small>
                  <strong>{link.player.nickname || link.player.name}</strong>
                  <p>{link.player.guardian.user.name} • {link.player.guardian.user.email}</p>
                </section>
              </div>

              <div className="approval-arrow">↔</div>

              <div className="approval-athlete">
                {link.athlete.photoUrl ? <img src={link.athlete.photoUrl} alt="" /> : <span>{(link.athlete.nickname || link.athlete.name).slice(0,2).toUpperCase()}</span>}
                <section>
                  <small>CADASTRO DO CLUBE</small>
                  <strong>{link.athlete.nickname || link.athlete.name}</strong>
                  <p>{link.athlete.category?.name || "Sem categoria"} • {link.athlete.position || "Atleta"}</p>
                </section>
              </div>

              <div className="actions">
                <form action={approvePlayerLink}>
                  <input type="hidden" name="id" value={link.id} />
                  <button type="submit">Confirmar vínculo</button>
                </form>
                <form action={rejectPlayerLink}>
                  <input type="hidden" name="id" value={link.id} />
                  <button type="submit" className="btn-danger">Recusar</button>
                </form>
              </div>
            </article>
          ))}

          {!pending.length ? (
            <div className="empty compact-empty">Nenhum vínculo aguardando aprovação.</div>
          ) : null}
        </div>
      </section>

      <section className="card" style={{ marginTop: 18 }}>
        <div className="section-title-row">
          <div><span className="page-eyebrow">CONFIRMADOS</span><h2>Perfis vinculados</h2></div>
        </div>

        <div className="verified-link-admin-grid">
          {verified.map((link) => (
            <article key={link.id}>
              <div>
                <strong>{link.athlete.nickname || link.athlete.name}</strong>
                <span>{link.athlete.category?.name || "Sem categoria"}</span>
              </div>
              <Link target="_blank" href={`/player/${link.player.slug}`}>
                Abrir ONZE Player ↗
              </Link>
            </article>
          ))}
          {!verified.length ? <div className="empty compact-empty">Nenhum vínculo verificado ainda.</div> : null}
        </div>
      </section>
    </>
  );
}
