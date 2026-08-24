import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import AdminConfirmSubmit from "../../AdminConfirmSubmit";
import {
  deactivateOrganization,
  deleteInactiveOrganization,
  reactivateOrganization,
  updateOrganizationAccess,
} from "../actions";

function dateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function statusLabel(status: string) {
  return ({
    ACTIVE: "Ativo",
    COMPLIMENTARY: "Cortesia",
    SUSPENDED: "Suspenso",
    CANCELLED: "Cancelado",
  } as Record<string, string>)[status] || status;
}

export default async function OrganizationAdminDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const query = await searchParams;

  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      subscription: true,
      _count: {
        select: {
          users: true,
          athletes: true,
          categories: true,
          matches: true,
          qtrs: true,
          payments: true,
        },
      },
    },
  });

  if (!org) notFound();

  const inactive = !org.active && ["SUSPENDED", "CANCELLED"].includes(org.accessStatus);

  return (
    <main className="admin-access-page">
      <div className="page-head">
        <div>
          <Link href="/admin/organizacoes" className="help">← Organizações</Link>
          <h1>{org.publicName || org.name}</h1>
          <p className="muted">Controle administrativo de acesso e ciclo de vida da organização.</p>
        </div>
        <span className={`badge access-${org.accessStatus.toLowerCase()}`}>
          {statusLabel(org.accessStatus)}
        </span>
      </div>

      {query.saved ? (
        <div className="admin-success">
          {query.saved === "deactivated"
            ? "Organização desativada. O acesso foi suspenso."
            : query.saved === "reactivated"
              ? "Organização reativada."
              : "Acesso atualizado com sucesso."}
        </div>
      ) : null}

      {query.error ? (
        <div className="notice error">
          {query.error === "must_deactivate"
            ? "Desative ou cancele a organização antes de excluir definitivamente."
            : query.error === "financial_history"
              ? "Esta organização possui pagamentos recebidos. Para preservar o histórico financeiro, ela não pode ser excluída; mantenha-a cancelada/inativa."
              : "Não foi possível concluir a ação solicitada."}
        </div>
      ) : null}

      <div className="admin-access-summary">
        <article className="card">
          <span className="page-eyebrow">PLANO</span>
          <h2>{org.subscription?.plan || "Sem plano"}</h2>
          <p className="muted">{org.subscription?.status || "Sem assinatura"}</p>
        </article>
        <article className="card">
          <span className="page-eyebrow">ATLETAS</span>
          <h2>{org._count.athletes}</h2>
          <p className="muted">{org._count.categories} categoria(s)</p>
        </article>
        <article className="card">
          <span className="page-eyebrow">USUÁRIOS</span>
          <h2>{org._count.users}</h2>
          <p className="muted">{org._count.matches} jogo(s)</p>
        </article>
        <article className="card">
          <span className="page-eyebrow">CORTESIA</span>
          <h2>
            {org.complimentaryUntil
              ? org.complimentaryUntil.toLocaleDateString("pt-BR")
              : org.accessStatus === "COMPLIMENTARY"
                ? "Sem prazo"
                : "—"}
          </h2>
          <p className="muted">{org.complimentaryReason || "Sem observação"}</p>
        </article>
      </div>

      <section className="card admin-access-card">
        <div>
          <span className="page-eyebrow">ACESSO</span>
          <h2>Gerenciar acesso</h2>
          <p className="muted">Libere cortesia, suspenda, reative ou cancele sem entrar na conta privada do cliente.</p>
        </div>
        <form action={updateOrganizationAccess} className="admin-access-form">
          <input type="hidden" name="organizationId" value={org.id} />
          <label>
            Status
            <select name="accessStatus" defaultValue={org.accessStatus}>
              <option value="ACTIVE">Ativo</option>
              <option value="COMPLIMENTARY">Cortesia</option>
              <option value="SUSPENDED">Suspenso</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>
          <label>
            Prazo da cortesia
            <select name="complimentaryMode" defaultValue={org.complimentaryUntil ? "UNTIL" : "NO_EXPIRY"}>
              <option value="NO_EXPIRY">Sem prazo</option>
              <option value="UNTIL">Até uma data</option>
            </select>
          </label>
          <label>
            Data final
            <input type="date" name="complimentaryUntil" defaultValue={dateInput(org.complimentaryUntil)} />
          </label>
          <label className="admin-access-reason">
            Motivo / observação
            <input name="complimentaryReason" defaultValue={org.complimentaryReason || ""} placeholder="Ex.: piloto parceiro ONZEUP" />
          </label>
          <button className="btn" type="submit">Salvar controle de acesso</button>
        </form>
      </section>

      <section className="card admin-danger-zone-v171">
        <div>
          <span className="page-eyebrow">ADMINISTRAÇÃO DO CADASTRO</span>
          <h2>{inactive ? "Organização inativa" : "Desativar organização"}</h2>
          <p className="muted">
            Desativar bloqueia o acesso sem apagar dados. A exclusão definitiva só é liberada depois da desativação e é bloqueada quando existe histórico financeiro pago.
          </p>
        </div>

        <div className="admin-danger-actions-v171">
          {!inactive ? (
            <form action={deactivateOrganization}>
              <input type="hidden" name="organizationId" value={org.id} />
              <AdminConfirmSubmit
                label="Desativar organização"
                confirmText={`Desativar ${org.publicName || org.name}? O acesso será suspenso, mas os dados permanecerão armazenados.`}
              />
            </form>
          ) : (
            <>
              <form action={reactivateOrganization}>
                <input type="hidden" name="organizationId" value={org.id} />
                <button className="btn-secondary" type="submit">Reativar organização</button>
              </form>

              <form action={deleteInactiveOrganization}>
                <input type="hidden" name="organizationId" value={org.id} />
                <AdminConfirmSubmit
                  label="Excluir definitivamente"
                  className="btn-danger-v171"
                  confirmText={`EXCLUIR DEFINITIVAMENTE ${org.publicName || org.name}? Serão removidos usuários e dados operacionais vinculados (${org._count.users} usuário(s), ${org._count.athletes} atleta(s), ${org._count.categories} categoria(s), ${org._count.matches} jogo(s), ${org._count.qtrs} QTR). Esta ação não pode ser desfeita.`}
                />
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
