import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MercadoPagoReturn({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string }>;
}) {
  const user = await requireUser();
  const q = await searchParams;
  const paymentId = String(q.paymentId || "");

  const payment = paymentId
    ? await prisma.payment.findFirst({
        where: { id: paymentId, userId: user.id },
        include: { player: true },
      })
    : null;

  const paid = payment?.status === "PAID";

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="page-eyebrow">ONZEUP • MERCADO PAGO</span>
        <h1>{paid ? "Premium ativado!" : "Pagamento em processamento"}</h1>

        {paid ? (
          <p>
            A confirmação chegou do Mercado Pago e o ONZEUP Player Premium
            já está ativo.
          </p>
        ) : (
          <p>
            Você voltou do Mercado Pago. A ativação acontece automaticamente
            assim que recebermos a confirmação do pagamento.
          </p>
        )}

        {payment?.player ? (
          <Link className="btn" href={`/responsavel?player=${payment.player.id}`}>
            Voltar para {payment.player.nickname || payment.player.name}
          </Link>
        ) : (
          <Link className="btn" href="/responsavel">
            Voltar ao ONZEUP Player
          </Link>
        )}
      </section>
    </main>
  );
}
