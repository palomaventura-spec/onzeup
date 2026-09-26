import "./globals.css";
import "./v143.css";
import "./onzeup-design-system.css";
import "./onzeup-module-pages.css";
import "./onzeup-performance-text-fix.css";
import "./onzeup-sidebar-fix.css";
import "./onzeup-mobile-hotfix.css";
import "./onzeup-mobile-atletas.css";

import type { Metadata, Viewport } from "next";

import PilotUX from "@/components/PilotUX";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  applicationName: "11UP",

  title: {
    default: "11UP",
    template: "%s | 11UP",
  },

  description:
    "Plataforma de gestão, desenvolvimento e performance esportiva.",

  manifest: "/manifest.webmanifest",

  icons: {
    icon: [
      {
        url: "/brand/11up/app/11up-icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        url: "/brand/11up/app/11up-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  },

  appleWebApp: {
    capable: true,
    title: "11UP",
    statusBarStyle: "black-translucent",
  },

  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",

  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#f5f7fa",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#07111c",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <PilotUX />
        <RegisterServiceWorker />
        <PwaInstallPrompt />
        {children}
      </body>
    </html>
  );
}