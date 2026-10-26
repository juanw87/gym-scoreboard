"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildAuthHeaders, type AuthSession } from "@/lib/auth";
import type {
  ScoreInput,
  SubscribedWorkout,
  SubscribedWorkoutsResponse,
  SubmitWorkoutScorePayload,
  WorkoutsResponse
} from "@/lib/types";

const initialScoreForm: ScoreInput = {
  athleteId: "",
  scoreDisplay: "",
  scoreValue: "",
  note: ""
};

export function ScoreSubmitView({ currentUser }: { currentUser: AuthSession }) {
  const [availableWorkouts, setAvailableWorkouts] = useState<SubscribedWorkout[]>([]);
  const [subscribedWorkouts, setSubscribedWorkouts] = useState<SubscribedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyWorkoutId, setBusyWorkoutId] = useState<number | null>(null);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<number | null>(null);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreMessage, setScoreMessage] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreForm, setScoreForm] = useState<ScoreInput>(initialScoreForm);

  const loadData = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const [workoutsResponse, subscribedResponse] = await Promise.all([
          apiFetch<WorkoutsResponse>("/api/workouts", { method: "GET" }),
          apiFetch<SubscribedWorkoutsResponse>("/api/workouts/subscribed", {
            method: "GET",
            headers: buildAuthHeaders(currentUser)
          })
        ]);

        setAvailableWorkouts(workoutsResponse.workouts);
        setSubscribedWorkouts(subscribedResponse.subscribedWorkouts);
        setSelectedWorkoutId((current) => {
          if (
            current !== null &&
            subscribedResponse.subscribedWorkouts.some((workout) => workout.id === current)
          ) {
            return current;
          }

          return subscribedResponse.subscribedWorkouts[0]?.id ?? null;
        });
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "No se pudo cargar la pantalla."
        );
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [currentUser]
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const subscribedIds = new Set(subscribedWorkouts.map((workout) => workout.id));
  const selectedWorkout =
    subscribedWorkouts.find((workout) => workout.id === selectedWorkoutId) ?? null;

  async function handleSubscribe(workoutId: number) {
    setBusyWorkoutId(workoutId);
    setScoreMessage(null);
    setScoreError(null);

    try {
      await apiFetch(`/api/workouts/${workoutId}/subscribe`, {
        method: "POST",
        headers: buildAuthHeaders(currentUser)
      });
      await loadData({ silent: true });
      setSelectedWorkoutId(workoutId);
      setScoreMessage("Te suscribiste al WOD. Ya podés cargar tu resultado.");
    } catch (requestError) {
      setScoreError(
        requestError instanceof Error ? requestError.message : "No se pudo suscribir al WOD."
      );
    } finally {
      setBusyWorkoutId(null);
    }
  }

  async function handleUnsubscribe(workoutId: number) {
    setBusyWorkoutId(workoutId);
    setScoreMessage(null);
    setScoreError(null);

    try {
      await apiFetch(`/api/workouts/${workoutId}/subscribe`, {
        method: "DELETE",
        headers: buildAuthHeaders(currentUser)
      });
      await loadData({ silent: true });
      setScoreForm(initialScoreForm);
      setScoreMessage("Te diste de baja del WOD. Ya no vas a poder cargar resultados para este WOD.");
    } catch (requestError) {
      setScoreError(
        requestError instanceof Error ? requestError.message : "No se pudo dar de baja del WOD."
      );
    } finally {
      setBusyWorkoutId(null);
    }
  }

  async function handleSubmitScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedWorkout) {
      setScoreError("Seleccioná un WOD al que estés suscrito antes de cargar el score.");
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
      await apiFetch(`/api/workouts/${selectedWorkout.id}/scores`, {
        method: "POST",
        headers: buildAuthHeaders(currentUser),
        body: JSON.stringify(payload)
      });

      setScoreForm(initialScoreForm);
      setScoreMessage(`Tu score fue cargado para "${selectedWorkout.title}".`);
      await loadData({ silent: true });
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
        <button className="ghost-button" onClick={() => void loadData()} type="button">
          Reintentar
        </button>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <Link className="back-link" href="/dashboard">
        Volver al inicio
      </Link>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Score</p>
          <h1>Registrá tu score, dejá tu marca.</h1>
          <p className="hero-copy">
            Suscribite a los WODs que vas a hacer, registrá tu resultado y construí tu historial de
            rendimiento entrenamiento tras entrenamiento.
          </p>
        </div>

        <div className="highlight-card">
          <span className="card-label">Administracion</span>
          <h2>¿El wod todabía no está listo?</h2>
          <p>
            Volvé a la carga del WOD para revisar los bloques y ejercicios antes de registrar
            resultados.
          </p>
          <Link className="ghost-button link-button" href="/workouts/new">
            Volver a editar WOD
          </Link>
        </div>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Suscripciones</p>
              <h2>WODs disponibles</h2>
            </div>
            <span className="panel-caption">Suscribite para poder cargar tu resultado</span>
          </div>

          {availableWorkouts.length > 0 ? (
            <div className="history-list">
              {availableWorkouts.map((workout) => {
                const isSubscribed = subscribedIds.has(workout.id);
                const isBusy = busyWorkoutId === workout.id;

                return (
                  <div className="history-row" key={workout.id}>
                    <div>
                      <strong>{workout.title}</strong>
                      <p>{workout.description}</p>
                    </div>
                    <div className="history-meta">
                      <span>{workout.workoutDate}</span>
                      <span>{workout.workoutTypeLabel}</span>
                      <span>{workout.scoreCount} scores</span>
                      {isSubscribed ? (
                        <>
                          <span className="success-message">Suscrito</span>
                          <button
                            className="ghost-button"
                            disabled={isBusy}
                            onClick={() => void handleUnsubscribe(workout.id)}
                            type="button"
                          >
                            {isBusy ? "Procesando..." : "Darme de baja"}
                          </button>
                        </>
                      ) : (
                        <button
                          className="primary-button compact"
                          disabled={isBusy}
                          onClick={() => void handleSubscribe(workout.id)}
                          type="button"
                        >
                          {isBusy ? "Procesando..." : "Suscribirme"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="highlight-card">
              <span className="card-label">WODs</span>
              <strong>No hay WODs disponibles</strong>
              <p>Publicá primero un WOD para que los atletas puedan suscribirse.</p>
            </div>
          )}

          {scoreError && availableWorkouts.length > 0 ? (
            <span className="error-message">{scoreError}</span>
          ) : null}
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Resultado</p>
              <h2>Registrá tu marca.</h2>
            </div>
          </div>

          {subscribedWorkouts.length > 0 ? (
            <form className="workout-form" onSubmit={(event) => void handleSubmitScore(event)}>
              <label>
                <span>WOD suscrito</span>
                <select
                  onChange={(event) =>
                    setSelectedWorkoutId(event.target.value ? Number(event.target.value) : null)
                  }
                  value={selectedWorkoutId ?? ""}
                >
                  <option value="">-- Seleccionar WOD --</option>
                  {subscribedWorkouts.map((workout) => (
                    <option key={workout.id} value={workout.id}>
                      {workout.title} - {workout.workoutDate}
                    </option>
                  ))}
                </select>
              </label>

              {selectedWorkout ? (
                <div className="metric-grid">
                  <div>
                    <span>Entrenamiento</span>
                    <strong>{selectedWorkout.title}</strong>
                  </div>
                  <div>
                    <span>Fecha del Wod</span>
                    <strong>{selectedWorkout.workoutDate}</strong>
                  </div>
                  <div>
                    <span>Tipo de Wod</span>
                    <strong>{selectedWorkout.workoutTypeLabel}</strong>
                  </div>
                  <div>
                    <span>Resultados registrados</span>
                    <strong>{selectedWorkout.scoreCount}</strong>
                  </div>
                </div>
              ) : null}

              <label>
                <span>Score</span>
                <input
                  onChange={(event) =>
                    setScoreForm((current) => ({
                      ...current,
                      scoreDisplay: event.target.value
                    }))
                  }
                  placeholder="Tu resultado tal como lo registraste en el entrenamiento."
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
                    placeholder="Número total de repeticiones o tiempo en que terminaste, cuando corresponda."
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
                    placeholder="Ej. RX, escalado, sensaciones..."
                    value={scoreForm.note}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button
                  className="primary-button"
                  disabled={submittingScore || !selectedWorkout}
                  type="submit"
                >
                  {submittingScore ? "Guardando..." : "Registrar score"}
                </button>
                {scoreMessage ? <span className="success-message">{scoreMessage}</span> : null}
                {scoreError ? <span className="error-message">{scoreError}</span> : null}
              </div>
            </form>
          ) : (
            <div className="highlight-card">
              <span className="card-label">Sin suscripciones</span>
              <strong>Todavía no estás suscrito a ningún WOD</strong>
              <p>Elegí un WOD de la lista y usá “Suscribirme” para poder cargar tu resultado.</p>
              {scoreMessage ? <span className="success-message">{scoreMessage}</span> : null}
              {scoreError ? <span className="error-message">{scoreError}</span> : null}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
