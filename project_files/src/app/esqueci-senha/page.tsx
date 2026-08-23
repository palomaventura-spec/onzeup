import Link from "next/link";
import { requestPasswordReset } from "./actions";
import PendingSubmitButton from "@/components/PendingSubmitButton";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; token?: string }>;
}) {
  const q = await searchParams;

  return (
    <main className="auth-marketing-page">
      <section className="auth-product-copy">
        <Link href="/" className="marketing-brand">
          ONZE<span>UP</span>
        </Link>
        <span className="marketing-kicker">RECUPERAR ACESSO</span>
        <h1>Redefina sua senha.</h1>
        <p>Informe o e-mail da sua conta ONZEUP para receber um link de recuperação.</p>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">RECUPERAÇÃO DE SENHA</span>
        <h2>Enviar link de recuperação</h2>

        {q.status === "enviado" ? (
          <div className="notice">
            <strong>E-mail enviado.</strong><br />
            Confira sua caixa de entrada e a pasta de spam.
          </div>
        ) : null}

        {q.status === "ok" ? (
          <div className="notice">
            Se existir uma conta com esse e-mail, enviaremos as instruções de recuperação.
          </div>
        ) : null}

        {q.status === "erro-email" ? (
          <div className="notice error">
            Não conseguimos enviar o e-mail de recuperação. Tente novamente.
            Se persistir, verifique a configuração do serviço de e-mail.
          </div>
        ) : null}

        {q.status === "dev" && q.token ? (
          <div className="notice">
            Ambiente local: <Link href={`/redefinir-senha?token=${q.token}`}>abrir redefinição →</Link>
          </div>
        ) : null}

        <form action={requestPasswordReset} className="stack">
          <label>
            E-mail
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <PendingSubmitButton className="btn" pendingText="Enviando link...">
            Enviar link de recuperação
          </PendingSubmitButton>
        </form>

        <p className="help">
          <Link href="/login">← Voltar ao login</Link>
        </p>
      </section>
    </main>
  );
}
