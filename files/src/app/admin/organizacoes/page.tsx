import { requireSuperAdmin } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

function label(status:string){return ({ACTIVE:"Ativo",COMPLIMENTARY:"Cortesia",SUSPENDED:"Suspenso",CANCELLED:"Cancelado"} as Record<string,string>)[status]||status}
export default async function OrganizationsAdminPage({searchParams}:{searchParams:Promise<{q?:string}>}) {
  await requireSuperAdmin(); const {q=""}=await searchParams; const term=q.trim();
  const organizations=await prisma.organization.findMany({where:term?{OR:[{name:{contains:term,mode:"insensitive"}},{publicName:{contains:term,mode:"insensitive"}},{slug:{contains:term,mode:"insensitive"}},{email:{contains:term,mode:"insensitive"}}]}:undefined,include:{subscription:true,_count:{select:{users:true,athletes:true,categories:true,matches:true}}},orderBy:{createdAt:"desc"}});
  return <><div className="page-head"><div><h1>Organizações</h1><p className="muted">Clientes, planos, cortesias e controle de acesso.</p></div><span className="badge">{organizations.length} organização(ões)</span></div>
  <form className="admin-org-search"><input name="q" defaultValue={term} placeholder="Buscar por nome, slug ou e-mail"/><button className="btn" type="submit">Buscar</button>{term?<Link className="btn-secondary" href="/admin/organizacoes">Limpar</Link>:null}</form>
  <section className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Organização</th><th>Plano</th><th>Atletas</th><th>Status</th><th>Cortesia</th><th>Ação</th></tr></thead><tbody>{organizations.map(org=><tr key={org.id}><td><strong>{org.publicName||org.name}</strong><div className="help">{org.slug}</div></td><td>{org.subscription?.plan??"Sem plano"}<div className="help">{org.subscription?.status??"—"}</div></td><td>{org._count.athletes}</td><td><span className={`badge access-${org.accessStatus.toLowerCase()}`}>{label(org.accessStatus)}</span></td><td>{org.accessStatus==="COMPLIMENTARY"?(org.complimentaryUntil?`até ${org.complimentaryUntil.toLocaleDateString("pt-BR")}`:"sem prazo"):"—"}</td><td><Link href={`/admin/organizacoes/${org.id}`} className="btn-secondary btn-small">Gerenciar</Link></td></tr>)}</tbody></table></div></section></>;
}
