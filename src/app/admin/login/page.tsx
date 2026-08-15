import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; reset?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="admin-login-page">
      <section className="admin-login-brand">
        <Link href="/" className="marketing-brand">ONZE<span>UP</span></Link>
        <span className="page-eyebrow">ADMINISTRAÇÃO</span>
        <h1>Central ONZEUP.</h1>
        <p>
          Acesso exclusivo da administração para gestão da plataforma,
          pagamentos, usuários e operações internas.
        </p>
      </section>

      <section className="admin-login-card">
        <div>
          <span className="page-eyebrow">SUPER ADMIN</span>
          <h2>Entrar na administração</h2>
          <p className="muted">
            O acesso utiliza as credenciais administrativas configuradas no ambiente.
            Acesso administrativo separado do login de Player, Coach e Club.
          </p>
        </div>

        {query.erro ? (
          <div className="notice error">
            E-mail ou senha administrativos inválidos.
          </div>
        ) : null}

        {query.reset === "ok" ? (
          <div className="notice">
            A senha administrativa é controlada pela configuração segura do sistema.
            Se você alterou a senha, faça login com a nova credencial.
          </div>
        ) : null}

        <form className="stack" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value="/admin" />
          <input type="hidden" name="adminOnly" value="1" />

          <label>
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="onzeupfutebolbase@gmail.com"
              required
            />
          </label>

          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button className="btn" type="submit">Entrar no Super Admin</button>
        </form>

        <div className="admin-login-links">
          <Link href="/admin/recuperar-senha">Esqueci a senha administrativa</Link>
          <Link href="/login">Login de usuários</Link>
        </div>
      </section>
    </main>
  );
}
