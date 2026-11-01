import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import ImageUpload from "@/components/ImageUpload";
import PlayerActions from "@/components/PlayerActions";
import DemoBanner from "@/components/DemoBanner";
import { deletePlayer, saveGuardianProfile, savePlayer } from "../actions";
import { createPlayerPremiumAsaas, createPlayerPremiumPixAsaas } from "@/app/checkout/actions";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { hasEffectivePlayerPremium, reconcileExpiredPlayerPremiums, reconcileExpiredPlayerTrials } from "@/lib/billing-entitlements";

export default async function GuardianPortal({
  searchParams,
}: {
  searchParams: Promise<{ player?: string; new?: string; linkStatus?: string; count?: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "GUARDIAN") redirect("/dashboard");

  const query = await searchParams;

  const linkStatusMessage = (() => {
    switch (query.linkStatus) {
      case "solicitado":
        return {
          type: "success",
          title: "Solicitação enviada ao clube.",
          text: `${Number(query.count || 1)} vínculo(s) compatível(is) foi(ram) localizado(s). A equipe precisa confirmar antes de o vínculo ficar ativo.`,
        };

      case "ja-solicitado":
        return {
          type: "info",
          title: "Solicitação já existente.",
          text: "O vínculo compatível já foi solicitado. Aguarde a confirmação da equipe.",
        };

      case "nenhum-cadastro":
      case "sem-correspondencia":
        return {
          type: "warning",
          title: "Não encontramos uma correspondência segura.",
          text: "Confira o nome completo do atleta, a data de nascimento e o nome do responsável. Por segurança, o 11UP não vincula informações divergentes.",
        };

      case "dados-incompletos":
        return {
          type: "warning",
          title: "Complete os dados para buscar o vínculo.",
          text: "Informe o nome completo do atleta e a data de nascimento. O nome do responsável ajuda a confirmar a correspondência.",
        };

      case "erro":
        return {
          type: "error",
          title: "Não foi possível buscar os vínculos.",
          text: "Atualize a página e tente novamente.",
        };

      default:
        return null;
    }
  })();
  const guardianBase = await prisma.guardianProfile.findUnique({ where: { userId: user.id }, select: { id: true } });
  if (guardianBase) {
    await reconcileExpiredPlayerTrials({ guardianId: guardianBase.id });
    await reconcileExpiredPlayerPremiums({ guardianId: guardianBase.id });
  }

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

  const canEditPremium = !selected || hasEffectivePlayerPremium(selected);
  const featuredVideo = (() => {
    const raw = selected?.videos || "";
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const first = parsed[0];
        return first && typeof first === "object" && typeof first.url === "string" && first.url !== "__11UP_NO_FEATURED_VIDEO__" ? first.url : "";
      }
    } catch { /* Formato de URLs por linha. */ }
    const first = raw.split(/\r?\n/).map(url => url.trim()).find(Boolean) || "";
    return first === "__11UP_NO_FEATURED_VIDEO__" ? "" : first;
  })();







  return (
    <main className="guardian-portal">
      {user.email.startsWith("demo-player-") ? <DemoBanner kind="player" /> : null}
      <header className="guardian-portal-nav">
        <Link href="/responsavel" className="player-brand">11<span>UP</span> <b>PLAYER</b></Link>
        <div>

          <Link href={selected ? `/responsavel?player=${selected.id}` : "/responsavel"} className="btn-secondary btn-small">← Voltar à página inicial</Link>
          <span>{user.name}</span>
          <form action="/api/auth/logout" method="post">
            <PendingSubmitButton pendingText="Saindo…" className="btn-secondary btn-small" type="submit">Sair</PendingSubmitButton>
          </form>
        </div>
      </header>

      <div className="guardian-portal-container">
        <section className="player-welcome">
          <div>
            <span className="page-eyebrow">ÁREA DA FAMÍLIA</span>
            <h1>11UP Player</h1>
            <p>Crie e gerencie o perfil esportivo dos seus filhos. O conteúdo pertence à família.</p>
          </div>
          <Link className="btn" href="/responsavel/pagina?new=1">+ Novo perfil</Link>
        </section>

        <div className="player-portal-layout">
          <aside className="player-profile-sidebar">
            <div className="player-sidebar-title">MEUS ATLETAS</div>
            {players.map((player) => (
              <Link
                className={`player-switcher ${selected?.id === player.id ? "active" : ""}`}
                href={`/responsavel/pagina?player=${player.id}`}
                key={player.id}
              >
                <div>
                  {player.photoUrl ? <img src={player.photoUrl} alt="" /> : <span>{(player.nickname || player.name).slice(0,2).toUpperCase()}</span>}
                </div>
                <section>
                  <strong>{player.nickname || player.name}</strong>
                  <small>{player.position || "Atleta"} • {player.plan === "PREMIUM" ? "Premium" : "Simples"}</small>
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
                <PendingSubmitButton pendingText="Salvando…" className="btn-secondary btn-small">Salvar contato</PendingSubmitButton>
              </form>
            </div>
          </aside>

          <section className="player-editor-area">
            <div className="player-editor-head">
              <div>
                <span className="page-eyebrow">{selected ? "EDITAR PERFIL" : "NOVO PERFIL"}</span>
                <h2>{selected ? (selected.nickname || selected.name) : "Criar 11UP Player"}</h2>
                {selected ? <span className={`player-plan-badge ${selected.plan === "PREMIUM" ? "premium" : "free"}`}>{selected.plan === "PREMIUM" ? "★ PREMIUM" : "SIMPLES"}</span> : null}
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

            {linkStatusMessage ? (
              <div className={`player-link-status-notice ${linkStatusMessage.type}`}>
                <strong>{linkStatusMessage.title}</strong>
                <p>{linkStatusMessage.text}</p>
              </div>
            ) : null}

            {selected && selected.plan !== "PREMIUM" ? (
              <section className="player-upgrade-card">
                <div>
                  <span className="page-eyebrow">UPGRADE PARA PREMIUM</span>
                  <h3>Transforme o perfil em um site esportivo completo.</h3>
                  <p>Vários vídeos, galeria, conquistas e visual Premium. Pagamento via PIX.</p>
                </div>
                <form action={createPlayerPremiumAsaas}>
                  <input type="hidden" name="playerId" value={selected.id} />
                  <strong>R$ 69,90/mês</strong>
                  <PendingSubmitButton pendingText="Processando pagamento…" className="btn">Assinar com cartao</PendingSubmitButton></form><form action={createPlayerPremiumPixAsaas}><input type="hidden" name="playerId" value={selected.id} /><PendingSubmitButton pendingText="Processando pagamento…" className="btn-secondary">Pagar mensalidade via Pix</PendingSubmitButton>
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
                  <label>Nome completo <small className="field-help">Dado cadastral. Não é exibido no perfil público por padrão.</small><input name="name" required defaultValue={selected?.name || ""} placeholder="Ex.: João Silva" /></label>
                  <label>Apelido / nome esportivo <small className="field-help">É o nome principal exibido publicamente. Preencha para identificar o atleta na página.</small><input name="nickname" defaultValue={selected?.nickname || ""} placeholder="Ex.: JS10" /></label>
                  <label>Link público do perfil <small className="field-help">Use o apelido ou nome do atleta. Nunca informe endereço, telefone ou dados da família.</small><input name="publicSlug" defaultValue={selected?.slug || ""} placeholder="joao-silva" /></label>

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
                    <input value={selected?.plan === "PREMIUM" ? "11UP Player Premium" : "11UP Player Simples"} readOnly />
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
                  <small className="field-help">{canEditPremium ? "Premium: vários vídeos." : "Simples: um vídeo em destaque. Outros vídeos Premium continuam guardados."}</small>
                  <textarea name="videos" rows={canEditPremium ? 6 : 2} defaultValue={canEditPremium ? (selected?.videos || "") : featuredVideo} placeholder={canEditPremium ? "https://youtube.com/watch?v=...\nhttps://youtu.be/..." : "https://youtube.com/watch?v=..."} />
                  {!canEditPremium ? <span className="field-help"><label><input type="checkbox" name="removeFeaturedVideo" /> Remover o vídeo em destaque (sem apagar os vídeos Premium guardados)</label></span> : null}
                </label>
                {canEditPremium ? <label>Galeria — uma URL de imagem por linha
                  <textarea name="gallery" rows={6} defaultValue={selected?.gallery || ""} placeholder="https://..." />
                </label> : <div className="field-help">Sua galeria Premium continua guardada e ficará disponível quando o Premium estiver ativo.</div>}
              </div>

              <label className="check player-public-toggle">
                <input type="checkbox" name="isPublic" defaultChecked={selected?.isPublic} />
                <span>
                  <strong>Perfil público</strong>
                  <small>Permite que o perfil seja acessado pelo endereço /player/...</small>
                </span>
              </label>
<label className="check-row"><input type="checkbox" name="publicationConsent" defaultChecked={false} /><span>Autorizo expressamente a publicação dos dados esportivos, imagens e vídeos deste atleta menor sob minha responsabilidade. Sem esta autorização, o perfil permanecerá privado.</span></label>
<label className="check-row"><input type="checkbox" name="directoryVisible" defaultChecked={selected?.directoryVisible} /><span>Permitir que este atleta apareça no catálogo público 11UP Players</span></label>
<label className="check-row"><input type="checkbox" name="showDiaryStatsPublic" defaultChecked={selected?.showDiaryStatsPublic} disabled={!canEditPremium} /><span><strong>Exibir o painel visual da trajetória</strong><small>Mostra na página pública gráficos com jogos, gols e assistências registrados pela família. É uma funcionalidade Premium e sempre aparece identificada como registro particular, não como dado oficial do clube.</small></span></label>

              <div className="actions">
                <PendingSubmitButton pendingText="Salvando perfil...">Salvar perfil</PendingSubmitButton>
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
                  <p className="muted">O mesmo painel atende Simples e Premium. O layout público muda conforme o plano.</p>
                </div>
                <div>
                  <Link className="btn-secondary" href="/gustavo-aguiar-free" target="_blank">Modelo Simples ↗</Link>
                  <Link className="btn-secondary" href="/gustavo-aguiar" target="_blank">Modelo Premium ↗</Link>
                  {selected.isPublic ? <a className="btn" href={`https://players.onzeup.com.br/${selected.slug}`} target="_blank">Abrir perfil publicado ↗</a> : null}
                </div>
              </section>
            ) : null}





          </section>
        </div>
      </div>
    </main>
  );
}
