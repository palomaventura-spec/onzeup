import Link from "next/link";

const benefits = [
  ["01", "Perfil profissional", "Experiência, clubes, funções, formação, licenças, metodologia e conquistas em um só endereço."],
  ["02", "Um login, vários vínculos", "Trabalhe em mais de um clube, categoria ou CT sem misturar os dados de cada organização."],
  ["03", "Acesso às suas equipes", "Quando um clube ONZEUP vincula seu perfil, você recebe acesso somente ao elenco, agenda e convocações autorizadas."],
  ["04", "Rede e indicações", "Indique o ONZEUP Player às famílias e acompanhe os atletas cadastrados pelo seu link."],
];

export default function CoachLanding() {
  return (
    <main className="product-landing coach-product-landing coach-complete-landing">
      <header className="product-landing-nav">
        <Link href="/" className="player-brand">ONZE<span>UP</span> <b>COACH</b></Link>
        <nav>
          <a href="#perfil">Perfil</a><a href="#vinculos">Vínculos</a><a href="#como-funciona">Como funciona</a><a href="#faq-coach">FAQ</a>
          <Link href="/coaches">Explorar Coaches</Link><Link href="/login">Entrar</Link><Link className="btn" href="/cadastro-coach">Criar perfil grátis</Link>
        </nav>
      </header>

      <section className="product-landing-hero coach-product-hero">
        <div>
          <span className="page-eyebrow">ONZEUP COACH • GRATUITO</span>
          <h1>Seu trabalho no futebol em um único perfil.</h1>
          <p>Crie sua presença profissional, conecte-se às equipes onde atua e acesse convocações com seu próprio login — sem compartilhar a conta do clube.</p>
          <div className="product-landing-actions">
            <Link className="btn" href="/cadastro-coach">Criar ONZEUP Coach grátis</Link>
            <Link className="players-secondary-cta" href="/coaches">Explorar profissionais →</Link>
          </div>
          <small>Para treinadores, auxiliares, preparadores, scouts, coordenadores e outros profissionais do futebol.</small>
        </div>
        <aside className="product-demo-card coach-demo-card">
          <span>UM LOGIN. VÁRIAS EQUIPES.</span>
          <h2>Seu acesso acompanha seus vínculos.</h2>
          <ul>
            <li>Perfil profissional compartilhável</li><li>Convites de clubes e CTs</li><li>Acesso por categoria/modalidade</li><li>Elenco, agenda e convocações conforme permissão</li><li>Indicação gratuita de atletas para o Player</li>
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
          <h2>O clube convida. Você decide.</h2>
          <p>O clube informa o e-mail da sua conta ONZEUP Coach e define categoria, modalidade e permissões. O convite aparece no seu dashboard e só fica ativo depois do seu aceite.</p>
        </div>
        <div className="coach-linking-flow">
          <article><b>1</b><span>Clube envia convite</span><small>pelo mesmo e-mail do Coach</small></article>
          <i>→</i><article><b>2</b><span>Coach aceita</span><small>no próprio dashboard</small></article>
          <i>→</i><article><b>3</b><span>Acesso liberado</span><small>somente à equipe autorizada</small></article>
        </div>
      </section>

      <section className="coach-permissions-landing">
        <div><span className="page-eyebrow">SEM SENHA COMPARTILHADA</span><h2>Cada profissional tem seu próprio acesso.</h2><p>O treinador não entra com o login do clube. Ele usa a própria conta Coach e vê apenas o que a organização autorizou.</p></div>
        <div className="coach-permission-grid"><article><strong>Elenco</strong><span>visualização da equipe vinculada</span></article><article><strong>Agenda</strong><span>jogos e compromissos da categoria</span></article><article><strong>Convocações</strong><span>visualizar ou gerenciar conforme permissão</span></article><article><strong>Isolamento</strong><span>sem financeiro ou outras categorias por padrão</span></article></div>
      </section>

      <section className="club-commercial-section dark" id="como-funciona">
        <span className="marketing-kicker">COMECE EM MINUTOS</span><h2>Crie. Complete. Conecte.</h2>
        <div className="club-steps"><article><b>01</b><h3>Crie seu Coach</h3><p>Perfil profissional gratuito com seu próprio login.</p></article><article><b>02</b><h3>Complete sua carreira</h3><p>Experiência, licenças, metodologia, clubes e contatos.</p></article><article><b>03</b><h3>Aceite seus vínculos</h3><p>Clubes ONZEUP podem convidar você para as equipes onde trabalha.</p></article></div>
      </section>

      <section className="coach-partner-landing">
        <div><span className="page-eyebrow">COACH PARCEIRO</span><h2>Ajude seus atletas a construir presença esportiva.</h2><p>Compartilhe seu link de indicação. O atleta pode começar gratuitamente no ONZEUP Player.</p><Link className="btn" href="/cadastro-coach">Quero ser Coach ONZEUP</Link></div>
        <div><span className="page-eyebrow">TEM ESCOLINHA OU CT?</span><h2>Seu Coach e sua organização podem coexistir.</h2><p>Seu perfil profissional continua individual e seu CT pode usar o ONZEUP Club para gestão.</p><Link className="players-secondary-cta" href="/club">Conhecer ONZEUP Club →</Link></div>
      </section>

      <section className="club-commercial-section" id="faq-coach">
        <span className="marketing-kicker dark">PERGUNTAS FREQUENTES</span><h2>Antes de criar seu Coach.</h2>
        <div className="club-faq"><article><h3>O ONZEUP Coach é pago?</h3><p>Não. O perfil Coach é gratuito para profissionais do futebol.</p></article><article><h3>Preciso usar a senha do clube?</h3><p>Não. Cada Coach usa sua própria conta e recebe acessos específicos por vínculo.</p></article><article><h3>Posso trabalhar em mais de um clube?</h3><p>Sim. Um mesmo perfil Coach pode ter vários vínculos independentes.</p></article><article><h3>Tenho um CT. Preciso de outra conta?</h3><p>Não necessariamente. Você mantém o Coach e pode criar o ONZEUP Club para a gestão do CT.</p></article></div>
      </section>

      <section className="product-directory-cta"><span className="page-eyebrow">TESTE AGORA</span><h2>Crie seu ONZEUP Coach.</h2><p>Depois do cadastro, complete o perfil e teste o dashboard de vínculos e convocações.</p><Link className="btn" href="/cadastro-coach">Criar perfil grátis →</Link></section>
    </main>
  );
}
