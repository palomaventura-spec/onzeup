import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import CopyPixButton from "@/components/CopyPixButton";

function money(cents:number){return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(cents/100)}

export default async function PixCheckout({ params }:{ params:Promise<{id:string}> }) {
  const user=await requireUser();
  const {id}=await params;
  const payment=await prisma.payment.findUnique({where:{id},include:{player:true}});
  if(!payment) notFound();
  if(payment.userId!==user.id && user.role!=="SUPER_ADMIN") redirect("/responsavel");

  const qr = payment.pixPayload ? await QRCode.toDataURL(payment.pixPayload,{width:320,margin:1}) : null;
  return <main className="pix-checkout-page">
    <header className="pix-checkout-nav"><Link href="/" className="player-brand">ONZE<span>UP</span></Link><Link href="/responsavel">Voltar ao painel</Link></header>
    <section className="pix-checkout-card">
      <div className="pix-checkout-copy">
        <span className="page-eyebrow">PAGAMENTO VIA PIX</span>
        <h1>Ative o Premium.</h1>
        <p>Pedido para <strong>{payment.player?.name || "ONZEUP Player"}</strong>.</p>
        <div className="pix-order-summary"><span>ONZEUP Player Premium</span><strong>{money(payment.amountCents)}</strong><small>30 dias de Premium após confirmação</small></div>
        <div className={`pix-status ${payment.status.toLowerCase()}`}>{payment.status==="PAID"?"✓ Pagamento confirmado":"● Aguardando confirmação"}</div>
        {payment.status==="PAID"?<Link className="btn" href="/responsavel">Voltar ao Player</Link>:null}
      </div>
      <div className="pix-payment-box">
        {payment.pixPayload && qr ? <>
          <img src={qr} alt="QR Code PIX" className="pix-qr"/>
          <p>Escaneie o QR Code pelo aplicativo do seu banco ou use o Pix Copia e Cola.</p>
          <label>PIX Copia e Cola<textarea readOnly value={payment.pixPayload} rows={5}/></label>
          <CopyPixButton payload={payment.pixPayload} />
        </> : <div className="pix-not-configured"><strong>PIX ainda não configurado.</strong><p>Defina ONZEUP_PIX_KEY na Vercel/.env para habilitar o QR Code e Copia e Cola.</p></div>}
        <small>Identificação: {payment.pixTxid}</small>
        <p className="pix-help">Depois do pagamento, a ONZEUP confirma o recebimento e ativa o Premium. Nesta fase do MVP, a confirmação é manual.</p>
      </div>
    </section>
  </main>;
}
