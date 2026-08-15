import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; token?: string }>;
}) {
  const q = await searchParams;

  return (
    <main className="auth-marketing-page">
      <section className="auth-product-copy">
        <Link href="/" className="marketing-brand">ONZE<span>UP</span></Link>
        <span className="marketing-kicker">RECUPERAÇÃO DE ACESSO</span>
        <h1>Recupere sua conta.</h1>
        <p>
          Informe o e-mail usado no cadastro para receber o link de redefinição.
        </p>
      </section>

      <section className="auth-form-card">
        <span className="page-eyebrow">ESQUECI MINHA SENHA</span>
        <h2>Redefinir acesso</h2>

        {q.status === "ok" ? (
          <div className="notice">
            Se o e-mail estiver cadastrado, processaremos a solicitação de recuperação.
          </div>
        ) : null}

        {q.status === "enviado" ? (
          <div className="notice">
            Link de recuperação enviado. Verifique sua caixa de entrada e spam.
          </div>
        ) : null}

        {q.status === "email-nao-configurado" ? (
          <div className="notice error">
            O envio de e-mail ainda não está configurado na ONZEUP. 
            A solicitação foi registrada, mas o link não pôde ser enviado.
          </div>
        ) : null}

        {q.status === "dev" && q.token ? (
          <div className="notice">
            Ambiente local:{" "}
            <Link href={`/redefinir-senha?token=${q.token}`}>
              abrir link de redefinição
            </Link>.
          </div>
        ) : null}

        <form action={requestPasswordReset} className="stack">
          <label>
            E-mail
            <input
              name="email"
              type="email"
              placeholder="seu@email.com"
              required
            />
          </label>
          <button className="btn">Enviar link de recuperação</button>
        </form>

        <p className="help"><Link href="/login">← Voltar ao login</Link></p>
      </section>
    </main>
  );
}
