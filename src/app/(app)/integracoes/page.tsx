import Link from "next/link";
import { requireOrganizationUser } from "@/lib/auth";
import { updateConnectionSettings } from "./actions";

function validWhatsapp(value?: string | null) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 ? digits : "";
}

export default async function ConnectionsPage() {
  const user = await requireOrganizationUser();
  const org = user.organization!;
  const whatsapp = validWhatsapp(org.whatsappPhone) || validWhatsapp(org.whatsapp);

  return (
    <>
      <div className="page-head">
        <div>
          <span className="page-eyebrow">COMUNICAÇÃO DA ORGANIZAÇÃO</span>
          <h1>Conexões</h1>
          <p className="muted">
            Configure o contato oficial da organização. Nesta fase, o ONZEUP prepara mensagens para envio manual pelo WhatsApp.
          </p>
        </div>
      </div>

      <form className="connections-grid" action={updateConnectionSettings}>
        <section className="card connection-card">
          <div className="connection-title">
            <span className="connection-icon">💬</span>
            <div>
              <h2>WhatsApp da organização</h2>
              <p className="muted">Contato oficial usado pela equipe e nas comunicações do ONZEUP.</p>
            </div>
          </div>

          <label>
            Número com DDI + DDD + telefone
            <input
              name="whatsappPhone"
              defaultValue={whatsapp}
              placeholder="5521999999999"
              inputMode="tel"
              autoComplete="tel"
            />
          </label>
          <p className="help">Exemplo: 5521999999999.</p>

          <div className="connection-current">
            <small>COMO FUNCIONA NESTA FASE</small>
            <strong>{whatsapp ? "WhatsApp configurado" : "Cadastre o número oficial"}</strong>
            <span className="help">
              O ONZEUP gera mensagens prontas de convocação, contato e cobrança. O sistema abre o WhatsApp do dispositivo e o envio é confirmado manualmente por você. Não é necessário WhatsApp Business nem API.
            </span>
          </div>

          <div className="actions">
            <button type="submit">Salvar WhatsApp</button>
            <Link className="btn-secondary" href="/comunicacao">Abrir Central de Comunicação</Link>
          </div>
        </section>

        <section className="card connection-card connection-future">
          <div className="connection-title">
            <span className="connection-icon">⚡</span>
            <div>
              <h2>Fase 2 — Premium / Pro</h2>
              <p className="muted">Recursos avançados entram após a validação do beta.</p>
            </div>
          </div>
          <p>
            Domínio próprio, WhatsApp automático via API, lembretes automáticos, convocações automáticas e integrações avançadas ficarão para a próxima fase.
          </p>
          <span className="badge">Em breve</span>
        </section>
      </form>
    </>
  );
}
