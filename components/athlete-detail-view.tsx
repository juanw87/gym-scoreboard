"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AthleteDetailResponse } from "@/lib/types";

export function AthleteDetailView({ athleteId }: { athleteId: string }) {
  const [athlete, setAthlete] = useState<AthleteDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAthlete() {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<AthleteDetailResponse>(`/api/athletes/${athleteId}`);
        setAthlete(response);
      } catch (requestError) {
        const message =
          requestError instanceof Error ? requestError.message : "No se pudo cargar el atleta.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void loadAthlete();
  }, [athleteId]);

  if (loading) {
    return <main className="page-shell status-card">Cargando perfil del atleta...</main>;
  }

  if (error || !athlete) {
    return (
      <main className="page-shell status-card">
        <p>{error ?? "Atleta no encontrado."}</p>
        <Link className="ghost-button link-button" href="/">
          Volver al dashboard
        </Link>
      </main>
    );
  }

  return (
    <main className="page-shell athlete-page">
      <Link className="back-link" href="/">
        Volver al dashboard
      </Link>

      <section className="hero-panel athlete-hero">
        <div>
          <p className="eyebrow">Perfil del atleta</p>
          <h1>{athlete.athlete.name}</h1>
          <p className="hero-copy">
            Nivel {athlete.athlete.level}. Formato favorito: {athlete.athlete.favoriteFormat}.
          </p>
        </div>

        <div className="highlight-card">
          <span className="card-label">Resumen</span>
          <div className="metric-grid">
            <div>
              <span>Scores cargados</span>
              <strong>{athlete.summary.totalScores}</strong>
            </div>
            <div>
              <span>PRs detectados</span>
              <strong>{athlete.summary.personalRecords}</strong>
            </div>
            <div>
              <span>Ultimo ranking</span>
              <strong>{athlete.summary.latestRank ?? "-"}</strong>
            </div>
            <div>
              <span>Mejor score</span>
              <strong>{athlete.summary.bestScoreDisplay ?? "-"}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Insights</p>
              <h2>Lectura rapida del progreso</h2>
            </div>
          </div>

          <ul className="insight-list">
            {athlete.insights.map((insight) => (
              <li key={insight}>{insight}</li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Benchmarks</p>
              <h2>Ultimas marcas</h2>
            </div>
          </div>

          <div className="history-list">
            {athlete.history.map((entry) => (
              <div className="history-row" key={entry.scoreId}>
                <div>
                  <strong>{entry.workoutTitle}</strong>
                  <p>{entry.workoutDate}</p>
                </div>
                <div className="history-meta">
                  <span>Score: {entry.scoreDisplay}</span>
                  <span>Rank: #{entry.rank}</span>
                  <span>{entry.note || entry.workoutTypeLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
