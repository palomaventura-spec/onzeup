import Link from "next/link";

import ModuleHero from "@/components/ModuleHero";
import ModulePanel from "@/components/ModulePanel";
import ModuleTabs from "@/components/ModuleTabs";

export default function PerformanceGpsPage() {
  return (
    <main className="performance-hub">
      <ModuleHero
        eyebrow="11UP PERFORMANCE Â· GPS"
        title="GPS"
        description={
          <p>
            Dados fÃ­sicos e mÃ©tricas de GPS serÃ£o integrados aqui em uma etapa prÃ³pria,
            sem interferir nos cÃ¡lculos de presenÃ§a e frequÃªncia.
          </p>
        }
      />

      <ModuleTabs
        className="performance-module-tabs"
        ariaLabel="NavegaÃ§Ã£o do Performance"
        items={[
          {
            label: "VisÃ£o geral",
            href: "/performance",
          },
          {
            label: "FrequÃªncia",
            href: "/performance/frequencia",
          },
          {
            label: "RelatÃ³rios",
            href: "/performance/relatorios",
          },
          {
            label: "Treinos",
            href: "/treinos",
          },
          {
            label: "GPS",
            href: "/performance/gps",
            active: true,
          },
        ]}
      />

      <ModulePanel
        eyebrow="PRÃ“XIMA ETAPA"
        title="MÃ³dulo GPS"
        description={
          <p>
            Esta Ã¡rea jÃ¡ estÃ¡ reservada para importaÃ§Ã£o, mÃ©tricas, evoluÃ§Ã£o e relatÃ³rios de GPS.
          </p>
        }
      >
        <div className="notice">
          O mÃ³dulo GPS serÃ¡ construÃ­do separadamente e conectado aos relatÃ³rios apenas quando houver dados do atleta.
        </div>
      </ModulePanel>

      <p style={{ marginTop: 16 }}>
        <Link href="/performance">â† Voltar para VisÃ£o geral</Link>
      </p>
    </main>
  );
}