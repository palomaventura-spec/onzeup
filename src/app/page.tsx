import Link from "next/link";

const modules = [
  "Categorias",
  "Atletas",
  "Comissão",
  "Treinos",
  "Jogos",
  "QTR",
  "Convocações",
  "Financeiro",
];

const faqs = [
  ["Preciso de WhatsApp Business?", "Não. Na versão atual, a ONZEUP abre o WhatsApp com a mensagem pronta. A plataforma não lê mensagens e não exige WhatsApp Business."],
  ["O ONZE Player é do clube?", "Não. O clube controla a ficha administrativa do atleta e a família controla o ONZE Player. Os dois podem ser conectados por vínculo verificado."],
  ["Posso testar antes de contratar?", "Sim. Durante a fase atual, a ONZEUP está selecionando organizações para o programa piloto sem custo."],
  ["O site do clube precisa ser atualizado separadamente?", "Não. Categorias, elenco, comissão, jogos e resultados cadastrados no painel alimentam automaticamente o site público da organização."],
];

export default function Home() {
  return (
    <main className="ecosystem-home">
      <header className="ecosystem-nav">
        <Link href="/" className="marketing-brand">ONZE<span>UP</span></Link>
        <nav>
          <a href="#ecossistema">Ecossistema</a>
          <a href="#clubes">Clubes</a>
          <a href="#player">ONZE Player</a>
          <a href="#planos">Planos</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div>
          <Link className="marketing-login" href="/login">Entrar</Link>
          <a className="marketing-cta small" href="#piloto">Participar do piloto</a>
        </div>
      </header>

      <section className="ecosystem-hero">
        <div className="marketing-wrap ecosystem-hero-grid">
          <div>
            <span className="marketing-kicker">GESTÃO • COMUNICAÇÃO • IDENTIDADE ESPORTIVA</span>
            <h1>A BASE TODA<br/><em>CONECTADA.</em></h1>
            <p>
              Uma plataforma para organizar a rotina do clube, aproximar as famílias
              e transformar a trajetória do atleta em presença digital.
            </p>

            <div className="marketing-actions">
              <a className="marketing-cta" href="#piloto">Quero participar do piloto</a>
              <a className="marketing-ghost" href="#ecossistema">Conhecer a ONZEUP ↓</a>
            </div>

            <div className="demo-entry-row">
              <form action="/api/auth/demo" method="post">
                <input type="hidden" name="type" value="club" />
                <button type="submit">⚽ Testar ONZEUP Clube</button>
              </form>
              <form action="/api/auth/demo" method="post">
                <input type="hidden" name="type" value="player" />
                <button type="submit">★ Testar ONZE Player</button>
              </form>
            </div>
          </div>

          <div className="ecosystem-hero-visual">
            <div className="ecosystem-dashboard-demo">
              <header><b>ONZE<span>UP</span></b><small>Central operacional</small></header>
              <div className="ecosystem-dashboard-body">
                <aside>
                  <strong>Dashboard</strong>
                  <span>Categorias</span>
                  <span>Atletas</span>
                  <span>Treinos</span>
                  <span>Jogos</span>
                  <span>QTR</span>
                </aside>
                <section>
                  <small>HOJE</small>
                  <h3>O que precisa da sua atenção.</h3>
                  <div className="ecosystem-mini-stats">
                    <b>8<small>Categorias</small></b>
                    <b>186<small>Atletas</small></b>
                    <b>4<small>Jogos</small></b>
                  </div>
                  <article>
                    <span>PRÓXIMO JOGO</span>
                    <strong>Sub-9 × Academia Futuro</strong>
                    <small>Sábado • 10:30 • 18 convocados</small>
                  </article>
                </section>
              </div>
            </div>

            <div className="ecosystem-player-mini">
              <div className="ecosystem-player-mini-photo" />
              <small>ONZE PLAYER</small>
              <strong>Gustavo Aguiar</strong>
              <span>G9 • Atacante</span>
            </div>
          </div>
        </div>
      </section>

      <section className="ecosystem-strip" id="ecossistema">
        <div className="marketing-wrap ecosystem-three-paths">
          <article>
            <span>01</span>
            <small>ORGANIZAÇÃO</small>
            <h2>CLUBE</h2>
            <p>Gestão esportiva, agenda, comunicação, financeiro e presença digital.</p>
          </article>
          <i>→</i>
          <article>
            <span>02</span>
            <small>CONEXÃO</small>
            <h2>FAMÍLIA</h2>
            <p>Responsáveis conectados à rotina esportiva sem perder privacidade.</p>
          </article>
          <i>→</i>
          <article>
            <span>03</span>
            <small>TRAJETÓRIA</small>
            <h2>ATLETA</h2>
            <p>Perfil esportivo, história, vídeos, conquistas e vínculos verificados.</p>
          </article>
        </div>
      </section>

      <section className="ecosystem-section light" id="clubes">
        <div className="marketing-wrap">
          <span className="marketing-kicker dark">ONZEUP PARA ORGANIZAÇÕES</span>
          <div className="marketing-title-row">
            <h2>Administre sua base<br/>em um só lugar.</h2>
            <p>
              Menos planilhas, grupos dispersos e retrabalho. A ONZEUP transforma
              cadastros em operação diária e presença digital.
            </p>
          </div>

          <div className="module-ribbon">
            {modules.map((module, index) => (
              <div key={module}>
                <small>{String(index + 1).padStart(2, "0")}</small>
                <strong>{module}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ecosystem-section scale-section">
        <div className="marketing-wrap">
          <div className="scale-copy">
            <span className="marketing-kicker">PARA OPERAÇÕES DE BASE</span>
            <h2>Quanto maior a base,<br/>mais importante organizar.</h2>
            <p>
              Uma única plataforma pode conectar dezenas de categorias, centenas de
              atletas e suas famílias — com informação centralizada e acesso por perfil.
            </p>
          </div>

          <div className="scale-numbers">
            <article><strong>10+</strong><span>categorias</span></article>
            <article><strong>250+</strong><span>atletas</span></article>
            <article><strong>500+</strong><span>responsáveis</span></article>
            <article><strong>1</strong><span>plataforma</span></article>
          </div>

          <small className="illustrative-note">Números ilustrativos para demonstrar a capacidade operacional da plataforma.</small>
        </div>
      </section>

      <section className="ecosystem-section site-automation-section">
        <div className="marketing-wrap split-feature">
          <div>
            <span className="marketing-kicker">DO PAINEL PARA O PÚBLICO</span>
            <h2>Você administra.<br/><em>Seu site se atualiza.</em></h2>
            <p>
              Categorias, elenco, comissão, jogos e resultados podem alimentar
              automaticamente a página pública da organização.
            </p>
          </div>

          <div className="site-demo premium-site-demo">
            <header><b>SEU CLUBE</b><span>Categorias　Jogos　Elenco</span></header>
            <section>
              <small>FUTEBOL • FUTSAL • FORMAÇÃO</small>
              <h3>A BASE<br/>EM MOVIMENTO.</h3>
              <div><b>SUB-8</b><b>SUB-9</b><b>SUB-11</b></div>
            </section>
          </div>
        </div>
      </section>

      <section className="ecosystem-player-showcase" id="player">
        <div className="marketing-wrap player-showcase-grid">
          <div className="player-showcase-photo">
            <img src="/marketing/gustavo-onze-player.png" alt="Exemplo demonstrativo de ONZE Player" />
            <span>EXEMPLO DEMONSTRATIVO</span>
          </div>

          <div>
            <span className="marketing-kicker dark">ONZE PLAYER</span>
            <h2>Uma trajetória esportiva<br/>que pode ser compartilhada.</h2>
            <p>
              O ONZE Player transforma os dados preenchidos pela família em um
              mini-site esportivo: identidade, estatísticas, carreira, conquistas,
              vídeos, galeria e vínculos confirmados por organizações ONZEUP.
            </p>

            <div className="player-showcase-data">
              <article><small>NOME</small><strong>Gustavo Aguiar</strong></article>
              <article><small>APELIDO</small><strong>G9</strong></article>
              <article><small>POSIÇÃO</small><strong>Atacante • Pivô</strong></article>
              <article><small>ANO</small><strong>2018</strong></article>
            </div>

            <p className="player-demo-disclaimer">
              Perfil utilizado como exemplo com autorização do responsável. A presença
              de uniforme ou referência esportiva não representa parceria institucional
              entre a ONZEUP e o clube retratado.
            </p>

            <div className="marketing-actions">
              <form action="/api/auth/demo" method="post">
                <input type="hidden" name="type" value="player" />
                <button className="marketing-cta dark" type="submit">Testar ONZE Player</button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <section className="ecosystem-section connection-section">
        <div className="marketing-wrap">
          <span className="marketing-kicker">UM ECOSSISTEMA, CONTROLES SEPARADOS</span>
          <h2>Conectados sem misturar propriedade dos dados.</h2>

          <div className="connection-grid">
            <article>
              <span>CLUBE</span>
              <h3>Ficha administrativa</h3>
              <p>Categoria, número, posição, responsáveis, convocações, cobranças e rotina esportiva.</p>
            </article>
            <b>↔</b>
            <article>
              <span>VÍNCULO</span>
              <h3>Confirmação</h3>
              <p>O clube pode confirmar que determinado ONZE Player corresponde ao atleta cadastrado.</p>
            </article>
            <b>↔</b>
            <article>
              <span>FAMÍLIA</span>
              <h3>Perfil esportivo</h3>
              <p>Fotos, vídeos, carreira, conquistas e informações públicas permanecem sob controle da família.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="ecosystem-section pricing-section" id="planos">
        <div className="marketing-wrap">
          <span className="marketing-kicker">PLANOS PREVISTOS APÓS O PILOTO</span>
          <h2>Uma solução que cresce<br/>junto com a organização.</h2>

          <div className="pricing-grid">
            <article>
              <small>BASE</small>
              <h3>R$ 79,90<span>/mês</span></h3>
              <p>Para projetos e escolinhas menores.</p>
              <ul><li>Até 3 categorias</li><li>Até 60 atletas</li><li>Agenda, jogos e QTR</li><li>Site público</li><li>Financeiro</li></ul>
            </article>
            <article className="featured">
              <span className="pricing-badge">MAIS ESCOLHIDO</span>
              <small>PRO</small>
              <h3>R$ 149,90<span>/mês</span></h3>
              <p>Para operações de base em crescimento.</p>
              <ul><li>Até 10 categorias</li><li>Até 200 atletas</li><li>Todos os módulos principais</li><li>Personalização completa</li><li>Relatórios avançados</li></ul>
            </article>
            <article>
              <small>CLUBE</small>
              <h3>R$ 249,90<span>/mês</span></h3>
              <p>Para estruturas maiores e múltiplas categorias.</p>
              <ul><li>Categorias ilimitadas</li><li>Atletas ilimitados</li><li>Domínio próprio</li><li>Suporte prioritário</li><li>Recursos avançados</li></ul>
            </article>
          </div>

          <p className="pricing-note">Valores planejados para o lançamento comercial e sujeitos a ajustes após o programa piloto.</p>
        </div>
      </section>

      <section className="partner-program" id="piloto">
        <div className="marketing-wrap partner-program-grid">
          <div>
            <span className="marketing-kicker">PROGRAMA CLUBE PARCEIRO</span>
            <h2>Ajude a construir<br/>o futuro da gestão da base.</h2>
            <p>
              Estamos selecionando organizações para testar a ONZEUP em operação real,
              compartilhar feedback e participar diretamente da evolução do produto.
            </p>
          </div>

          <div className="partner-card">
            <span>PILOTO</span>
            <h3>Acesso sem custo durante o programa.</h3>
            <ul>
              <li>Implantação assistida</li>
              <li>Acesso aos principais módulos</li>
              <li>Canal direto para feedback</li>
              <li>Correções e evolução durante o piloto</li>
              <li>Sem obrigação de contratação ao término</li>
            </ul>
            <a href="mailto:palomaventura@gmail.com?subject=Programa%20Piloto%20ONZEUP">Quero conversar sobre parceria →</a>
          </div>
        </div>
      </section>

      <section className="ecosystem-section faq-section" id="faq">
        <div className="marketing-wrap">
          <span className="marketing-kicker dark">PERGUNTAS FREQUENTES</span>
          <h2>Antes de entrar em campo.</h2>

          <div className="faq-grid">
            {faqs.map(([question, answer]) => (
              <article key={question}>
                <h3>{question}</h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="marketing-footer ecosystem-footer">
        <div className="marketing-wrap">
          <div><b>ONZE<span>UP</span></b><p>O FUTURO DO FUTEBOL COMEÇA NA BASE.</p></div>
          <div><Link href="/login">Entrar</Link><a href="#piloto">Programa piloto</a></div>
        </div>
      </footer>
    </main>
  );
}
