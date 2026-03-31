"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildAuthHeaders, type AuthSession } from "@/lib/auth";
import type {
  AthleteSummary,
  DashboardResponse,
  NewWorkoutPayload,
  ScoreInput,
  SubmitWorkoutScorePayload
} from "@/lib/types";

const initialWorkoutForm = {
  title: "",
  workoutDate: "",
  workoutType: "for_time",
  rankingOrder: "asc",
  description: "",
  sourceImageUrl: ""
};

const initialScoreForm: ScoreInput = {
  athleteId: "",
  scoreDisplay: "",
  scoreValue: "",
  note: ""
};

const navigationItems = [
  {
    id: "home",
    label: "Inicio",
    description: "Resumen del box y WOD del dia"
  },
  {
    id: "ranking",
    label: "Ranking",
    description: "Tabla de atletas y podio actual"
  },
  {
    id: "submit",
    label: "Cargar WOD",
    description: "Publicar el WOD y subir tu score"
  }
] as const;

type DashboardSection = (typeof navigationItems)[number]["id"];

export function DashboardView({
  currentUser,
  onLogout
}: {
  currentUser: AuthSession;
  onLogout: () => void;
}) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [athletes, setAthletes] = useState<AthleteSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingWorkout, setSubmittingWorkout] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [workoutMessage, setWorkoutMessage] = useState<string | null>(null);
  const [scoreMessage, setScoreMessage] = useState<string | null>(null);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [workoutForm, setWorkoutForm] = useState(initialWorkoutForm);
  const [scoreForm, setScoreForm] = useState<ScoreInput>(initialScoreForm);
  const [activeSection, setActiveSection] = useState<DashboardSection>("home");

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

  async function handleCreateWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingWorkout(true);
    setWorkoutMessage(null);
    setWorkoutError(null);

    const payload: NewWorkoutPayload = {
      title: workoutForm.title,
      workoutDate: workoutForm.workoutDate,
      workoutType: workoutForm.workoutType,
      rankingOrder: workoutForm.rankingOrder,
      description: workoutForm.description,
      sourceImageUrl: workoutForm.sourceImageUrl
    };

    try {
      await apiFetch("/api/workouts", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setWorkoutForm({
        ...initialWorkoutForm,
        workoutDate: workoutForm.workoutDate
      });
      setWorkoutMessage("WOD creado. Ahora cada atleta puede cargar su score por separado.");
      await loadDashboard();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : "No se pudo crear el WOD.";
      setWorkoutError(message);
    } finally {
      setSubmittingWorkout(false);
    }
  }

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
      const message =
        requestError instanceof Error ? requestError.message : "No se pudo cargar el score.";
      setScoreError(message);
    } finally {
      setSubmittingScore(false);
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

  const mainTitle =
    activeSection === "home"
      ? "Pantalla principal del atleta"
      : activeSection === "ranking"
        ? "Ranking de atletas"
        : "Carga de WOD y score";

  const mainDescription =
    activeSection === "home"
      ? "Consulta el WOD destacado del dia, el score ganador hasta el momento y el pulso general del box."
      : activeSection === "ranking"
        ? "Revisa el leaderboard actual y entra al detalle individual de cada atleta."
        : "Publica el WOD del dia y permite que cada atleta cargue su propio score por separado.";

  return (
    <main className="page-shell">
      <header className="top-header">
        <div>
          <p className="eyebrow">Gym Scoreboard MVP</p>
          <h1>{mainTitle}</h1>
          <p className="header-copy">{mainDescription}</p>
        </div>
        <div className="header-actions">
          <div className="session-badge">
            <span>{currentUser.name}</span>
            <Link
              aria-label="Mi perfil"
              className="ghost-button link-button icon-button"
              href="/profile"
              title="Mi perfil"
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                width="18"
              >
                <path d="M19 21a7 7 0 0 0-14 0" />
                <circle cx="12" cy="8" r="4" />
              </svg>
            </Link>
            <button
              aria-label="Cerrar sesion"
              className="ghost-button icon-button"
              onClick={onLogout}
              title="Cerrar sesion"
              type="button"
            >
              <svg
                aria-hidden="true"
                fill="none"
                height="18"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
                width="18"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M20 4v16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <section className="dashboard-layout">
        <aside className="side-nav">
          <div className="side-nav-header">
            <span className="card-label">Menu atleta</span>
            <p>Navega por las vistas principales del tablero.</p>
          </div>

          <nav className="side-nav-links" aria-label="Navegacion principal">
            {navigationItems.map((item) => (
              <button
                aria-current={activeSection === item.id ? "page" : undefined}
                className={`side-nav-link ${activeSection === item.id ? "is-active" : ""}`}
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                type="button"
              >
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </nav>

          <div className="side-nav-summary">
            <strong>{dashboard?.stats.activeAthletes ?? 0}</strong>
            <span>Atletas con actividad registrada</span>
          </div>
        </aside>

        <div className="dashboard-main">
          {activeSection === "home" ? (
            <>
              <section className="hero-panel">
                <div>
                  <p className="eyebrow">Pantalla principal</p>
                  <h1>Digitaliza la pizarra y sigue el rendimiento del box.</h1>
                  <p className="hero-copy">
                    El atleta puede entrar al ranking, revisar el WOD vigente y conocer el score
                    ganador del dia desde un solo lugar.
                  </p>
                </div>
              </section>

              {dashboard?.featuredWorkout ? (
                <section className="highlight-band">
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
                        <span>Score ganador</span>
                        <strong>{dashboard.featuredWorkout.topScore ?? "-"}</strong>
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

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
                      <p className="eyebrow">Ranking express</p>
                      <h2>Podio diario</h2>
                    </div>
                    <button
                      className="ghost-button"
                      onClick={() => setActiveSection("ranking")}
                      type="button"
                    >
                      Ver ranking completo
                    </button>
                  </div>

                  <div className="leaderboard-list">
                    {dashboard?.leaderboard.slice(0, 3).map((entry) => (
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
            </>
          ) : null}

          {activeSection === "ranking" ? (
            <section className="content-grid">
              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Leaderboard</p>
                    <h2>Ranking de atletas</h2>
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
                    <h2>Perfiles disponibles</h2>
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
          ) : null}

          {activeSection === "submit" ? (
            <section className="content-grid submit-grid">
              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Carga</p>
                    <h2>Publicar WOD del dia</h2>
                  </div>
                  <span className="panel-caption">Paso 1 del flujo</span>
                </div>

                <form className="workout-form" onSubmit={(event) => void handleCreateWorkout(event)}>
                  <div className="field-grid">
                    <label>
                      <span>Titulo</span>
                      <input
                        onChange={(event) =>
                          setWorkoutForm((current) => ({ ...current, title: event.target.value }))
                        }
                        placeholder="Open 24.4"
                        value={workoutForm.title}
                      />
                    </label>
                    <label>
                      <span>Fecha</span>
                      <input
                        onChange={(event) =>
                          setWorkoutForm((current) => ({
                            ...current,
                            workoutDate: event.target.value
                          }))
                        }
                        type="date"
                        value={workoutForm.workoutDate}
                      />
                    </label>
                    <label>
                      <span>Tipo</span>
                      <select
                        onChange={(event) =>
                          setWorkoutForm((current) => ({
                            ...current,
                            workoutType: event.target.value
                          }))
                        }
                        value={workoutForm.workoutType}
                      >
                        <option value="for_time">For time</option>
                        <option value="amrap">AMRAP</option>
                        <option value="emon">EMON</option>
                        <option value="tabata">Tabata</option>
                      </select>
                    </label>
                    <label>
                      <span>Ranking</span>
                      <select
                        onChange={(event) =>
                          setWorkoutForm((current) => ({
                            ...current,
                            rankingOrder: event.target.value
                          }))
                        }
                        value={workoutForm.rankingOrder}
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
                        setWorkoutForm((current) => ({
                          ...current,
                          description: event.target.value
                        }))
                      }
                      placeholder="21-15-9 thrusters and pull-ups"
                      rows={3}
                      value={workoutForm.description}
                    />
                  </label>

                  <label>
                    <span>Imagen de referencia</span>
                    <input
                      onChange={(event) =>
                        setWorkoutForm((current) => ({
                          ...current,
                          sourceImageUrl: event.target.value
                        }))
                      }
                      placeholder="https://..."
                      value={workoutForm.sourceImageUrl}
                    />
                  </label>

                  <div className="form-actions">
                    <button className="primary-button" disabled={submittingWorkout} type="submit">
                      {submittingWorkout ? "Guardando..." : "Publicar WOD"}
                    </button>
                    {workoutMessage ? <span className="success-message">{workoutMessage}</span> : null}
                    {workoutError ? <span className="error-message">{workoutError}</span> : null}
                  </div>
                </form>
              </article>

              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Carga personal</p>
                    <h2>Subir mi score</h2>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => setActiveSection("home")}
                    type="button"
                  >
                    Volver al inicio
                  </button>
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

                    <label>
                      <span>Valor numerico para ranking</span>
                      <input
                        onChange={(event) =>
                          setScoreForm((current) => ({
                            ...current,
                            scoreValue: event.target.value
                          }))
                        }
                        placeholder="868 o 212"
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
                        placeholder="PR, capped, smooth"
                        value={scoreForm.note}
                      />
                    </label>

                    <div className="form-actions">
                      <button className="primary-button" disabled={submittingScore} type="submit">
                        {submittingScore ? "Guardando..." : "Cargar mi score"}
                      </button>
                      {scoreMessage ? <span className="success-message">{scoreMessage}</span> : null}
                      {scoreError ? <span className="error-message">{scoreError}</span> : null}
                    </div>
                  </form>
                ) : (
                  <div className="history-list">
                    <div className="history-row">
                      <div>
                        <strong>No hay WOD vigente</strong>
                        <p>Publica primero el WOD del dia para que cada atleta pueda cargar su score.</p>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
