import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ONZEUP",
    short_name: "ONZEUP",
    description:
      "Gestão de clubes, treinadores e atletas do futebol de base.",
    start_url: "/login",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070b10",
    theme_color: "#9ddb16",
    categories: [
      "sports",
      "productivity",
      "education",
    ],
    lang: "pt-BR",
    icons: [
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "ONZEUP Club",
        short_name: "Club",
        description: "Acessar a gestão do clube",
        url: "/dashboard",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "ONZEUP Player",
        short_name: "Player",
        description: "Acessar a área da família",
        url: "/responsavel",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "ONZEUP Coach",
        short_name: "Coach",
        description: "Acessar a área do treinador",
        url: "/coach/dashboard",
        icons: [
          {
            src: "/pwa-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}