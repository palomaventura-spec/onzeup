import "./globals.css";
import "./v143.css";
import "./onzeup-design-system.css";
import "./onzeup-module-pages.css";
import "./onzeup-performance-text-fix.css";
import "./onzeup-sidebar-fix.css";
import "./onzeup-mobile-hotfix.css";

import type { Metadata, Viewport } from "next";

import PilotUX from "@/components/PilotUX";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";
import RegisterServiceWorker from "@/components/RegisterServiceWorker";

export const metadata: Metadata = {
  applicationName: "ONZEUP",
  title: { default: "ONZEUP", template: "%s | ONZEUP" },
  description: "Gestão de clubes, treinadores e atletas do futebol de base.",
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }, { url: "/pwa-icon-512.png", sizes: "512x512", type: "image/png" }], apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }] },
  appleWebApp: { capable: true, title: "ONZEUP", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width", initialScale: 1, maximumScale: 5, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f7fa" }, { media: "(prefers-color-scheme: dark)", color: "#07111c" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><PilotUX /><RegisterServiceWorker /><PwaInstallPrompt />{children}</body></html>;
}
