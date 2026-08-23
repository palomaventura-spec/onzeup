import "./globals.css";
import "./v143.css";
import PilotUX from "@/components/PilotUX";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OnzeUp",
  description: "O futuro do futebol começa na base.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><PilotUX />{children}</body></html>;
}
