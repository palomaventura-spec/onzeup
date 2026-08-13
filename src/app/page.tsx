import Link from "next/link";

const modules = ["Categorias", "Atletas", "Comissão", "Treinos", "Jogos", "QTR", "Convocações", "Financeiro"];

export default function Home() {
  return (
    <main className="marketing-home">
      <header className="marketing-nav">
        <Link href="/" className="marketing-brand">ONZE<span>UP</span></Link>
        <nav>
          <a href="#produto">Produto</a><a href="#clubes">Para clubes</a><a href="#player">ONZE Player</a><a href="#recursos">Recursos</a>
        </nav>
        <div><Link className="marketing-login" href="/login">Entrar</Link><a className="marketing-cta small" href="#comece">Começar agora</a></div>
      </header>

      <section className="marketing-hero" id="produto">
        <div className="marketing-wrap marketing-hero-grid">
          <div>
            <span className="marketing-kicker">FUTEBOL • FUTSAL • FORMAÇÃO</span>
            <h1>A BASE TODA<br/><em>CONECTADA.</em></h1>
            <p>Gestão, comunicação e presença digital para quem desenvolve o futebol desde o início.</p>
            <div className="marketing-actions"><a className="marketing-cta" href="#clubes">Conhecer a plataforma</a><a className="marketing-ghost" href="#demo">Ver demonstração ↓</a></div>
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
            <small>Clubes • Escolinhas • Projetos • Centros de treinamento</small>
          </div>
          <div className="hero-product">
            <div className="hero-window">
              <div className="hero-window-top"><b>ONZE<span>UP</span></b><i/><i/><i/></div>
              <div className="hero-window-body">
                <aside><b>Dashboard</b><span>Categorias</span><span>Atletas</span><span>Treinos</span><span>Jogos</span><span>QTR</span></aside>
                <section><small>VISÃO GERAL</small><h3>Bom dia, Coordenação.</h3><div className="demo-stats"><b>8<small>Categorias</small></b><b>186<small>Atletas</small></b><b>4<small>Jogos</small></b></div><div className="demo-card"><strong>Próximo jogo</strong><p>Sub-9 • Sábado • 10:30</p><span>Convocação em andamento →</span></div></section>
              </div>
            </div>
            <div className="hero-phone"><span>ONZE<em>UP</em> PLAYER</span><div>G9</div><strong>Gustavo</strong><small>Atacante • Sub-9</small></div>
          </div>
        </div>
      </section>

      <section className="marketing-section light" id="clubes">
        <div className="marketing-wrap">
          <span className="marketing-kicker dark">ONZEUP PARA ORGANIZAÇÕES</span>
          <div className="marketing-title-row"><h2>Administre sua base<br/>em um só lugar.</h2><p>Menos planilhas, mensagens perdidas e retrabalho. A rotina esportiva conectada em uma plataforma.</p></div>
          <div className="module-ribbon">{modules.map((m,i)=><div key={m}><small>{String(i+1).padStart(2,"0")}</small><strong>{m}</strong></div>)}</div>
        </div>
      </section>

      <section className="marketing-section dark-demo" id="demo">
        <div className="marketing-wrap split-feature">
          <div><span className="marketing-kicker">DO PAINEL PARA A TORCIDA</span><h2>Você administra.<br/><em>Seu site se atualiza.</em></h2><p>Cadastre categorias, elenco, comissão, jogos e resultados uma vez. A página pública da organização transforma esses dados em presença digital.</p></div>
          <div className="site-demo"><header><b>SEU CLUBE</b><span>Categorias　Jogos　Elenco</span></header><section><small>FUTEBOL • FORMAÇÃO</small><h3>O FUTURO<br/>JOGA AQUI.</h3><div><b>SUB-8</b><b>SUB-9</b><b>SUB-11</b></div></section></div>
        </div>
      </section>

      <section className="marketing-section player-feature" id="player">
        <div className="marketing-wrap split-feature">
          <div className="player-demo-card"><div className="player-demo-photo">09</div><small>ONZE PLAYER</small><h3>G9</h3><p>Atacante • 2018</p><div><span>POSIÇÃO<strong>Atacante</strong></span><span>PÉ<strong>Direito</strong></span></div><b>✓ Vínculo verificado</b></div>
          <div><span className="marketing-kicker dark">PARA FAMÍLIAS</span><h2>A trajetória esportiva<br/>dele em um lugar só.</h2><p>O ONZE Player é o perfil esportivo controlado pela família: fotos, vídeos, dados, clubes e vínculos verificados — independente do cadastro administrativo do clube.</p><Link className="marketing-cta dark" href="/login">Criar perfil de atleta</Link></div>
        </div>
      </section>

      <section className="marketing-section communication" id="recursos">
        <div className="marketing-wrap">
          <span className="marketing-kicker">ROTINA QUE FLUI</span><h2>Da convocação ao grupo dos pais.</h2>
          <div className="flow"><b>Jogo cadastrado</b><i>→</i><b>Convocação</b><i>→</i><b>WhatsApp</b><i>→</i><b>Confirmação</b></div>
          <div className="flow second"><b>Treinos + Jogos</b><i>→</i><b>QTR automático</b><i>→</i><b>Compartilhar</b></div>
        </div>
      </section>

      <section className="marketing-final" id="comece">
        <div className="marketing-wrap"><span className="marketing-kicker">COMECE PELO SEU LADO DO JOGO</span><h2>Um ecossistema.<br/>Dois caminhos.</h2><div className="final-choices">
          <div className="final-choice-demo"><Link href="/login"><small>ORGANIZAÇÕES</small><strong>Quero administrar minha base →</strong><span>Clubes, escolinhas e projetos.</span></Link><form action="/api/auth/demo" method="post"><input type="hidden" name="type" value="club" /><button type="submit">Testar conta demo do clube</button></form></div>
          <div className="final-choice-demo"><Link href="/login"><small>FAMÍLIAS</small><strong>Quero criar um ONZE Player →</strong><span>Perfil esportivo do atleta.</span></Link><form action="/api/auth/demo" method="post"><input type="hidden" name="type" value="player" /><button type="submit">Testar conta demo do atleta</button></form></div>
        </div></div>
      </section>
      <footer className="marketing-footer"><div className="marketing-wrap"><b>ONZE<span>UP</span></b><p>O FUTURO DO FUTEBOL COMEÇA NA BASE.</p><Link href="/login">Entrar</Link></div></footer>
    </main>
  );
}
