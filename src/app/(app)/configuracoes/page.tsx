import ModuleHero from "@/components/ModuleHero";

import { requireOrganizationUser } from "@/lib/auth";

import { updateAccountProfile } from "./actions";

function roleLabel(role: string, clubRole: string | null) {
  if (clubRole === "MANAGER") return "Proprietário / Gestor";
  if (clubRole === "COORDINATOR") return "Coordenador";
  if (clubRole === "COACH") return "Treinador";
  if (clubRole === "FINANCE") return "Financeiro";

  if (role === "SUPER_ADMIN") return "Administrador";
  return "Usuário da organização";
}

export default async function Settings() {
  const user = await requireOrganizationUser();

  const organizationName =
    user.organization?.publicName ||
    user.organization?.name ||
    "Organização vinculada";

  return (
    <main className="account-settings-page">
      <ModuleHero
        eyebrow="CONTA E PERFIL"
        title="Dados da conta"
        description={
          <p>
            Gerencie as informações pessoais do titular e os dados
            utilizados para acessar o 11UP.
          </p>
        }
        aside={
          <div className="account-settings-hero-status">
            <small>CONTA ATIVA</small>
            <strong>{user.name}</strong>
            <span>{organizationName}</span>
          </div>
        }
      />

      <section className="account-settings-grid">
        <article className="card account-settings-profile">
          <div className="account-settings-section-head">
            <div>
              <span className="page-eyebrow">
                PERFIL DO TITULAR
              </span>

              <h2>Informações pessoais</h2>

              <p className="muted">
                Estes dados pertencem ao usuário responsável pelo
                acesso à conta.
              </p>
            </div>

            <span className="account-settings-role">
              {roleLabel(user.role, user.clubRole)}
            </span>
          </div>

          <form
            className="form account-settings-form"
            action={updateAccountProfile}
          >
            <label>
              Nome completo
              <input
                name="name"
                defaultValue={user.name}
                required
                autoComplete="name"
              />
            </label>

            <label>
              E-mail de acesso
              <input
                name="email"
                type="email"
                defaultValue={user.email}
                required
                autoComplete="email"
              />
            </label>

            <div className="account-settings-readonly">
              <span>Organização vinculada</span>
              <strong>{organizationName}</strong>
              <small>
                Os dados institucionais do clube são gerenciados em
                Configurações da organização.
              </small>
            </div>

            <div className="account-settings-readonly">
              <span>Perfil de acesso</span>
              <strong>
                {roleLabel(user.role, user.clubRole)}
              </strong>
              <small>
                Permissões e acessos da equipe são gerenciados
                separadamente.
              </small>
            </div>

            <div className="account-settings-actions">
              <button className="btn" type="submit">
                Salvar alterações
              </button>
            </div>
          </form>
        </article>

        <aside className="account-settings-side">
          <article className="card account-settings-security">
            <span className="page-eyebrow">
              SEGURANÇA
            </span>

            <h2>Acesso à conta</h2>

            <p className="muted">
              Mantenha suas credenciais atualizadas e protegidas.
            </p>

            <div className="account-settings-security-item">
              <div>
                <strong>E-mail verificado</strong>
                <span>
                  {user.emailVerifiedAt
                    ? "E-mail confirmado"
                    : "Confirmação pendente"}
                </span>
              </div>

              <b>
                {user.emailVerifiedAt ? "✓" : "!"}
              </b>
            </div>

            <div className="account-settings-security-item">
              <div>
                <strong>Status da conta</strong>
                <span>
                  {user.active
                    ? "Conta ativa"
                    : "Conta inativa"}
                </span>
              </div>

              <b>{user.active ? "✓" : "!"}</b>
            </div>

            <p className="help" style={{ marginTop: 18 }}>
              A alteração de senha e autenticação em duas etapas
              serão concentradas nesta área.
            </p>
          </article>

          <article className="account-settings-note">
            <span>11UP</span>

            <h3>Preferências do sistema ficam separadas.</h3>

            <p>
              Tema, aparência, plano, cobrança e configurações do
              clube não fazem parte dos dados pessoais desta conta.
            </p>
          </article>
        </aside>
      </section>
    </main>
  );
}