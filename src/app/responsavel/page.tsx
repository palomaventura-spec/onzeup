import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import DemoBanner from "@/components/DemoBanner";
import { reconcileExpiredPlayerTrials } from "@/lib/billing-entitlements";

export default async function GuardianPortal({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") {
    redirect("/dashboard");
  }

  const query = await searchParams;

  const guardianBase = await prisma.guardianProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
    },
  });

  if (guardianBase) {
    await reconcileExpiredPlayerTrials({
      guardianId: guardianBase.id,
    });
  }

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
                  memberships: {
                    where: {
                      status: "ACTIVE",
                    },
                    include: {
                      organization: true,
                      category: true,
                    },
                  },
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
  });

  const players = guardian?.players || [];

  const selected =
    players.find((player) => player.id === query.player) ||
    players[0] ||
    null;

  const unreadCommunicationCount = selected
    ? await prisma.clubCommunicationRecipient.count({
        where: {
          playerId: selected.id,
          readAt: null,
        },
      })
    : 0;

  const recentCommunications = selected
    ? await prisma.clubCommunicationRecipient.findMany({
        where: {
          playerId: selected.id,
        },
        include: {
          communication: {
            include: {
              organization: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 3,
      })
    : [];

  const activeLinks =
    selected?.athleteLinks.filter(
      (link) =>
        link.active &&
        link.verified &&
        link.athlete.memberships.length > 0,
    ) || [];

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
          {selected ? (
            <Link
              href={`/responsavel/comunicacao?player=${selected.id}`}
              className="btn-secondary btn-small"
              title="Comunicados"
            >
              🔔
              {unreadCommunicationCount > 0
                ? ` ${unreadCommunicationCount}`
                : ""}
            </Link>
          ) : null}

          <span>{user.name}</span>

          <form action="/api/auth/logout" method="post">
            <button
              className="btn-secondary btn-small"
              type="submit"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="guardian-portal-container">
        <section className="player-welcome">
          <div>
            <span className="page-eyebrow">
              ÁREA DA FAMÍLIA
            </span>

            <h1>11UP Player</h1>

            <p>
              Acompanhe o atleta, receba comunicados dos clubes
              e gerencie sua página esportiva.
            </p>
          </div>

          <Link
            className="btn"
            href="/responsavel/pagina?new=1"
          >
            + Novo perfil
          </Link>
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
                href={`/responsavel?player=${player.id}`}
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
                    {player.position || "Atleta"} •{" "}
                    {player.plan === "PREMIUM"
                      ? "Premium"
                      : "Simples"}
                  </small>
                </section>

                <b>→</b>
              </Link>
            ))}

            {!players.length ? (
              <div className="player-sidebar-empty">
                Nenhum perfil criado.
              </div>
            ) : null}
          </aside>

          <section className="player-editor-area">
            {selected ? (
              <>
                <div className="player-editor-head">
                  <div>
                    <span className="page-eyebrow">
                      VISÃO GERAL
                    </span>

                    <h2>
                      {selected.nickname || selected.name}
                    </h2>

                    <span
                      className={`player-plan-badge ${
                        selected.plan === "PREMIUM"
                          ? "premium"
                          : "free"
                      }`}
                    >
                      {selected.plan === "PREMIUM"
                        ? "★ PREMIUM"
                        : "PLAYER SIMPLES"}
                    </span>
                  </div>

                  {selected.isPublic ? (
                    <a
                      className="btn-secondary"
                      href={`https://players.onzeup.com.br/${selected.slug}`}
                      target="_blank"
                    >
                      Ver página ↗
                    </a>
                  ) : null}
                </div>

                <section className="player-preview-card">
                  <div>
                    <span className="page-eyebrow">
                      🔔 COMUNICAÇÃO
                    </span>

                    <h3>Comunicados dos clubes</h3>

                    <p className="muted">
                      {unreadCommunicationCount > 0
                        ? `Você tem ${unreadCommunicationCount} comunicado(s) não lido(s).`
                        : "Nenhum comunicado novo."}
                    </p>

                    {recentCommunications.length ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 10,
                          marginTop: 12,
                        }}
                      >
                        {recentCommunications.map(
                          (recipient) => (
                            <div key={recipient.id}>
                              <strong>
                                {
                                  recipient.communication
                                    .title
                                }
                              </strong>

                              <small
                                className="muted"
                                style={{
                                  display: "block",
                                }}
                              >
                                {recipient.communication
                                  .organization.publicName ||
                                  recipient.communication
                                    .organization.name}
                              </small>
                            </div>
                          ),
                        )}
                      </div>
                    ) : null}
                  </div>

                  <Link
                    className="btn"
                    href={`/responsavel/comunicacao?player=${selected.id}`}
                  >
                    Ver comunicação
                  </Link>
                </section>

                <section className="player-preview-card">
                  <div>
                    <span className="page-eyebrow">
                      👤 DADOS
                    </span>

                    <h3>Dados do atleta</h3>

                    <p className="muted">
                      Informações pessoais e esportivas,
                      responsável e vínculos com clubes.
                    </p>

                    <small className="muted">
                      {activeLinks.length
                        ? `${activeLinks.length} vínculo(s) ativo(s) com clube`
                        : "Nenhum vínculo ativo com clube"}
                    </small>
                  </div>

                  <Link
                    className="btn-secondary"
                    href={`/responsavel/dados?player=${selected.id}`}
                  >
                    Editar dados
                  </Link>
                </section>

                <section className="player-preview-card">
                  <div>
                    <span className="page-eyebrow">
                      🌐 MINHA PÁGINA
                    </span>

                    <h3>Página pessoal do atleta</h3>

                    <p className="muted">
                      Foto, capa, apresentação, estatísticas,
                      carreira, conquistas, vídeos e galeria.
                    </p>

                    <small className="muted">
                      {selected.isPublic
                        ? "Página publicada"
                        : "Página privada"}
                      {" • "}
                      {selected.plan === "PREMIUM"
                        ? "Premium"
                        : "Simples"}
                    </small>
                  </div>

                  <Link
                    className="btn"
                    href={`/responsavel/pagina?player=${selected.id}`}
                  >
                    Editar página
                  </Link>
                </section>
              </>
            ) : (
              <section className="player-preview-card">
                <div>
                  <span className="page-eyebrow">
                    PRIMEIRO PASSO
                  </span>

                  <h3>Crie o perfil do atleta</h3>

                  <p className="muted">
                    Depois você poderá editar os dados,
                    configurar a página e vinculá-lo aos clubes.
                  </p>
                </div>

                <Link
                  className="btn"
                  href="/responsavel/pagina?new=1"
                >
                  Criar perfil
                </Link>
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}