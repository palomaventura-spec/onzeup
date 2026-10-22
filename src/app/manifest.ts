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
      { src: "/pwa-icon-maskable-512.png?v=11up2", sizes: "512x512", type: "image/png", purpose: "maskable" },
      {
        src: "/pwa-icon-192.png?v=11up2",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-512.png?v=11up2",
        sizes: "512x512",
        type: "image/png",
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
      { src: "/pwa-icon-maskable-512.png?v=11up2", sizes: "512x512", type: "image/png", purpose: "maskable" },
          {
            src: "/pwa-icon-192.png?v=11up2",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "11UP Player",
        short_name: "Player",
        description: "Acessar a área da família e do atleta",
        url: "/responsavel",
        icons: [
      { src: "/pwa-icon-maskable-512.png?v=11up2", sizes: "512x512", type: "image/png", purpose: "maskable" },
          {
            src: "/pwa-icon-192.png?v=11up2",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "11UP Coach",
        short_name: "Coach",
        description: "Acessar a área do treinador",
        url: "/coach/dashboard",
        icons: [
      { src: "/pwa-icon-maskable-512.png?v=11up2", sizes: "512x512", type: "image/png", purpose: "maskable" },
          {
            src: "/pwa-icon-192.png?v=11up2",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}