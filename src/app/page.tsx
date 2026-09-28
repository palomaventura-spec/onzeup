import Image from "next/image";
import Link from "next/link";

const products = [
  {
    id: "player",
    number: "01",
    audience: "ATLETAS · FAMÍLIAS",
    name: "PLAYER",
    title: "A identidade esportiva do atleta.",
    description:
      "Perfil público, trajetória, vídeos, informações esportivas e presença digital para apresentar a evolução do atleta dentro e fora do 11UP.",
    features: [
      "Perfil esportivo público",
      "Vídeos e trajetória",
      "Currículo do atleta",
      "Compartilhamento por link",
    ],
    primaryLabel: "Conhecer 11UP Player",
    primaryHref: "/player-product",
    secondaryLabel: "Explorar Players",
    secondaryHref: "https://players.onzeup.com.br",
    className: "player",
  },
  {
    id: "coach",
    number: "02",
    audience: "TREINADORES · PROFISSIONAIS",
    name: "COACH",
    title: "Ferramentas para quem desenvolve atletas.",
    description:
      "Um ambiente profissional para treinadores criarem presença no ecossistema, gerenciarem vínculos e acompanharem sua atuação no futebol.",
    features: [
      "Perfil profissional",
      "Vínculos com clubes",
      "Atletas acompanhados",
      "Conexões profissionais",
    ],
    primaryLabel: "Conhecer 11UP Coach",
    primaryHref: "/coach-product",
    secondaryLabel: "Explorar Coaches",
    secondaryHref: "/coaches",
    className: "coach",
  },
  {
    id: "club",
    number: "03",
    audience: "CLUBES · ESCOLINHAS · CTs",
    name: "CLUB",
    title: "Gestão esportiva em uma única operação.",
    description:
      "Do cadastro do atleta à performance: gestão de equipes, treinos, jogos, comissão, presença, avaliações, GPS, documentos e operação do clube.",
    features: [
      "Gestão esportiva",
      "Performance e avaliações",
      "Frequência, jogos e GPS",
      "Financeiro e documentos",
    ],
    primaryLabel: "Conhecer 11UP Club",
    primaryHref: "https://club.onzeup.com.br",
    secondaryLabel: "Cadastrar organização",
    secondaryHref: "/cadastro-clube",
    className: "club",
  },
  {
    id: "organizacao",
    number: "04",
    audience: "LIGAS · TORNEIOS · ORGANIZADORES",
    name: "ORGANIZAÇÃO",
    title: "A operação completa de uma competição.",
    description:
      "Planeje e administre competições, categorias, equipes, atletas, documentação, credenciais, campos e toda a operação esportiva em um só ambiente.",
    features: [
      "Competições e categorias",
      "Equipes e inscrições",
      "Documentos e credenciais",
      "Jogos, súmulas e classificação",
    ],
    primaryLabel: "Conhecer 11UP Organização",
    primaryHref: "/organizacao-produto",
    secondaryLabel: "Entrar no 11UP",
    secondaryHref: "/login",
    className: "organization",
  },
] as const;

function OfficialBrand({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`ecosystem-brand ${className}`.trim()}
      aria-label="11UP"
    >
      <Image
        src="/brand/11up/logos/11up-logo-transparent-light.svg"
        alt="11UP Sports Management & Performance"
        width={300}
        height={95}
        priority={priority}
      />
    </Link>
  );
}

