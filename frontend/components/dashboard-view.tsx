"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { AuthSession } from "@/lib/auth";
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
    description: "Registrar un nuevo entrenamiento"
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState(initialForm);
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

  const mainTitle =
    activeSection === "home"
      ? "Pantalla principal del atleta"
      : activeSection === "ranking"
        ? "Ranking de atletas"
        : "Carga de WODs";

  const mainDescription =
    activeSection === "home"
      ? "Consulta el WOD destacado del dia, el score ganador hasta el momento y el pulso general del box."
      : activeSection === "ranking"
        ? "Revisa el leaderboard actual y entra al detalle individual de cada atleta."
        : "Registra un entrenamiento con sus scores para actualizar el tablero del box.";

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
                    <h2>Subir un nuevo WOD</h2>
                  </div>
                  <span className="panel-caption">Disponible para el atleta o staff</span>
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
                      <h3>Scores del WOD</h3>
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
                          onChange={(event) =>
                            updateScore(index, { scoreDisplay: event.target.value })
                          }
                          placeholder="14:28 o 212"
                          value={score.scoreDisplay}
                        />
                        <input
                          onChange={(event) =>
                            updateScore(index, { scoreValue: event.target.value })
                          }
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
                    <p className="eyebrow">Referencia</p>
                    <h2>WODs recientes</h2>
                  </div>
                  <button
                    className="ghost-button"
                    onClick={() => setActiveSection("home")}
                    type="button"
                  >
                    Volver al inicio
                  </button>
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
          ) : null}
        </div>
      </section>
    </main>
  );
}
