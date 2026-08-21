import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { mercadoPagoIsTestMode } from "@/lib/mercadopago";
import MercadoPagoSandboxCardForm from "@/components/MercadoPagoSandboxCardForm";

export const dynamic = "force-dynamic";

export default async function MercadoPagoSandboxPage({
  searchParams,
}: {
  searchParams: Promise<{ playerId?: string }>;
}) {
  const user = await requireUser();

  if (user.role !== "GUARDIAN") {
    redirect("/dashboard");
  }

  if (!mercadoPagoIsTestMode()) {
    redirect("/responsavel");
  }

  const query = await searchParams;
  const playerId = String(query.playerId || "");

  const guardian = await prisma.guardianProfile.findUnique({
    where: { userId: user.id },
  });

  if (!guardian || !playerId) notFound();

  const player = await prisma.playerProfile.findFirst({
    where: {
      id: playerId,
      guardianId: guardian.id,
    },
  });

  if (!player) notFound();

  const publicKey = process.env.MERCADOPAGO_PUBLIC_KEY || "";

  if (!publicKey.startsWith("TEST-")) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <span className="page-eyebrow">MERCADO PAGO • SANDBOX</span>
          <h1>Public Key de teste ausente</h1>
          <p>
            Configure MERCADOPAGO_PUBLIC_KEY com a Public Key TEST da mesma
            aplicação que fornece o Access Token TEST.
          </p>
          <Link className="btn" href="/responsavel">
            Voltar
          </Link>
        </section>
      </main>
    );
  }

  // Não usamos e-mail de conta de teste do Mercado Pago neste fluxo.
  // O usuário informa um e-mail comum diferente do e-mail da conta Mercado Pago.
  const payerEmail = "";

  return (
    <main className="auth-shell mp-sandbox-shell">
      <section className="auth-card mp-sandbox-card">
        <span className="page-eyebrow">MERCADO PAGO • SANDBOX</span>
        <h1>Testar Player Premium</h1>

        <div className="mp-product-summary">
          <div>
            <strong>{player.nickname || player.name}</strong>
            <span>ONZEUP Player Premium</span>
          </div>
          <b>R$ 29,90/mês</b>
        </div>

        <div className="mp-test-warning">
          <strong>Teste técnico — nenhum cartão real.</strong>
          <p>
            Use somente cartão oficial de teste do Mercado Pago e um e-mail
            comum diferente do e-mail da sua conta Mercado Pago.
          </p>
        </div>

        <MercadoPagoSandboxCardForm
          publicKey={publicKey}
          playerId={player.id}
          payerEmail={payerEmail}
        />

        <Link className="btn-secondary" href={`/responsavel?player=${player.id}`}>
          Cancelar e voltar
        </Link>
      </section>
    </main>
  );
}
