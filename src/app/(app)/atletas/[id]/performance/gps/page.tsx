import Link from "next/link";
import { notFound } from "next/navigation";

import SafeAvatar from "@/components/SafeAvatar";
import ModuleTabs from "@/components/ModuleTabs";

import { requireClubPermission } from "@/lib/club-access";
import { prisma } from "@/lib/prisma";

import { createManualGpsRecord } from "../actions";

function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function AthleteGpsPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireClubPermission("ATHLETES_VIEW");
  const { id } = await params;

  const athlete = await prisma.athlete.findFirst({
    where: {
      id,
      organizationId: user.organizationId,
    },
    include: {
      category: true,

      gpsRecords: {
        orderBy: {
          activityAt: "desc",
        },
        take: 30,
      },
    },
  });

  if (!athlete) notFound();

  const trainingRecords = athlete.gpsRecords.filter(
    (record) => record.context === "TRAINING",
  );

  const matchRecords = athlete.gpsRecords.filter(
    (record) => record.context === "MATCH",
  );

  const latestTraining = trainingRecords[0];
  const latestMatch = matchRecords[0];

  return (
    <main className="athlete-performance-page athlete-performance-v4">
      <section className="athlete-performance-hero">
        <div className="athlete-performance-hero-main">
          <div className="athlete-performance-hero-avatar">
            <SafeAvatar
              src={athlete.photoUrl}
              name={athlete.nickname || athlete.name}
              alt={athlete.name}
            />
          </div>

          <div className="athlete-performance-hero-copy">
            <span className="athlete-performance-hero-kicker">
              11UP PERFORMANCE · CLUB ELITE
            </span>

            <h1>{athlete.nickname || athlete.name}</h1>

            <p className="athlete-performance-hero-meta">
              <span>{athlete.name}</span>

              <span>
                {athlete.category?.name || "Sem categoria"}
              </span>

              <span>
                {athlete.position || "Posição não informada"}
              </span>
            </p>

            <p className="athlete-performance-hero-description">
              Carga física, intensidade e métricas individuais de GPS
              em treino e jogo.
            </p>
          </div>
        </div>

        <div className="athlete-performance-hero-actions">
          <a
            className="athlete-performance-hero-primary"
            href="#novo-gps"
          >
            + Lançar GPS
          </a>

          <Link
            className="athlete-performance-hero-secondary"
            href={`/atletas/${athlete.id}`}
          >
            Voltar ao atleta
          </Link>
        </div>
      </section>

      <ModuleTabs
        className="performance-module-tabs athlete-performance-tabs"
        ariaLabel="Navegação da performance do atleta"
        items={[
          {
            label: "Visão geral",
            href: `/atletas/${athlete.id}/performance`,
          },

          {
            label: "Treino",
            href: `/atletas/${athlete.id}/performance/treino`,
          },

          {
            label: "Jogo",
            href: `/atletas/${athlete.id}/performance/jogo`,
          },

          {
            label: "GPS",
            href: `/atletas/${athlete.id}/performance/gps`,
            active: true,
          },

          {
            label: "Avaliações",
            href: `/atletas/${athlete.id}/performance/avaliacoes`,
          },

          {
            label: "Relatórios",
            href: `/atletas/${athlete.id}/performance/relatorios`,
          },
        ]}
      />

      <section className="athlete-performance-v4-heading">
        <div>
          <span className="page-eyebrow">
            GPS
          </span>

          <h2>Carga física</h2>

          <p className="muted">
            Métricas separadas entre treino e jogo para acompanhamento
            individual da carga física do atleta.
          </p>
        </div>
      </section>

      <section className="athlete-performance-v4-secondary-grid">
        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">
            GPS DE TREINO
          </span>

          <h2>Treinos monitorados</h2>

          <p className="muted">
            Último registro de GPS realizado em treinamento.
          </p>

          <div className="athlete-performance-v4-detail-grid">
            <div>
              <small>DISTÂNCIA</small>

              <strong>
                {latestTraining?.distanceMeters
                  ? `${Number(
                      latestTraining.distanceMeters,
                    ).toFixed(0)} m`
                  : "—"}
              </strong>
            </div>

            <div>
              <small>VELOCIDADE MÁX.</small>

              <strong>
                {latestTraining?.maxSpeedKmh
                  ? `${Number(
                      latestTraining.maxSpeedKmh,
                    ).toFixed(1)} km/h`
                  : "—"}
              </strong>
            </div>

            <div>
              <small>SPRINTS</small>

              <strong>
                {latestTraining?.sprintCount ?? "—"}
              </strong>
            </div>

            <div>
              <small>CARGA</small>

              <strong>
                {latestTraining?.playerLoad
                  ? Number(
                      latestTraining.playerLoad,
                    ).toFixed(1)
                  : "—"}
              </strong>
            </div>
          </div>
        </article>

        <article className="card athlete-performance-v4-detail-card">
          <span className="page-eyebrow">
            GPS DE JOGO
          </span>

          <h2>Partidas monitoradas</h2>

          <p className="muted">
            Último registro de GPS realizado em partida.
          </p>

          <div className="athlete-performance-v4-detail-grid">
            <div>
              <small>DISTÂNCIA</small>

              <strong>
                {latestMatch?.distanceMeters
                  ? `${Number(
                      latestMatch.distanceMeters,
                    ).toFixed(0)} m`
                  : "—"}
              </strong>
            </div>

            <div>
              <small>VELOCIDADE MÁX.</small>

              <strong>
                {latestMatch?.maxSpeedKmh
                  ? `${Number(
                      latestMatch.maxSpeedKmh,
                    ).toFixed(1)} km/h`
                  : "—"}
              </strong>
            </div>

            <div>
              <small>SPRINTS</small>

              <strong>
                {latestMatch?.sprintCount ?? "—"}
              </strong>
            </div>

            <div>
              <small>CARGA</small>

              <strong>
                {latestMatch?.playerLoad
                  ? Number(
                      latestMatch.playerLoad,
                    ).toFixed(1)
                  : "—"}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <section
        id="novo-gps"
        className="card"
        style={{ marginTop: 24 }}
      >
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              NOVO REGISTRO
            </span>

            <h2>Lançar GPS manualmente</h2>

            <p className="muted">
              Registre os dados fornecidos pelo equipamento de GPS.
            </p>
          </div>
        </div>

        <form
          className="form"
          action={createManualGpsRecord}
          style={{ marginTop: 20 }}
        >
          <input
            type="hidden"
            name="athleteId"
            value={athlete.id}
          />

          <label>
            Tipo de atividade

            <select
              name="context"
              defaultValue="TRAINING"
              required
            >
              <option value="TRAINING">
                Treino
              </option>

              <option value="MATCH">
                Jogo
              </option>
            </select>
          </label>

          <label>
            Data

            <input
              name="activityAt"
              type="date"
              required
            />
          </label>

          <label>
            Duração

            <div style={{ position: "relative" }}>
              <input
                name="durationMinutes"
                type="number"
                min="0"
                placeholder="Ex.: 75"
              />
            </div>

            <span className="help">
              Minutos
            </span>
          </label>

          <label>
            Distância total

            <input
              name="distanceMeters"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 4250"
            />

            <span className="help">
              Metros
            </span>
          </label>

          <label>
            Velocidade máxima

            <input
              name="maxSpeedKmh"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 24.8"
            />

            <span className="help">
              km/h
            </span>
          </label>

          <label>
            Velocidade média

            <input
              name="averageSpeedKmh"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 8.5"
            />

            <span className="help">
              km/h
            </span>
          </label>

          <label>
            Sprints

            <input
              name="sprintCount"
              type="number"
              min="0"
              placeholder="Ex.: 12"
            />
          </label>

          <label>
            Distância em alta intensidade

            <input
              name="highIntensityDistanceMeters"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 580"
            />

            <span className="help">
              Metros
            </span>
          </label>

          <label>
            Acelerações

            <input
              name="accelerations"
              type="number"
              min="0"
              placeholder="Ex.: 22"
            />
          </label>

          <label>
            Desacelerações

            <input
              name="decelerations"
              type="number"
              min="0"
              placeholder="Ex.: 18"
            />
          </label>

          <label>
            Player Load / carga

            <input
              name="playerLoad"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ex.: 385"
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Observações

            <textarea
              name="notes"
              rows={4}
              placeholder="Observações do treino, jogo ou equipamento."
            />
          </label>

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btn"
              type="submit"
            >
              Salvar GPS
            </button>
          </div>
        </form>
      </section>

      <section
        className="card athlete-performance-v4-history"
        style={{ marginTop: 24 }}
      >
        <div className="section-title-row">
          <div>
            <span className="page-eyebrow">
              HISTÓRICO
            </span>

            <h2>Registros de GPS</h2>
          </div>

          <span className="badge">
            {athlete.gpsRecords.length} registro(s)
          </span>
        </div>

        {athlete.gpsRecords.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Duração</th>
                  <th>Distância</th>
                  <th>Vel. máx.</th>
                  <th>Sprints</th>
                  <th>Carga</th>
                </tr>
              </thead>

              <tbody>
                {athlete.gpsRecords.map((record) => (
                  <tr key={record.id}>
                    <td>
                      {formatDateTime(record.activityAt)}
                    </td>

                    <td>
                      <span className="badge">
                        {record.context === "TRAINING"
                          ? "Treino"
                          : "Jogo"}
                      </span>
                    </td>

                    <td>
                      {record.durationMinutes
                        ? `${record.durationMinutes} min`
                        : "—"}
                    </td>

                    <td>
                      {record.distanceMeters
                        ? `${Number(
                            record.distanceMeters,
                          ).toFixed(0)} m`
                        : "—"}
                    </td>

                    <td>
                      {record.maxSpeedKmh
                        ? `${Number(
                            record.maxSpeedKmh,
                          ).toFixed(1)} km/h`
                        : "—"}
                    </td>

                    <td>
                      {record.sprintCount ?? "—"}
                    </td>

                    <td>
                      {record.playerLoad
                        ? Number(
                            record.playerLoad,
                          ).toFixed(1)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            Nenhum registro individual de GPS foi lançado para este atleta.
          </p>
        )}
      </section>
    </main>
  );
}