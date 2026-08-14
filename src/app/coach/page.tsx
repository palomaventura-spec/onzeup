import Link from "next/link";

export default function CoachLanding() {
  return (
    <main className="product-landing coach-product-landing">
      <header className="product-landing-nav">
        <Link href="/" className="player-brand">ONZE<span>UP</span> <b>COACH</b></Link>
        <nav>
          <a href="#perfil">Perfil profissional</a>
          <a href="#parceria">Parceria</a>
          <Link href="/coaches">Explorar Coaches</Link>
          <Link href="/login">Entrar</Link>
          <Link className="btn" href="/cadastro-coach">Criar perfil grátis</Link>
        </nav>
      </header>

      <section className="product-landing-hero coach-product-hero">
        <div>
          <span className="page-eyebrow">ONZEUP COACH</span>
          <h1>Sua carreira no futebol merece presença profissional.</h1>
          <p>
            Organize experiência, clubes, formação, licenças, metodologia e conquistas
            em um perfil profissional gratuito.
          </p>
          <div className="product-landing-actions">
            <Link className="btn" href="/cadastro-coach">Criar perfil Coach grátis</Link>
            <Link className="players-secondary-cta" href="/coaches">Explorar profissionais →</Link>
          </div>
          <small>Gratuito para profissionais do futebol.</small>
        </div>

        <aside className="product-demo-card coach-demo-card">
          <span>COACH PARCEIRO ONZEUP</span>
          <h2>Perfil profissional + rede</h2>
          <ul>
            <li>Página profissional compartilhável</li>
            <li>Histórico de clubes e funções</li>
            <li>Formação, licenças e idiomas</li>
            <li>Metodologia e conquistas</li>
            <li>Indicação de atletas para ONZEUP Player</li>
          </ul>
        </aside>
      </section>

      <section className="product-benefit-section" id="perfil">
        <span className="page-eyebrow">PERFIL PROFISSIONAL</span>
        <h2>Mais do que um currículo em PDF.</h2>
        <div className="product-benefit-grid">
          <article><b>01</b><h3>Experiência</h3><p>Organize funções, categorias e clubes da carreira.</p></article>
          <article><b>02</b><h3>Formação</h3><p>Licenças, certificações, cursos e idiomas.</p></article>
          <article><b>03</b><h3>Metodologia</h3><p>Apresente seu trabalho e filosofia profissional.</p></article>
          <article><b>04</b><h3>Presença digital</h3><p>Compartilhe um endereço profissional ONZEUP.</p></article>
        </div>
      </section>

      <section className="coach-partner-landing" id="parceria">
        <div>
          <span className="page-eyebrow">COACH PARCEIRO</span>
          <h2>Você não precisa vender nada.</h2>
          <p>
            Indique gratuitamente o ONZEUP Player às famílias dos seus atletas.
            Cada indicação fica registrada no seu painel.
          </p>
          <Link className="btn" href="/cadastro-coach">Quero ser Coach ONZEUP</Link>
        </div>
        <div>
          <span className="page-eyebrow">TEM ESCOLINHA OU CT?</span>
          <h2>Seu perfil Coach pode abrir outra porta.</h2>
          <p>
            Se você também administra uma escolinha, CT, projeto, clube ou treinamento
            personalizado, conheça a gestão ONZEUP Club.
          </p>
          <Link className="players-secondary-cta" href="/club">Conhecer ONZEUP Club →</Link>
        </div>
      </section>

      <section className="product-directory-cta">
        <span className="page-eyebrow">ONZEUP COACHES</span>
        <h2>Encontre profissionais do futebol.</h2>
        <p>Explore treinadores, auxiliares, scouts e outros profissionais cadastrados.</p>
        <Link className="btn" href="/coaches">Explorar Coaches →</Link>
      </section>
    </main>
  );
}
