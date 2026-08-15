import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelPayment, confirmPayment } from "./actions";
function money(c:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(c/100)}
export default async function AdminPayments(){
 await requireSuperAdmin();
 const payments=await prisma.payment.findMany({include:{user:true,player:true},orderBy:{createdAt:"desc"},take:200});
 return <><div className="page-head"><div><h1>Pagamentos PIX</h1><p className="muted">Confirmação manual do MVP e ativação de produtos.</p></div><span className="badge">{payments.filter(p=>p.status==="PENDING").length} pendente(s)</span></div>
 <section className="card"><div className="table-wrap"><table className="table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Produto</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>
 {payments.map(p=><tr key={p.id}><td><strong>{p.pixTxid}</strong><div className="help">{p.createdAt.toLocaleString("pt-BR")}</div></td><td>{p.user.name}<div className="help">{p.user.email}</div>{p.player?<div className="help">Atleta: {p.player.name}</div>:null}</td><td>{p.product==="PLAYER_PREMIUM_MONTHLY"?"Player Premium - 30 dias":p.product}</td><td>{money(p.amountCents)}</td><td><span className={`badge ${p.status.toLowerCase()}`}>{p.status}</span>{p.confirmedAt?<div className="help">{p.confirmedAt.toLocaleString("pt-BR")}</div>:null}</td><td>{p.status==="PENDING"?<div className="admin-payment-actions"><form action={confirmPayment}><input type="hidden" name="id" value={p.id}/><button className="btn-small">Confirmar PIX</button></form><form action={cancelPayment}><input type="hidden" name="id" value={p.id}/><button className="btn-secondary btn-small">Cancelar</button></form></div>:"—"}</td></tr>)}
 {!payments.length?<tr><td colSpan={6}>Nenhum pagamento registrado.</td></tr>:null}</tbody></table></div></section></>;
}
