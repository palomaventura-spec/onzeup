import Image from "next/image";
import Link from "next/link";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    verificacao?: string;
    senha?: string;
    erro?: string;
  }>;
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
          <Link
            href="/"
            className="login-brand-link"
            aria-label="11UP"
          >
            <Image
              src="/brand/11up/logos/11up-logo-transparent-dark.svg"
              alt="11UP"
              width={150}
              height={48}
              priority
            />
          </Link>

          <div>
            <span className="page-eyebrow">
              ACESSO À PLATAFORMA
            </span>

            <h2>
              Acesse sua conta 11UP
            </h2>

            <p className="muted">
              Entre com seu e-mail. A plataforma identifica automaticamente
              seu perfil.
            </p>
          </div>

          {q.verificacao === "ok" ? (
            <div className="notice">
              E-mail confirmado. Sua conta está ativa e você já pode entrar.
            </div>
          ) : null}

          {q.verificacao === "token-expirado" ||
          q.verificacao === "token-invalido" ? (
            <div className="notice error">
              O link de ativação é inválido ou expirou. Solicite um novo link
              de confirmação.
            </div>
          ) : null}

          {q.senha === "alterada" ? (
            <div className="notice">
              Senha alterada com sucesso. Entre com a nova senha.
            </div>
          ) : null}

          {q.erro === "1" ? (
            <div className="notice error">
              E-mail ou senha incorretos.
            </div>
          ) : null}

          {q.erro === "confirme-email" ? (
            <div className="notice error">
              Confirme seu e-mail antes de acessar o 11UP.
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

          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              marginTop: "-4px",
              cursor: "pointer",
            }}
          >
            <input
              name="remember"
              type="checkbox"
              value="1"
              style={{
                marginTop: "4px",
                width: "16px",
                height: "16px",
                flex: "0 0 auto",
              }}
            />

            <span>
              Manter conectado neste dispositivo
              <br />
              <small className="muted">
                Ideal para uso no seu celular pessoal.
              </small>
            </span>
          </label>

          <button
            className="btn"
            type="submit"
          >
            Entrar
          </button>

          <div className="login-commercial-links">
            <Link href="/esqueci-senha">
              Esqueci minha senha
            </Link>
          </div>

          <div className="login-register-box">
            <span>
              Ainda não possui conta?
            </span>

            <Link href="/cadastro-clube">
              11UP Club — criar conta →
            </Link>

            <Link href="/cadastro">
              11UP Player — criar grátis →
            </Link>

            <Link href="/cadastro-coach">
              11UP Coach — criar grátis →
            </Link>
          </div>
        </form>

        <aside className="login-side-message">
          <span className="marketing-kicker">
            11UP
          </span>

          <h1>
            Club para gestão. Player para atletas.
            <br />
            Coach para profissionais.
          </h1>

          <p>
            Organizações, equipes, profissionais, famílias e atletas conectados
            em uma única plataforma esportiva.
          </p>

          <Link href="/">
            Voltar para o site →
          </Link>
        </aside>
      </div>
    </main>
  );
}