import Link from "next/link";

export default function AdminRecoverPage() {
  return (
    <main className="admin-login-page">
      <section className="admin-login-brand">
        <Link href="/" className="marketing-brand">ONZE<span>UP</span></Link>
        <span className="page-eyebrow">SEGURANÇA</span>
        <h1>Recuperar acesso administrativo.</h1>
        <p>
          Por segurança, a senha do Super Admin não é enviada por e-mail nem exibida
          pela plataforma. Ela é controlada pelas variáveis seguras do ambiente.
        </p>
      </section>

      <section className="admin-login-card">
        <span className="page-eyebrow">SUPER ADMIN</span>
        <h2>Redefinir senha</h2>

        <div className="admin-recovery-steps">
          <article>
            <b>1</b>
            <div>
              <strong>Abra a Vercel</strong>
              <p>Projeto ONZEUP → Settings → Environment Variables.</p>
            </div>
          </article>
          <article>
            <b>2</b>
            <div>
              <strong>Altere ONZEUP_ADMIN_PASSWORD</strong>
              <p>Defina uma nova senha forte e salve para Production.</p>
            </div>
          </article>
          <article>
            <b>3</b>
            <div>
              <strong>Faça Redeploy</strong>
              <p>Depois do deploy, o primeiro login atualiza automaticamente o Admin no banco.</p>
            </div>
          </article>
        </div>

        <p className="muted">
          E-mail padrão do Admin: <strong>onzeupfutebolbase@gmail.com</strong>.
          Se ONZEUP_ADMIN_EMAIL estiver definido, use o e-mail configurado lá.
        </p>

        <Link className="btn" href="/admin/login">Voltar ao login Admin</Link>
      </section>
    </main>
  );
}
