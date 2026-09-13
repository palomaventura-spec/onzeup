import { prisma } from "@/lib/prisma";
import { requireClubPermission } from "@/lib/club-access";

import ModuleTour from "@/components/help/ModuleTour";
import WhatsAppAction from "@/components/WhatsAppAction";
import PendingSubmitButton from "@/components/PendingSubmitButton";

import {
  createCharge,
  createMonthlyFees,
  createRefereeFeesForCallUps,
  markChargePaid,
  markChargePending,
  cancelCharge,
  deleteCharge,
  updatePixSettings,
} from "./actions";

function money(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function fmtDate(date: Date) {
  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(date);
}

function labelType(type: string) {
  return (
    {
      MONTHLY_FEE: "Mensalidade",
      REFEREE_FEE: "Arbitragem",
      TOURNAMENT: "Torneio",
      UNIFORM: "Uniforme",
      TRAVEL: "Viagem",
      EVENT: "Evento",
      OTHER: "Outro",
    }[type] || type
  );
}

function pixType(
  key?: string | null
) {
  if (!key) {
    return "Não configurado";
  }

  const value = key.trim();

  if (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value
    )
  ) {
    return "E-mail";
  }

  const digits =
    value.replace(/\D/g, "");

  if (/^\d{11}$/.test(digits)) {
    return "CPF ou celular";
  }

  if (/^\d{14}$/.test(digits)) {
    return "CNPJ";
  }

  return "Chave aleatória";
}

function statusLabel(
  status: string
) {
  return (
    {
      PENDING: "Pendente",
      PAID: "Pago",
      OVERDUE: "Vencido",
      CANCELLED: "Cancelado",
    }[status] || status
  );
}

