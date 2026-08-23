import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function PlayerLanding() {
  const gustavo = await prisma.playerProfile.findUnique({ where: { slug: "gustavo-aguiar" } });

  const model = {
    name: gustavo?.name || "Gustavo Aguiar",
    nickname: gustavo?.nickname || "G9",
    photoUrl: gustavo?.photoUrl || "/marketing/gustavo-onze-player.jpg",
    coverUrl: gustavo?.coverUrl || gustavo?.photoUrl || "/marketing/gustavo-onze-player.jpg",
    position: gustavo?.position || "Atacante",
    secondaryPosition: gustavo?.secondaryPosition || "Pivô",
    currentClub: gustavo?.currentClub || "Botafogo",
    matches: gustavo?.matches ?? 69,
    goals: gustavo?.goals ?? 135,
    titles: gustavo?.titles ?? 3,
  };

  return (
    <main className="product-landing player-product-landing">
      <header className="product-landing-nav">
        <Link href="/" className="player-brand">ONZE<span>UP</span> <b>PLAYER</b></Link>
        <nav><a href="#modelo">Modelo Premium</a><a href="#como-funciona">Como funciona</a><a href="#planos">Free x Premium</a><Link href="/players">Explorar atletas</Link><Link href="/login">Entrar</Link><Link className="btn" href="/cadastro">Criar perfil grátis</Link></nav>
      </header>

      <section className="product-landing-hero player-landing-with-model">
        <div>
          <span className="page-eyebrow">ONZEUP PLAYER</span>
          <h1>A trajetória do atleta merece ser vista.</h1>
          <p>Reúna perfil, números, trajetória, vídeos e conquistas em uma identidade esportiva profissional e compartilhável.</p>
          <div className="product-landing-actions"><Link className="btn" href="/cadastro">Criar ONZEUP Player grátis</Link><a className="players-secondary-cta" href="https://players.onzeup.com.br/gustavo-aguiar">Ver modelo Premium →</a></div>
          <small>Com clube ou sem clube. Comece grátis e evolua para Premium quando quiser.</small>
        </div>

        <a id="modelo" className="gustavo-official-showcase" href="https://players.onzeup.com.br/gustavo-aguiar">
          <div className="gustavo-showcase-photo"><img src={model.coverUrl} alt={model.name} /><div /><span>MODELO OFICIAL ONZEUP PLAYER PREMIUM</span></div>
          <div className="gustavo-showcase-body">
            <div><small>PERFIL MODELO</small><h2>{model.name}</h2><strong>{model.nickname}</strong><p>{[model.position, model.secondaryPosition, model.currentClub].filter(Boolean).join(" • ")}</p></div>
            <div className="gustavo-showcase-stats"><article><strong>{model.matches}</strong><small>Jogos</small></article><article><strong>{model.goals}</strong><small>Gols</small></article><article><strong>{model.titles}</strong><small>Conquistas</small></article></div>
            <span className="gustavo-showcase-link">Abrir perfil completo →</span>
          </div>
        </a>
      </section>

      <section className="player-model-proof">
        <div><span className="page-eyebrow">VEJA NA PRÁTICA</span><h2>O Premium não é uma ficha. É o site esportivo do atleta.</h2><p>O perfil do Gustavo é o nosso modelo oficial para mostrar como fotos, estatísticas, carreira e vídeos podem formar uma apresentação esportiva completa.</p></div>
        <div className="player-model-proof-actions"><a className="btn" href="https://players.onzeup.com.br/gustavo-aguiar">Abrir Gustavo G9 Premium ↗</a><a className="players-secondary-cta" href="https://players.onzeup.com.br/gustavo-aguiar-free">Comparar com Free ↗</a></div>
      </section>

      <section className="player-independence-section">
        <div className="player-independence-copy"><span className="page-eyebrow">O PERFIL É DO ATLETA</span><h2>O clube faz parte da trajetória.</h2><p>Não precisa estar vinculado a uma equipe para criar um ONZEUP Player. Atletas sem clube, de escolinhas, projetos, equipes independentes ou federados podem começar gratuitamente e manter o mesmo perfil ao longo da carreira.</p></div>
        <div className="player-independence-grid">
          <article><span>SEM CLUBE</span><h3>Comece de onde você está.</h3><p>Crie o perfil, organize vídeos, números e trajetória agora. Quando houver um novo clube, ele poderá ser acrescentado ao histórico do atleta.</p></article>
          <article><span>JÁ JOGA POR UM CLUBE ONZEUP?</span><h3>Use o mesmo e-mail do responsável.</h3><p>Se a equipe já cadastrou o atleta no ONZEUP Club, crie a conta do responsável com o mesmo e-mail informado ao clube. Assim o sistema pode localizar o cadastro.</p><small>O e-mail apenas encontra possíveis correspondências. A família solicita e o clube confirma o vínculo antes de ele ficar ativo.</small></article>
        </div>
        <Link className="btn" href="/cadastro">Criar ONZEUP Player grátis →</Link>
      </section>

      <section className="product-benefit-section" id="como-funciona">
        <span className="page-eyebrow">IDENTIDADE ESPORTIVA</span><h2>Mais organizado do que fotos e vídeos espalhados.</h2>
        <div className="product-benefit-grid"><article><b>01</b><h3>Perfil esportivo</h3><p>Dados relacionados exclusivamente à trajetória esportiva.</p></article><article><b>02</b><h3>Números e carreira</h3><p>Estatísticas, clubes, temporadas e conquistas.</p></article><article><b>03</b><h3>Vídeos</h3><p>Momentos em campo organizados em um único endereço.</p></article><article><b>04</b><h3>Compartilhe</h3><p>Um link profissional para bio, redes sociais e contatos.</p></article></div>
      </section>

      <section className="player-plan-landing" id="planos">
        <div><span className="page-eyebrow">ONZEUP PLAYER FREE</span><h2>Comece sem pagar.</h2><ul><li>Perfil público do atleta</li><li>Foto e dados esportivos</li><li>Estatísticas básicas</li><li>Trajetória</li><li>1 vídeo do YouTube</li><li>Presença no catálogo</li></ul><a className="players-secondary-cta" href="https://players.onzeup.com.br/gustavo-aguiar-free">Ver modelo Free →</a></div>
        <div className="premium"><span className="page-eyebrow">ONZEUP PLAYER PREMIUM</span><h2>Um site esportivo completo.</h2><ul><li>Visual Premium personalizado</li><li>Vários vídeos</li><li>Galeria e conquistas</li><li>Estatísticas completas</li><li>Trajetória mais detalhada</li><li>Links sociais e site externo</li></ul><strong>R$ 29,90/mês</strong><a className="btn" href="https://players.onzeup.com.br/gustavo-aguiar">Ver modelo Premium →</a></div>
      </section>

      <section className="onze-testimonials">
        <div><span className="page-eyebrow">QUEM JÁ TESTOU</span><h2>Uma presença profissional acessível.</h2></div>
        <div className="onze-testimonial-grid">
          <article className="onze-testimonial-card">
            <small>ONZEUP PLAYER</small>
            <blockquote>“Poder criar um perfil de atleta de forma profissional, sem precisar gastar muito e ainda ter liberdade para editar e atualizar minha trajetória, achei sensacional.”</blockquote>
            <strong>Gustavo G9</strong><span>Atleta • ONZEUP Player</span>
          </article>
        </div>
      </section>

      <section className="club-commercial-section dark" id="faq-player">
        <span className="marketing-kicker">PERGUNTAS FREQUENTES</span><h2>Antes de criar o Player.</h2>
        <div className="club-faq"><article><h3>O atleta precisa estar em um clube?</h3><p>Não. Qualquer atleta pode criar seu perfil, inclusive quem está sem clube no momento.</p></article><article><h3>Já estou cadastrado por um clube ONZEUP. O que faço?</h3><p>Crie a conta do responsável com o mesmo e-mail informado ao clube. Depois use “Buscar vínculos com clubes” e aguarde a confirmação da equipe.</p></article><article><h3>Posso ter mais de um clube?</h3><p>Sim. O mesmo Player pode ter vínculos com equipes e modalidades diferentes sem misturar os dados internos dos clubes.</p></article><article><h3>Se eu trocar de clube, perco o perfil?</h3><p>Não. O Player pertence ao atleta e acompanha sua trajetória.</p></article></div>
      </section>

      <section className="player-test-landing"><span className="page-eyebrow">COMECE AGORA</span><h2>Crie um Player e veja como funciona na prática.</h2><p>Comece no plano Free, publique o perfil e, se o atleta já estiver cadastrado por um clube ONZEUP, teste também a busca e solicitação de vínculo.</p><div className="product-landing-actions"><Link className="btn" href="/cadastro">Criar Player grátis</Link><Link className="players-secondary-cta" href="/login">Já tenho conta →</Link></div></section>
      <section className="product-directory-cta"><span className="page-eyebrow">ONZEUP PLAYERS</span><h2>Descubra atletas cadastrados.</h2><p>Explore perfis públicos por nome, clube, categoria e posição.</p><Link className="btn" href="/players">Explorar atletas →</Link></section>
    </main>
  );
}
