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
  ["Posso conhecer antes de contratar?", "Sim. O ONZEUP Club oferece 15 dias grátis e o ONZE Player possui uma versão gratuita permanente, ambos sem cartão no cadastro inicial."],
  ["O site do clube precisa ser atualizado separadamente?", "Não. Categorias, elenco, comissão, jogos e resultados cadastrados no painel alimentam automaticamente o site público da organização."],
];

export default function Home() {
  const playersUrl = process.env.NODE_ENV === "development" ? "/players" : (process.env.NEXT_PUBLIC_PLAYERS_URL || "https://players.onzeup.com.br");

  return (
    <main className="ecosystem-home">
      <header className="ecosystem-nav">
        <Link href="/" className="marketing-brand">ONZE<span>UP</span></Link>
        <nav>
          <a href="#clubes">Clubes</a>
          <a href="#player">ONZE Player</a>
          <a href={playersUrl}>Players</a>
          <a href="/coaches">Coach</a>
          <a href="#planos">Planos</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div>
          <Link className="marketing-login" href="/login">Entrar</Link>
          <a className="marketing-cta small" href="#planos">Ver planos</a>
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
              <a className="marketing-cta" href="#planos">Começar com a ONZEUP</a>
              <a className="marketing-ghost" href="#plataforma">Conhecer a ONZEUP ↓</a>
            </div>

            <div className="demo-entry-row">
              <Link className="club-trial-hero-cta" href="/cadastro-clube">
                ⚽ Testar grátis por 15 dias
              </Link>
              <Link className="player-free-hero-cta" href="/cadastro">★ Criar ONZE Player grátis</Link>
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

      <section className="product-choice">
        <div className="marketing-wrap">
          <span className="marketing-kicker">ESCOLHA SUA ONZEUP</span>
          <h2>Uma plataforma.<br/>Dois caminhos.</h2>
          <div className="product-choice-grid">
            <article>
              <small>PARA ORGANIZAÇÕES</small><h3>ONZEUP CLUB</h3>
              <p>Gestão de categorias, atletas, comissão, treinos, jogos, comunicação e financeiro.</p>
              <Link className="marketing-cta" href="/cadastro-clube">Começar 15 dias grátis</Link>
              <a className="marketing-ghost" href="#planos">Conhecer planos →</a>
              <span>15 dias grátis • sem cartão</span>
            </article>

          <article className="marketing-product-card coach-product-card">
            <span className="marketing-kicker">ONZEUP COACH</span>
            <h3>Presença profissional para quem desenvolve atletas.</h3>
            <p>
              Treinadores, auxiliares, scouts e profissionais podem organizar
              experiência, clubes, licenças, formação, metodologia e conquistas.
            </p>
            <div className="marketing-product-actions">
              <Link className="marketing-cta" href="/cadastro-coach">Criar perfil Coach grátis</Link>
              <a className="marketing-ghost" href="/coaches">Explorar Coaches →</a>
            </div>
            <span>Grátis no lançamento</span>
          </article>
            <article className="player-choice">
              <small>PARA FAMÍLIAS E ATLETAS</small><h3>ONZE PLAYER</h3>
              <p>Crie gratuitamente a identidade esportiva digital do atleta e compartilhe sua trajetória.</p>
              <Link className="marketing-cta" href="/cadastro">Criar ONZE Player grátis</Link>
              <Link className="marketing-ghost" href={playersUrl}>Explorar Players →</Link>
              <span>Grátis • sem cartão</span>
            </article>
          </div>
        </div>
      </section>

      <section className="ecosystem-strip" id="plataforma">
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
            <img src="/marketing/gustavo-onze-player.jpg" alt="Exemplo demonstrativo de ONZE Player" />
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
            <div className="marketing-actions player-example-actions">
              <Link className="marketing-cta dark" href="/cadastro">Criar ONZE Player grátis</Link>
              <Link className="marketing-ghost dark polished-secondary-link" href="/gustavo-aguiar-free">Ver exemplo Free</Link>
              <Link className="marketing-ghost dark polished-secondary-link" href="/gustavo-aguiar">Ver exemplo Premium</Link>
            </div>

            <div className="marketing-actions">
              <Link className="marketing-cta dark" href="/cadastro">
                Criar ONZE Player grátis
              </Link>
              <Link className="marketing-ghost dark" href={playersUrl}>
                Explorar ONZE Players →
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ecosystem-section connection-section">
        <div className="marketing-wrap">
          <span className="marketing-kicker">UMA PLATAFORMA, CONTROLES SEPARADOS</span>
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

      
      <section className="player-plan-comparison">
        <div className="marketing-wrap">
          <span className="marketing-kicker">FREE X PREMIUM</span>
          <div className="marketing-title-row">
            <h2>Veja a diferença<br/>antes de escolher.</h2>
            <p>O Free entrega uma presença esportiva objetiva. O Premium transforma o perfil em um verdadeiro site esportivo personalizado.</p>
          </div>
          <div className="player-plan-comparison-grid">
            <article>
              <small>ONZE PLAYER FREE</small>
              <h3>R$ 0</h3>
              <p>Perfil esportivo essencial para começar.</p>
              <ul><li>Foto principal</li><li>Dados esportivos</li><li>Estatísticas básicas</li><li>Trajetória</li><li>1 vídeo YouTube</li><li>Link compartilhável</li></ul>
              <Link className="marketing-ghost dark polished-secondary-link" href="/gustavo-aguiar-free">Ver Gustavo no Free →</Link>
            </article>
            <article className="premium">
              <span className="pricing-badge">PREMIUM</span>
              <small>ONZE PLAYER PREMIUM</small>
              <h3>R$ 29,90<span>/mês</span></h3>
              <p>Um site esportivo completo para destacar a trajetória do atleta.</p>
              <ul><li>Hero e capa premium</li><li>Números em destaque</li><li>Trajetória por temporadas</li><li>Conquistas</li><li>Galeria</li><li>Vários vídeos</li><li>Visual profissional</li></ul>
              <Link className="marketing-cta dark" href="/gustavo-aguiar">Ver Gustavo no Premium →</Link>
            </article>
          </div>
        </div>
      </section>
<section className="ecosystem-section pricing-section" id="planos">
        <div className="marketing-wrap">
          <span className="marketing-kicker">PLANOS ONZEUP</span>
          <h2>Uma solução que cresce<br/>junto com a organização.</h2>

          <div className="pricing-grid">
            <article>
              <small>BASE</small>
              <h3>R$ 49,90<span>/mês</span></h3>
              <p>Para projetos, academias e escolinhas que estão começando.</p>
              <ul><li>Até 3 categorias</li><li>Até 50 atletas</li><li>Agenda, jogos e QTR</li><li>Site público</li><li>Financeiro</li></ul>
            </article>
            <article className="featured">
              <span className="pricing-badge">MAIS ESCOLHIDO</span>
              <small>PRO</small>
              <h3>R$ 99,90<span>/mês</span></h3>
              <p>Para operações de base em crescimento.</p>
              <ul><li>Até 10 categorias</li><li>Até 150 atletas</li><li>Todos os módulos principais</li><li>Personalização completa</li><li>Gestão ampliada da operação</li></ul>
            </article>
            <article>
              <small>CLUBE</small>
              <h3>R$ 179,90<span>/mês</span></h3>
              <p>Para clubes e estruturas com maior volume de atletas.</p>
              <ul><li>Categorias sem limite comercial</li><li>Atletas sem limite comercial</li><li>Domínio próprio</li><li>Suporte prioritário</li><li>Acesso aos módulos do plano Clube</li></ul>
            </article>
          </div>

          <p className="pricing-note">Planos de lançamento do ONZEUP. Todos começam com 15 dias grátis.</p>
          <div className="marketing-actions pricing-actions">
            <Link className="marketing-cta" href="/cadastro-clube">Começar 15 dias grátis</Link>
          </div>
        </div>
      </section>

      <section className="partner-program" id="parceiros">
        <div className="marketing-wrap partner-program-grid">
          <div>
            <span className="marketing-kicker">ONZEUP PARCEIROS</span>
            <h2>Ajude a construir<br/>o futuro da gestão da base.</h2>
            <p>
              Estamos selecionando organizações para testar a ONZEUP em operação real,
              compartilhar feedback e participar diretamente da evolução do produto.
            </p>
          </div>

          <div className="partner-card">
            <span>PARCERIA</span>
            <h3>Benefícios exclusivos para parceiros ONZEUP.</h3>
            <ul>
              <li>Condições comerciais diferenciadas</li>
              <li>Acesso aos módulos definidos na parceria</li>
              <li>Canal direto com a equipe ONZEUP</li>
              <li>Relacionamento direto com a ONZEUP</li>
              <li>Condições avaliadas individualmente</li>
            </ul>
            <a href="mailto:palomaventura@gmail.com?subject=Parceria%20ONZEUP">Quero ser parceiro ONZEUP →</a>
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
          <div><Link href="/login">Entrar</Link><a href="#parceiros">ONZEUP Parceiros</a></div>
        </div>
      </footer>
    </main>
  );
}
