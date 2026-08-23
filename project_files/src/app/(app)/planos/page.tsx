import { requireOrganizationUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ClubPlanCard from "@/components/ClubPlanCard";

const plans = [
  { plan: "ESSENTIAL" as const, name: "Essencial", monthly: "R$ 49,90", annual: "R$ 499", annualSaving: "Economize R$ 99,80 no ano.", limit: "Até 100 atletas", description: "Para escolinhas, projetos e equipes em crescimento." },
  { plan: "PRO" as const, name: "Pro", monthly: "R$ 99,90", annual: "R$ 999", annualSaving: "Economize R$ 199,80 no ano.", limit: "Até 300 atletas", description: "Mais capacidade para operações com várias categorias.", featured: true },
  { plan: "ELITE" as const, name: "Elite", monthly: "R$ 149,90", annual: "R$ 1.499", annualSaving: "Economize R$ 299,80 no ano.", limit: "Atletas ilimitados", description: "Para clubes e estruturas de base com operação ampliada." },
];

function planName(plan?: string | null) {
  if (plan === "PRO") return "Pro";
  if (plan === "BUSINESS") return "Elite";
  return "Essencial";
}

function planPrice(plan?: string | null, billingCycle?: string | null) {
  const annual = billingCycle === "ANNUAL";
  if (plan === "PRO") return annual ? "R$ 999/ano" : "R$ 99,90/mês";
  if (plan === "BUSINESS") return annual ? "R$ 1.499/ano" : "R$ 149,90/mês";
  return annual ? "R$ 499/ano" : "R$ 49,90/mês";
}

function statusLabel(status?: string | null) {
  if (status === "ACTIVE") return "Ativa";
  if (status === "PAST_DUE") return "Pagamento pendente";
  if (status === "CANCELLED") return "Cancelada";
  return "Período de acesso";
}

export default async function Plans() {
  const user = await requireOrganizationUser();
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: user.organizationId },
  });

  const currentPlan = planName(subscription?.plan);
  const status = subscription?.status || "TRIAL";

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">ONZEUP CLUB</span>
          <h1>Assinatura</h1>
          <p className="muted">Consulte seu plano atual e altere a assinatura quando precisar.</p>
        </div>
      </div>

      <section className="card subscription-current-card">
        <div>
          <span className="page-eyebrow">PLANO ATUAL</span>
          <h2>{currentPlan}</h2>
          <p className="muted">
            {status === "ACTIVE"
              ? "Sua assinatura está ativa."
              : status === "PAST_DUE"
                ? "Existe uma pendência de pagamento na assinatura."
                : status === "CANCELLED"
                  ? "Sua assinatura está cancelada."
                  : "Seu acesso atual está liberado."}
            {subscription?.currentPeriodEnd
              ? ` Período atual até ${subscription.currentPeriodEnd.toLocaleDateString("pt-BR")}.`
              : ""}
          </p>
          <div className="subscription-current-meta">
            <span className={status === "ACTIVE" ? "is-active" : ""}>Status: {statusLabel(status)}</span>
            <span>{subscription?.billingCycle === "ANNUAL" ? "Cobrança anual" : "Cobrança mensal"}</span>
          </div>
        </div>
        <div className="subscription-current-price">
          <small>VALOR DO PLANO</small>
          <strong>{planPrice(subscription?.plan, subscription?.billingCycle)}</strong>
        </div>
      </section>

      <div className="page-head" style={{ marginTop: 6 }}>
        <div>
          <span className="page-eyebrow">ALTERAR PLANO</span>
          <h2>Planos ONZEUP Club</h2>
          <p className="muted">Compare os recursos e escolha outra opção quando fizer sentido para sua operação.</p>
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
