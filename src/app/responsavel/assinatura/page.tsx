import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

import DemoBanner from "@/components/DemoBanner";
import PendingSubmitButton from "@/components/PendingSubmitButton";

import {
  PLAYER_PREMIUM_MONTHLY_CENTS,
  PLAYER_SIMPLE_MONTHLY_CENTS,
} from "@/lib/player-plans";

import {
  reconcileExpiredPlayerTrials,
  reconcileExpiredPlayerPremiums,
} from "@/lib/billing-entitlements";

import {
  savePlayerBillingProfile,
} from "../actions";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function date(value: Date | null | undefined) {
  if (!value) return "—";

  return value.toLocaleDateString("pt-BR");
}

export default async function PlayerSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{
    player?: string;
  }>;
}) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") {
    redirect("/dashboard");
  }

  const query = await searchParams;

  const guardianBase =
    await prisma.guardianProfile.findUnique({
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

    await reconcileExpiredPlayerPremiums({
      guardianId: guardianBase.id,
    });
  }

  const guardian =
    await prisma.guardianProfile.findUnique({
      where: {
        userId: user.id,
      },
      include: {
        billingProfile: true,

        players: {
          include: {
            payments: {
              orderBy: {
                createdAt: "desc",
              },
              take: 12,
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
    players.find(
      (player) => player.id === query.player
    ) ||
    players[0] ||
    null;

  const now = new Date();

  const complimentaryActive = Boolean(
    selected?.isComplimentary &&
      (
        !selected.complimentaryUntil ||
        selected.complimentaryUntil >= now
      )
  );

  const trialActive = Boolean(
    selected?.planStatus === "TRIAL" &&
      selected.trialEndsAt &&
      selected.trialEndsAt >= now
  );

  const trialExpired =
    selected?.planStatus === "TRIAL_EXPIRED";

  const premiumActive = Boolean(
    selected?.plan === "PREMIUM" &&
      selected.planStatus === "ACTIVE"
  );

  const trialDaysRemaining =
    trialActive && selected?.trialEndsAt
      ? Math.max(
          1,
          Math.ceil(
            (
              selected.trialEndsAt.getTime() -
              now.getTime()
            ) /
              86400000
          )
        )
      : 0;

  const statusTitle = complimentaryActive
    ? "Benefício de parceria"
    : trialActive
      ? "Teste Premium"
      : premiumActive
        ? "Player Premium"
        : trialExpired
          ? "Teste encerrado"
          : "Sem assinatura ativa";

  const statusText = complimentaryActive
    ? selected?.complimentaryReason ||
      "Acesso concedido por parceria."
    : trialActive
      ? `${trialDaysRemaining} dia(s) restante(s) do teste Premium.`
      : premiumActive
        ? `Premium ativo até ${date(
            selected?.currentPeriodEndsAt ||
              selected?.premiumUntil
          )}.`
        : trialExpired
          ? "Escolha um plano para continuar utilizando o 11UP Player."
          : "Escolha um plano para utilizar o 11UP Player.";

  return (
    <main className="guardian-portal">
      {user.email.startsWith("demo-player-") ? (
        <DemoBanner kind="player" />
      ) : null}

      <header className="guardian-portal-nav">
        <Link
          href="/responsavel"
          className="player-brand"
        >
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

          <form
            action="/api/auth/logout"
            method="post"
          >
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
              💳 ASSINATURA
            </span>

            <h1>Assinatura e cobrança</h1>

            <p>
              Consulte o plano, período de teste,
              cobranças e dados financeiros do responsável.
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
                  selected?.id === player.id
                    ? "active"
                    : ""
                }`}
                href={`/responsavel/assinatura?player=${player.id}`}
              >
                <div>
                  {player.photoUrl ? (
                    <img
                      src={player.photoUrl}
                      alt=""
                    />
                  ) : (
                    <span>
                      {(
                        player.nickname ||
                        player.name
                      )
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

                <Link
                  className="btn btn-small"
                  href={`/responsavel/assinatura?player=${selected.id}`}
                >
                  Assinatura e cobrança
                </Link>
              </div>
            ) : null}
          </aside>

          <section className="player-editor-area">
            {selected ? (
              <>
                <section className="player-editor-section">
                  <div>
                    <span className="page-eyebrow">
                      PLANO ATUAL
                    </span>

                    <h2>{statusTitle}</h2>

                    <p className="muted">
                      {statusText}
                    </p>
                  </div>

                  {complimentaryActive ? (
                    <div className="player-preview-card" style={{ display: "grid", gap: 10 }}>
                      <strong>
                        Benefício institucional
                      </strong>

                      <p>
                        Este acesso não consome o período
                        de teste e não gera cobrança enquanto
                        a cortesia estiver válida.
                      </p>

                      {selected.complimentaryUntil ? (
                        <small>
                          Vigente até{" "}
                          {date(
                            selected.complimentaryUntil
                          )}
                        </small>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section className="player-editor-section">
                  <div>
                    <span className="page-eyebrow">
                      PLANOS
                    </span>

                    <h3>Escolha seu 11UP Player</h3>

                    <p className="muted">
                      O teste gratuito permite conhecer
                      os recursos Premium durante 7 dias.
                    </p>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 16,
                    }}
                  >
                    <article className="player-preview-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 14 }}>
                      <span className="page-eyebrow">
                        PLAYER SIMPLES
                      </span>

                      <h3>
                        {money(
                          PLAYER_SIMPLE_MONTHLY_CENTS
                        )}
                        /mês
                      </h3>

                      <p className="muted">
                        Perfil esportivo essencial para
                        apresentar o atleta.
                      </p>

                      <button
                        className="btn-secondary"
                        type="button"
                        disabled
                        style={{
                          width: "100%",
                          marginTop: "auto",
                        }}
                      >
                        Em breve
                      </button>
                    </article>

                    <article className="player-preview-card" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 14 }}>
                      <span className="page-eyebrow">
                        ★ PLAYER PREMIUM
                      </span>

                      <h3>
                        {money(
                          PLAYER_PREMIUM_MONTHLY_CENTS
                        )}
                        /mês
                      </h3>

                      <p className="muted">
                        Perfil completo com recursos
                        avançados de apresentação.
                      </p>

                      <button
                        className="btn"
                        type="button"
                        disabled
                        style={{
                          width: "100%",
                          marginTop: "auto",
                        }}
                      >
                        Em breve
                      </button>
                    </article>
                  </div>
                </section>

                <section className="player-editor-section">
                  <div>
                    <span className="page-eyebrow">
                      RESPONSÁVEL FINANCEIRO
                    </span>

                    <h3>Dados de cobrança</h3>

                    <p className="muted">
                      O pagamento é realizado pelo
                      responsável. Dados de cartão não
                      ficam armazenados no 11UP.
                    </p>
                  </div>

                  <form
                    className="form"
                    action={savePlayerBillingProfile}
                  >
                    <input
                      type="hidden"
                      name="playerId"
                      value={selected.id}
                    />

                    <label>
                      Nome para cobrança
                      <input
                        name="billingName"
                        required
                        defaultValue={
                          guardian?.billingProfile
                            ?.billingName ||
                          user.name
                        }
                      />
                    </label>

                    <div className="two-field-row">
                      <label>
                        E-mail de cobrança
                        <input
                          name="billingEmail"
                          type="email"
                          defaultValue={
                            guardian?.billingProfile
                              ?.billingEmail ||
                            user.email
                          }
                        />
                      </label>

                      <label>
                        WhatsApp / telefone
                        <input
                          name="billingPhone"
                          defaultValue={
                            guardian?.billingProfile
                              ?.billingPhone ||
                            guardian?.phone ||
                            ""
                          }
                        />
                      </label>
                    </div>

                    <div className="two-field-row">
                      <label>
                        CPF / CNPJ
                        <input
                          name="taxId"
                          inputMode="numeric"
                          defaultValue={
                            guardian?.billingProfile
                              ?.taxId || ""
                          }
                        />
                      </label>

                      <label>
                        CEP
                        <input
                          name="postalCode"
                          inputMode="numeric"
                          defaultValue={
                            guardian?.billingProfile
                              ?.postalCode || ""
                          }
                        />
                      </label>
                    </div>

                    <div className="two-field-row">
                      <label>
                        Endereço
                        <input
                          name="address"
                          defaultValue={
                            guardian?.billingProfile
                              ?.address || ""
                          }
                        />
                      </label>

                      <label>
                        Número
                        <input
                          name="addressNumber"
                          defaultValue={
                            guardian?.billingProfile
                              ?.addressNumber || ""
                          }
                        />
                      </label>
                    </div>

                    <div className="two-field-row">
                      <label>
                        Complemento
                        <input
                          name="complement"
                          defaultValue={
                            guardian?.billingProfile
                              ?.complement || ""
                          }
                        />
                      </label>

                      <label>
                        Bairro
                        <input
                          name="neighborhood"
                          defaultValue={
                            guardian?.billingProfile
                              ?.neighborhood || ""
                          }
                        />
                      </label>
                    </div>

                    <div className="two-field-row">
                      <label>
                        Cidade
                        <input
                          name="city"
                          defaultValue={
                            guardian?.billingProfile
                              ?.city || ""
                          }
                        />
                      </label>

                      <label>
                        UF
                        <input
                          name="state"
                          maxLength={2}
                          defaultValue={
                            guardian?.billingProfile
                              ?.state || ""
                          }
                        />
                      </label>
                    </div>

                    <div className="actions">
                      <PendingSubmitButton
                        pendingText="Salvando cobrança..."
                      >
                        Salvar dados de cobrança
                      </PendingSubmitButton>
                    </div>
                  </form>
                </section>

                <section className="player-editor-section">
                  <div>
                    <span className="page-eyebrow">
                      HISTÓRICO
                    </span>

                    <h3>Pagamentos</h3>
                  </div>

                  {selected.payments.length ? (
                    <div
                      style={{
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      {selected.payments.map(
                        (payment) => (
                          <article
                            key={payment.id}
                            className="player-preview-card"
                          >
                            <div>
                              <strong>
                                {payment.product ===
                                "PLAYER_PREMIUM_MONTHLY"
                                  ? "Player Premium"
                                  : payment.product ===
                                      "PLAYER_SIMPLE_MONTHLY"
                                    ? "Player Simples"
                                    : payment.product}
                              </strong>

                              <p className="muted">
                                {date(
                                  payment.createdAt
                                )}
                                {" • "}
                                {payment.method}
                              </p>
                            </div>

                            <div>
                              <strong>
                                {money(
                                  payment.amountCents
                                )}
                              </strong>

                              <p className="muted">
                                {payment.status ===
                                "PAID"
                                  ? "Pago"
                                  : payment.status ===
                                      "PENDING"
                                    ? "Pendente"
                                    : "Cancelado"}
                              </p>
                            </div>
                          </article>
                        )
                      )}
                    </div>
                  ) : (
                    <p className="muted">
                      Nenhum pagamento registrado para
                      este atleta.
                    </p>
                  )}
                </section>
              </>
            ) : (
              <section className="player-preview-card">
                <h3>Nenhum atleta selecionado</h3>
              </section>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}