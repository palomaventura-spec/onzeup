"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import styles from "./FeaturesShowcase.module.css";

type ProductKey = "club" | "player";
type ShowcaseFeature = {
  label: string;
  title: string;
  description: string;
  image: string;
  alt: string;
};

const showcase: Record<
  ProductKey,
  {
    name: string;
    eyebrow: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    features: ShowcaseFeature[];
  }
> = {
  club: {
    name: "11UP Club",
    eyebrow: "GESTÃO ESPORTIVA",
    description:
      "A operação do clube organizada em um único ambiente, do elenco à agenda.",
    ctaLabel: "Conhecer o 11UP Club",
    ctaHref: "https://club.onzeup.com.br",
    features: [
      {
        label: "Visão geral",
        title: "Visão geral do clube",
        description:
          "Indicadores, compromissos, próximos jogos e pontos de atenção em uma única visão.",
        image: "/showcase/club-visao-geral.webp",
        alt: "Arte do 11UP Club mostrando visão geral, indicadores e prioridades em um notebook",
      },
      {
        label: "Agenda",
        title: "Agenda do clube",
        description:
          "Treinos, jogos e compromissos organizados com filtros e visualizações práticas.",
        image: "/showcase/club-agenda.webp",
        alt: "Arte do 11UP Club com calendário, programação e próximos eventos",
      },
      {
        label: "Gestão de atletas",
        title: "Gestão de atletas",
        description:
          "Elenco, categorias, inscrições, vínculos e pendências documentais reunidos.",
        image: "/showcase/club-atletas.webp",
        alt: "Arte do 11UP Club com cadastro, status, elenco e documentação de atletas",
      },
    ],
  },
  player: {
    name: "11UP Player",
    eyebrow: "ATLETAS E FAMÍLIAS",
    description:
      "Informações esportivas, comunicação com o clube e identidade digital do atleta.",
    ctaLabel: "Conhecer o 11UP Player",
    ctaHref: "/player-product",
    features: [
      {
        label: "Comunicados",
        title: "Comunicados do clube",
        description:
          "Avisos oficiais e solicitações documentais acessíveis à família.",
        image: "/showcase/player-comunicados.webp",
        alt: "Arte do 11UP Player com Gustavo G9 e painel de comunicados do clube",
      },
      {
        label: "Agenda esportiva",
        title: "Minha agenda esportiva",
        description:
          "Acompanhe treinos, jogos, convocações e orientações do clube.",
        image: "/showcase/player-agenda.webp",
        alt: "Arte do 11UP Player com Gustavo G9 e agenda esportiva",
      },
      {
        label: "Dados do atleta",
        title: "Dados do atleta",
        description:
          "Documentos, vínculos e informações esportivas organizados para consulta.",
        image: "/showcase/player-dados.webp",
        alt: "Arte do 11UP Player com Gustavo G9 e painel de informações do atleta",
      },
      {
        label: "Página do atleta",
        title: "Página do atleta",
        description:
          "Perfil público, trajetória esportiva, vídeos, galeria e compartilhamento.",
        image: "/showcase/player-perfil.webp",
        alt: "Arte do 11UP Player com Gustavo G9 usando camisa alvinegra e página pública de atleta",
      },
    ],
  },
};