export default async function FinancePage() {
  const user =
    await requireClubPermission(
      "FINANCE_VIEW"
    );

  const orgId =
    user.organizationId;

  const [
    charges,
    athletes,
    categories,
    matches,
    organization,
  ] = await Promise.all([
    prisma.charge.findMany({
      where: {
        organizationId: orgId,
      },

      include: {
        athlete: {
          include: {
            category: true,
          },
        },

        match: true,
      },

      orderBy: [
        {
          dueDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    }),

    prisma.athlete.findMany({
      where: {
        organizationId: orgId,
        active: true,
      },

      include: {
        category: true,
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.category.findMany({
      where: {
        organizationId: orgId,
      },

      orderBy: {
        name: "asc",
      },
    }),

    prisma.match.findMany({
      where: {
        organizationId: orgId,
        status: "SCHEDULED",
      },

      include: {
        category: true,
        callUps: true,
      },

      orderBy: {
        startsAt: "asc",
      },
    }),

    prisma.organization.findUnique({
      where: {
        id: orgId,
      },

      select: {
        name: true,
        publicName: true,
        pixKey: true,
      },
    }),
  ]);

  const pending =
    charges.filter(
      (charge) =>
        charge.status === "PENDING"
    );

  const paid =
    charges.filter(
      (charge) =>
        charge.status === "PAID"
    );

  const pendingTotal =
    pending.reduce(
      (sum, charge) =>
        sum + charge.amountCents,
      0
    );

  const paidTotal =
    paid.reduce(
      (sum, charge) =>
        sum + charge.amountCents,
      0
    );

  return (
    <>
      <div className="page-head">
        <ModuleTour module="financeiro" />

        <div>
          <h1>Financeiro</h1>

          <p className="muted">
            Controle simples de
            cobranças dos atletas e
            responsáveis.
          </p>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>
            {money(pendingTotal)}
          </h2>

          <span className="muted">
            Pendente
          </span>
        </div>

        <div className="card">
          <h2>
            {money(paidTotal)}
          </h2>

          <span className="muted">
            Recebido
          </span>
        </div>

        <div className="card">
          <h2>
            {pending.length}
          </h2>

          <span className="muted">
            Cobranças pendentes
          </span>
        </div>

        <div className="card">
          <h2>
            {paid.length}
          </h2>

          <span className="muted">
            Pagamentos registrados
          </span>
        </div>
      </div>

      <section
        className="card"
        style={{
          marginTop: 18,
        }}
      >
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              RECEBIMENTOS DIRETOS
            </span>

            <h2>
              PIX da organização
            </h2>

            <p className="muted">
              A cobrança é controlada
              no ONZEUP, mas o pagamento
              vai diretamente para o
              clube.
            </p>
          </div>

          <span className="badge">
            {pixType(
              organization?.pixKey
            )}
          </span>
        </div>

        <form
          className="form"
          action={updatePixSettings}
        >
          <label>
            Chave PIX

            <input
              name="pixKey"
              defaultValue={
                organization?.pixKey ??
                ""
              }
              placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória"
            />
          </label>

          <p className="help">
            O ONZEUP não recebe nem
            movimenta este dinheiro. A
            chave é usada apenas para
            montar as mensagens de
            cobrança.
          </p>

          <PendingSubmitButton
            className="btn"
            pendingText="Salvando PIX..."
          >
            Salvar chave PIX
          </PendingSubmitButton>
        </form>
      </section>

      <div className="finance-grid">
        <section className="card">
          <h2>
            Cobrança individual
          </h2>

          <form
            className="form"
            action={createCharge}
          >
            <label>
              Atleta

              <select
                name="athleteId"
                required
                defaultValue=""
              >
                <option
                  value=""
                  disabled
                >
                  Selecione
                </option>

                {athletes.map(
                  (athlete) => (
                    <option
                      key={athlete.id}
                      value={athlete.id}
                    >
                      {athlete.name}
                      {athlete.category
                        ? ` — ${athlete.category.name}`
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Tipo

              <select
                name="type"
                defaultValue="MONTHLY_FEE"
              >
                <option value="MONTHLY_FEE">
                  Mensalidade
                </option>

                <option value="REFEREE_FEE">
                  Arbitragem
                </option>

                <option value="TOURNAMENT">
                  Torneio
                </option>

                <option value="UNIFORM">
                  Uniforme
                </option>

                <option value="TRAVEL">
                  Viagem
                </option>

                <option value="EVENT">
                  Evento
                </option>

                <option value="OTHER">
                  Outro
                </option>
              </select>
            </label>

            <label>
              Título

              <input
                name="title"
                placeholder="Ex.: Mensalidade de agosto"
                required
              />
            </label>

            <label>
              Valor (R$)

              <input
                name="amount"
                inputMode="decimal"
                placeholder="180,00"
                required
              />
            </label>

            <label>
              Vencimento

              <input
                name="dueDate"
                type="date"
                required
              />
            </label>

            <label>
              Jogo relacionado

              <select
                name="matchId"
                defaultValue=""
              >
                <option value="">
                  Nenhum
                </option>

                {matches.map(
                  (match) => (
                    <option
                      key={match.id}
                      value={match.id}
                    >
                      {
                        match.category
                          .name
                      }{" "}
                      ×{" "}
                      {match.opponent}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Descrição

              <textarea
                name="description"
                rows={3}
              />
            </label>

            <button type="submit">
              Criar cobrança
            </button>
          </form>
        </section>

        <section className="card">
          <h2>
            Mensalidade em lote
          </h2>

          <form
            className="form"
            action={
              createMonthlyFees
            }
          >
            <label>
              Categoria

              <select
                name="categoryId"
                defaultValue=""
              >
                <option value="">
                  Todos os atletas
                  ativos
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category.id
                      }
                      value={
                        category.id
                      }
                    >
                      {
                        category.name
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Título

              <input
                name="title"
                defaultValue="Mensalidade"
              />
            </label>

            <label>
              Valor por atleta (R$)

              <input
                name="amount"
                placeholder="180,00"
                required
              />
            </label>

            <label>
              Vencimento

              <input
                name="dueDate"
                type="date"
                required
              />
            </label>

            <button type="submit">
              Gerar mensalidades
            </button>
          </form>

          <hr
            style={{
              borderColor:
                "var(--line)",
              width: "100%",
              margin: "24px 0",
            }}
          />

          <h2>
            Taxa de arbitragem
          </h2>

          <form
            className="form"
            action={
              createRefereeFeesForCallUps
            }
          >
            <label>
              Jogo

              <select
                name="matchId"
                required
                defaultValue=""
              >
                <option
                  value=""
                  disabled
                >
                  Selecione
                </option>

                {matches.map(
                  (match) => (
                    <option
                      key={match.id}
                      value={match.id}
                    >
                      {
                        match.category
                          .name
                      }{" "}
                      ×{" "}
                      {match.opponent}
                      {" — "}
                      {
                        match.callUps
                          .length
                      }{" "}
                      convocado(s)
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Valor por convocado (R$)

              <input
                name="amount"
                placeholder="25,00"
                required
              />
            </label>

            <label>
              Vencimento

              <input
                name="dueDate"
                type="date"
                required
              />
            </label>

            <button type="submit">
              Gerar taxa para
              convocados
            </button>
          </form>
        </section>
      </div>

      <section
        className="card"
        style={{
          marginTop: 18,
        }}
      >
        <h2>Cobranças</h2>

        {charges.length === 0 ? (
          <div className="empty">
            Nenhuma cobrança
            cadastrada.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Atleta</th>
                  <th>Tipo</th>
                  <th>Título</th>
                  <th>
                    Vencimento
                  </th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {charges.map(
                  (charge) => (
                    <tr
                      key={charge.id}
                    >
                      <td>
                        <strong>
                          {
                            charge
                              .athlete
                              .name
                          }
                        </strong>

                        <div className="help">
                          {charge
                            .athlete
                            .category
                            ?.name ??
                            "—"}
                        </div>
                      </td>

                      <td>
                        {labelType(
                          charge.type
                        )}
                      </td>

                      <td>
                        {charge.title}
                      </td>

                      <td>
                        {fmtDate(
                          charge.dueDate
                        )}
                      </td>

                      <td>
                        <strong>
                          {money(
                            charge.amountCents
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`status finance-${charge.status.toLowerCase()}`}
                        >
                          {statusLabel(
                            charge.status
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="actions">
                          {charge.status !==
                          "PAID" ? (
                            <form
                              action={
                                markChargePaid
                              }
                              className="inline-form"
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  charge.id
                                }
                              />

                              <select
                                name="paymentMethod"
                                defaultValue="PIX"
                              >
                                <option value="PIX">
                                  Pix
                                </option>

                                <option value="CASH">
                                  Dinheiro
                                </option>

                                <option value="TRANSFER">
                                  Transferência
                                </option>

                                <option value="CARD">
                                  Cartão
                                </option>

                                <option value="BOLETO">
                                  Boleto
                                </option>

                                <option value="OTHER">
                                  Outro
                                </option>
                              </select>

                              <button
                                className="btn-small"
                                type="submit"
                              >
                                Dar baixa
                              </button>
                            </form>
                          ) : (
                            <form
                              action={
                                markChargePending
                              }
                              className="inline-form"
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  charge.id
                                }
                              />

                              <button
                                className="btn-secondary btn-small"
                                type="submit"
                              >
                                Reabrir
                              </button>
                            </form>
                          )}

                          {charge.status !==
                          "CANCELLED" ? (
                            <form
                              action={
                                cancelCharge
                              }
                              className="inline-form"
                            >
                              <input
                                type="hidden"
                                name="id"
                                value={
                                  charge.id
                                }
                              />

                              <button
                                className="btn-secondary btn-small"
                                type="submit"
                              >
                                Cancelar
                              </button>
                            </form>
                          ) : null}

                          {charge.status !==
                          "PAID" ? (
                            <WhatsAppAction
                              phone={
                                charge
                                  .athlete
                                  .guardianPhone
                              }
                              label="Cobrar no WhatsApp"
                              message={`Olá! Lembrete da ${
                                organization?.publicName ||
                                organization?.name ||
                                "organização"
                              }.

👤 Atleta: ${
                                charge
                                  .athlete
                                  .nickname ||
                                charge
                                  .athlete
                                  .name
                              }
📄 ${charge.title}
💰 ${money(
                                charge.amountCents
                              )}
📅 Vencimento: ${fmtDate(
                                charge.dueDate
                              )}${
                                organization?.pixKey
                                  ? `
💠 PIX: ${organization.pixKey}`
                                  : ""
                              }

Se o pagamento já foi realizado, desconsidere.`}
                            />
                          ) : null}

                          <form
                            action={
                              deleteCharge
                            }
                            className="inline-form"
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={
                                charge.id
                              }
                            />

                            <button
                              className="btn-danger btn-small"
                              type="submit"
                            >
                              Excluir
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}