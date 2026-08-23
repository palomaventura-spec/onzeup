import Link from "next/link";

const benefits = [
  ["01","Perfil profissional","Apresente função, experiência, formação, certificações, metodologia, conquistas e contatos."],
  ["02","Sua trajetória em um link","Tenha um endereço público para compartilhar em redes sociais, clubes, projetos e oportunidades."],
  ["03","Vínculos com equipes","Conecte seu perfil aos clubes onde atua sem compartilhar senha e sem misturar organizações."],
  ["04","Catálogo ONZEUP","Seja encontrado por quem procura treinadores, auxiliares, preparadores, scouts e outros profissionais."],
];

export default function CoachLanding() {
  return (
    <main className="product-landing coach-product-landing coach-complete-landing">
      <header className="product-landing-nav coach-marketing-nav">
        <Link href="/" className="player-brand">ONZE<span>UP</span> <b>COACH</b></Link>
        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#vinculos">Vínculos</a>
          <a href="#como-funciona">Como funciona</a>
          <Link href="/coaches">Explorar Coaches</Link>
          <Link href="/login">Entrar</Link>
          <Link className="btn" href="/cadastro-coach">Criar meu perfil</Link>
        </nav>
      </header>

      <section className="product-landing-hero coach-product-hero">
        <div>
          <span className="page-eyebrow">ONZEUP COACH</span>
          <h1>Seu trabalho no futebol merece presença profissional.</h1>
          <p>Reúna sua trajetória, experiências, certificações, clubes e contatos em um perfil público feito para profissionais do futebol.</p>
          <div className="product-landing-actions">
            <Link className="btn" href="/cadastro-coach">Criar meu perfil</Link>
            <Link className="players-secondary-cta" href="/coaches">Explorar profissionais →</Link>
          </div>
          <small>Para treinadores, auxiliares, preparadores, scouts, coordenadores e outros profissionais do futebol.</small>
        </div>
        <aside className="product-demo-card coach-demo-card">
          <span>SEU PERFIL. SUA CARREIRA.</span>
          <h2>Mais do que um currículo.</h2>
          <ul>
            <li>Foto e apresentação profissional</li>
            <li>Clubes, projetos e categorias</li>
            <li>Formação, licenças e certificações</li>
            <li>Metodologia, conquistas e vídeo</li>
            <li>Contatos e vínculos verificados</li>
          </ul>
        </aside>
      </section>

      <section className="product-benefit-section" id="recursos">
        <span className="page-eyebrow">PRESENÇA PROFISSIONAL</span>
        <h2>Um perfil que acompanha sua carreira.</h2>
        <div className="product-benefit-grid">
          {benefits.map(([n,t,d]) => <article key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></article>)}
        </div>
      </section>

      <section className="coach-linking-landing" id="vinculos">
        <div>
          <span className="page-eyebrow">COACH ↔ CLUB</span>
          <h2>Seu perfil profissional e seus clubes, conectados.</h2>
          <p>O clube pode convidar você, ou você pode localizar um cadastro feito com o mesmo e-mail. O vínculo só fica ativo após confirmação.</p>
        </div>
        <div className="coach-linking-flow">
          <article><b>1</b><span>Perfil Coach</span><small>sua identidade profissional</small></article>
          <i>→</i>
          <article><b>2</b><span>Vínculo</span><small>convite ou solicitação</small></article>
          <i>→</i>
          <article><b>3</b><span>Acesso</span><small>somente ao autorizado</small></article>
        </div>
      </section>

      <section className="coach-permissions-landing">
        <div>
          <span className="page-eyebrow">SEM SENHA COMPARTILHADA</span>
          <h2>Cada profissional tem seu próprio acesso.</h2>
          <p>Quando autorizado, o Coach acessa somente as equipes e recursos liberados pelo clube.</p>
        </div>
        <div className="coach-permission-grid">
          <article><strong>Elenco</strong><span>da equipe vinculada</span></article>
          <article><strong>Agenda</strong><span>jogos e compromissos</span></article>
          <article><strong>Convocações</strong><span>visualizar ou gerenciar</span></article>
          <article><strong>Privacidade</strong><span>sem financeiro por padrão</span></article>
        </div>
      </section>

      <section className="club-commercial-section dark" id="como-funciona">
        <span className="marketing-kicker">COMECE EM MINUTOS</span>
        <h2>Crie. Complete. Compartilhe.</h2>
        <div className="club-steps">
          <article><b>01</b><h3>Crie seu Coach</h3><p>Cadastre sua identidade profissional.</p></article>
          <article><b>02</b><h3>Conte sua trajetória</h3><p>Experiência, formação, certificações, clubes e metodologia.</p></article>
          <article><b>03</b><h3>Conecte-se</h3><p>Compartilhe seu perfil e vincule-se às equipes onde atua.</p></article>
        </div>
      </section>

      <section className="coach-partner-landing">
        <div>
          <span className="page-eyebrow">PARA PROFISSIONAIS</span>
          <h2>Mostre quem você é dentro do futebol.</h2>
          <p>Tenha um perfil público para apresentar seu trabalho de forma organizada e profissional.</p>
          <Link className="btn" href="/cadastro-coach">Criar meu perfil</Link>
        </div>
        <div>
          <span className="page-eyebrow">PROCURA UM PROFISSIONAL?</span>
          <h2>Explore o catálogo ONZEUP.</h2>
          <p>Pesquise profissionais cadastrados por nome, clube e função.</p>
          <Link className="players-secondary-cta" href="/coaches">Explorar Coaches →</Link>
        </div>
      </section>

      <section className="product-directory-cta">
        <span className="page-eyebrow">ONZEUP COACH</span>
        <h2>Construa sua presença profissional no futebol.</h2>
        <div className="product-landing-actions">
          <Link className="btn" href="/cadastro-coach">Criar meu perfil →</Link>
          <Link className="players-secondary-cta" href="/coaches">Explorar profissionais →</Link>
        </div>
      </section>
    </main>
  );
}
