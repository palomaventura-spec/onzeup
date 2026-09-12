import Link from "next/link";
import { registerClubTrial, resendClubVerification } from "./actions";
import PendingSubmitButton from "@/components/PendingSubmitButton";

export default async function ClubRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; erro?: string; email?: string }>;
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
          Crie a conta da sua organização. O acesso inicial pode ser liberado pela equipe ONZEUP.
        </p>

        <strong>Cadastro sem cartão</strong>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">CADASTRO DO CLUB</span>
        <h2>Criar conta ONZEUP Club</h2>

        {query.status === "enviado" || query.status === "reenviado" ? (
          <div className="notice">
            Enviamos um link de confirmação para <strong>{query.email || "seu e-mail"}</strong>. Confirme o endereço antes de acessar o ONZEUP Club.
          </div>
        ) : null}

        {query.status === "erro-email" ? (
          <div className="notice error">
            A conta foi criada, mas não conseguimos enviar o e-mail de confirmação agora. Tente reenviar abaixo.
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

        {query.status ? (
          <>
            <form action={resendClubVerification} className="stack verification-resend-form">
              <input type="hidden" name="email" value={query.email || ""} />
              <PendingSubmitButton className="btn-secondary" pendingText="Reenviando...">Reenviar confirmação</PendingSubmitButton>
            </form>
            <p className="help">Já confirmou? <Link href="/login">Entrar no ONZEUP Club</Link></p>
          </>
        ) : (
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

          <PendingSubmitButton className="btn" pendingText="Criando seu ONZEUP Club...">
            Criar meu ONZEUP Club
          </PendingSubmitButton>
          <p className="form-submit-help">Ao enviar, vamos preparar sua conta e abrir a configuração inicial.</p>
        </form>
        )}

        {!query.status ? (
          <p className="help">
            Já possui conta? <Link href="/login">Entrar</Link>
          </p>
        ) : null}
      </section>
    </main>
  );
}
