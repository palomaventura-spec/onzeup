import PendingSubmitButton from "@/components/PendingSubmitButton";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  ExternalLink,
  UserRound,
  Globe2,
  Plus,
  UsersRound,
  Headset,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import DemoBanner from "@/components/DemoBanner";
import { reconcileExpiredSimplePlayerCourtesies } from "@/lib/player-simple-courtesy";
import { reconcileExpiredPlayerTrials } from "@/lib/billing-entitlements";
import styles from "./PlayerHome.module.css";

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
    where: { userId: user.id },
    select: { id: true },
  });

  if (guardianBase) {
    await reconcileExpiredSimplePlayerCourtesies({ guardianId: guardianBase.id });
    await reconcileExpiredPlayerTrials({ guardianId: guardianBase.id });
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
                  memberships: {
                    where: { status: "ACTIVE" },
                    include: { organization: true, category: true },
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
    players.find((player) => player.id === query.player) || players[0] || null;

  const unreadCommunicationCount = selected
    ? await prisma.clubCommunicationRecipient.count({
        where: { playerId: selected.id, readAt: null },
      })
    : 0;

  const activeLinks =
    selected?.athleteLinks.filter(
      (link) =>
        link.active &&
        link.verified &&
        link.athlete.memberships.length > 0,
    ) || [];

  const selectedName = selected?.nickname || selected?.name || "";
  const selectedPlan = selected?.plan === "PREMIUM" ? "Premium" : "Simples";

  return (
    <main className={`guardian-portal ${styles.portal}`}>
      {user.email.startsWith("demo-player-") ? (
        <DemoBanner kind="player" />
      ) : null}

      <header className={`guardian-portal-nav ${styles.topNav}`}>
        <Link href="/responsavel" className="player-brand">
          11<span>UP</span> <b>PLAYER</b>
        </Link>

        <div className={styles.topNavRight}>
          <Link href="/suporte" className={styles.navNotice} title="Ajuda e suporte" aria-label="Ajuda e suporte">
            <Headset size={17} aria-hidden="true" />
          </Link>
          {selected ? (
            <Link
              href={`/responsavel/comunicacao?player=${selected.id}`}
              className={styles.navNotice}
              aria-label={
                unreadCommunicationCount > 0
                  ? `Comunicados: ${unreadCommunicationCount} não lidos`
                  : "Ver comunicados"
              }
              title="Comunicados do clube"
            >
              <Bell size={17} aria-hidden="true" />
              {unreadCommunicationCount > 0 ? (
                <span className={styles.navCount}>
                  {unreadCommunicationCount}
                </span>
              ) : null}
            </Link>
          ) : null}
          <span className={styles.userName}>{user.name}</span>
          <form action="/api/auth/logout" method="post">
            <PendingSubmitButton
              pendingText="Saindo…"
              className={styles.logoutButton}
              type="submit"
            >
              Sair
            </PendingSubmitButton>
          </form>
        </div>
      </header>

      <div className={`guardian-portal-container ${styles.container}`}>
        <section className={styles.intro}>
          <div>
            <p className={styles.eyebrow}>ÁREA DA FAMÍLIA</p>
            <h1>Bem-vindo ao 11UP Player</h1>
            <p className={styles.subtitle}>
              Tudo o que você precisa para acompanhar seu atleta, em um só lugar.
            </p>
          </div>
          {selected ? (
            <Link href="/responsavel/pagina?new=1" className={styles.addPlayer}>
              <Plus size={17} aria-hidden="true" />
              Adicionar atleta
            </Link>
          ) : null}
        </section>

        {selected ? (
          <>
            <section className={styles.playerSummary} aria-label="Atleta selecionado">
              <div className={styles.playerIdentity}>
                <div className={styles.avatar}>
                  {selected.photoUrl ? (
                    <img src={selected.photoUrl} alt="" loading="lazy" />
                  ) : (
                    <span aria-hidden="true">
                      {selectedName.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={styles.playerDetails}>
                  <p className={styles.eyebrow}>ATLETA SELECIONADO</p>
                  <h2>{selectedName}</h2>
                  <div className={styles.playerMeta}>
                    <span className={styles.planPill}>Player {selectedPlan}</span>
                    <span className={styles.linkPill}>
                      {activeLinks.length === 1
                        ? "1 clube vinculado"
                        : activeLinks.length > 1
                          ? `${activeLinks.length} vínculos com clubes`
                          : "Nenhum clube vinculado"}
                    </span>
                  </div>
                </div>
              </div>
              {selected.isPublic ? (
                <a
                  className={styles.publicPageLink}
                  href={`https://players.onzeup.com.br/${selected.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Ver página
                  <ExternalLink size={15} aria-hidden="true" />
                </a>
              ) : null}
            </section>

            {players.length > 1 ? (
              <nav className={styles.switcherSection} aria-label="Selecionar atleta">
                <div className={styles.switcherLabel}>
                  <UsersRound size={15} aria-hidden="true" />
                  Trocar de atleta
                </div>
                <div className={styles.switcherList}>
                  {players.map((player) => (
                    <Link
                      key={player.id}
                      href={`/responsavel?player=${player.id}`}
                      className={`${styles.switcherItem} ${
                        player.id === selected.id ? styles.switcherActive : ""
                      }`}
                      aria-current={player.id === selected.id ? "page" : undefined}
                    >
                      {player.nickname || player.name}
                    </Link>
                  ))}
                </div>
              </nav>
            ) : null}

            <section className={styles.actionsSection} aria-labelledby="player-actions-title">
              <div className={styles.actionsHeading}>
                <h2 id="player-actions-title">O que você deseja fazer?</h2>
                <p>Escolha uma das opções abaixo.</p>
              </div>
              <div className={styles.actionsGrid}>
                <Link
                  className={styles.actionCard}
                  href={`/responsavel/comunicacao?player=${selected.id}`}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.iconBox}>
                      <Bell size={22} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <ArrowRight className={styles.cardArrow} size={20} aria-hidden="true" />
                  </div>
                  <div className={styles.actionCopy}>
                    <h3>Comunicados do clube</h3>
                    <p>Leia avisos e mensagens do clube.</p>
                  </div>
                  <span
                    className={`${styles.cardFooter} ${
                      unreadCommunicationCount > 0 ? styles.footerAttention : ""
                    }`}
                  >
                    {unreadCommunicationCount > 0
                      ? unreadCommunicationCount === 1
                        ? "1 comunicado não lido"
                        : `${unreadCommunicationCount} comunicados não lidos`
                      : "Ver comunicação"}
                  </span>
                </Link>

                <Link
                  className={styles.actionCard}
                  href={`/responsavel/dados?player=${selected.id}`}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.iconBox}>
                      <UserRound size={22} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <ArrowRight className={styles.cardArrow} size={20} aria-hidden="true" />
                  </div>
                  <div className={styles.actionCopy}>
                    <h3>Dados do atleta</h3>
                    <p>Consulte dados, documentos e vínculos.</p>
                  </div>
                  <span className={styles.cardFooter}>Ver e editar dados</span>
                </Link>

                <Link
                  className={styles.actionCard}
                  href={`/responsavel/pagina?player=${selected.id}`}
                >
                  <div className={styles.cardTop}>
                    <span className={styles.iconBox}>
                      <Globe2 size={22} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <ArrowRight className={styles.cardArrow} size={20} aria-hidden="true" />
                  </div>
                  <div className={styles.actionCopy}>
                    <h3>Página do atleta</h3>
                    <p>Atualize fotos e sua trajetória esportiva.</p>
                  </div>
                  <span className={styles.cardFooter}>
                    {selected.isPublic ? "Página publicada" : "Página privada"}
                    {" · Editar"}
                  </span>
                </Link>
              </div>
            </section>
          </>
        ) : (
          <section className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <UserRound size={26} aria-hidden="true" />
            </div>
            <h2>Vamos começar pelo perfil do atleta?</h2>
            <p>
              Crie um perfil para consultar dados, receber comunicados e solicitar
              vínculos com clubes.
            </p>
            <Link className={styles.primaryButton} href="/responsavel/pagina?new=1">
              <Plus size={18} aria-hidden="true" />
              Criar perfil do atleta
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
