import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verificacao?: string; senha?: string; erro?: string }>;
}) {
  const q = await searchParams;
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
              Entre com seu e-mail ONZEUP. A plataforma identifica automaticamente seu perfil.
            </p>
          </div>

          {q.verificacao === "ok" ? (
            <div className="notice">
              E-mail confirmado. Sua conta está ativa e você já pode entrar.
            </div>
          ) : null}

          {q.verificacao === "token-expirado" || q.verificacao === "token-invalido" ? (
            <div className="notice error">
              O link de ativação é inválido ou expirou. Volte ao cadastro Player para solicitar um novo link.
            </div>
          ) : null}

          {q.senha === "alterada" ? (
            <div className="notice">
              Senha alterada com sucesso. Entre com a nova senha.
            </div>
          ) : null}

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
            <Link href="/cadastro">ONZEUP Player — criar grátis →</Link>
            <Link href="/cadastro-coach">ONZEUP Coach — criar grátis →</Link>
          </div>
        </form>

        <aside className="login-side-message">
          <span className="marketing-kicker">ONZEUP</span>
          <h1>
            Club para gestão. Player para atletas.
            <br />
            Coach para profissionais.
          </h1>
          <p>
            Clubes, escolinhas, famílias e atletas conectados em uma única plataforma esportiva.
          </p>
          <Link href="/">Voltar para o site →</Link>
        </aside>
      </div>
    </main>
  );
}
