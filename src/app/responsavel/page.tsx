import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import ImageUpload from "@/components/ImageUpload";
import PlayerActions from "@/components/PlayerActions";
import DemoBanner from "@/components/DemoBanner";
import {
  deletePlayer,
  linkMatchingClubAthletes,
  saveGuardianProfile,
  savePlayer,
} from "./actions";

export default async function GuardianPortal({
  searchParams,
}: {
  searchParams: Promise<{ player?: string; new?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") redirect("/dashboard");

  const query = await searchParams;

  const guardian = await prisma.guardianProfile.findUnique({
    where: { userId: user.id },
    include: {
      players: {
        include: {
          athleteLinks: {
            include: {
              athlete: {
                include: {
                  organization: true,
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const players = guardian?.players || [];
  const selected =
    query.new === "1"
      ? null
      : players.find((player) => player.id === query.player) || players[0] || null;

  return (
    <main className="guardian-portal">
      {user.email.startsWith("demo-player-") ? <DemoBanner kind="player" /> : null}
      <header className="guardian-portal-nav">
        <Link href="/responsavel" className="player-brand">ONZE<span>UP</span> <b>PLAYER</b></Link>
        <div>
          <span>{user.name}</span>
          <form action="/api/auth/logout" method="post">
            <button className="btn-secondary btn-small" type="submit">Sair</button>
          </form>
        </div>
      </header>

      <div className="guardian-portal-container">
        <section className="player-welcome">
          <div>
            <span className="page-eyebrow">ÁREA DA FAMÍLIA</span>
            <h1>ONZE Player</h1>
            <p>Crie e gerencie o perfil esportivo dos seus filhos. O conteúdo pertence à família.</p>
          </div>
          <Link className="btn" href="/responsavel?new=1">+ Novo perfil</Link>
        </section>

        <div className="player-portal-layout">
          <aside className="player-profile-sidebar">
            <div className="player-sidebar-title">MEUS ATLETAS</div>
            {players.map((player) => (
              <Link
                className={`player-switcher ${selected?.id === player.id ? "active" : ""}`}
                href={`/responsavel?player=${player.id}`}
                key={player.id}
              >
                <div>
                  {player.photoUrl ? <img src={player.photoUrl} alt="" /> : <span>{(player.nickname || player.name).slice(0,2).toUpperCase()}</span>}
                </div>
                <section>
                  <strong>{player.nickname || player.name}</strong>
                  <small>{player.position || "Atleta"}</small>
                </section>
                <b>→</b>
              </Link>
            ))}

            {!players.length ? (
              <div className="player-sidebar-empty">Nenhum perfil criado.</div>
            ) : null}

            <div className="guardian-contact-card">
              <strong>Contato da família</strong>
              <form action={saveGuardianProfile}>
                <input name="phone" defaultValue={guardian?.phone || ""} placeholder="WhatsApp do responsável" />
                <button className="btn-secondary btn-small">Salvar contato</button>
              </form>
            </div>
          </aside>

          <section className="player-editor-area">
            <div className="player-editor-head">
              <div>
                <span className="page-eyebrow">{selected ? "EDITAR PERFIL" : "NOVO PERFIL"}</span>
                <h2>{selected ? (selected.nickname || selected.name) : "Criar ONZE Player"}</h2>
              </div>
              <div className="player-editor-actions">
                <span className={`publication-status ${selected?.isPublic ? "public" : "private"}`}>
                  {selected?.isPublic ? "● Público" : "● Privado"}
                </span>
                <PlayerActions
                  url={selected ? `/player/${selected.slug}` : "#"}
                  enabled={Boolean(selected?.isPublic)}
                />
              </div>
            </div>

            <form className="player-editor-form" action={savePlayer}>
              {selected ? <input type="hidden" name="id" value={selected.id} /> : null}

              <div className="player-editor-grid">
                <div className="player-photo-editor">
                  <ImageUpload
                    name="photoUrl"
                    defaultValue={selected?.photoUrl}
                    label="Foto principal (JPEG/PNG/WEBP)"
                  />
                  <ImageUpload
                    name="coverUrl"
                    defaultValue={selected?.coverUrl}
                    label="Imagem de capa (opcional)"
                  />
                  {selected?.photoUrl ? <img src={selected.photoUrl} alt="" /> : <div className="player-photo-placeholder">FOTO</div>}
                </div>

                <div className="form">
                  <label>Nome completo <small className="field-help">Este será o nome principal no perfil público.</small><input name="name" required defaultValue={selected?.name || ""} placeholder="Ex.: Gustavo Aguiar" /></label>
                  <label>Apelido / nome esportivo <small className="field-help">Opcional. Aparece abaixo do nome completo.</small><input name="nickname" defaultValue={selected?.nickname || ""} placeholder="Ex.: G9" /></label>
                  <label>Endereço público <small className="field-help">Ex.: gustavo-aguiar</small><input name="slug" defaultValue={selected?.slug || ""} placeholder="gustavo-aguiar" /></label>

                  <div className="two-field-row">
                    <label>Ano de nascimento<input name="birthYear" type="number" defaultValue={selected?.birthYear || ""} placeholder="2018" /></label>
                    <label>Nacionalidade<input name="nationality" defaultValue={selected?.nationality || ""} placeholder="Brasil • Portugal" /></label>
                  </div>

                  <div className="two-field-row">
                    <label>Posição principal<input name="position" defaultValue={selected?.position || ""} placeholder="Atacante" /></label>
                    <label>Posição secundária<input name="secondaryPosition" defaultValue={selected?.secondaryPosition || ""} placeholder="Pivô" /></label>
                  </div>

                  <div className="two-field-row">
                    <label>Altura<input name="height" defaultValue={selected?.height || ""} placeholder="1,34 m" /></label>
                    <label>Peso<input name="weight" defaultValue={selected?.weight || ""} placeholder="28 kg" /></label>
                  </div>

                  <div className="two-field-row">
                    <label>Pé dominante<input name="dominantFoot" defaultValue={selected?.dominantFoot || ""} placeholder="Direito" /></label>
                    <label>Clube atual<input name="currentClub" defaultValue={selected?.currentClub || ""} placeholder="Nome do clube" /></label>
                  </div>

                  <label>Instagram<input name="instagram" defaultValue={selected?.instagram || ""} placeholder="@perfil" /></label>
                  <label>Template
                    <select name="template" defaultValue={selected?.template || "PREMIUM_DARK"}>
                      <option value="PREMIUM_DARK">Premium Dark</option>
                      <option value="CLEAN_LIGHT">Clean Light</option>
                    </select>
                  </label>
                </div>
              </div>

              <label>Apresentação
                <textarea name="bio" rows={5} defaultValue={selected?.bio || ""} placeholder="Apresentação esportiva do atleta..." />
              </label>

              <section className="player-editor-section">
                <div>
                  <span className="page-eyebrow">NÚMEROS</span>
                  <h3>Estatísticas principais</h3>
                  <p className="muted">Opcional. Preencha apenas os números que deseja destacar.</p>
                </div>
                <div className="four-field-row">
                  <label>Jogos<input name="matches" type="number" min="0" defaultValue={selected?.matches || ""} placeholder="62" /></label>
                  <label>Gols<input name="goals" type="number" min="0" defaultValue={selected?.goals || ""} placeholder="128" /></label>
                  <label>Assistências<input name="assists" type="number" min="0" defaultValue={selected?.assists || ""} placeholder="0" /></label>
                  <label>Títulos / artilharias<input name="titles" type="number" min="0" defaultValue={selected?.titles || ""} placeholder="2" /></label>
                </div>
              </section>

              <section className="player-editor-section">
                <div className="two-field-row">
                  <label>Carreira — uma linha por passagem
                    <textarea name="careerHistory" rows={6} defaultValue={selected?.careerHistory || ""} placeholder={"2026 — atual | Botafogo\n2025 | Arouca Futsal"} />
                  </label>
                  <label>Conquistas — uma por linha
                    <textarea name="achievements" rows={6} defaultValue={selected?.achievements || ""} placeholder={"Artilheiro Campeonato X\nCampeão Torneio Y"} />
                  </label>
                </div>
              </section>

              <div className="two-field-row">
                <label>Vídeos — um link por linha
                  <textarea name="videos" rows={6} defaultValue={selected?.videos || ""} placeholder="https://youtube.com/..." />
                </label>
                <label>Galeria — uma URL de imagem por linha
                  <textarea name="gallery" rows={6} defaultValue={selected?.gallery || ""} placeholder="https://..." />
                </label>
              </div>

              <label className="check player-public-toggle">
                <input type="checkbox" name="isPublic" defaultChecked={selected?.isPublic} />
                <span>
                  <strong>Perfil público</strong>
                  <small>Permite que o perfil seja acessado pelo endereço /player/...</small>
                </span>
              </label>

              <div className="actions">
                <button type="submit">Salvar perfil</button>
                {selected ? (
                  <button type="submit" formAction={deletePlayer} className="btn-danger">
                    Excluir perfil
                  </button>
                ) : null}
              </div>
            </form>

            {selected ? (
              <section className="player-club-links">
                <div className="section-title-row">
                  <div>
                    <span className="page-eyebrow">CLUBES</span>
                    <h2>Vínculos esportivos</h2>
                  </div>
                  <form action={linkMatchingClubAthletes}>
                    <input type="hidden" name="playerId" value={selected.id} />
                    <button className="btn-secondary" type="submit">Buscar vínculo pelo meu e-mail</button>
                  </form>
                </div>

                {selected.athleteLinks.length ? (
                  <div className="player-link-list">
                    {selected.athleteLinks.map((link) => (
                      <article key={link.id}>
                        <div>
                          {link.athlete.organization.logoUrl ? <img src={link.athlete.organization.logoUrl} alt="" /> : <span>CL</span>}
                        </div>
                        <section>
                          <strong>{link.athlete.organization.publicName || link.athlete.organization.name}</strong>
                          <p>{link.athlete.category?.name || "Sem categoria"} • {link.athlete.position || "Atleta"}</p>
                        </section>
                        <b className={link.verified ? "verified" : ""}>
                          {link.verified ? "Vínculo verificado" : "Aguardando verificação"}
                        </b>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Nenhum clube vinculado. Se o clube cadastrou o seu e-mail como responsável, use o botão acima para localizar registros compatíveis.
                  </p>
                )}
              </section>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
