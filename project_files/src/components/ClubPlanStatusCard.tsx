import Link from "next/link";
import { prisma } from "@/lib/prisma";

function daysLeft(date?: Date | null) {
  if (!date) return null;
  return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 86400000));
}

function planLabel(plan?: string | null) {
  if (plan === "STARTER") return "Essencial";
  if (plan === "PRO") return "Pro";
  if (plan === "BUSINESS") return "Elite";
  return "Essencial";
}

export default async function ClubPlanStatusCard({
  organizationId,
}: {
  organizationId: string;
}) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  const remaining = daysLeft(subscription?.trialEnds);
  const status = subscription?.status || "TRIAL";

  return (
    <section className="card clean-site-card" style={{ marginBottom: 20 }}>
      <div>
        <span className="page-eyebrow">PLANO E ASSINATURA</span>

        {status === "TRIAL" ? (
          <>
            <h2>Período grátis em andamento</h2>
            <p className="muted">
              {remaining !== null
                ? `Você ainda tem ${remaining} dia(s) de acesso gratuito.`
                : "Seu período gratuito está ativo."}{" "}
              Você pode contratar um plano agora e manter sua organização ativa
              sem interrupção.
            </p>
          </>
        ) : status === "ACTIVE" ? (
          <>
            <h2>Plano {planLabel(subscription?.plan)} ativo</h2>
            <p className="muted">
              {subscription?.billingCycle === "ANNUAL"
                ? "Assinatura anual ativa."
                : "Assinatura mensal ativa."}
              {subscription?.currentPeriodEnd
                ? ` Período atual até ${subscription.currentPeriodEnd.toLocaleDateString(
                    "pt-BR",
                  )}.`
                : ""}
            </p>
          </>
        ) : status === "PAST_DUE" ? (
          <>
            <h2>Pagamento pendente</h2>
            <p className="muted">
              Regularize sua assinatura para manter todos os recursos do
              ONZEUP Club disponíveis.
            </p>
          </>
        ) : (
          <>
            <h2>Escolha seu plano ONZEUP Club</h2>
            <p className="muted">
              Reative sua organização escolhendo um plano mensal ou anual.
            </p>
          </>
        )}
      </div>

      <div>
        <Link className="dashboard-primary-btn" href="/planos">
          {status === "ACTIVE" ? "Ver plano e assinatura" : "Ver planos e assinar"}
        </Link>
      </div>
    </section>
  );
}
