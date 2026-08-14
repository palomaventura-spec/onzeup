import Link from "next/link";

export default function Home() {
  return (
    <main className="onzeup-portal-home">
      <header className="portal-nav">
        <Link href="/" className="marketing-brand">ONZE<span>UP</span></Link>
        <nav>
          <a href="https://players.onzeup.com.br">Players</a>
          <a href="/coaches">Coaches</a>
          <a href="https://club.onzeup.com.br">Club</a>
        </nav>
        <Link className="portal-login" href="/login">Entrar</Link>
      </header>

      <section className="portal-hero">
        <div className="portal-hero-copy">
          <span className="marketing-kicker">ONZEUP • FUTEBOL DE BASE</span>
          <h1>O FUTEBOL DE BASE<br/><em>CONECTADO.</em></h1>
          <p>
            Uma única marca para quem administra, desenvolve e vive a trajetória
            esportiva: organizações, profissionais, atletas e famílias.
          </p>
        </div>

        <div className="portal-path-grid">
          <article className="portal-path player">
            <small>ATLETAS E FAMÍLIAS</small>
            <h2>ONZEUP<br/>PLAYER</h2>
            <p>Crie a identidade esportiva do atleta e compartilhe sua trajetória.</p>
            <div>
              <Link className="btn" href="/cadastro">Criar perfil grátis</Link>
              <a className="portal-text-link" href="https://players.onzeup.com.br">Explorar Players →</a>
            </div>
          </article>

          <article className="portal-path coach">
            <small>PROFISSIONAIS DO FUTEBOL</small>
            <h2>ONZEUP<br/>COACH</h2>
            <p>Perfil profissional gratuito e parceria para conectar seus atletas à ONZEUP.</p>
            <div>
              <Link className="btn" href="/cadastro-coach">Criar Coach grátis</Link>
              <a className="portal-text-link" href="/coaches">Explorar Coaches →</a>
            </div>
          </article>

          <article className="portal-path club">
            <small>CLUBES • ESCOLINHAS • CTS</small>
            <h2>ONZEUP<br/>CLUB</h2>
            <p>Gestão esportiva, comunicação, financeiro e presença digital.</p>
            <div>
              <a className="btn" href="https://club.onzeup.com.br">Conhecer ONZEUP Club</a>
              <Link className="portal-text-link" href="/cadastro-clube">Testar 15 dias grátis →</Link>
            </div>
          </article>
        </div>
      </section>

      <section className="portal-login-section">
        <span className="marketing-kicker">JÁ FAZ PARTE?</span>
        <h2>Uma conta. Seu papel na ONZEUP.</h2>
        <p>O mesmo acesso identifica automaticamente se você é responsável, Coach ou gestor de organização.</p>
        <div>
          <Link className="portal-role-login" href="/login?perfil=player"><b>PLAYER</b><span>Entrar como responsável →</span></Link>
          <Link className="portal-role-login" href="/login?perfil=coach"><b>COACH</b><span>Entrar como profissional →</span></Link>
          <Link className="portal-role-login" href="/login?perfil=club"><b>CLUB</b><span>Entrar como organização →</span></Link>
        </div>
      </section>

      <footer className="portal-footer">
        <Link href="/" className="marketing-brand">ONZE<span>UP</span></Link>
        <span>O futuro do futebol começa na base.</span>
      </footer>
    </main>
  );
}
