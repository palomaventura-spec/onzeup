import Link from "next/link";
import { registerClubTrial } from "./actions";

export default async function ClubRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; erro?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="auth-marketing-page">
      <section className="auth-product-copy">
        <Link href="/" className="marketing-brand">
          ONZE<span>UP</span>
        </Link>

        <span className="marketing-kicker">ONZEUP CLUB</span>

        <h1>
          Organize sua base.
          <br />
          Comece grátis.
        </h1>

        <p>
          Crie a conta da sua organização e tenha 15 dias para conhecer a ONZEUP
          antes de escolher um plano.
        </p>

        <strong>15 dias grátis • sem cartão</strong>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">TESTE GRATUITO</span>
        <h2>Criar conta ONZEUP Club</h2>

        {query.status ? (
          <div className="notice">
            Cadastro criado. Confirme seu e-mail para ativar a conta e iniciar o acesso.
          </div>
        ) : null}

        {query.erro === "email" ? (
          <div className="notice error">
            Já existe uma conta com este e-mail. Use a tela de login.
          </div>
        ) : null}

        {query.erro === "dados" ? (
          <div className="notice error">
            Confira os dados e use uma senha com pelo menos 8 caracteres.
          </div>
        ) : null}

        <form action={registerClubTrial} className="stack" autoComplete="off">
          <label>
            Nome do responsável
            <input name="responsibleName" required />
          </label>

          <label>
            Clube, escolinha ou projeto
            <input name="organizationName" required />
          </label>

          <label>
            Tipo de organização
            <select name="type" defaultValue="SCHOOL">
              <option value="SCHOOL">Escolinha</option>
              <option value="CLUB">Clube</option>
              <option value="PROJECT">Projeto</option>
              <option value="ACADEMY">Academia</option>
              <option value="PERSONAL_TRAINING">Treinamento</option>
            </select>
          </label>

          <label>
            E-mail
            <input name="email" type="email" autoComplete="off" required />
          </label>

          <label>
            WhatsApp
            <input name="phone" />
          </label>

          <label>
            Senha
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirmar senha
            <input
              name="confirm"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <label className="check-row">
            <input name="legal" type="checkbox" required />
            <span>
              Confirmo que tenho autorização para criar e administrar esta
              organização na ONZEUP.
            </span>
          </label>

          <button className="btn" type="submit">
            Começar 15 dias grátis
          </button>
        </form>

        <p className="help">
          Já possui conta? <Link href="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}
