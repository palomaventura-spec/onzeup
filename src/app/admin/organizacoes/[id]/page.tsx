import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth";
import { updateOrganizationAccess } from "../actions";

function dateInput(value: Date | null | undefined) { return value ? value.toISOString().slice(0, 10) : ""; }
function statusLabel(status: string) { return ({ACTIVE:"Ativo",COMPLIMENTARY:"Cortesia",SUSPENDED:"Suspenso",CANCELLED:"Cancelado"} as Record<string,string>)[status] || status; }

export default async function OrganizationAdminDetail({ params, searchParams }: { params: Promise<{id:string}>, searchParams: Promise<{saved?:string}> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const { saved } = await searchParams;
  const org = await prisma.organization.findUnique({ where:{id}, include:{subscription:true,_count:{select:{users:true,athletes:true,categories:true,matches:true}}} });
  if (!org) notFound();
  return <main className="admin-access-page">
    <div className="page-head"><div><Link href="/admin/organizacoes" className="help">← Organizações</Link><h1>{org.publicName || org.name}</h1><p className="muted">Controle administrativo de acesso da organização.</p></div><span className={`badge access-${org.accessStatus.toLowerCase()}`}>{statusLabel(org.accessStatus)}</span></div>
    {saved ? <div className="admin-success">Acesso atualizado com sucesso.</div> : null}
    <div className="admin-access-summary">
      <article className="card"><span className="page-eyebrow">PLANO</span><h2>{org.subscription?.plan || "Sem plano"}</h2><p className="muted">{org.subscription?.status || "Sem assinatura"}</p></article>
      <article className="card"><span className="page-eyebrow">ATLETAS</span><h2>{org._count.athletes}</h2><p className="muted">{org._count.categories} categoria(s)</p></article>
      <article className="card"><span className="page-eyebrow">USUÁRIOS</span><h2>{org._count.users}</h2><p className="muted">{org._count.matches} jogo(s)</p></article>
      <article className="card"><span className="page-eyebrow">CORTESIA</span><h2>{org.complimentaryUntil ? org.complimentaryUntil.toLocaleDateString("pt-BR") : org.accessStatus === "COMPLIMENTARY" ? "Sem prazo" : "—"}</h2><p className="muted">{org.complimentaryReason || "Sem observação"}</p></article>
    </div>
    <section className="card admin-access-card"><div><span className="page-eyebrow">ACESSO</span><h2>Gerenciar acesso</h2><p className="muted">Libere cortesia, suspenda, reative ou cancele sem entrar na conta privada do cliente.</p></div>
      <form action={updateOrganizationAccess} className="admin-access-form">
        <input type="hidden" name="organizationId" value={org.id}/>
        <label>Status<select name="accessStatus" defaultValue={org.accessStatus}><option value="ACTIVE">Ativo</option><option value="COMPLIMENTARY">Cortesia</option><option value="SUSPENDED">Suspenso</option><option value="CANCELLED">Cancelado</option></select></label>
        <label>Prazo da cortesia<select name="complimentaryMode" defaultValue={org.complimentaryUntil ? "UNTIL" : "NO_EXPIRY"}><option value="NO_EXPIRY">Sem prazo</option><option value="UNTIL">Até uma data</option></select></label>
        <label>Data final<input type="date" name="complimentaryUntil" defaultValue={dateInput(org.complimentaryUntil)}/></label>
        <label className="admin-access-reason">Motivo / observação<input name="complimentaryReason" defaultValue={org.complimentaryReason || ""} placeholder="Ex.: piloto parceiro ONZEUP"/></label>
        <button className="btn" type="submit">Salvar controle de acesso</button>
      </form>
    </section>
  </main>;
}
