import Link from "next/link";

const modules = [
  ["01", "Atletas & categorias", "Cadastros organizados por categoria, modalidade e temporada."],
  ["02", "Agenda & treinos", "Horários, rotina e visão operacional da semana."],
  ["03", "Jogos & convocações", "Partidas, QTR e comunicação preparada para as famílias."],
  ["04", "Comissão técnica", "Profissionais, funções e categorias sob controle."],
  ["05", "Financeiro", "Mensalidades, cobranças, recebimentos e pendências."],
  ["06", "Site público", "Sua organização ganha presença digital alimentada pelo próprio painel."],
];

export default function ClubLanding() {
  return <main className="club-commercial-home">
    <header className="club-commercial-nav">
      <a href="https://club.onzeup.com.br" className="marketing-brand">ONZE<span>UP</span> <b>CLUB</b></a>
      <nav><a href="#recursos">Recursos</a><a href="#como-funciona">Como funciona</a><a href="#planos">Planos</a><a href="#faq-club">FAQ</a></nav>
      <div><Link className="marketing-login" href="/login?perfil=club">Entrar</Link><Link className="marketing-cta small" href="/cadastro-clube">Testar grátis</Link></div>
    </header>

    <section className="club-commercial-hero">
      <div>
        <span className="marketing-kicker">GESTÃO PARA QUEM FAZ A BASE ACONTECER</span>
        <h1>MENOS IMPROVISO.<br/><em>MAIS GESTÃO.</em></h1>
        <p>Atletas, categorias, treinos, jogos, comunicação, financeiro e presença digital em uma única plataforma.</p>
        <div className="marketing-actions"><Link className="marketing-cta" href="/cadastro-clube">Começar 15 dias grátis</Link><a className="marketing-ghost" href="#recursos">Conhecer recursos ↓</a></div>
        <small>Sem cartão no cadastro inicial.</small>
      </div>
      <aside className="club-commercial-dashboard">
        <span>ONZEUP CLUB</span><h3>O que precisa da sua atenção hoje.</h3>
        <div><article><strong>8</strong><small>Categorias</small></article><article><strong>186</strong><small>Atletas</small></article><article><strong>4</strong><small>Jogos</small></article></div>
        <section><small>PRÓXIMO JOGO</small><b>Sub-9 × Academia Futuro</b><span>Sábado • 10:30 • 18 convocados</span></section>
      </aside>
    </section>

    <section className="club-problem-strip"><div><strong>Planilhas</strong><span>espalhadas</span></div><i>→</i><div><strong>WhatsApp</strong><span>sem histórico</span></div><i>→</i><div><strong>Cobranças</strong><span>manuais</span></div><i>→</i><div className="solution"><strong>ONZEUP</strong><span>tudo conectado</span></div></section>

    <section className="club-commercial-section" id="recursos">
      <span className="marketing-kicker dark">TUDO EM UM SÓ LUGAR</span><h2>Da operação esportiva<br/>ao financeiro.</h2>
      <div className="club-module-grid">{modules.map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</div>
    </section>

    <section className="club-commercial-section dark" id="como-funciona">
      <span className="marketing-kicker">COMECE RÁPIDO</span><h2>Cadastre. Organize. Use.</h2>
      <div className="club-steps"><article><b>01</b><h3>Crie sua organização</h3><p>15 dias grátis para configurar e testar com sua rotina.</p></article><article><b>02</b><h3>Monte sua base</h3><p>Categorias, atletas, comissão, treinos e jogos.</p></article><article><b>03</b><h3>Centralize a operação</h3><p>Comunicação, financeiro e site passam a partir do mesmo painel.</p></article></div>
    </section>

    <section className="club-commercial-section" id="planos">
      <span className="marketing-kicker dark">PLANOS ONZEUP CLUB</span><h2>Comece pequeno.<br/>Cresça sem trocar de sistema.</h2>
      <p className="club-plan-note">Estamos ajustando os planos comerciais para atender desde pequenos treinamentos e escolinhas até estruturas maiores. O teste gratuito já está disponível.</p>
      <div className="club-plan-preview"><article><small>ENTRADA</small><h3>Para pequenas operações</h3><p>O essencial para organizar a rotina e começar profissionalmente.</p></article><article className="featured"><small>CRESCIMENTO</small><h3>Para bases em expansão</h3><p>Mais atletas, categorias e recursos de gestão.</p></article><article><small>ESTRUTURA</small><h3>Para operações maiores</h3><p>Escala, personalização e suporte adequado ao volume.</p></article></div>
      <Link className="marketing-cta" href="/cadastro-clube">Testar ONZEUP Club por 15 dias</Link>
    </section>

    <section className="club-commercial-section dark" id="faq-club"><span className="marketing-kicker">PERGUNTAS FREQUENTES</span><h2>Antes de entrar em campo.</h2><div className="club-faq"><article><h3>Preciso instalar aplicativo?</h3><p>Não. A ONZEUP funciona pela web e pode trabalhar em conjunto com o WhatsApp para comunicação.</p></article><article><h3>Posso começar com poucos atletas?</h3><p>Sim. A proposta é atender também pequenas escolinhas, CTs e treinamentos personalizados.</p></article><article><h3>O site público dá trabalho extra?</h3><p>Não. As informações da organização podem alimentar a página pública a partir do próprio painel.</p></article></div></section>

    <section className="club-final-cta"><span>ONZEUP CLUB</span><h2>Sua base organizada<br/>desde o primeiro treino.</h2><Link className="btn" href="/cadastro-clube">Começar 15 dias grátis</Link></section>
  </main>;
}
