import { requireOrganizationUser } from "@/lib/auth";
import ClubPlanCard from "@/components/ClubPlanCard";

const plans = [
  { plan: "ESSENTIAL" as const, name: "Essencial", monthly: "R$ 49,90", annual: "R$ 499", annualSaving: "Economize R$ 99,80 no ano.", limit: "Até 100 atletas", description: "Para escolinhas, projetos e equipes em crescimento." },
  { plan: "PRO" as const, name: "Pro", monthly: "R$ 99,90", annual: "R$ 999", annualSaving: "Economize R$ 199,80 no ano.", limit: "Até 300 atletas", description: "Mais capacidade para operações com várias categorias.", featured: true },
  { plan: "ELITE" as const, name: "Elite", monthly: "R$ 149,90", annual: "R$ 1.499", annualSaving: "Economize R$ 299,80 no ano.", limit: "Atletas ilimitados", description: "Para clubes e estruturas de base com operação ampliada." },
];

export default async function Plans() {
  await requireOrganizationUser();
  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">ONZEUP CLUB</span>
          <h1>Planos e assinatura</h1>
          <p className="muted">Escolha o plano, a periodicidade e a forma de pagamento.</p>
        </div>
      </div>

      <section className="commercial-plans-grid">
        {plans.map((plan) => <ClubPlanCard key={plan.plan} {...plan} />)}
      </section>

      <section className="card payment-security-card">
        <div><span className="page-eyebrow">PAGAMENTO SEGURO</span><h2>Assine do seu jeito</h2></div>
        <p className="muted">Cartão mensal com cobrança recorrente. Pix mensal é pago a cada período. No anual, a confirmação libera 12 meses de acesso.</p>
      </section>
    </>
  );
}
