import Link from "next/link";
export default function PlayerFreeExample() {
  return <main className="free-player-site">
    <div className="example-banner"><span>EXEMPLO ONZE PLAYER FREE</span><div><Link href="/exemplos/player-premium">Comparar com Premium →</Link><Link href="/cadastro">Criar meu Player grátis</Link></div></div>
    <header className="free-player-nav"><Link href="/" className="player-brand">ONZE<span>UP</span> <b>PLAYER</b></Link><Link href="/cadastro" className="btn">Criar perfil grátis</Link></header>
    <section className="free-player-hero"><div className="free-player-photo"><img src="/marketing/gustavo-onze-player.jpg" alt="Gustavo Aguiar"/></div><div><span className="page-eyebrow">ONZE PLAYER • PERFIL ESPORTIVO</span><h1>Gustavo Aguiar</h1><h2>G9</h2><div className="athlete-tags"><span>Atacante</span><span>Pivô</span><span>Sub-9</span><span>Brasil • Portugal</span></div></div></section>
    <section className="free-player-stats"><div><strong>62</strong><span>Jogos</span></div><div><strong>128</strong><span>Gols</span></div><div><strong>2</strong><span>Artilharias</span></div></section>
    <section className="free-player-content">
      <article className="card"><span className="page-eyebrow">PERFIL</span><h2>Dados esportivos</h2><div className="free-player-data"><p><small>Ano</small><b>2018</b></p><p><small>Modalidade</small><b>Campo + Futsal</b></p><p><small>Posição</small><b>Atacante / Pivô</b></p><p><small>Pé dominante</small><b>Direito</b></p><p><small>Clube atual</small><b>Botafogo</b></p></div></article>
      <article className="card"><span className="page-eyebrow">TRAJETÓRIA</span><h2>Histórico esportivo</h2><div className="free-history"><p>2026 — atual | Botafogo</p><p>2025 | Arouca Futsal</p></div></article>
      <article className="card free-video"><span className="page-eyebrow">EM CAMPO</span><h2>Vídeo</h2><div className="free-video-placeholder"><span>▶</span><strong>1 vídeo YouTube no plano Free</strong></div></article>
    </section>
  </main>;
}
