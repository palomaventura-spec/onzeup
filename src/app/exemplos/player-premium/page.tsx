import Link from "next/link";
export default function PlayerPremiumExample() {
  return <main className="premium-player-example">
    <div className="example-banner"><span>EXEMPLO ONZE PLAYER PREMIUM</span><div><Link href="/exemplos/player-free">Comparar com Free →</Link><Link href="/cadastro">Criar ONZE Player</Link></div></div>
    <section className="premium-player-hero"><div className="premium-player-overlay"/><img src="/marketing/gustavo-onze-player.jpg" alt="Gustavo Aguiar"/><div className="premium-player-hero-content"><span>ONZE PLAYER PREMIUM</span><h1>GUSTAVO<br/>AGUIAR</h1><h2>G9</h2><p>Atacante • Pivô • Botafogo • 2018</p><a href="#momentos" className="btn">▶ Ver melhores momentos</a></div></section>
    <section className="premium-player-numbers"><article><strong>62</strong><span>Jogos oficiais</span></article><article><strong>128</strong><span>Gols oficiais</span></article><article><strong>2</strong><span>Artilharias</span></article><article><strong>2,05</strong><span>Gols por jogo</span></article></section>
    <section className="premium-player-section"><div>01 — PERFIL</div><div><h2>Identidade esportiva.</h2><p>Atacante e pivô com forte presença ofensiva, intensidade e participação em futebol de campo e futsal.</p></div></section>
    <section className="premium-player-section dark-section"><div>02 — CARREIRA</div><div><h2>Trajetória.</h2><div className="premium-career"><article><strong>2026 — atual | Botafogo</strong></article><article><strong>2025 | Arouca Futsal</strong></article></div></div></section>
    <section className="premium-player-section" id="momentos"><div>03 — MOMENTOS</div><div><h2>Em campo.</h2><div className="premium-video-grid"><article>▶ Melhores momentos 2026</article><article>▶ Supercopa — 4 gols</article><article>▶ Jogadas e finalizações</article></div></div></section>
    <section className="premium-final-cta"><h2>Mais que uma ficha.<br/>Um site esportivo.</h2><p>Premium — R$ 29,90/mês</p><Link className="btn" href="/cadastro">Criar meu ONZE Player</Link></section>
  </main>;
}
