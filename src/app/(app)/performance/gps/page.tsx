import Link from "next/link";

import ModuleHero from "@/components/ModuleHero";
import ModulePanel from "@/components/ModulePanel";
import ModuleTabs from "@/components/ModuleTabs";

export default function PerformanceGpsPage() {
  return (
    <main className="performance-hub performance-gps-page">
      <ModuleHero
        eyebrow="11UP PERFORMANCE · GPS"
        title="GPS e carga física"
        description={
          <p>
            Central para dados físicos de treinos e jogos. O GPS será integrado ao
            histórico do atleta e aos relatórios somente quando houver dados reais,
            sem alterar os cálculos de presença, frequência ou minutagem.
          </p>
        }
        aside={
          <>
            <small>STATUS</small>
            <strong>Preparado</strong>
            <span>Estrutura pronta para Treino + Jogo</span>
          </>
        }
      />

      <ModuleTabs
        className="performance-module-tabs"
        ariaLabel="Navegação do Performance"
        items={[
          {
            label: "Visão geral",
            href: "/performance",
          },
          {
            label: "Frequência",
            href: "/performance/frequencia",
          },
          {
            label: "Relatórios",
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

      <section className="performance-gps-mode-grid">
        <article className="performance-gps-mode-card">
          <span className="performance-gps-mode-kicker">TREINO</span>
          <h2>GPS de treino</h2>
          <p>
            Registro físico vinculado à sessão de treino, categoria e atleta.
          </p>

          <div className="performance-gps-mode-list">
            <span>Minutos monitorados</span>
            <span>Distância total</span>
            <span>Velocidade máxima</span>
            <span>Sprints</span>
            <span>Alta intensidade</span>
            <span>Acelerações e desacelerações</span>
          </div>

          <small>
            Os dados de GPS poderão ser comparados com a minutagem registrada na
            chamada do treino.
          </small>
        </article>

        <article className="performance-gps-mode-card performance-gps-mode-card-dark">
          <span className="performance-gps-mode-kicker">JOGO</span>
          <h2>GPS de jogo</h2>
          <p>
            Registro físico vinculado à partida, atleta, posição e minutagem de jogo.
          </p>

          <div className="performance-gps-mode-list">
            <span>Minutos monitorados</span>
            <span>Distância total</span>
            <span>Velocidade máxima</span>
            <span>Sprints</span>
            <span>Alta intensidade</span>
            <span>Carga da partida</span>
          </div>

          <small>
            Treino e jogo permanecerão separados para evitar médias incompatíveis.
          </small>
        </article>
      </section>

      <ModulePanel
        eyebrow="INTEGRAÇÃO"
        title="Como o GPS entrará no 11UP"
        description={
          <p>
            O GPS será um bloco independente dentro do Performance e poderá alimentar
            o relatório mensal apenas quando houver dados daquele atleta no período.
          </p>
        }
      >
        <div className="performance-gps-flow">
          <article>
            <span>01</span>
            <div>
              <strong>Registrar ou importar</strong>
              <p>
                O clube informa os dados da sessão de treino ou da partida.
              </p>
            </div>
          </article>

          <article>
            <span>02</span>
            <div>
              <strong>Vincular ao atleta</strong>
              <p>
                Cada registro fica relacionado ao atleta, categoria e contexto
                esportivo correto.
              </p>
            </div>
          </article>

          <article>
            <span>03</span>
            <div>
              <strong>Acompanhar evolução</strong>
              <p>
                O histórico permitirá comparar treino, jogo e evolução por período.
              </p>
            </div>
          </article>

          <article>
            <span>04</span>
            <div>
              <strong>Levar ao relatório</strong>
              <p>
                O bloco de GPS entra no relatório mensal somente quando existir dado
                real no snapshot.
              </p>
            </div>
          </article>
        </div>
      </ModulePanel>

      <ModulePanel
        eyebrow="RELATÓRIO MENSAL"
        title="GPS opcional, sem penalizar o atleta"
        description={
          <p>
            Ausência de GPS não reduz frequência, minutagem ou avaliação. Cada bloco
            mantém sua própria natureza e aparece no relatório apenas quando houver
            informação válida.
          </p>
        }
      >
        <div className="performance-gps-report-preview">
          <div>
            <small>PRESENÇA E MINUTAGEM</small>
            <strong>Base obrigatória</strong>
            <span>Calculada a partir das chamadas registradas.</span>
          </div>

          <div>
            <small>GPS</small>
            <strong>Bloco opcional</strong>
            <span>Treino e jogo aparecem separadamente.</span>
          </div>

          <div>
            <small>AVALIAÇÃO</small>
            <strong>Bloco opcional</strong>
            <span>Entra somente quando houver avaliação válida no período.</span>
          </div>
        </div>
      </ModulePanel>

      <p className="performance-gps-back">
        <Link href="/performance">← Voltar para Visão geral</Link>
      </p>
    </main>
  );
}