export default function FeaturesShowcase() {
  const [product, setProduct] = useState<ProductKey>("club");
  const [selected, setSelected] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const current = showcase[product];
  const feature = current.features[selected];

  function selectProduct(next: ProductKey) {
    if (next === product) return;
    setProduct(next);
    setSelected(0);
  }

  function moveFeature(delta: number) {
    setSelected((index) =>
      (index + delta + current.features.length) % current.features.length,
    );
  }

  return (
    <section
      id="funcionalidades"
      className={styles.section}
      aria-labelledby="showcase-heading"
    >
      <div className={styles.container}>
        <header className={styles.heading}>
          <span className={styles.kicker}>A PLATAFORMA NA PRÁTICA</span>
          <h2 id="showcase-heading">
            CONHEÇA O 11UP <em>POR DENTRO.</em>
          </h2>
          <p>
            Veja como as funcionalidades aproximam clubes, atletas e famílias.
            Explore as experiências Club e Player.
          </p>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Produto 11UP">
          {(["club", "player"] as const).map((key) => (
            <button
              key={key}
              id={`showcase-tab-${key}`}
              type="button"
              role="tab"
              aria-selected={product === key}
              aria-controls="showcase-product-panel"
              className={`${styles.tab} ${product === key ? styles.activeTab : ""} ${key === "club" ? styles.clubTab : styles.playerTab}`}
              onClick={() => selectProduct(key)}
            >
              <span className={styles.tabMark} aria-hidden="true" />
              {showcase[key].name}
            </button>
          ))}
        </div>

        <div
          id="showcase-product-panel"
          role="tabpanel"
          aria-labelledby={`showcase-tab-${product}`}
          className={`${styles.panel} ${product === "club" ? styles.club : styles.player}`}
        >
          <aside className={styles.sidebar}>
            <span className={styles.eyebrow}>{current.eyebrow}</span>
            <h3>{current.name}</h3>
            <p className={styles.summary}>{current.description}</p>

            <div className={styles.featureNav} aria-label="Funcionalidades disponíveis">
              {current.features.map((item, index) => (
                <button
                  key={item.label}
                  type="button"
                  aria-current={selected === index ? "true" : undefined}
                  className={`${styles.featureButton} ${selected === index ? styles.selectedFeature : ""}`}
                  onClick={() => setSelected(index)}
                >
                  <span className={styles.featureNumber}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item.label}</span>
                  <span className={styles.featureArrow} aria-hidden="true">→</span>
                </button>
              ))}
            </div>

            <a
              className={styles.productLink}
              href={current.ctaHref}
              {...(current.ctaHref.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {current.ctaLabel} <span aria-hidden="true">↗</span>
            </a>
          </aside>

          <div className={styles.preview}>
            <div className={styles.previewTop}>
              <span>PRÉVIA DAS FUNCIONALIDADES</span>
              <span>
                {String(selected + 1).padStart(2, "0")} / {String(current.features.length).padStart(2, "0")}
              </span>
            </div>

            <div
              className={styles.previewCanvas}
              onTouchStart={(event) => {
                const touch = event.touches[0];
                touchStart.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={(event) => {
                if (!touchStart.current) return;
                const touch = event.changedTouches[0];
                const deltaX = touch.clientX - touchStart.current.x;
                const deltaY = touch.clientY - touchStart.current.y;
                touchStart.current = null;
                if (Math.abs(deltaX) > 55 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
                  moveFeature(deltaX < 0 ? 1 : -1);
                }
              }}
            >
              <a
                className={styles.fullImageLink}
                href={feature.image}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir a imagem ampliada: ${feature.title}`}
                title="Abrir imagem ampliada"
              >
                <Image
                  key={feature.image}
                  src={feature.image}
                  alt={feature.alt}
                  width={1491}
                  height={1055}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 65vw, 850px"
                  className={styles.previewImage}
                />
              </a>
            </div>

            <div className={styles.previewBottom} aria-live="polite" aria-atomic="true">
              <div>
                <strong>{feature.title}</strong>
                <p>{feature.description}</p>
              </div>
              <div className={styles.arrows}>
                <button
                  type="button"
                  onClick={() => moveFeature(-1)}
                  aria-label="Funcionalidade anterior"
                  title="Anterior"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => moveFeature(1)}
                  aria-label="Próxima funcionalidade"
                  title="Próxima"
                >
                  →
                </button>
              </div>
            </div>
            <small className={styles.note}>
              Artes ilustrativas; nomes de clubes e dados demonstrativos na apresentação.
              No celular, deslize para navegar ou toque na imagem para ampliá-la.
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}
