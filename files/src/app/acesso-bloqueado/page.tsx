import Link from "next/link";

export default async function AccessBlocked({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const text =
    status === "suspended"
      ? "O acesso desta organização está suspenso."
      : status === "cancelled"
        ? "O acesso desta organização foi cancelado."
        : status === "past_due"
          ? "A mensalidade está há mais de 10 dias em atraso. Regularize o pagamento para liberar o acesso ao ONZEUP Club."
          : status === "billing_cancelled"
            ? "A assinatura do ONZEUP Club foi cancelada."
            : "O período de cortesia desta organização terminou.";

  return (
    <main className="access-blocked-page">
      <section className="card">
        <span className="page-eyebrow">ONZEUP CLUB</span>
        <h1>Acesso indisponível</h1>
        <p>{text}</p>
        <p className="muted">Se o pagamento já foi realizado, aguarde a confirmação automática do Asaas e tente novamente.</p>
        <form action="/api/auth/logout" method="post"><button className="btn">Sair</button></form>
        <Link href="/">Voltar ao site</Link>
      </section>
    </main>
  );
}
