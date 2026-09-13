import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import {
  requireOrganizationUser,
} from "@/lib/auth";
import {
  canManageClubUsers,
  clubRoleLabel,
  type ClubRole,
} from "@/lib/club-permissions";

import PendingSubmitButton from "@/components/PendingSubmitButton";

import {
  inviteClubUser,
  resendClubInvite,
  toggleClubUserAccess,
  updateClubUserRole,
} from "./actions";

function statusLabel(user: {
  active: boolean;
  accountStatus: string;
}) {
  if (
    user.accountStatus ===
    "PENDING_INVITE"
  ) {
    return "Convite pendente";
  }

  if (!user.active) {
    return "Inativo";
  }

  return "Ativo";
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    erro?: string;
  }>;
}) {
  const currentUser =
    await requireOrganizationUser();

  if (
    !canManageClubUsers(
      currentUser
    )
  ) {
    redirect("/dashboard");
  }

  const query =
    await searchParams;

  const users =
    await prisma.user.findMany({
      where: {
        organizationId:
          currentUser.organizationId,

        role: "COORDINATOR",
      },

      include: {
        clubInvites: {
          where: {
            usedAt: null,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },

      orderBy: [
        {
          active: "desc",
        },
        {
          name: "asc",
        },
      ],
    });

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">
            ADMINISTRAÇÃO
          </span>

          <h1>
            Usuários e Acessos
          </h1>

          <p className="muted">
            Cada pessoa acessa o
            ONZEUP com seu próprio
            e-mail e senha.
          </p>
        </div>
      </div>

      {query.status ===
      "convite-enviado" ? (
        <div className="notice">
          Convite enviado com sucesso.
        </div>
      ) : null}

      {query.status ===
      "convite-reenviado" ? (
        <div className="notice">
          Novo convite enviado.
        </div>
      ) : null}

      {query.status ===
      "perfil-atualizado" ? (
        <div className="notice">
          Perfil de acesso atualizado.
        </div>
      ) : null}

      {query.status ===
      "desativado" ? (
        <div className="notice">
          Acesso desativado.
        </div>
      ) : null}

      {query.status ===
      "reativado" ? (
        <div className="notice">
          Acesso reativado.
        </div>
      ) : null}

      {query.status ===
      "erro-email" ? (
        <div className="notice error">
          O usuário foi criado,
          mas não conseguimos enviar
          o convite por e-mail agora.
          Você pode reenviar abaixo.
        </div>
      ) : null}

      {query.erro === "email" ? (
        <div className="notice error">
          Já existe uma conta ONZEUP
          usando este e-mail.
        </div>
      ) : null}

      {query.erro ===
      "proprio-acesso" ? (
        <div className="notice error">
          Você não pode alterar ou
          desativar seu próprio acesso.
        </div>
      ) : null}

      {query.erro ===
      "convite-pendente" ? (
        <div className="notice error">
          Este usuário ainda precisa
          aceitar o convite.
        </div>
      ) : null}

      {query.erro &&
      ![
        "email",
        "proprio-acesso",
        "convite-pendente",
      ].includes(query.erro) ? (
        <div className="notice error">
          Não foi possível concluir
          esta operação.
        </div>
      ) : null}

      <section
        className="card"
        style={{
          marginTop: 18,
        }}
      >
        <span className="page-eyebrow">
          NOVO ACESSO
        </span>

        <h2>
          Convidar usuário
        </h2>

        <p className="muted">
          O usuário receberá um
          e-mail para criar a própria
          senha.
        </p>

        <form
          action={inviteClubUser}
          className="form"
        >
          <label>
            Nome
            <input
              name="name"
              required
              placeholder="Nome da pessoa"
            />
          </label>

          <label>
            E-mail
            <input
              name="email"
              type="email"
              required
              placeholder="email@exemplo.com"
            />
          </label>

          <label>
            Perfil de acesso

            <select
              name="clubRole"
              defaultValue="COORDINATOR"
              required
            >
              <option value="MANAGER">
                Gestor
              </option>

              <option value="COORDINATOR">
                Coordenador
              </option>

              <option value="COACH">
                Coach
              </option>

              <option value="FINANCE">
                Financeiro
              </option>
            </select>
          </label>

          <PendingSubmitButton
            className="btn"
            pendingText="Enviando convite..."
          >
            Enviar convite
          </PendingSubmitButton>
        </form>
      </section>

      <section
        className="card"
        style={{
          marginTop: 18,
        }}
      >
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              EQUIPE
            </span>

            <h2>
              Acessos do Club
            </h2>

            <p className="muted">
              Gerencie quem pode
              entrar no painel.
            </p>
          </div>

          <span className="badge">
            {users.length} usuário(s)
          </span>
        </div>

        {users.length === 0 ? (
          <div className="empty">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const effectiveRole =
                    (user.clubRole ||
                      "MANAGER") as ClubRole;

                  const pending =
                    user.accountStatus ===
                    "PENDING_INVITE";

                  const invite =
                    user.clubInvites[0];

                  const expired =
                    invite
                      ? invite.expiresAt <
                        new Date()
                      : false;

                  const isSelf =
                    user.id ===
                    currentUser.id;

                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>
                          {user.name}
                        </strong>

                        <div className="help">
                          {user.email}
                        </div>

                        {isSelf ? (
                          <div className="help">
                            Seu acesso
                          </div>
                        ) : null}
                      </td>

                      <td>
                        {isSelf ? (
                          <span className="badge">
                            {clubRoleLabel(
                              effectiveRole
                            )}
                          </span>
                        ) : (
                          <form
                            action={
                              updateClubUserRole
                            }
                            className="inline-form"
                          >
                            <input
                              type="hidden"
                              name="userId"
                              value={user.id}
                            />

                            <select
                              name="clubRole"
                              defaultValue={
                                effectiveRole
                              }
                            >
                              <option value="MANAGER">
                                Gestor
                              </option>

                              <option value="COORDINATOR">
                                Coordenador
                              </option>

                              <option value="COACH">
                                Coach
                              </option>

                              <option value="FINANCE">
                                Financeiro
                              </option>
                            </select>

                            <button
                              type="submit"
                              className="btn-small"
                            >
                              Salvar
                            </button>
                          </form>
                        )}
                      </td>

                      <td>
                        <span className="badge">
                          {statusLabel(user)}
                        </span>

                        {pending &&
                        expired ? (
                          <div className="help">
                            Convite expirado
                          </div>
                        ) : null}
                      </td>

                      <td>
                        <div className="actions">
                          {pending ? (
                            <form
                              action={
                                resendClubInvite
                              }
                              className="inline-form"
                            >
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />

                              <button
                                type="submit"
                                className="btn-secondary btn-small"
                              >
                                Reenviar convite
                              </button>
                            </form>
                          ) : null}

                          {!pending &&
                          !isSelf ? (
                            <form
                              action={
                                toggleClubUserAccess
                              }
                              className="inline-form"
                            >
                              <input
                                type="hidden"
                                name="userId"
                                value={user.id}
                              />

                              <button
                                type="submit"
                                className={
                                  user.active
                                    ? "btn-danger btn-small"
                                    : "btn-secondary btn-small"
                                }
                              >
                                {user.active
                                  ? "Desativar"
                                  : "Reativar"}
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}