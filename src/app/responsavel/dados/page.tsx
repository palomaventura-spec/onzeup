import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import DemoBanner from "@/components/DemoBanner";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import {
  linkMatchingClubAthletes,
  saveGuardianProfile,
  savePlayerData,
} from "../actions";

export default async function PlayerDataPage({
  searchParams,
}: {
  searchParams: Promise<{
    player?: string;
    linkStatus?: string;
    count?: string;
  }>;
}) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") {
    redirect("/dashboard");
  }

  const query = await searchParams;

  const linkStatusMessage = (() => {
    switch (query.linkStatus) {
      case "solicitado":
        return {
          type: "success",
          title: "Solicitação enviada ao clube.",
          text: `${Number(query.count || 1)} vínculo(s) compatível(is) localizado(s). O clube precisa confirmar antes da ativação.`,
        };

      case "ja-solicitado":
        return {
          type: "info",
          title: "Solicitação já existente.",
          text: "Este vínculo já foi solicitado. Aguarde a confirmação do clube.",
        };

      case "nenhum-cadastro":
      case "sem-correspondencia":
        return {
          type: "warning",
          title: "Não encontramos uma correspondência segura.",
          text: "Confira o nome completo e a data de nascimento do atleta. Se ele for aluno novo, entre em contato com o clube: o cadastro pode ainda nao estar no sistema.",
        };

      case "dados-incompletos":
        return {
          type: "warning",
          title: "Complete os dados.",
          text: "Informe o nome completo e a data de nascimento do atleta.",
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

  const guardian = await prisma.guardianProfile.findUnique({
    where: {
      userId: user.id,
    },
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
                    where: {
                      status: "ACTIVE",
                    },
                    include: {
                      organization: true,
                      category: true,
                    },
                    orderBy: {
                      createdAt: "asc",
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  const players = guardian?.players || [];

  const selected =
    players.find((player) => player.id === query.player) ||
    players[0] ||
    null;

  return (
    <main className="guardian-portal">
      {user.email.startsWith("demo-player-") ? (
        <DemoBanner kind="player" />
      ) : null}

      <header className="guardian-portal-nav">
        <Link href="/responsavel" className="player-brand">
          11<span>UP</span> <b>PLAYER</b>
        </Link>

        <div>
          <Link
            href={
              selected
                ? `/responsavel?player=${selected.id}`
                : "/responsavel"
            }
            className="btn-secondary btn-small"
          >
            Início
          </Link>

          <span>{user.name}</span>

          <form action="/api/auth/logout" method="post">
            <PendingSubmitButton pendingText="Saindo…"
              className="btn-secondary btn-small"
              type="submit"
            >
              Sair
            </PendingSubmitButton>
          </form>
        </div>
      </header>

      <div className="guardian-portal-container">
        <section className="player-welcome">
          <div>
            <span className="page-eyebrow">
              👤 DADOS
            </span>

            <h1>Dados do atleta e da família</h1>

            <p>
              Gerencie as informações cadastrais, esportivas e os
              vínculos com clubes.
            </p>
          </div>
        </section>

        <div className="player-portal-layout">
          <aside className="player-profile-sidebar">
            <div className="player-sidebar-title">
              MEUS ATLETAS
            </div>

            {players.map((player) => (
              <Link
                key={player.id}
                className={`player-switcher ${
                  selected?.id === player.id ? "active" : ""
                }`}
                href={`/responsavel/dados?player=${player.id}`}
              >
                <div>
                  {player.photoUrl ? (
                    <img src={player.photoUrl} alt="" />
                  ) : (
                    <span>
                      {(player.nickname || player.name)
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                </div>

                <section>
                  <strong>
                    {player.nickname || player.name}
                  </strong>

                  <small>
                    {player.position || "Atleta"}
                  </small>
                </section>

                <b>→</b>
              </Link>
            ))}

            {selected ? (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  marginTop: 18,
                }}
              >
                <Link
                  className="btn-secondary btn-small"
                  href={`/responsavel?player=${selected.id}`}
                >
                  Visão geral
                </Link>

                <Link
                  className="btn-secondary btn-small"
                  href={`/responsavel/comunicacao?player=${selected.id}`}
                >
                  Comunicação
                </Link>

                <Link
                  className="btn-secondary btn-small"
                  href={`/responsavel/pagina?player=${selected.id}`}
                >
                  Minha página
                </Link>
              </div>
            ) : null}
          </aside>

          <section className="player-editor-area">
            {selected ? (
              <>
                <div className="player-editor-head">
                  <div>
                    <span className="page-eyebrow">
                      ATLETA
                    </span>

                    <h2>
                      {selected.nickname || selected.name}
                    </h2>
                  </div>
                </div>

                {linkStatusMessage ? (
                  <div
                    className={`player-link-status-notice ${linkStatusMessage.type}`}
                  >
                    <strong>
                      {linkStatusMessage.title}
                    </strong>

                    <p>{linkStatusMessage.text}</p>
                  </div>
                ) : null}

                <form
                  className="player-editor-form"
                  action={savePlayerData}
                >
                  <input
                    type="hidden"
                    name="id"
                    value={selected.id}
                  />

                  <section className="player-editor-section">
                    <div>
                      <span className="page-eyebrow">
                        DADOS PESSOAIS
                      </span>

                      <h3>Informações do atleta</h3>
                    </div>

                    <div className="form">
                      <label>
                        Nome completo
                        <input
                          name="name"
                          required
                          defaultValue={selected.name}
                        />
                      </label>

                      <div className="two-field-row">
                        <label>
                          Ano de nascimento
                          <input
                            name="birthYear"
                            type="number"
                            defaultValue={
                              selected.birthYear || ""
                            }
                            placeholder="2015"
                          />
                        </label>

                        <label>
                          Nacionalidade
                          <input
                            name="nationality"
                            defaultValue={
                              selected.nationality || ""
                            }
                            placeholder="Brasil"
                          />
                        </label>
                      </div>
                    </div>
                  </section>

                  <section className="player-editor-section">
                    <div>
                      <span className="page-eyebrow">
                        ESPORTE
                      </span>

                      <h3>Informações esportivas</h3>
                    </div>

                    <div className="form">
                      <div className="two-field-row">
                        <label>
                          Posição principal
                          <input
                            name="position"
                            defaultValue={
                              selected.position || ""
                            }
                            placeholder="Atacante"
                          />
                        </label>

                        <label>
                          Posição secundária
                          <input
                            name="secondaryPosition"
                            defaultValue={
                              selected.secondaryPosition || ""
                            }
                            placeholder="Ala"
                          />
                        </label>
                      </div>

                      <div className="two-field-row">
                        <label>
                          Altura
                          <input
                            name="height"
                            defaultValue={
                              selected.height || ""
                            }
                            placeholder="1,42 m"
                          />
                        </label>

                        <label>
                          Peso
                          <input
                            name="weight"
                            defaultValue={
                              selected.weight || ""
                            }
                            placeholder="36 kg"
                          />
                        </label>
                      </div>

                      <div className="two-field-row">
                        <label>
                          Pé dominante
                          <input
                            name="dominantFoot"
                            defaultValue={
                              selected.dominantFoot || ""
                            }
                            placeholder="Direito"
                          />
                        </label>

                        <label>
                          Clube atual
                          <input
                            name="currentClub"
                            defaultValue={
                              selected.currentClub || ""
                            }
                            placeholder="Clube atual"
                          />
                        </label>
                      </div>

                      <div className="two-field-row">
                        <label>
                          Modalidade
                          <input
                            name="modality"
                            defaultValue={
                              selected.modality || ""
                            }
                            placeholder="Futebol / Futsal"
                          />
                        </label>

                        <label>
                          Categoria
                          <input
                            name="categoryLabel"
                            defaultValue={
                              selected.categoryLabel || ""
                            }
                            placeholder="Sub-8"
                          />
                        </label>
                      </div>

                      <label>
                        Número da camisa
                        <input
                          name="jerseyNumber"
                          type="number"
                          min="0"
                          defaultValue={
                            selected.jerseyNumber || ""
                          }
                        />
                      </label>
                    </div>
                  </section>

                  <div className="actions">
                    <PendingSubmitButton
                      pendingText="Salvando dados..."
                    >
                      Salvar dados do atleta
                    </PendingSubmitButton>
                  </div>
                </form>

                <section className="player-editor-section">
                  <div>
                    <span className="page-eyebrow">
                      RESPONSÁVEL
                    </span>

                    <h3>Dados do responsável</h3>

                    <p className="muted">
                      Dados da conta responsável pelo perfil do
                      atleta.
                    </p>
                  </div>

                  <form
                    className="form"
                    action={saveGuardianProfile}
                  >
                    <label>
                      Nome do responsável
                      <input
                        name="name"
                        defaultValue={user.name}
                        required
                      />
                    </label>

                    <label>
                      E-mail de acesso
                      <input
                        value={user.email}
                        readOnly
                      />

                      <small className="field-help">
                        O e-mail de acesso não pode ser alterado
                        por esta tela.
                      </small>
                    </label>

                    <label>
                      WhatsApp / telefone
                      <input
                        name="phone"
                        defaultValue={
                          guardian?.phone || ""
                        }
                        placeholder="WhatsApp do responsável"
                      />
                    </label>

                    <div className="actions">
                      <PendingSubmitButton
                        className="btn-secondary"
                        pendingText="Salvando responsável..."
                      >
                        Salvar dados do responsável
                      </PendingSubmitButton>
                    </div>
                  </form>
                </section>

                <section className="player-club-links">
                  <div className="section-title-row">
                    <div>
                      <span className="page-eyebrow">
                        CLUBES
                      </span>

                      <h2>Vínculos esportivos</h2>

                      <p className="muted">
                        O perfil pertence ao atleta. O clube é um
                        vínculo da trajetória esportiva.
                      </p>
                    </div>

                    <details
                      open={
                        !selected.athleteLinks.some(
                          (link) =>
                            link.active &&
                            link.verified,
                        )
                      }
                      style={{
                        minWidth: "min(100%, 330px)",
                      }}
                    >
                      <summary
                        style={{
                          cursor: "pointer",
                          fontWeight: 800,
                          marginBottom: 12,
                        }}
                      >
                        {selected.athleteLinks.some(
                          (link) =>
                            link.active &&
                            link.verified,
                        )
                          ? "+ Vincular outro clube"
                          : "Localizar vínculo com clube"}
                      </summary>

                      <form
                        action={linkMatchingClubAthletes}
                        style={{
                          display: "grid",
                          gap: 10,
                          minWidth: "min(100%, 320px)",
                        }}
                      >
                        <input
                          type="hidden"
                          name="playerId"
                          value={selected.id}
                        />

                        <label>
                          <span>
                            Nome completo do atleta
                          </span>

                          <input
                            name="athleteFullName"
                            defaultValue={selected.name}
                            required
                          />
                        </label>

                        <label>
                          <span>
                            Data de nascimento
                          </span>

                          <input
                            name="birthDate"
                            type="date"
                            required
                          />
                        </label>


                        <p className="muted" style={{ fontSize: 13, margin: "4px 0" }}>
                          Busque pelo nome completo e pela data de nascimento do atleta.
                          O vínculo só será ativado depois da aprovação do clube.
                        </p>

                        <PendingSubmitButton
                          className="btn-secondary"
                          pendingText="Buscando vínculos..."
                        >
                          Buscar vínculos com clubes
                        </PendingSubmitButton>
                      </form>
                    </details>
                  </div>

                  {selected.athleteLinks.length ? (
                    <div className="player-link-list">
                      {selected.athleteLinks.map((link) => (
                        <article key={link.id}>
                          {link.active && link.verified ? (
                            <>
                          <div>
                            {link.athlete.organization
                              .logoUrl ? (
                              <img
                                src={
                                  link.athlete.organization
                                    .logoUrl
                                }
                                alt=""
                              />
                            ) : (
                              <span>CL</span>
                            )}
                          </div>

                          <section>
                            <strong>
                              {link.athlete.organization
                                .publicName ||
                                link.athlete.organization.name}
                            </strong>

                            {link.athlete.memberships.length ? (
                              <div className="player-membership-chips">
                                {link.athlete.memberships.map(
                                  (membership) => (
                                    <span
                                      key={membership.id}
                                    >
                                      {membership.sport ===
                                      "FOOTBALL"
                                        ? "Futebol"
                                        : membership.sport ===
                                            "FUTSAL"
                                          ? "Futsal"
                                          : "Futebol + Futsal"}

                                      {" • "}

                                      {membership.category
                                        ?.name ||
                                        membership.teamLabel ||
                                        "Equipe"}

                                      {membership.season
                                        ? ` • ${membership.season}`
                                        : ""}
                                    </span>
                                  ),
                                )}
                              </div>
                            ) : (
                              <p>
                                {link.athlete.category
                                  ?.name || "Sem categoria"}
                              </p>
                            )}
                          </section>

                          <b className="verified">Vínculo verificado</b>
                            </>
                          ) : (
                            <section>
                              <strong>Solicitação de vínculo</strong>
                              <p className="muted">
                                {link.active
                                  ? "Aguardando conferência e aprovação do clube."
                                  : "Vínculo encerrado."}
                              </p>
                            </section>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">
                      Nenhum clube vinculado.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <section className="player-preview-card">
                <div>
                  <h3>Nenhum atleta selecionado</h3>
                </div>
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}