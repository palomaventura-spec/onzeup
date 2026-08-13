import { requireOrganizationUser } from "@/lib/auth";
import { updateIntegrationSettings, markDomainVerified } from "./actions";

export default async function IntegrationsPage() {
  const user = await requireOrganizationUser();
  const org = user.organization!;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Integrações</h1>
          <p className="muted">Prepare domínio, WhatsApp e pagamentos da organização.</p>
        </div>
      </div>

      <div className="finance-grid">
        <section className="card">
          <h2>Domínio próprio</h2>
          <form className="form" action={updateIntegrationSettings}>
            <label>
              Domínio
              <input
                name="customDomain"
                defaultValue={org.customDomain ?? ""}
                placeholder="www.suaescolinha.com.br"
              />
            </label>

            <label>
              WhatsApp da organização
              <input
                name="whatsappPhone"
                defaultValue={org.whatsappPhone ?? ""}
                placeholder="5521999999999"
              />
            </label>

            <label>
              Provedor de pagamento
              <select name="paymentProvider" defaultValue={org.paymentProvider ?? ""}>
                <option value="">Não configurado</option>
                <option value="ASAAS">Asaas</option>
                <option value="MERCADO_PAGO">Mercado Pago</option>
                <option value="STRIPE">Stripe</option>
              </select>
            </label>

            <button type="submit">Salvar configurações</button>
          </form>

          <div className="stack" style={{marginTop:18}}>
            <span className="badge">Domínio: {org.domainVerified ? "verificado" : "pendente"}</span>
            <span className="badge">WhatsApp: {org.whatsappStatus}</span>
            <span className="badge">Pagamento: {org.paymentStatus}</span>
          </div>

          {org.customDomain && !org.domainVerified && (
            <form action={markDomainVerified} style={{marginTop:16}}>
              <button className="btn-secondary" type="submit">
                Marcar domínio como verificado (teste)
              </button>
            </form>
          )}

          <p className="help" style={{marginTop:16}}>
            Nesta versão, a validação é simulada para testes. Em produção, a verificação deve ocorrer por DNS.
          </p>
        </section>

        <section className="card">
          <h2>Status das integrações</h2>
          <div className="stack">
            <div className="integration-card">
              <strong>Domínio personalizado</strong>
              <span>{org.customDomain || "Não configurado"}</span>
            </div>

            <div className="integration-card">
              <strong>WhatsApp</strong>
              <span>{org.whatsappPhone || "Não configurado"}</span>
              <small>API oficial ainda não conectada.</small>
            </div>

            <div className="integration-card">
              <strong>Gateway</strong>
              <span>{org.paymentProvider || "Não configurado"}</span>
              <small>Processamento real entra após escolha do provedor.</small>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
