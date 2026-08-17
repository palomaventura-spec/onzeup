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
  respondToPlayerCallUp,
  saveGuardianProfile,
  savePlayer,
} from "./actions";
import { createPlayerPremiumPix } from "@/app/checkout/actions";
import PendingSubmitButton from "@/components/PendingSubmitButton";

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
                  memberships: {
                    where: { status: "ACTIVE" },
                    include: { organization: true, category: true },
                    orderBy: { createdAt: "asc" },
                  },
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

  const linkedAthleteIds = selected?.athleteLinks.map(link => link.athleteId) || [];
  const upcomingCallUps = linkedAthleteIds.length
    ? await prisma.callUp.findMany({
        where: {
          athleteId: { in: linkedAthleteIds },
          match: { startsAt: { gte: new Date() } },
        },
        include: {
          athlete: true,
          organization: true,
          match: { include: { category: true } },
        },
        orderBy: { match: { startsAt: "asc" } },
        take: 12,
      })
    : [];

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
            <h1>ONZEUP Player</h1>
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
                  <small>{player.position || "Atleta"} • {player.plan === "PREMIUM" ? "Premium" : "Free"}</small>
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
                <h2>{selected ? (selected.nickname || selected.name) : "Criar ONZEUP Player"}</h2>
                {selected ? <span className={`player-plan-badge ${selected.plan === "PREMIUM" ? "premium" : "free"}`}>{selected.plan === "PREMIUM" ? "★ PREMIUM" : "FREE"}</span> : null}
              </div>
              <div className="player-editor-actions">
                <span className={`publication-status ${selected?.isPublic ? "public" : "private"}`}>
                  {selected?.isPublic ? "● Público" : "● Privado"}
                </span>
                <PlayerActions
                  url={selected ? `https://players.onzeup.com.br/${selected.slug}` : "#"}
                  enabled={Boolean(selected?.isPublic)}
                />
              </div>
            </div>

            {selected && selected.plan !== "PREMIUM" ? (
              <section className="player-upgrade-card">
                <div>
                  <span className="page-eyebrow">UPGRADE PARA PREMIUM</span>
                  <h3>Transforme o perfil em um site esportivo completo.</h3>
                  <p>Vários vídeos, galeria, conquistas e visual Premium. Pagamento via PIX.</p>
                </div>
                <form action={createPlayerPremiumPix}>
                  <input type="hidden" name="playerId" value={selected.id} />
                  <strong>R$ 29,90/mês</strong>
                  <button className="btn">Assinar Premium via PIX</button>
                </form>
              </section>
            ) : null}

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
                  <label>Nome completo <small className="field-help">Este será o nome principal no perfil público.</small><input name="name" required defaultValue={selected?.name || ""} placeholder="Ex.: João Silva" /></label>
                  <label>Apelido / nome esportivo <small className="field-help">Opcional. Aparece abaixo do nome completo.</small><input name="nickname" defaultValue={selected?.nickname || ""} placeholder="Ex.: JS10" /></label>
                  <label>Endereço público <small className="field-help">Ex.: joao-silva</small><input name="slug" defaultValue={selected?.slug || ""} placeholder="joao-silva" /></label>

                  <div className="two-field-row">
                    <label>Ano de nascimento<input name="birthYear" type="number" defaultValue={selected?.birthYear || ""} placeholder="2015" /></label>
                    <label>Nacionalidade<input name="nationality" defaultValue={selected?.nationality || ""} placeholder="Brasil" /></label>
                  </div>

                  <div className="two-field-row">
                    <label>Posição principal<input name="position" defaultValue={selected?.position || ""} placeholder="Meia" /></label>
                    <label>Posição secundária<input name="secondaryPosition" defaultValue={selected?.secondaryPosition || ""} placeholder="Ala" /></label>
                  </div>

                  <div className="two-field-row">
                    <label>Altura<input name="height" defaultValue={selected?.height || ""} placeholder="1,42 m" /></label>
                    <label>Peso<input name="weight" defaultValue={selected?.weight || ""} placeholder="36 kg" /></label>
                  </div>

                  <div className="two-field-row">
                    <label>Pé dominante<input name="dominantFoot" defaultValue={selected?.dominantFoot || ""} placeholder="Direito ou Esquerdo" /></label>
                    <label>Clube atual<input name="currentClub" defaultValue={selected?.currentClub || ""} placeholder="Ex.: Clube Exemplo" /></label>
                  </div>

                  <div className="two-field-row">
                    <label>Instagram <small className="field-help">Cole @usuario ou o link completo.</small><input name="instagram" defaultValue={selected?.instagram || ""} placeholder="@atletaexemplo" /></label>
                    <label>Site externo <small className="field-help">Opcional.</small><input name="websiteUrl" type="url" defaultValue={selected?.websiteUrl || ""} placeholder="https://..." /></label>
                  </div>
                  <input type="hidden" name="plan" value={selected?.plan || "FREE"} />
                  <label>Plano atual
                    <input value={selected?.plan === "PREMIUM" ? "ONZEUP Player Premium" : "ONZEUP Player Free"} readOnly />
                    <small className="field-help">O upgrade para Premium é ativado após a confirmação do pagamento.</small>
                  </label>
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
                  <label>Jogos<input name="matches" type="number" min="0" defaultValue={selected?.matches || ""} placeholder="24" /></label>
                  <label>Gols<input name="goals" type="number" min="0" defaultValue={selected?.goals || ""} placeholder="18" /></label>
                  <label>Assistências<input name="assists" type="number" min="0" defaultValue={selected?.assists || ""} placeholder="0" /></label>
                  <label>Títulos / artilharias<input name="titles" type="number" min="0" defaultValue={selected?.titles || ""} placeholder="1" /></label>
                </div>
              </section>

              <section className="player-editor-section">
                <div className="two-field-row">
                  <label>Carreira — uma linha por passagem
                    <textarea name="careerHistory" rows={6} defaultValue={selected?.careerHistory || ""} placeholder={"2026 — atual | Clube Exemplo\n2025 | Projeto Esportivo"} />
                  </label>
                  <label>Conquistas — uma por linha
                    <textarea name="achievements" rows={6} defaultValue={selected?.achievements || ""} placeholder={"Destaque do torneio\nCampeão regional"} />
                  </label>
                </div>
              </section>

              <div className="two-field-row">
                <label>Vídeos — um link por linha
                  <small className="field-help">{selected?.plan === "PREMIUM" ? "Premium: vários vídeos." : "Free: o primeiro link será utilizado."}</small>
                  <textarea name="videos" rows={6} defaultValue={selected?.videos || ""} placeholder={"https://youtube.com/watch?v=...\nhttps://youtu.be/..."} />
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
<label className="check-row"><input type="checkbox" name="directoryVisible" defaultChecked={selected?.directoryVisible} /><span>Permitir que este atleta apareça no catálogo público ONZEUP Players</span></label>

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
              <section className="player-preview-card">
                <div>
                  <span className="page-eyebrow">PRÉ-VISUALIZAÇÃO</span>
                  <h3>Veja como o perfil aparece para o público.</h3>
                  <p className="muted">O mesmo painel atende Free e Premium. O layout público muda conforme o plano.</p>
                </div>
                <div>
                  <Link className="btn-secondary" href="/gustavo-aguiar-free" target="_blank">Modelo Free ↗</Link>
                  <Link className="btn-secondary" href="/gustavo-aguiar" target="_blank">Modelo Premium ↗</Link>
                  {selected.isPublic ? <a className="btn" href={`https://players.onzeup.com.br/${selected.slug}`} target="_blank">Abrir perfil publicado ↗</a> : null}
                </div>
              </section>
            ) : null}

            {selected ? (
              <section className="player-family-agenda">
                <div className="section-title-row">
                  <div>
                    <span className="page-eyebrow">MINHA ROTINA</span>
                    <h2>Agenda esportiva do atleta</h2>
                    <p className="muted">Convocações de todas as organizações vinculadas aparecem juntas para a família, sem misturar os dados internos dos clubes.</p>
                  </div>
                </div>

                {upcomingCallUps.length ? (
                  <div className="player-agenda-list">
                    {upcomingCallUps.map(call => (
                      <article key={call.id}>
                        <div>
                          <small>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(call.match.startsAt)}</small>
                          <strong>{call.organization.publicName || call.organization.name}</strong>
                          <p>{call.match.category.name} • x {call.match.opponent}</p>
                        </div>
                        <div className="player-callup-response">
                          <b className={`callup-family-status ${call.status.toLowerCase()}`}>
                            {call.status === "CONFIRMED" ? "Confirmado" : call.status === "DECLINED" ? "Não poderá" : "Convocado"}
                          </b>
                          {call.status === "PENDING" ? (
                            <div className="player-callup-response-actions">
                              <form action={respondToPlayerCallUp}>
                                <input type="hidden" name="callUpId" value={call.id} />
                                <input type="hidden" name="status" value="CONFIRMED" />
                                <PendingSubmitButton className="btn btn-small" pendingText="Confirmando...">
                                  Confirmar presença
                                </PendingSubmitButton>
                              </form>
                              <form action={respondToPlayerCallUp}>
                                <input type="hidden" name="callUpId" value={call.id} />
                                <input type="hidden" name="status" value="DECLINED" />
                                <PendingSubmitButton className="btn-secondary btn-small" pendingText="Enviando...">
                                  Não poderá
                                </PendingSubmitButton>
                              </form>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Nenhuma convocação futura encontrada nos vínculos deste atleta.</p>
                )}
              </section>
            ) : null}

            {selected ? (
              <section className="player-club-links">
                <div className="section-title-row">
                  <div>
                    <span className="page-eyebrow">CLUBES</span>
                    <h2>Vínculos esportivos</h2>
                    <p className="muted">O vínculo parte do ONZEUP Player e só é confirmado após validação da equipe. Um mesmo Player pode estar ligado a vários clubes/modalidades.</p>
                  </div>
                  <form action={linkMatchingClubAthletes}>
                    <input type="hidden" name="playerId" value={selected.id} />
                    <button className="btn-secondary" type="submit">Solicitar vínculo com clubes</button>
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
                          {link.athlete.memberships.length ? (
                            <div className="player-membership-chips">
                              {link.athlete.memberships.map(membership => (
                                <span key={membership.id}>
                                  {membership.sport === "FOOTBALL" ? "Campo" : membership.sport === "FUTSAL" ? "Futsal" : "Campo + Futsal"}
                                  {" • "}
                                  {membership.category?.name || membership.teamLabel || "Equipe"}
                                  {membership.season ? ` • ${membership.season}` : ""}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p>{link.athlete.category?.name || "Sem categoria"} • {link.athlete.position || "Atleta"}</p>
                          )}
                        </section>
                        <b className={link.verified ? "verified" : ""}>
                          {link.verified ? "Vínculo verificado" : "Aguardando verificação"}
                        </b>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="muted">
                    Nenhum clube vinculado. Se uma equipe já cadastrou este atleta usando o seu e-mail como responsável, solicite o vínculo acima. O clube precisa confirmar antes de o vínculo ficar verificado.
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
