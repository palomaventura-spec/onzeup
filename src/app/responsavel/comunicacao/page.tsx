import Link from "next/link";
import PlayerCommunicationBody from "@/components/PlayerCommunicationBody";
import PlayerDocumentConversation from "@/components/PlayerDocumentConversation";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import DemoBanner from "@/components/DemoBanner";
import PendingSubmitButton from "@/components/PendingSubmitButton";
import { markPlayerCommunicationRead } from "../actions";

export default async function PlayerCommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") {
    redirect("/dashboard");
  }

  const query = await searchParams;

  const guardian = await prisma.guardianProfile.findUnique({
    where: {
      userId: user.id,
    },
    include: {
      players: {
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

  const eligible = selected ? await prisma.clubCommunicationRecipient.findMany({
    where: {
      playerId: selected.id,
      athlete: { active: true, playerLinks: { some: { playerId: selected.id, active: true, verified: true } } },
      communication: { organization: { active: true } },
    },
    select: { id: true, athlete: { select: { organizationId: true } }, communication: { select: { organizationId: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  }) : [];

  const authorizedIds = eligible.filter((row) =>
    row.athlete.organizationId === row.communication.organizationId
  ).map((row) => row.id);

  const communications = await prisma.clubCommunicationRecipient.findMany({
    where: { id: { in: authorizedIds } },
    include: {
      athlete: true,
      documentRequests: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { attachments: { include: { athleteDocument: { select: { originalFileName: true, status: true } } } } } },
      communication: { include: { organization: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const unreadCount = communications.filter(
    (recipient) => !recipient.readAt,
  ).length;

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
              🔔 COMUNICAÇÃO
            </span>

            <h1>Comunicados</h1>

            <p>
              Avisos oficiais enviados pelos clubes vinculados
              ao atleta.
            </p>
          </div>

          {unreadCount > 0 ? (
            <span className="player-plan-badge premium">
              {unreadCount} NÃO LIDO
              {unreadCount > 1 ? "S" : ""}
            </span>
          ) : null}
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
                href={`/responsavel/comunicacao?player=${player.id}`}
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
                  href={`/responsavel/dados?player=${selected.id}`}
                >
                  Dados
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

                {communications.length ? (
                  <div
                    style={{
                      display: "grid",
                      gap: 16,
                    }}
                  >
                    {communications.map((recipient) => (
                      <article
                        key={recipient.id}
                        className="player-preview-card"
                        style={{
                          borderLeft: recipient.readAt
                            ? undefined
                            : "4px solid var(--accent, #9DDB16)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {!recipient.readAt ? (
                              <span className="player-plan-badge premium">
                                NOVO
                              </span>
                            ) : null}

                            <small className="muted">
                              {new Intl.DateTimeFormat(
                                "pt-BR",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              ).format(
                                recipient.communication.sentAt,
                              )}
                            </small>
                          </div>

                          <strong>
                            {recipient.communication.organization
                              .publicName ||
                              recipient.communication.organization
                                .name}
                          </strong>

                          <h3 style={{ margin: 0 }}>
                            {recipient.communication.title}
                          </h3>

                          <PlayerCommunicationBody body={recipient.communication.body} />
                          <PlayerDocumentConversation recipientId={recipient.id} requests={recipient.documentRequests} messages={recipient.messages} />
                        </div>

                        {!recipient.readAt ? (
                          <form
                            action={markPlayerCommunicationRead}
                          >
                            <input
                              type="hidden"
                              name="recipientId"
                              value={recipient.id}
                            />

                            <PendingSubmitButton
                              className="btn-secondary btn-small"
                              pendingText="Marcando..."
                            >
                              Marcar como lido
                            </PendingSubmitButton>
                          </form>
                        ) : (
                          <small className="muted">
                            ✓ Lido
                          </small>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <section className="player-preview-card">
                    <div>
                      <span className="page-eyebrow">
                        CAIXA DE ENTRADA
                      </span>

                      <h3>Nenhum comunicado recebido</h3>

                      <p className="muted">
                        Quando um clube enviar um aviso para este
                        atleta, ele aparecerá aqui.
                      </p>
                    </div>
                  </section>
                )}
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