export default function Home() {
  return (
    <main className="ecosystem-home">
      <header className="ecosystem-nav">
        <OfficialBrand
          className="ecosystem-brand-header"
          priority
        />

        <nav aria-label="Navegação principal">
          <a href="#ecossistema">Ecossistema</a>
          <a href="#player">Player</a>
          <a href="#coach">Coach</a>
          <a href="#club">Club</a>
          <a href="#organizacao">Organização</a>
        </nav>

        <Link
          className="ecosystem-login"
          href="/login"
        >
          Entrar
        </Link>
      </header>

      <section className="ecosystem-hero">
        <div className="ecosystem-hero-glow" />

        <div className="ecosystem-hero-copy">
          <span className="ecosystem-kicker">
            11UP · FOOTBALL ECOSYSTEM
          </span>

          <h1>
            UM ECOSSISTEMA.
            <br />
            <em>TODO O FUTEBOL CONECTADO.</em>
          </h1>

          <p>
            Clubes, atletas, treinadores e organizadores de
            competições conectados em uma plataforma criada para
            organizar a jornada esportiva e transformar informação
            em desenvolvimento.
          </p>

          <div className="ecosystem-hero-actions">
            <a
              className="btn"
              href="#ecossistema"
            >
              Conhecer o ecossistema
            </a>

            <Link
              className="ecosystem-secondary-button"
              href="/login"
            >
              Entrar no 11UP
            </Link>
          </div>
        </div>

        <div
          className="ecosystem-orbit"
          aria-label="Produtos do ecossistema 11UP"
        >
          <div className="ecosystem-orbit-center">
            <Image
              src="/brand/11up/logos/11up-logo-transparent-light.svg"
              alt="11UP"
              width={190}
              height={60}
              priority
            />

            <small>ECOSYSTEM</small>
          </div>

          <a
            href="#player"
            className="ecosystem-orbit-node node-player"
          >
            <small>01</small>
            <strong>PLAYER</strong>
          </a>

          <a
            href="#coach"
            className="ecosystem-orbit-node node-coach"
          >
            <small>02</small>
            <strong>COACH</strong>
          </a>

          <a
            href="#club"
            className="ecosystem-orbit-node node-club"
          >
            <small>03</small>
            <strong>CLUB</strong>
          </a>

          <a
            href="#organizacao"
            className="ecosystem-orbit-node node-organization"
          >
            <small>04</small>
            <strong>ORGANIZAÇÃO</strong>
          </a>
        </div>
      </section>

      <section className="ecosystem-statement">
        <span>
          UMA MARCA · QUATRO SOLUÇÕES · UMA REDE
        </span>

        <p>
          O futebol acontece em diferentes ambientes.
          <strong>
            {" "}
            A informação não precisa ficar separada.
          </strong>
        </p>
      </section>

      <section
        id="ecossistema"
        className="ecosystem-products"
      >
        <div className="ecosystem-section-heading">
          <div>
            <span className="ecosystem-kicker">
              O ECOSSISTEMA
            </span>

            <h2>
              QUATRO EXPERIÊNCIAS.
              <br />
              <em>UMA MESMA PLATAFORMA.</em>
            </h2>
          </div>

          <p>
            Cada produto atende uma parte específica do futebol,
            mas todos foram pensados para fazer parte da mesma
            jornada.
          </p>
        </div>

        <div className="ecosystem-product-grid">
          {products.map((product) => (
            <article
              id={product.id}
              key={product.id}
              className={`ecosystem-product ${product.className}`}
            >
              <div className="ecosystem-product-top">
                <span>
                  {product.number}
                </span>

                <small>
                  {product.audience}
                </small>
              </div>

              <div className="ecosystem-product-name">
                <small>11UP</small>

                <h3>
                  {product.name}
                </h3>
              </div>

              <h4>
                {product.title}
              </h4>

              <p>
                {product.description}
              </p>

              <ul>
                {product.features.map(
                  (feature) => (
                    <li key={feature}>
                      {feature}
                    </li>
                  ),
                )}
              </ul>

              <div className="ecosystem-product-actions">
                {product.primaryHref.startsWith(
                  "http",
                ) ? (
                  <a
                    className="btn"
                    href={product.primaryHref}
                  >
                    {product.primaryLabel}
                  </a>
                ) : (
                  <Link
                    className="btn"
                    href={product.primaryHref}
                  >
                    {product.primaryLabel}
                  </Link>
                )}

                {product.secondaryHref.startsWith(
                  "http",
                ) ? (
                  <a
                    className="ecosystem-text-link"
                    href={product.secondaryHref}
                  >
                    {product.secondaryLabel} →
                  </a>
                ) : (
                  <Link
                    className="ecosystem-text-link"
                    href={product.secondaryHref}
                  >
                    {product.secondaryLabel} →
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="ecosystem-connected">
        <div className="ecosystem-connected-copy">
          <span className="ecosystem-kicker">
            CONECTADO POR NATUREZA
          </span>

          <h2>
            O DADO ACOMPANHA
            <br />
            <em>O FUTEBOL.</em>
          </h2>

          <p>
            O atleta pode fazer parte de um clube, ser acompanhado
            por profissionais, construir sua identidade esportiva e
            participar de competições sem transformar cada etapa em
            um universo isolado.
          </p>
        </div>

        <div className="ecosystem-flow">
          <article>
            <span>01</span>
            <small>CLUB</small>
            <strong>Organiza</strong>

            <p>
              Cadastro, treino, jogo, performance e evolução.
            </p>
          </article>

          <div className="ecosystem-flow-line">
            →
          </div>

          <article>
            <span>02</span>
            <small>COACH</small>
            <strong>Desenvolve</strong>

            <p>
              O profissional acompanha e participa da jornada.
            </p>
          </article>

          <div className="ecosystem-flow-line">
            →
          </div>

          <article>
            <span>03</span>
            <small>PLAYER</small>
            <strong>Constrói</strong>

            <p>
              A trajetória ganha identidade e presença digital.
            </p>
          </article>

          <div className="ecosystem-flow-line">
            →
          </div>

          <article>
            <span>04</span>
            <small>ORGANIZAÇÃO</small>
            <strong>Conecta</strong>

            <p>
              Competições recebem equipes, atletas e informação.
            </p>
          </article>
        </div>
      </section>

      <section className="ecosystem-intelligence">
        <div className="ecosystem-section-heading">
          <div>
            <span className="ecosystem-kicker">
              GESTÃO + PERFORMANCE + CONEXÃO
            </span>

            <h2>
              MAIS QUE SOFTWARE.
              <br />
              <em>
                INFRAESTRUTURA PARA O FUTEBOL.
              </em>
            </h2>
          </div>

          <p>
            Uma base digital preparada para acompanhar operação,
            desenvolvimento esportivo e relacionamento entre os
            diferentes participantes do ecossistema.
          </p>
        </div>

        <div className="ecosystem-capabilities">
          <article>
            <span>01</span>
            <h3>Gestão</h3>

            <p>
              Processos esportivos e administrativos organizados em
              um único ambiente.
            </p>
          </article>

          <article>
            <span>02</span>
            <h3>Performance</h3>

            <p>
              Dados de treino, jogo, presença, avaliações e evolução
              do atleta.
            </p>
          </article>

          <article>
            <span>03</span>
            <h3>Identidade</h3>

            <p>
              Perfis que transformam informações esportivas em
              trajetória organizada e compartilhável.
            </p>
          </article>

          <article>
            <span>04</span>
            <h3>Competições</h3>

            <p>
              Estrutura para inscrições, documentação, credenciais,
              operação e gestão esportiva.
            </p>
          </article>
        </div>
      </section>

      <section className="ecosystem-audiences">
        <span className="ecosystem-kicker">
          EXISTE UM 11UP PARA CADA PAPEL
        </span>

        <div className="ecosystem-audience-grid">
          <a href="#player">
            <span>
              ATLETA / FAMÍLIA
            </span>

            <strong>
              11UP PLAYER
            </strong>

            <small>
              Identidade e trajetória →
            </small>
          </a>

          <a href="#coach">
            <span>
              TREINADOR
            </span>

            <strong>
              11UP COACH
            </strong>

            <small>
              Desenvolvimento e conexão →
            </small>
          </a>

          <a href="#club">
            <span>
              CLUBE / ESCOLINHA
            </span>

            <strong>
              11UP CLUB
            </strong>

            <small>
              Gestão e performance →
            </small>
          </a>

          <a href="#organizacao">
            <span>
              LIGA / TORNEIO
            </span>

            <strong>
              11UP ORGANIZAÇÃO
            </strong>

            <small>
              Gestão de competições →
            </small>
          </a>
        </div>
      </section>

      <section className="ecosystem-login-section">
        <div>
          <span className="ecosystem-kicker">
            JÁ FAZ PARTE?
          </span>

          <h2>
            SUA CONTA.
            <br />
            <em>SEU ESPAÇO NO 11UP.</em>
          </h2>

          <p>
            Acesse o ambiente correspondente à sua atuação dentro
            do ecossistema.
          </p>
        </div>

        <div className="ecosystem-role-grid">
          <Link href="/login?perfil=player">
            <small>
              ATLETAS E FAMÍLIAS
            </small>

            <strong>
              PLAYER
            </strong>

            <span>
              Entrar →
            </span>
          </Link>

          <Link href="/login?perfil=coach">
            <small>
              PROFISSIONAIS
            </small>

            <strong>
              COACH
            </strong>

            <span>
              Entrar →
            </span>
          </Link>

          <Link href="/login?perfil=club">
            <small>
              CLUBES E CTs
            </small>

            <strong>
              CLUB
            </strong>

            <span>
              Entrar →
            </span>
          </Link>

          <Link href="/login">
            <small>
              ORGANIZADORES
            </small>

            <strong>
              ORGANIZAÇÃO
            </strong>

            <span>
              Entrar →
            </span>
          </Link>
        </div>
      </section>

      <section className="ecosystem-final-cta">
        <span>
          11UP ECOSYSTEM
        </span>

        <h2>
          O FUTEBOL ACONTECE
          <br />
          EM MUITOS LUGARES.
          <br />
          <em>
            OS DADOS PODEM ESTAR EM UM SÓ.
          </em>
        </h2>

        <div>
          <a
            className="ecosystem-dark-button"
            href="#ecossistema"
          >
            Explorar o ecossistema
          </a>

          <Link
            className="ecosystem-outline-dark"
            href="/login"
          >
            Acessar 11UP
          </Link>
        </div>
      </section>

      <footer className="ecosystem-footer">
        <div>
          <OfficialBrand className="ecosystem-brand-footer" />

          <p>
            Gestão, desenvolvimento, identidade e competições.
          </p>
        </div>

        <nav>
          <a href="#player">
            Player
          </a>

          <a href="#coach">
            Coach
          </a>

          <a href="#club">
            Club
          </a>

          <a href="#organizacao">
            Organização
          </a>
        </nav>

        <small>
          11UP · Sports Management & Performance
        </small>
      </footer>
    </main>
  );
}