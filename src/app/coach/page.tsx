import Link from "next/link";

const benefits = [
  ["01", "Site profissional", "Foto, capa, experiência, clubes, formação, licenças, metodologia, conquistas, vídeo e contatos em um endereço profissional."],
  ["02", "Um login, vários vínculos", "Trabalhe em mais de um clube, categoria ou CT sem misturar os dados de cada organização."],
  ["03", "Acesso às suas equipes", "Quando o vínculo é confirmado, você recebe somente os acessos de elenco, agenda e convocações autorizados."],
  ["04", "Rede e indicações", "Indique o ONZEUP Player às famílias e acompanhe os atletas cadastrados pelo seu link."],
];

export default function CoachLanding() {
  return (
    <main className="product-landing coach-product-landing coach-complete-landing">
      <header className="product-landing-nav">
        <Link href="/" className="player-brand">ONZE<span>UP</span> <b>COACH</b></Link>
        <nav>
          <a href="#perfil">Site profissional</a><a href="#vinculos">Vínculos</a><a href="#como-funciona">Como funciona</a><a href="#faq-coach">FAQ</a>
          <Link href="/coaches">Explorar Coaches</Link><Link href="/login">Entrar</Link><Link className="btn" href="/cadastro-coach">Criar perfil grátis</Link>
        </nav>
      </header>

      <section className="product-landing-hero coach-product-hero">
        <div>
          <span className="page-eyebrow">ONZEUP COACH • GRATUITO</span>
          <h1>Seu trabalho no futebol merece um site profissional.</h1>
          <p>Apresente sua carreira, conecte-se às equipes onde atua e acesse convocações com seu próprio login — sem compartilhar a conta do clube.</p>
          <div className="product-landing-actions">
            <Link className="btn" href="/cadastro-coach">Criar ONZEUP Coach grátis</Link>
            <Link className="players-secondary-cta" href="/coaches">Explorar profissionais →</Link>
          </div>
          <small>Para treinadores, auxiliares, preparadores, scouts, coordenadores e outros profissionais do futebol.</small>
        </div>
        <aside className="product-demo-card coach-demo-card">
          <span>SEU PERFIL. SUA CARREIRA.</span>
          <h2>Um site que acompanha seu trabalho.</h2>
          <ul>
            <li>Foto e capa personalizadas</li><li>Experiência, formação e certificações</li><li>Metodologia e conquistas</li><li>Vídeo e redes profissionais</li><li>Vínculos verificados com equipes</li>
          </ul>
        </aside>
      </section>

      <section className="product-benefit-section" id="perfil">
        <span className="page-eyebrow">ONZEUP COACH</span><h2>Mais do que um currículo em PDF.</h2>
        <div className="product-benefit-grid">{benefits.map(([n,t,d]) => <article key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></article>)}</div>
      </section>

      <section className="coach-linking-landing" id="vinculos">
        <div>
          <span className="page-eyebrow">VÍNCULO COACH ↔ CLUB</span>
          <h2>O vínculo pode começar pelos dois lados.</h2>
          <p>O clube pode convidar seu Coach. Se você já foi cadastrado na comissão com o mesmo e-mail, também pode buscar a correspondência no seu dashboard e solicitar o vínculo. Em ambos os casos existe confirmação antes do acesso.</p>
        </div>
        <div className="coach-linking-flow">
          <article><b>1</b><span>Mesmo e-mail</span><small>Coach e cadastro no clube</small></article>
          <i>→</i><article><b>2</b><span>Convite ou solicitação</span><small>sem vínculo automático</small></article>
          <i>→</i><article><b>3</b><span>Confirmação</span><small>acesso somente ao autorizado</small></article>
        </div>
      </section>

      <section className="coach-permissions-landing">
        <div><span className="page-eyebrow">SEM SENHA COMPARTILHADA</span><h2>Cada profissional tem seu próprio acesso.</h2><p>O treinador usa sua conta Coach e vê apenas o que a organização autorizou.</p></div>
        <div className="coach-permission-grid"><article><strong>Elenco</strong><span>da equipe vinculada</span></article><article><strong>Agenda</strong><span>jogos e compromissos</span></article><article><strong>Convocações</strong><span>visualizar ou gerenciar</span></article><article><strong>Isolamento</strong><span>sem financeiro por padrão</span></article></div>
      </section>

      <section className="club-commercial-section dark" id="como-funciona">
        <span className="marketing-kicker">COMECE EM MINUTOS</span><h2>Crie. Complete. Conecte.</h2>
        <div className="club-steps"><article><b>01</b><h3>Crie seu Coach</h3><p>Conta profissional gratuita.</p></article><article><b>02</b><h3>Monte seu site</h3><p>Foto, capa, carreira, licenças, metodologia, vídeo e contatos.</p></article><article><b>03</b><h3>Conecte suas equipes</h3><p>Busque vínculos pelo mesmo e-mail ou aceite convites dos clubes.</p></article></div>
      </section>

      <section className="coach-partner-landing">
        <div><span className="page-eyebrow">COACH PARCEIRO</span><h2>Ajude seus atletas a construir presença esportiva.</h2><p>Compartilhe seu link de indicação. O atleta pode começar gratuitamente no ONZEUP Player.</p><Link className="btn" href="/cadastro-coach">Quero ser Coach ONZEUP</Link></div>
        <div><span className="page-eyebrow">TEM ESCOLINHA OU CT?</span><h2>Seu Coach e sua organização podem coexistir.</h2><p>Seu perfil profissional continua individual e seu CT pode usar o ONZEUP Club para gestão.</p><Link className="players-secondary-cta" href="/club">Conhecer ONZEUP Club →</Link></div>
      </section>

      <section className="club-commercial-section" id="faq-coach">
        <span className="marketing-kicker dark">PERGUNTAS FREQUENTES</span><h2>Antes de criar seu Coach.</h2>
        <div className="club-faq"><article><h3>O ONZEUP Coach é pago?</h3><p>Não. O perfil Coach é gratuito para profissionais do futebol.</p></article><article><h3>Preciso usar a senha do clube?</h3><p>Não. Cada Coach usa sua própria conta e recebe acessos específicos por vínculo.</p></article><article><h3>Posso trabalhar em mais de um clube?</h3><p>Sim. Um mesmo perfil Coach pode ter vários vínculos independentes.</p></article><article><h3>O clube me cadastrou antes de eu criar o Coach. E agora?</h3><p>Crie o Coach com o mesmo e-mail informado ao clube e use “Buscar vínculos com clubes” no dashboard.</p></article></div>
      </section>

      <section className="product-directory-cta"><span className="page-eyebrow">TESTE AGORA</span><h2>Crie seu ONZEUP Coach.</h2><p>Complete seu site profissional e teste os vínculos com equipes.</p><Link className="btn" href="/cadastro-coach">Criar perfil grátis →</Link></section>
    </main>
  );
}
