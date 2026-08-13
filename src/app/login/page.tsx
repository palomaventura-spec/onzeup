export default function LoginPage() {
  return (
    <main className="login">
      <form className="card form" action="/api/auth/login" method="post">
        <div className="brand">ONZE<span>UP</span></div>
        <h2>Acesse sua conta ONZEUP</h2>
        <label>E-mail<input name="email" type="email" autoComplete="username" placeholder="seu@email.com" required /></label>
        <label>Senha<input name="password" type="password" autoComplete="current-password" placeholder="Sua senha" required /></label>
        <button type="submit">Entrar</button>
        <div className="login-demo-box">
          <span>OU ENTRE NA DEMONSTRAÇÃO</span>
          <div className="login-demo-actions">
            <form action="/api/auth/demo" method="post">
              <input type="hidden" name="type" value="club" />
              <button className="btn-secondary" type="submit">Testar como clube</button>
            </form>
            <form action="/api/auth/demo" method="post">
              <input type="hidden" name="type" value="player" />
              <button className="btn-secondary" type="submit">Criar Player de teste</button>
            </form>
          </div>
          <small>Clube: entra na conta demo. Player: abre uma sessão temporária vazia para você criar um perfil de teste.</small>
        </div>
      </form>
    </main>
  );
}
