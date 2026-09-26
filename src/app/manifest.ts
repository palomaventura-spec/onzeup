import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",

    name: "11UP",
    short_name: "11UP",

    description:
      "Plataforma de gestão, desenvolvimento e performance esportiva.",

    start_url: "/login",
    scope: "/",

    display: "standalone",
    orientation: "any",

    background_color: "#07111c",
    theme_color: "#07111c",

    categories: ["sports", "productivity", "education"],

    lang: "pt-BR",

    icons: [
      {
        src: "/brand/11up/app/11up-icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/brand/11up/app/11up-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],

    shortcuts: [
      {
        name: "11UP Club",
        short_name: "Club",
        description: "Acessar a gestão do clube",
        url: "/dashboard",
        icons: [
          {
            src: "/brand/11up/app/11up-icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
        ],
      },
      {
        name: "11UP Player",
        short_name: "Player",
        description: "Acessar a área da família e do atleta",
        url: "/responsavel",
        icons: [
          {
            src: "/brand/11up/app/11up-icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
        ],
      },
      {
        name: "11UP Coach",
        short_name: "Coach",
        description: "Acessar a área do treinador",
        url: "/coach/dashboard",
        icons: [
          {
            src: "/brand/11up/app/11up-icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
        ],
      },
    ],
  };
}