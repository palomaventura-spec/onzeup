import Link from "next/link";

const modules = [
  ["01", "Atletas & categorias", "Cadastros organizados por categoria, modalidade e temporada."],
  ["02", "Agenda & treinos", "Horários, rotina, presença e visão operacional da semana."],
  ["03", "Jogos & convocações", "Partidas, QTR, listas e confirmação das famílias."],
  ["04", "Comissão & Coach", "Vincule profissionais e libere acessos por equipe e categoria."],
  ["05", "Financeiro", "Mensalidades, taxas, recebimentos e pendências."],
  ["06", "Site público", "Logo, capa, cores, elenco, comissão, jogos e resultados alimentados pelo painel."],
];

export default function ClubLanding() {
  return <main className="club-commercial-home club-complete-landing">
    <header className="club-commercial-nav">
      <Link href="/club" className="marketing-brand">ONZE<span>UP</span> <b>CLUB</b></Link>
      <nav><a href="#recursos">Recursos</a><a href="#conectado">Ecossistema</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a><a href="#faq-club">FAQ</a></nav>
      <div><Link className="marketing-login" href="/login?perfil=club">Entrar</Link><Link className="marketing-cta small" href="/cadastro-clube">Testar grátis</Link></div>
    </header>

    <section className="club-commercial-hero">
      <div><span className="marketing-kicker">CLUBES • ESCOLINHAS • CTs • PROJETOS</span><h1>MENOS IMPROVISO.<br/><em>MAIS GESTÃO.</em></h1><p>Gestão esportiva, comunicação, cobranças e site público em uma plataforma feita para a rotina da base.</p><div className="marketing-actions"><Link className="marketing-cta" href="/cadastro-clube">Criar meu clube</Link><a className="marketing-ghost" href="#recursos">Conhecer recursos ↓</a></div><small>Sem cartão no cadastro inicial.</small></div>
      <aside className="club-commercial-dashboard"><span>ONZEUP CLUB</span><h3>O que precisa da sua atenção hoje.</h3><div><article><strong>8</strong><small>Categorias</small></article><article><strong>186</strong><small>Atletas</small></article><article><strong>4</strong><small>Jogos</small></article></div><section><small>PRÓXIMO JOGO</small><b>Sub-9 × Academia Futuro</b><span>Sábado • 10:30 • 18 convocados</span></section></aside>
    </section>

    <section className="club-problem-strip"><div><strong>Planilhas</strong><span>espalhadas</span></div><i>→</i><div><strong>WhatsApp</strong><span>sem histórico</span></div><i>→</i><div><strong>Cobranças</strong><span>manuais</span></div><i>→</i><div className="solution"><strong>ONZEUP</strong><span>tudo conectado</span></div></section>

    <section className="club-commercial-section" id="recursos"><span className="marketing-kicker dark">TUDO EM UM SÓ LUGAR</span><h2>Da operação esportiva<br/>ao site do clube.</h2><div className="club-module-grid">{modules.map(([n,t,d]) => <article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div></section>

    <section className="club-ecosystem-section" id="conectado">
      <div><span className="page-eyebrow">CLUB + PLAYER + COACH</span><h2>O clube administra. Cada pessoa mantém sua própria identidade.</h2><p>Famílias usam o ONZEUP Player. Treinadores usam o ONZEUP Coach. O Club conecta esses perfis por vínculo e permissão, sem compartilhar senhas.</p></div>
      <div className="club-ecosystem-grid"><article><strong>PLAYER</strong><h3>Atletas vinculados</h3><p>O responsável usa o mesmo e-mail informado ao clube, solicita a correspondência e a equipe confirma.</p></article><article><strong>COACH</strong><h3>Comissão com acesso próprio</h3><p>O clube pode convidar o Coach, ou o profissional pode localizar seu cadastro pelo mesmo e-mail e solicitar vínculo.</p></article><article><strong>CLUB</strong><h3>Controle continua com a organização</h3><p>Dados internos, financeiro e outras categorias permanecem isolados por permissão.</p></article></div>
    </section>

    <section className="coach-permissions-landing club-coach-permission"><div><span className="page-eyebrow">COMISSÃO TÉCNICA</span><h2>Sem senha compartilhada.</h2><p>Cadastre o e-mail do profissional mesmo que ele ainda não tenha Coach. Quando criar a conta com o mesmo e-mail, o vínculo poderá ser encontrado e confirmado.</p></div><div className="coach-permission-grid"><article><strong>Elenco</strong><span>da categoria vinculada</span></article><article><strong>Agenda</strong><span>da equipe</span></article><article><strong>Convocação</strong><span>visualizar ou gerenciar</span></article><article><strong>Financeiro</strong><span>não liberado por padrão</span></article></div></section>

    <section className="club-commercial-section dark" id="como-funciona"><span className="marketing-kicker">COMECE RÁPIDO</span><h2>Cadastre. Organize. Convide.</h2><div className="club-steps"><article><b>01</b><h3>Crie sua organização</h3><p>Crie sua conta e configure sua organização.</p></article><article><b>02</b><h3>Monte sua base</h3><p>Categorias, atletas, comissão, treinos e jogos.</p></article><article><b>03</b><h3>Conecte famílias e comissão</h3><p>Player e Coach usam logins próprios e vínculos confirmados.</p></article></div></section>

    <section className="club-public-site-selling"><div><span className="page-eyebrow">SITE PÚBLICO INCLUÍDO</span><h2>Cadastre uma vez. Apresente o clube automaticamente.</h2><p>Logo, capa, cores, categorias, elenco, comissão, próximos jogos e resultados podem alimentar a página pública a partir do próprio painel.</p></div><div className="club-site-mini-preview"><span>SUA MARCA</span><h3>Seu clube com presença profissional.</h3><div><b>Próximos jogos</b><b>Elenco</b><b>Comissão</b></div></div></section>

    <section className="onze-testimonials light">
      <div><span className="page-eyebrow">QUEM VIVE A GESTÃO</span><h2>Organização que aparece na rotina.</h2></div>
      <div className="onze-testimonial-grid">
        <article className="onze-testimonial-card">
          <small>ONZEUP CLUB</small>
          <blockquote>“Sou treinador e gestor de uma escolinha de futebol, e o ONZEUP facilitou muito a minha organização. Além de ter um site profissional e editável, posso vincular treinadores e alunos e concentrar tudo em um único sistema.”</blockquote>
          <strong>Julio</strong><span>Treinador e Gestor de Escolinha de Futebol</span>
        </article>
      </div>
    </section>

    <section className="club-commercial-section" id="planos"><span className="marketing-kicker dark">PLANOS ONZEUP CLUB</span><h2>Comece pequeno.<br/>Cresça sem trocar de sistema.</h2><p className="club-plan-note">Os planos comerciais estão sendo ajustados para atender desde treinamentos e pequenas escolinhas até operações maiores. O acesso inicial pode ser liberado pela equipe ONZEUP.</p><div className="club-plan-preview"><article><small>ENTRADA</small><h3>Pequenas operações</h3><p>Organize a rotina e profissionalize a gestão.</p></article><article className="featured"><small>CRESCIMENTO</small><h3>Base em expansão</h3><p>Mais atletas, categorias e recursos conectados.</p></article><article><small>ESTRUTURA</small><h3>Operações maiores</h3><p>Escala, personalização e suporte ao volume.</p></article></div><Link className="marketing-cta" href="/cadastro-clube">Criar meu clube</Link></section>

    <section className="club-commercial-section dark" id="faq-club"><span className="marketing-kicker">PERGUNTAS FREQUENTES</span><h2>Antes de começar.</h2><div className="club-faq"><article><h3>Serve para escolinha pequena?</h3><p>Sim. Clubes, escolinhas, CTs, projetos e treinamentos personalizados podem usar a plataforma.</p></article><article><h3>O treinador usa a senha do clube?</h3><p>Não. Ele usa o próprio ONZEUP Coach e recebe somente as permissões da equipe vinculada.</p></article><article><h3>O atleta precisa ter Player?</h3><p>Não para o clube cadastrá-lo. Se a família criar o Player, pode solicitar o vínculo usando o mesmo e-mail informado ao clube.</p></article><article><h3>O site público dá trabalho extra?</h3><p>Não. Os dados do painel podem alimentar a página pública automaticamente.</p></article></div></section>

    <section className="club-final-cta"><span>COMECE COM SUA ROTINA REAL</span><h2>Crie seu ONZEUP Club<br/>e convide sua equipe.</h2><p>Cadastre sua organização, monte sua base e centralize a rotina do clube.</p><Link className="btn" href="/cadastro-clube">Criar meu clube</Link></section>
  </main>;
}
