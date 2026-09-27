"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildAuthHeaders, type AuthSession } from "@/lib/auth";
import type { DashboardResponse, ScoreInput, SubmitWorkoutScorePayload } from "@/lib/types";

const initialScoreForm: ScoreInput = {
  athleteId: "",
  scoreDisplay: "",
  scoreValue: "",
  note: ""
};

export function ScoreSubmitView({ currentUser }: { currentUser: AuthSession }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreMessage, setScoreMessage] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreForm, setScoreForm] = useState<ScoreInput>(initialScoreForm);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<DashboardResponse>("/api/dashboard");
      setDashboard(response);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar la pantalla."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleSubmitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dashboard?.featuredWorkout) {
      setScoreError("Primero debes crear un WOD vigente.");
      return;
    }

    setSubmittingScore(true);
    setScoreMessage(null);
    setScoreError(null);

    const payload: SubmitWorkoutScorePayload = {
      scoreDisplay: scoreForm.scoreDisplay,
      scoreValue: Number(scoreForm.scoreValue),
      note: scoreForm.note
    };

    try {
      await apiFetch(`/api/workouts/${dashboard.featuredWorkout.id}/scores`, {
        method: "POST",
        headers: buildAuthHeaders(currentUser),
        body: JSON.stringify(payload)
      });

      setScoreForm(initialScoreForm);
      setScoreMessage("Tu score fue cargado para el WOD del dia.");
      await loadDashboard();
    } catch (requestError) {
      setScoreError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar el score."
      );
    } finally {
      setSubmittingScore(false);
    }
  }

  if (loading) {
    return <main className="page-shell status-card">Cargando pantalla de score...</main>;
  }

  if (error) {
    return (
      <main className="page-shell status-card">
        <p>{error}</p>
        <button className="ghost-button" onClick={() => void loadDashboard()} type="button">
          Reintentar
        </button>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <Link className="back-link" href="/dashboard">
        Volver al dashboard
      </Link>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Score</p>
          <h1>Sube tu resultado desde una pantalla dedicada.</h1>
          <p className="hero-copy">
            Consulta el WOD vigente, revisa el contexto del dia y registra tu marca sin mezclarlo
            con la carga del entrenamiento.
          </p>
        </div>

        <div className="highlight-card">
          <span className="card-label">Administracion</span>
          <h2>Necesitas ajustar el WOD antes del score.</h2>
          <p>Si la rutina todavia no esta lista, vuelve a la pantalla de publicacion del WOD.</p>
          <Link className="ghost-button link-button" href="/workouts/new">
            Ir a cargar WOD
          </Link>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Carga personal</p>
              <h2>Subir mi score</h2>
            </div>
            <Link className="ghost-button link-button" href="/workouts/new">
              Ver pantalla de WOD
            </Link>
          </div>

          {dashboard?.featuredWorkout ? (
            <form className="workout-form" onSubmit={(event) => void handleSubmitScore(event)}>
              <div className="metric-grid">
                <div>
                  <span>WOD vigente</span>
                  <strong>{dashboard.featuredWorkout.title}</strong>
                </div>
                <div>
                  <span>Fecha</span>
                  <strong>{dashboard.featuredWorkout.workoutDate}</strong>
                </div>
                <div>
                  <span>Formato</span>
                  <strong>{dashboard.featuredWorkout.workoutTypeLabel}</strong>
                </div>
                <div>
                  <span>Scores actuales</span>
                  <strong>{dashboard.featuredWorkout.scoreCount}</strong>
                </div>
              </div>

              <label>
                <span>Score visible</span>
                <input
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      scoreDisplay: event.target.value
                    }))
                  }
                  placeholder="14:28 o 212 reps"
                  value={scoreForm.scoreDisplay}
                />
              </label>

              <div className="field-grid">
                <label>
                  <span>Score numerico</span>
                  <input
                    min="0"
                    onChange={(event) =>
                      setScoreForm((current) => ({
                        ...current,
                        scoreValue: event.target.value
                      }))
                    }
                    placeholder="868"
                    required
                    type="number"
                    value={scoreForm.scoreValue}
                  />
                </label>

                <label>
                  <span>Nota</span>
                  <input
                    onChange={(event) =>
                      setScoreForm((current) => ({
                        ...current,
                        note: event.target.value
                      }))
                    }
                    placeholder="Escalado o sensaciones"
                    value={scoreForm.note}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button className="primary-button" disabled={submittingScore} type="submit">
                  {submittingScore ? "Guardando..." : "Subir score"}
                </button>
                {scoreMessage ? <span className="success-message">{scoreMessage}</span> : null}
                {scoreError ? <span className="error-message">{scoreError}</span> : null}
              </div>
            </form>
          ) : (
            <div className="highlight-card">
              <span className="card-label">WOD vigente</span>
              <strong>No hay WOD vigente</strong>
              <p>Publica primero el WOD del dia para que cada atleta pueda cargar su score.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
