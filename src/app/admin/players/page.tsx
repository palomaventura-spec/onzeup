import PendingSubmitButton from "@/components/PendingSubmitButton";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { reconcileExpiredSimplePlayerCourtesies } from "@/lib/player-simple-courtesy";
import AdminConfirmSubmit from "../AdminConfirmSubmit";
import {
  deactivatePlayer,
  deleteInactivePlayer,
  reactivatePlayer,
  grantSimplePlayerCourtesy,
  endSimplePlayerCourtesy,
  updatePremiumPlayerGuardian,
} from "./actions";

function isInactive(status: string) {
  return status === "INACTIVE";
}

function statusLabel(status: string) {
  if (status === "INACTIVE") return "Inativo";
  if (status === "AWAITING_PAYMENT") return "Aguardando pagamento";
  if (status === "PAST_DUE") return "Em atraso";
  return "Ativo";
}

export default async function AdminPlayers({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    plan?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  await requireSuperAdmin();
  const query = await searchParams;
  const term = String(query.q || "").trim();
  const status = String(query.status || "ALL").toUpperCase();
  const plan = String(query.plan || "ALL").toUpperCase();

  await reconcileExpiredSimplePlayerCourtesies();

  const players = await prisma.playerProfile.findMany({
    where: {
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" as const } },
              { nickname: { contains: term, mode: "insensitive" as const } },
              { slug: { contains: term, mode: "insensitive" as const } },
              { currentClub: { contains: term, mode: "insensitive" as const } },
              {
                guardian: {
                  user: {
                    email: { contains: term, mode: "insensitive" as const },
                  },
                },
              },
            ],
          }
        : {}),
      ...(status === "ACTIVE" ? { NOT: { planStatus: "INACTIVE" } } : {}),
      ...(status === "INACTIVE" ? { planStatus: "INACTIVE" } : {}),
      ...(plan === "FREE" || plan === "PREMIUM" ? { plan } : {}),
    },
    include: {
      guardian: { include: { user: true } },
      _count: { select: { payments: true, athleteLinks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>11UP Players</h1>
          <p className="muted">
            Perfis esportivos, planos, responsáveis e limpeza de cadastros inativos.
          </p>
        </div>
        <span className="badge">{players.length} perfil(is)</span>
      </div>

      {query.saved ? (
        <div className="admin-success">
          {query.saved === "deactivated"
            ? "Player desativado. Ele saiu do catálogo e agora pode ser excluído definitivamente."
            : query.saved === "guardian"
              ? "Responsável do Premium atualizado. Os demais Players, o plano e os vínculos existentes foram preservados."
              : query.saved === "simple_courtesy"
                ? "Cortesia Player Simples concedida. A família não será cobrada por este benefício durante a vigência."
                : query.saved === "courtesy_ended"
                  ? "Cortesia Simples encerrada. O vínculo com o clube foi preservado."
                  : "Player reativado com sucesso."}
        </div>
      ) : null}

      {query.deleted ? (
        <div className="admin-success">Player excluído definitivamente.</div>
      ) : null}

      {query.error ? (
        <div className="notice error">
          {query.error === "must_deactivate"
            ? "Para excluir um Player, desative o perfil primeiro."
            : query.error === "invalid_email"
              ? "Informe um e-mail válido."
              : query.error === "guardian_not_found"
                ? "Não foi encontrada uma conta única de responsável com esse e-mail. Cadastre ou confira a conta de responsável no Players antes de tentar novamente."
                : query.error === "not_premium"
                  ? "Esta alteração está disponível somente para um Player Premium."
                  : query.error === "stale_guardian"
                    ? "O responsável mudou desde que a página foi aberta. Atualize a página e confira o cadastro."
                    : query.error === "invalid_date"
                      ? "Informe uma data futura válida para a cortesia."
                      : query.error === "link_required"
                        ? "Cortesia não liberada: é necessário um vínculo ativo e confirmado pelo clube."
                        : query.error === "existing_premium"
                          ? "Não é permitido substituir uma assinatura Premium paga ou uma cortesia Premium."
                          : query.error === "inactive"
                            ? "Reative o Player antes de conceder a cortesia."
                            : query.error === "not_simple_courtesy"
                              ? "Este perfil não possui cortesia Simples ativa para encerrar."
                              : "Não foi possível concluir a ação solicitada."}
        </div>
      ) : null}

      <form className="admin-entity-filter-v171" method="get">
        <input
          name="q"
          defaultValue={term}
          placeholder="Buscar atleta, slug, clube ou e-mail do responsável"
        />
        <select name="status" defaultValue={status}>
          <option value="ALL">Todos os status</option>
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
        </select>
        <select name="plan" defaultValue={plan}>
          <option value="ALL">Todos os planos</option>
          <option value="FREE">Simples</option>
          <option value="PREMIUM">Premium</option>
        </select>
        <button className="btn" type="submit">Filtrar</button>
        {(term || status !== "ALL" || plan !== "ALL") ? (
          <Link className="btn-secondary" href="/admin/players">Limpar</Link>
        ) : null}
      </form>

      <section className="card">
        <div className="table-wrap">
          <table className="table admin-entity-table-v171">
            <thead>
              <tr>
                <th>Atleta</th>
                <th>Responsável</th>
                <th>Plano</th>
                <th>Status</th>
                <th>Visibilidade</th>
                <th>Vínculos</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const inactive = isInactive(p.planStatus);
                return (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <div className="help">{p.nickname || p.slug}</div>
                    </td>
                    <td>
                      {p.guardian.user.name}
                      <div className="help">{p.guardian.user.email}</div>
                      {p.plan === "PREMIUM" ? (
                        <details style={{ marginTop: 12 }}>
                          <summary style={{ cursor: "pointer" }}>Alterar e-mail do responsável</summary>
                          <form action={updatePremiumPlayerGuardian} style={{ display: "grid", gap: 10, marginTop: 12, minWidth: 220, maxWidth: 340 }}>
                            <input type="hidden" name="playerId" value={p.id} />
                            <input type="hidden" name="previousGuardianId" value={p.guardianId} />
                            <label htmlFor={`guardian-email-${p.id}`}>E-mail da conta de responsável</label>
                            <input id={`guardian-email-${p.id}`} name="guardianEmail" type="email" required maxLength={254} defaultValue={p.guardian.user.email} />
                            <p className="help">Somente este Premium passará para a conta informada. Ela poderá gerenciar o perfil. O cadastro Free não será alterado.</p>
                            <AdminConfirmSubmit
                              label="Salvar responsável"
                              confirmText={`Transferir a gestão do Premium de ${p.name} para a conta do e-mail informado? Confira o e-mail antes de confirmar. Os demais Players não serão alterados.`}
                            />
                          </form>
                        </details>
                      ) : null}
                    </td>
                    <td>
                      <span className="badge">{p.plan === "PREMIUM" ? "Premium" : "Simples"}</span>
                      {p.isComplimentary ? (
                        <div className="help">Cortesia {p.complimentaryPlan === "SIMPLE" ? "Simples" : "Premium"}
                          {p.complimentaryUntil ? ` até ${p.complimentaryUntil.toLocaleDateString("pt-BR")}` : ""}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <span className={`badge ${inactive ? "admin-status-inactive" : "admin-status-active"}`}>
                        {statusLabel(p.planStatus)}
                      </span>
                    </td>
                    <td>
                      {p.isPublic ? "Público" : "Privado"}
                      <div className="help">
                        {p.directoryVisible ? "No catálogo" : "Fora do catálogo"}
                      </div>
                    </td>
                    <td>
                      {p._count.athleteLinks} vínculo(s)
                      <div className="help">{p._count.payments} pagamento(s)</div>
                    </td>
                    <td>
                      <div className="admin-row-actions-v171">
                        {p.isPublic ? (
                          <Link href={`/player/${p.slug}`} className="btn-secondary btn-small">
                            Abrir
                          </Link>
                        ) : null}

                        {!inactive ? (
                          <form action={deactivatePlayer}>
                            <input type="hidden" name="playerId" value={p.id} />
                            <AdminConfirmSubmit
                              label="Desativar"
                              confirmText={`Desativar ${p.name}? O perfil sairá do catálogo e deixará de ser público.`}
                            />
                          </form>
                        ) : (
                          <>
                            <form action={reactivatePlayer}>
                              <input type="hidden" name="playerId" value={p.id} />
                              <PendingSubmitButton pendingText="Atualizando…" className="btn-secondary btn-small" type="submit">Reativar</PendingSubmitButton>
                            </form>
                            <form action={deleteInactivePlayer}>
                              <input type="hidden" name="playerId" value={p.id} />
                              <AdminConfirmSubmit
                                label="Excluir"
                                className="btn-danger-v171 btn-small"
                                confirmText={`EXCLUIR DEFINITIVAMENTE ${p.name}? Esta ação não pode ser desfeita. Os pagamentos permanecem no histórico sem vínculo com o Player.`}
                              />
                            </form>
                          </>
                        )}

                        <details style={{ marginTop: 10, minWidth: 190 }}>
                          <summary style={{ cursor: "pointer" }}>Cortesia Player Simples</summary>
                          {p.isComplimentary && p.complimentaryPlan === "SIMPLE" ? (
                            <form action={endSimplePlayerCourtesy} style={{ marginTop: 10 }}>
                              <input type="hidden" name="playerId" value={p.id} />
                              <AdminConfirmSubmit
                                label="Encerrar cortesia"
                                confirmText={`Encerrar a cortesia Simples de ${p.name}? O perfil público ficará indisponível até regularização do plano. O vínculo com o clube será preservado.`}
                              />
                            </form>
                          ) : (
                            <form action={grantSimplePlayerCourtesy} style={{ display: "grid", gap: 8, marginTop: 10 }}>
                              <input type="hidden" name="playerId" value={p.id} />
                              <label htmlFor={`simples-until-${p.id}`}>Válida até (obrigatório)</label>
                              <input id={`simples-until-${p.id}`} type="date" name="complimentaryUntil" min={new Date().toISOString().slice(0, 10)} required />
                              <p className="help">Somente após vínculo aprovado pelo clube. Não altera Premium pago.</p>
                              <AdminConfirmSubmit
                                label="Conceder Simples"
                                confirmText={`Conceder gratuitamente o Player Simples a ${p.name}, pelo período informado? O Premium não está incluído.`}
                              />
                            </form>
                          )}
                        </details>

                      </div>
                    </td>
                  </tr>
                );
              })}

              {!players.length ? (
                <tr>
                  <td colSpan={7} className="admin-empty-cell-v171">Nenhum Player encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
