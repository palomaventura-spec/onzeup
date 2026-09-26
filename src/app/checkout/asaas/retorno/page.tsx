import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AsaasReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const query = await searchParams;
  const status = String(query.status || "");

  const content =
    status === "success"
      ? {
          eyebrow: "PAGAMENTO RECEBIDO",
          title: "Pagamento concluído.",
          text: "A confirmação do plano é processada automaticamente pelo 11UP. Volte ao Player para acompanhar o status da assinatura.",
        }
      : status === "expired"
        ? {
            eyebrow: "CHECKOUT EXPIRADO",
            title: "O link de pagamento expirou.",
            text: "Volte ao Player e gere um novo checkout para continuar.",
          }
        : {
            eyebrow: "PAGAMENTO CANCELADO",
            title: "O pagamento não foi concluído.",
            text: "Nenhuma alteração foi feita no seu plano. Você pode tentar novamente quando quiser.",
          };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="page-eyebrow">{content.eyebrow}</span>
        <h1>{content.title}</h1>
        <p>{content.text}</p>
        <Link className="btn" href="/responsavel">
          Voltar ao 11UP Player
        </Link>
      </section>
    </main>
  );
}
