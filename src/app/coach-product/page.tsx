import Image from "next/image";
import Link from "next/link";

export default function CoachProductPage() {
  return (
    <main className="product-landing">
      <header className="product-landing-nav">
        <Link href="/" aria-label="11UP">
          <Image
            src="/brand/11up/logos/11up-logo-transparent-light.svg"
            alt="11UP"
            width={150}
            height={48}
            priority
          />
        </Link>

        <nav>
          <a href="#recursos">Recursos</a>
          <a href="#como-funciona">Como funciona</a>
          <Link href="/coaches">Explorar Coaches</Link>
          <Link href="/login?perfil=coach">Entrar</Link>
          <Link className="btn" href="/cadastro-coach">
            Criar Coach grátis
          </Link>
        </nav>
      </header>

      <section className="product-landing-hero">
        <div>
          <span className="page-eyebrow">
            11UP COACH
          </span>

          <h1>
            Sua trajetória profissional também merece
            uma identidade digital.
          </h1>

          <p>
            Crie seu perfil profissional, organize sua
            experiência, conecte-se a clubes e faça parte
            do ecossistema 11UP.
          </p>

          <div className="product-landing-actions">
            <Link className="btn" href="/cadastro-coach">
              Criar 11UP Coach grátis
            </Link>

            <Link
              className="players-secondary-cta"
              href="/coaches"
            >
              Explorar profissionais →
            </Link>
          </div>

          <small>
            Para treinadores, preparadores, analistas e
            profissionais do futebol.
          </small>
        </div>

        <div className="product-hero-card">
          <span className="page-eyebrow">
            PERFIL PROFISSIONAL
          </span>

          <h2>
            Um endereço para sua carreira.
          </h2>

          <p>
            Experiência, função, clubes, categorias,
            conexões e presença profissional reunidos
            em um único perfil.
          </p>
        </div>
      </section>

      <section
        className="product-benefit-section"
        id="recursos"
      >
        <span className="page-eyebrow">
          RECURSOS
        </span>

        <h2>
          Mais do que um perfil.
        </h2>

        <div className="product-benefit-grid">
          <article>
            <b>01</b>
            <h3>Perfil profissional</h3>
            <p>
              Apresente sua função, experiência,
              trajetória e atuação esportiva.
            </p>
          </article>

          <article>
            <b>02</b>
            <h3>Vínculos com clubes</h3>
            <p>
              Conecte seu perfil às organizações
              em que você atua.
            </p>
          </article>

          <article>
            <b>03</b>
            <h3>Atuação esportiva</h3>
            <p>
              Acompanhe categorias, equipes e
              atividades relacionadas ao seu trabalho.
            </p>
          </article>

          <article>
            <b>04</b>
            <h3>Rede 11UP</h3>
            <p>
              Faça parte de um ecossistema que conecta
              profissionais, atletas e clubes.
            </p>
          </article>
        </div>
      </section>

      <section
        className="player-independence-section"
        id="como-funciona"
      >
        <div className="player-independence-copy">
          <span className="page-eyebrow">
            COMO FUNCIONA
          </span>

          <h2>
            Crie seu perfil e evolua sua presença.
          </h2>

          <p>
            O Coach pode existir independentemente de um
            clube e, quando houver vínculo com uma
            organização 11UP, essa conexão passa a fazer
            parte da sua atuação dentro do ecossistema.
          </p>
        </div>

        <div className="player-independence-grid">
          <article>
            <span>PASSO 01</span>
            <h3>Crie seu perfil.</h3>
            <p>
              Cadastre suas informações profissionais
              e publique sua presença no 11UP.
            </p>
          </article>

          <article>
            <span>PASSO 02</span>
            <h3>Conecte-se a organizações.</h3>
            <p>
              Clubes podem vincular profissionais às
              categorias e equipes em que atuam.
            </p>
          </article>
        </div>

        <Link className="btn" href="/cadastro-coach">
          Criar Coach grátis →
        </Link>
      </section>
    </main>
  );
}
