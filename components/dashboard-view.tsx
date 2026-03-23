"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type {
  AthleteSummary,
  DashboardResponse,
  NewWorkoutPayload,
  ScoreInput
} from "@/lib/types";

const emptyScore = (): ScoreInput => ({
  athleteId: "",
  scoreDisplay: "",
  scoreValue: "",
  note: ""
});

const initialForm = {
  title: "",
  workoutDate: "",
  workoutType: "for_time",
  rankingOrder: "asc",
  description: "",
  sourceImageUrl: "",
  scores: [emptyScore(), emptyScore(), emptyScore()]
};

export function DashboardView() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialForm);

  async function loadDashboard() {
    setLoading(true);
    setError(null);

    try {
      const [dashboardResponse, athletesResponse] = await Promise.all([
        apiFetch<DashboardResponse>("/api/dashboard"),
        apiFetch<AthleteSummary[]>("/api/athletes")
      ]);

      setDashboard(dashboardResponse);
      setAthletes(athletesResponse);
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "No se pudo cargar el dashboard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  const selectedAthletes = useMemo(
    () => athletes.map((athlete) => ({ value: String(athlete.id), label: athlete.name })),
    [athletes]
  );

  function updateScore(index: number, nextValue: Partial<ScoreInput>) {
    setFormData((current) => ({
      ...current,
      scores: current.scores.map((score, scoreIndex) =>
        scoreIndex === index ? { ...score, ...nextValue } : score
      )
    }));
  }

  function addScoreRow() {
    setFormData((current) => ({
      ...current,
      scores: [...current.scores, emptyScore()]
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormMessage(null);
    setError(null);

    const payload: NewWorkoutPayload = {
      title: formData.title,
      workoutDate: formData.workoutDate,
      workoutType: formData.workoutType,
      rankingOrder: formData.rankingOrder,
      description: formData.description,
      sourceImageUrl: formData.sourceImageUrl,
      scores: formData.scores
        .filter(
          (score) =>
            score.athleteId.trim() !== "" &&
            score.scoreDisplay.trim() !== "" &&
            score.scoreValue.trim() !== ""
        )
        .map((score) => ({
          athleteId: Number(score.athleteId),
          scoreDisplay: score.scoreDisplay,
          scoreValue: Number(score.scoreValue),
          note: score.note
        }))
    };

    try {
      await apiFetch("/api/workouts", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setFormData({
        ...initialForm,
        workoutDate: formData.workoutDate
      });
      setFormMessage("WOD creado y ranking recalculado.");
      await loadDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "No se pudo crear el WOD.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="page-shell status-card">Cargando dashboard del box...</main>;
  }

  if (error && !dashboard) {
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
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Gym Scoreboard MVP</p>
          <h1>Digitaliza la pizarra, ordena el podio y sigue el progreso del box.</h1>
          <p className="hero-copy">
            Este MVP conecta frontend, backend y PostgreSQL para mostrar el WOD del dia, el
            ranking actualizado y perfiles individuales por atleta.
          </p>
        </div>

        {dashboard?.featuredWorkout ? (
          <div className="highlight-card">
            <span className="card-label">WOD del dia</span>
            <h2>{dashboard.featuredWorkout.title}</h2>
            <p>{dashboard.featuredWorkout.description}</p>
            <div className="metric-grid">
              <div>
                <span>Fecha</span>
                <strong>{dashboard.featuredWorkout.workoutDate}</strong>
              </div>
              <div>
                <span>Formato</span>
                <strong>{dashboard.featuredWorkout.workoutTypeLabel}</strong>
              </div>
              <div>
                <span>Scores</span>
                <strong>{dashboard.featuredWorkout.scoreCount}</strong>
              </div>
              <div>
                <span>Top score</span>
                <strong>{dashboard.featuredWorkout.topScore ?? "-"}</strong>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>Atletas activos</span>
          <strong>{dashboard?.stats.activeAthletes ?? 0}</strong>
          <p>Con al menos un score cargado en la base.</p>
        </article>
        <article className="stat-card">
          <span>WODs cargados</span>
          <strong>{dashboard?.stats.workoutCount ?? 0}</strong>
          <p>Incluye benchmarks, metcons y dias de fuerza.</p>
        </article>
        <article className="stat-card">
          <span>Mejoras detectadas</span>
          <strong>{dashboard?.stats.prCount ?? 0}</strong>
          <p>Nuevos mejores resultados vs historial del atleta.</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Leaderboard</p>
              <h2>Podio diario</h2>
            </div>
            <span className="panel-caption">Actualizado con la ultima carga</span>
          </div>

          <div className="leaderboard-list">
            {dashboard?.leaderboard.map((entry) => (
              <div className="leaderboard-row" key={entry.athleteId}>
                <div className="leaderboard-rank">{entry.rank}</div>
                <div className="leaderboard-main">
                  <strong>{entry.athleteName}</strong>
                  <span>{entry.scoreDisplay}</span>
                </div>
                <div className="leaderboard-meta">
                  <span>{entry.note || entry.badge || "Sin observaciones"}</span>
                  <Link href={`/athletes/${entry.athleteId}`}>Ver atleta</Link>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Atletas</p>
              <h2>Seguimiento individual</h2>
            </div>
            <span className="panel-caption">Accesos rapidos</span>
          </div>

          <div className="athlete-grid">
            {athletes.map((athlete) => (
              <Link className="athlete-card" href={`/athletes/${athlete.id}`} key={athlete.id}>
                <strong>{athlete.name}</strong>
                <span>{athlete.level}</span>
                <p>{athlete.favoriteFormat}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Admin</p>
              <h2>Cargar resultados manualmente</h2>
            </div>
            <span className="panel-caption">Simula la digitalizacion inicial</span>
          </div>

          <form className="workout-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="field-grid">
              <label>
                <span>Titulo</span>
                <input
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Open 24.4"
                  value={formData.title}
                />
              </label>
              <label>
                <span>Fecha</span>
                <input
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, workoutDate: event.target.value }))
                  }
                  type="date"
                  value={formData.workoutDate}
                />
              </label>
              <label>
                <span>Tipo</span>
                <select
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, workoutType: event.target.value }))
                  }
                  value={formData.workoutType}
                >
                  <option value="for_time">For time</option>
                  <option value="amrap">AMRAP</option>
                  <option value="weight">Weightlifting</option>
                </select>
              </label>
              <label>
                <span>Ranking</span>
                <select
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, rankingOrder: event.target.value }))
                  }
                  value={formData.rankingOrder}
                >
                  <option value="asc">Menor score gana</option>
                  <option value="desc">Mayor score gana</option>
                </select>
              </label>
            </div>

            <label>
              <span>Descripcion</span>
              <textarea
                onChange={(event) =>
                  setFormData((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="21-15-9 thrusters and pull-ups"
                rows={3}
                value={formData.description}
              />
            </label>

            <label>
              <span>Imagen de referencia</span>
              <input
                onChange={(event) =>
                  setFormData((current) => ({ ...current, sourceImageUrl: event.target.value }))
                }
                placeholder="https://..."
                value={formData.sourceImageUrl}
              />
            </label>

            <div className="scores-section">
              <div className="scores-heading">
                <h3>Scores detectados</h3>
                <button className="ghost-button" onClick={addScoreRow} type="button">
                  Agregar fila
                </button>
              </div>

              {formData.scores.map((score, index) => (
                <div className="score-row" key={`score-${index}`}>
                  <select
                    onChange={(event) => updateScore(index, { athleteId: event.target.value })}
                    value={score.athleteId}
                  >
                    <option value="">Atleta</option>
                    {selectedAthletes.map((athlete) => (
                      <option key={athlete.value} value={athlete.value}>
                        {athlete.label}
                      </option>
                    ))}
                  </select>
                  <input
                    onChange={(event) => updateScore(index, { scoreDisplay: event.target.value })}
                    placeholder="14:28 o 212"
                    value={score.scoreDisplay}
                  />
                  <input
                    onChange={(event) => updateScore(index, { scoreValue: event.target.value })}
                    placeholder="868 o 212"
                    type="number"
                    value={score.scoreValue}
                  />
                  <input
                    onChange={(event) => updateScore(index, { note: event.target.value })}
                    placeholder="PR, capped, smooth"
                    value={score.note}
                  />
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? "Guardando..." : "Crear WOD"}
              </button>
              {formMessage ? <span className="success-message">{formMessage}</span> : null}
              {error ? <span className="error-message">{error}</span> : null}
            </div>
          </form>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Historial</p>
              <h2>Ultimos WODs cargados</h2>
            </div>
            <span className="panel-caption">Persistidos en PostgreSQL</span>
          </div>

          <div className="history-list">
            {dashboard?.recentWorkouts.map((workout) => (
              <div className="history-row" key={workout.id}>
                <div>
                  <strong>{workout.title}</strong>
                  <p>{workout.description}</p>
                </div>
                <div className="history-meta">
                  <span>{workout.workoutDate}</span>
                  <span>{workout.workoutTypeLabel}</span>
                  <span>{workout.scoreCount} scores</span>
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
