import { requireOrganizationUser } from "@/lib/auth";
import { updateConnectionSettings } from "./actions";

function pixType(key?: string | null) {
  if (!key) return "Não configurado";
  const value = key.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "E-mail";
  if (/^\+?\d{10,13}$/.test(value.replace(/\D/g, ""))) return "Celular";
  if (/^\d{11}$/.test(value.replace(/\D/g, ""))) return "CPF";
  if (/^\d{14}$/.test(value.replace(/\D/g, ""))) return "CNPJ";
  return "Chave aleatória";
}

export default async function ConnectionsPage() {
  const user = await requireOrganizationUser();
  const org = user.organization!;
  const standardUrl = `/o/${org.slug}`;

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">CONFIGURAÇÃO DA ORGANIZAÇÃO</span>
          <h1>Conexões</h1>
          <p className="muted">
            Configure domínio, WhatsApp e a forma como sua organização recebe pagamentos.
          </p>
        </div>
      </div>

      <form className="connections-grid" action={updateConnectionSettings}>
        <section className="card connection-card">
          <div className="connection-title">
            <span className="connection-icon">🌐</span>
            <div>
              <h2>Site e domínio</h2>
              <p className="muted">Seu site ONZEUP já funciona sem precisar comprar um domínio.</p>
            </div>
          </div>

          <div className="connection-current">
            <small>ENDEREÇO ONZEUP</small>
            <strong>onzeup.com.br{standardUrl}</strong>
            <span className="badge">Ativo</span>
          </div>

          <label>
            Domínio próprio <span className="help">(opcional)</span>
            <input
              name="customDomain"
              defaultValue={org.customDomain ?? ""}
              placeholder="www.suaescolinha.com.br"
            />
          </label>
          <p className="help">
            Você pode usar seu próprio domínio sem alterar o endereço padrão ONZEUP.
            A ativação definitiva dependerá da configuração DNS.
          </p>
        </section>

        <section className="card connection-card">
          <div className="connection-title">
            <span className="connection-icon">💬</span>
            <div>
              <h2>WhatsApp</h2>
              <p className="muted">Usado para contatos, convocações e mensagens geradas pelo sistema.</p>
            </div>
          </div>

          <label>
            WhatsApp da organização
            <input
              name="whatsappPhone"
              defaultValue={org.whatsappPhone ?? org.whatsapp ?? ""}
              placeholder="5521999999999"
              inputMode="tel"
            />
          </label>

          <div className="connection-current">
            <small>STATUS</small>
            <strong>{org.whatsappPhone || org.whatsapp ? "Número cadastrado" : "Não configurado"}</strong>
            <span className="help">
              Nesta fase, o ONZEUP prepara mensagens e links para abrir no WhatsApp. O envio automático via API fica para uma evolução futura.
            </span>
          </div>
        </section>

        <section className="card connection-card">
          <div className="connection-title">
            <span className="connection-icon">💠</span>
            <div>
              <h2>Recebimentos via PIX</h2>
              <p className="muted">O dinheiro vai diretamente para a conta informada pelo clube.</p>
            </div>
          </div>

          <label>
            Chave PIX da organização
            <input
              name="pixKey"
              defaultValue={org.pixKey ?? ""}
              placeholder="CPF, CNPJ, e-mail, celular ou chave aleatória"
            />
          </label>

          <div className="connection-current">
            <small>TIPO IDENTIFICADO</small>
            <strong>{pixType(org.pixKey)}</strong>
            <span className="help">
              O ONZEUP não recebe nem movimenta esse dinheiro. O Financeiro controla pendências e baixas; o pagamento acontece diretamente entre responsável e clube.
            </span>
          </div>
        </section>

        <section className="card connection-card connection-future">
          <div className="connection-title">
            <span className="connection-icon">⚡</span>
            <div>
              <h2>Recebimentos automáticos</h2>
              <p className="muted">Uma evolução futura do ONZEUP.</p>
            </div>
          </div>
          <p>
            No futuro, o clube poderá conectar uma conta de recebimento e ter PIX,
            cartão, boleto e baixa automática dentro da plataforma.
          </p>
          <span className="badge">Em breve</span>
        </section>

        <div className="connections-save">
          <button type="submit">Salvar conexões</button>
        </div>
      </form>
    </>
  );
}
