import Image from "next/image";
import Link from "next/link";

export default function OrganizationProductPage() {
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
          <a href="#recursos">Funcionalidades</a>
          <a href="#fluxo">Operação</a>
          <Link href="/login">Entrar</Link>
        </nav>
      </header>

      <section className="product-landing-hero">
        <div>
          <span className="page-eyebrow">
            11UP ORGANIZAÇÃO
          </span>

          <h1>
            Competições organizadas do cadastro ao jogo.
          </h1>

          <p>
            Uma operação digital para ligas, torneios e
            organizadores gerenciarem competições,
            categorias, equipes, atletas, documentação,
            credenciais e jogos em um só ambiente.
          </p>

          <div className="product-landing-actions">
            <Link className="btn" href="/login">
              Entrar no 11UP Organização
            </Link>

            <a
              className="players-secondary-cta"
              href="#recursos"
            >
              Conhecer funcionalidades →
            </a>
          </div>
        </div>

        <div className="product-hero-card">
          <span className="page-eyebrow">
            GESTÃO DE COMPETIÇÕES
          </span>

          <h2>
            Da inscrição à competição.
          </h2>

          <p>
            Estruture participantes, documentos,
            credenciais e operação esportiva com os
            dados centralizados.
          </p>
        </div>
      </section>

      <section
        className="product-benefit-section"
        id="recursos"
      >
        <span className="page-eyebrow">
          FUNCIONALIDADES
        </span>

        <h2>
          A estrutura da competição em um único sistema.
        </h2>

        <div className="product-benefit-grid">
          <article>
            <b>01</b>
            <h3>Competições e categorias</h3>
            <p>
              Configure torneios, divisões, categorias,
              limites e regras operacionais.
            </p>
          </article>

          <article>
            <b>02</b>
            <h3>Equipes e atletas</h3>
            <p>
              Controle inscrições, elencos, responsáveis
              e participantes da competição.
            </p>
          </article>

          <article>
            <b>03</b>
            <h3>Documentação</h3>
            <p>
              Organize documentos obrigatórios,
              conferências e regularização dos atletas.
            </p>
          </article>

          <article>
            <b>04</b>
            <h3>Credenciais</h3>
            <p>
              Prepare identificação e credenciamento
              oficial dos participantes.
            </p>
          </article>

          <article>
            <b>05</b>
            <h3>Jogos e súmulas</h3>
            <p>
              Centralize partidas, informações de jogo
              e registros da competição.
            </p>
          </article>

          <article>
            <b>06</b>
            <h3>Classificação</h3>
            <p>
              Estrutura preparada para resultados,
              tabelas e acompanhamento esportivo.
            </p>
          </article>
        </div>
      </section>

      <section
        className="player-independence-section"
        id="fluxo"
      >
        <div className="player-independence-copy">
          <span className="page-eyebrow">
            OPERAÇÃO CONECTADA
          </span>

          <h2>
            Uma base para toda a competição.
          </h2>

          <p>
            Os mesmos dados cadastrados na gestão poderão
            alimentar as diferentes etapas da competição,
            reduzindo retrabalho e centralizando a operação.
          </p>
        </div>

        <div className="player-independence-grid">
          <article>
            <span>GESTÃO INTERNA</span>
            <h3>Organize a competição.</h3>
            <p>
              Categorias, equipes, atletas, documentos,
              campos, jogos e credenciamento.
            </p>
          </article>

          <article>
            <span>EXPERIÊNCIA PÚBLICA</span>
            <h3>Compartilhe a competição.</h3>
            <p>
              Estrutura preparada para sites públicos com
              jogos, classificação, equipes, regulamento,
              documentos e patrocinadores.
            </p>
          </article>
        </div>

        <Link className="btn" href="/login">
          Entrar no 11UP Organização →
        </Link>
      </section>
    </main>
  );
}
