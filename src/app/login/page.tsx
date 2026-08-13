import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="login login-commercial">
      <div className="login-commercial-wrap">
        <form
          className="card form login-commercial-card"
          action="/api/auth/login"
          method="post"
          autoComplete="on"
        >
          <Link href="/" className="brand login-brand-link">
            ONZE<span>UP</span>
          </Link>

          <div>
            <span className="page-eyebrow">ACESSO À PLATAFORMA</span>
            <h2>Acesse sua conta ONZEUP</h2>
            <p className="muted">
              Entre com o e-mail cadastrado na sua organização ou conta de responsável.
            </p>
          </div>

          <label>
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="seu@email.com"
              required
            />
          </label>

          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              required
            />
          </label>

          <button className="btn" type="submit">
            Entrar
          </button>

          <div className="login-commercial-links">
            <Link href="/esqueci-senha">Esqueci minha senha</Link>
          </div>

          <div className="login-register-box">
            <span>Ainda não possui conta?</span>
            <Link href="/cadastro-clube">ONZEUP Club — 15 dias grátis →</Link>
            <Link href="/cadastro">ONZE Player — criar grátis →</Link>
          </div>
        </form>

        <aside className="login-side-message">
          <span className="marketing-kicker">ONZEUP</span>
          <h1>
            Gestão para a base.
            <br />
            Identidade para o atleta.
          </h1>
          <p>
            Clubes, escolinhas, famílias e atletas conectados em um único
            plataforma esportivo.
          </p>
          <Link href="/">Voltar para o site →</Link>
        </aside>
      </div>
    </main>
  );
}
