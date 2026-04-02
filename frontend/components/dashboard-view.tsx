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
  SubmitWorkoutScorePayload,
  WorkoutBlockType,
  WorkoutExerciseTargetType
} from "@/lib/types";

type WorkoutExerciseForm = {
  name: string;
  targetType: WorkoutExerciseTargetType;
  reps: string;
  timeCap: string;
  weightMen: string;
  weightWomen: string;
  percentRm: string;
};

type WorkoutBlockForm = {
  name: string;
  type: WorkoutBlockType;
  rounds: string;
  timeCap: string;
  exercises: WorkoutExerciseForm[];
};

type WorkoutFormState = {
  workoutDate: string;
  blocks: WorkoutBlockForm[];
};

function labelWorkoutType(type: WorkoutBlockType) {
  switch (type) {
    case "for_time":
      return "For time";
    case "amrap":
      return "AMRAP";
    case "emon":
      return "EMON";
    case "tabata":
      return "Tabata";
    default:
      return type;
  }
}

function deriveWorkoutType(blocks: WorkoutBlockForm[]) {
  const availableTypes = blocks
    .map((block) => block.type)
    .filter((type, index, current) => current.indexOf(type) === index);

  if (availableTypes.length === 0) {
    return "Sin definir";
  }

  if (availableTypes.length === 1) {
    return labelWorkoutType(availableTypes[0]);
  }

  return "Mixto";
}

function formatPreviewDate(workoutDate: string) {
  if (!workoutDate) {
    return "Fecha pendiente";
  }

  const [year, month, day] = workoutDate.split("-");

  if (!year || !month || !day) {
    return workoutDate;
  }

  return `${day}/${month}/${year}`;
}

function buildBlockProperties(block: WorkoutBlockForm) {
  const properties = [
    `${labelWorkoutType(block.type)}`,
    block.rounds ? `${block.rounds} ronda${block.rounds === "1" ? "" : "s"}` : null,
    block.timeCap ? `TC ${block.timeCap}` : null
  ];

  return properties.filter(Boolean).join(" • ");
}

function buildExerciseProperties(exercise: WorkoutExerciseForm) {
  const target =
    exercise.targetType === "reps"
      ? exercise.reps
        ? `${exercise.reps} reps`
        : null
      : exercise.timeCap
        ? `TC ${exercise.timeCap}`
        : null;

  const loads = [
    exercise.weightMen ? `H ${exercise.weightMen}` : null,
    exercise.weightWomen ? `M ${exercise.weightWomen}` : null,
    exercise.percentRm ? `%RM ${exercise.percentRm}` : null
  ];

  return [target, ...loads].filter(Boolean).join(" • ");
}

function createEmptyExercise(targetType: WorkoutExerciseTargetType = "reps"): WorkoutExerciseForm {
  return {
    name: "",
    targetType,
    reps: "",
    timeCap: "",
    weightMen: "",
    weightWomen: "",
    percentRm: ""
  };
}

function createEmptyBlock(type: WorkoutBlockType = "for_time"): WorkoutBlockForm {
  const forcedTimeCap = type === "emon" || type === "tabata";

  return {
    name: labelWorkoutType(type),
    type,
    rounds: "",
    timeCap: "",
    exercises: [createEmptyExercise(forcedTimeCap ? "time_cap" : "reps")]
  };
}

const initialWorkoutForm: WorkoutFormState = {
  workoutDate: "",
  blocks: [createEmptyBlock()]
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

  function updateBlock(
    blockIndex: number,
    updater: (block: WorkoutBlockForm) => WorkoutBlockForm
  ) {
    setWorkoutForm((current) => ({
      ...current,
      blocks: current.blocks.map((block, index) =>
        index === blockIndex ? updater(block) : block
      )
    }));
  }

  function addBlock() {
    setWorkoutForm((current) => ({
      ...current,
      blocks: [...current.blocks, createEmptyBlock()]
    }));
  }

  function removeBlock(blockIndex: number) {
    setWorkoutForm((current) => ({
      ...current,
      blocks:
        current.blocks.length === 1
          ? current.blocks
          : current.blocks.filter((_, index) => index !== blockIndex)
    }));
  }

  function addExercise(blockIndex: number) {
    updateBlock(blockIndex, (block) => ({
      ...block,
      exercises: [
        ...block.exercises,
        createEmptyExercise(block.type === "emon" || block.type === "tabata" ? "time_cap" : "reps")
      ]
    }));
  }

  function removeExercise(blockIndex: number, exerciseIndex: number) {
    updateBlock(blockIndex, (block) => ({
      ...block,
      exercises:
        block.exercises.length === 1
          ? block.exercises
          : block.exercises.filter((_, index) => index !== exerciseIndex)
    }));
  }

  function updateBlockType(blockIndex: number, nextType: WorkoutBlockType) {
    setWorkoutForm((current) => ({
      ...current,
      blocks: current.blocks.map((block, index) => {
        if (index !== blockIndex) {
          return block;
        }

        const requiresTimeCap = nextType === "emon" || nextType === "tabata";
        const previousTypeLabel = labelWorkoutType(block.type);
        const nextTypeLabel = labelWorkoutType(nextType);

        return {
          ...block,
          name: block.name === previousTypeLabel ? nextTypeLabel : block.name,
          type: nextType,
          exercises: block.exercises.map((exercise) =>
            requiresTimeCap
              ? {
                  ...exercise,
                  targetType: "time_cap",
                  reps: ""
                }
              : exercise
          )
        };
      })
    }));
  }

  function updateExercise(
    blockIndex: number,
    exerciseIndex: number,
    updater: (exercise: WorkoutExerciseForm) => WorkoutExerciseForm
  ) {
    updateBlock(blockIndex, (block) => ({
      ...block,
      exercises: block.exercises.map((exercise, index) =>
        index === exerciseIndex ? updater(exercise) : exercise
      )
    }));
  }

  async function handleCreateWorkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingWorkout(true);
    setWorkoutMessage(null);
    setWorkoutError(null);

    const payload: NewWorkoutPayload = {
      workoutDate: workoutForm.workoutDate,
      blocks: workoutForm.blocks.map((block) => ({
        name: block.name,
        type: block.type,
        rounds: Number(block.rounds),
        timeCap: block.timeCap,
        exercises: block.exercises.map((exercise) => ({
          name: exercise.name,
          targetType: exercise.targetType,
          reps: exercise.targetType === "reps" ? Number(exercise.reps) : undefined,
          timeCap: exercise.targetType === "time_cap" ? exercise.timeCap : undefined,
          weightMen: exercise.weightMen,
          weightWomen: exercise.weightWomen,
          percentRm: exercise.percentRm
        }))
      }))
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
        : "Publica el WOD del dia con bloques y ejercicios para que cada atleta cargue su propio score por separado.";
  const previewWorkoutType = deriveWorkoutType(workoutForm.blocks);

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
              <div className="workout-builder-layout">
              <article className="panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Carga</p>
                    <h2>Publicar WOD del dia</h2>
                  </div>
                  <span className="panel-caption">Fecha, bloques y ejercicios</span>
                </div>

                <form className="workout-form" onSubmit={(event) => void handleCreateWorkout(event)}>
                  <label>
                    <span>Fecha</span>
                    <input
                      onChange={(event) =>
                        setWorkoutForm((current) => ({
                          ...current,
                          workoutDate: event.target.value
                        }))
                      }
                      required
                      type="date"
                      value={workoutForm.workoutDate}
                    />
                  </label>

                  <div className="form-section-header">
                    <div>
                      <span className="card-label">Bloques</span>
                      <p>Agrega los bloques necesarios y completa sus ejercicios.</p>
                    </div>
                    <button className="ghost-button" onClick={addBlock} type="button">
                      + Agregar bloque
                    </button>
                  </div>

                  <div className="blocks-list">
                    {workoutForm.blocks.map((block, blockIndex) => {
                      const requiresTimeCap = block.type === "emon" || block.type === "tabata";

                      return (
                        <section className="workout-block-card" key={`block-${blockIndex}`}>
                          <div className="form-section-header">
                            <div>
                              <span className="card-label">Bloque {blockIndex + 1}</span>
                            </div>
                            <button
                              className="ghost-button"
                              disabled={workoutForm.blocks.length === 1}
                              onClick={() => removeBlock(blockIndex)}
                              type="button"
                            >
                              Quitar bloque
                            </button>
                          </div>

                          <div className="field-grid">
                            <label>
                              <span>Nombre</span>
                              <input
                                onChange={(event) =>
                                  updateBlock(blockIndex, (current) => ({
                                    ...current,
                                    name: event.target.value
                                  }))
                                }
                                placeholder="Buy in"
                                required
                                value={block.name}
                              />
                            </label>
                            <label>
                              <span>Tipo</span>
                              <select
                                onChange={(event) =>
                                  updateBlockType(blockIndex, event.target.value as WorkoutBlockType)
                                }
                                value={block.type}
                              >
                                <option value="for_time">For time</option>
                                <option value="amrap">AMRAP</option>
                                <option value="emon">EMON</option>
                                <option value="tabata">Tabata</option>
                              </select>
                            </label>
                            <label>
                              <span>Rondas</span>
                              <input
                                min="1"
                                onChange={(event) =>
                                  updateBlock(blockIndex, (current) => ({
                                    ...current,
                                    rounds: event.target.value
                                  }))
                                }
                                placeholder="3"
                                required
                                type="number"
                                value={block.rounds}
                              />
                            </label>
                            <label>
                              <span>Time Cap</span>
                              <input
                                onChange={(event) =>
                                  updateBlock(blockIndex, (current) => ({
                                    ...current,
                                    timeCap: event.target.value
                                  }))
                                }
                                placeholder="12:00"
                                required
                                value={block.timeCap}
                              />
                            </label>
                          </div>

                          <div className="form-section-header compact">
                            <div>
                              <span className="card-label">Ejercicios</span>
                              <p>
                                {requiresTimeCap
                                  ? "Cada ejercicio usa time cap."
                                  : "Cada ejercicio puede usar repeticiones o time cap."}
                              </p>
                            </div>
                            <button
                              className="ghost-button"
                              onClick={() => addExercise(blockIndex)}
                              type="button"
                            >
                              + Agregar ejercicio
                            </button>
                          </div>

                          <div className="exercise-list">
                            {block.exercises.map((exercise, exerciseIndex) => (
                              <div
                                className="workout-exercise-card"
                                key={`exercise-${blockIndex}-${exerciseIndex}`}
                              >
                                <div className="form-section-header compact">
                                  <div>
                                    <span className="card-label">Ejercicio {exerciseIndex + 1}</span>
                                  </div>
                                  <button
                                    className="ghost-button"
                                    disabled={block.exercises.length === 1}
                                    onClick={() => removeExercise(blockIndex, exerciseIndex)}
                                    type="button"
                                  >
                                    Quitar ejercicio
                                  </button>
                                </div>

                                <div className="field-grid">
                                  <label>
                                    <span>Nombre</span>
                                    <input
                                      onChange={(event) =>
                                        updateExercise(blockIndex, exerciseIndex, (current) => ({
                                          ...current,
                                          name: event.target.value
                                        }))
                                      }
                                      placeholder="Thruster"
                                      required
                                      value={exercise.name}
                                    />
                                  </label>

                                  {requiresTimeCap ? (
                                    <label>
                                      <span>Time Cap</span>
                                      <input
                                        onChange={(event) =>
                                          updateExercise(blockIndex, exerciseIndex, (current) => ({
                                            ...current,
                                            timeCap: event.target.value
                                          }))
                                        }
                                        placeholder="00:20"
                                        required
                                        value={exercise.timeCap}
                                      />
                                    </label>
                                  ) : (
                                    <>
                                      <label>
                                        <span>Objetivo</span>
                                        <select
                                          onChange={(event) =>
                                            updateExercise(blockIndex, exerciseIndex, (current) => ({
                                              ...current,
                                              targetType: event.target.value as WorkoutExerciseTargetType,
                                              reps:
                                                event.target.value === "reps" ? current.reps : "",
                                              timeCap:
                                                event.target.value === "time_cap"
                                                  ? current.timeCap
                                                  : ""
                                            }))
                                          }
                                          value={exercise.targetType}
                                        >
                                          <option value="reps">Repeticiones</option>
                                          <option value="time_cap">Time Cap</option>
                                        </select>
                                      </label>

                                      {exercise.targetType === "reps" ? (
                                        <label>
                                          <span>Repeticiones</span>
                                          <input
                                            min="1"
                                            onChange={(event) =>
                                              updateExercise(blockIndex, exerciseIndex, (current) => ({
                                                ...current,
                                                reps: event.target.value
                                              }))
                                            }
                                            placeholder="21"
                                            required
                                            type="number"
                                            value={exercise.reps}
                                          />
                                        </label>
                                      ) : (
                                        <label>
                                          <span>Time Cap</span>
                                          <input
                                            onChange={(event) =>
                                              updateExercise(blockIndex, exerciseIndex, (current) => ({
                                                ...current,
                                                timeCap: event.target.value
                                              }))
                                            }
                                            placeholder="01:00"
                                            required
                                            value={exercise.timeCap}
                                          />
                                        </label>
                                      )}
                                    </>
                                  )}

                                  <label>
                                    <span>Peso Hombre</span>
                                    <input
                                      onChange={(event) =>
                                        updateExercise(blockIndex, exerciseIndex, (current) => ({
                                          ...current,
                                          weightMen: event.target.value
                                        }))
                                      }
                                      placeholder="43/30 kg"
                                      value={exercise.weightMen}
                                    />
                                  </label>
                                  <label>
                                    <span>Peso Mujer</span>
                                    <input
                                      onChange={(event) =>
                                        updateExercise(blockIndex, exerciseIndex, (current) => ({
                                          ...current,
                                          weightWomen: event.target.value
                                        }))
                                      }
                                      placeholder="30/20 kg"
                                      value={exercise.weightWomen}
                                    />
                                  </label>
                                  <label className="field-span-2">
                                    <span>% RM</span>
                                    <input
                                      onChange={(event) =>
                                        updateExercise(blockIndex, exerciseIndex, (current) => ({
                                          ...current,
                                          percentRm: event.target.value
                                        }))
                                      }
                                      placeholder="75%"
                                      value={exercise.percentRm}
                                    />
                                  </label>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      );
                    })}
                  </div>

                  <div className="form-actions">
                    <button className="primary-button" disabled={submittingWorkout} type="submit">
                      {submittingWorkout ? "Guardando..." : "Publicar WOD"}
                    </button>
                    {workoutMessage ? <span className="success-message">{workoutMessage}</span> : null}
                    {workoutError ? <span className="error-message">{workoutError}</span> : null}
                  </div>
                </form>
              </article>
              
              <aside className="panel workout-preview-panel">
                <div className="panel-heading">
                  <div>
                    <p className="eyebrow">Vista previa</p>
                    <h2>WOD en vivo</h2>
                  </div>
                  <span className="panel-caption">Se actualiza al cargar bloques y ejercicios</span>
                </div>

                <div className="workout-preview-shell">
                  <div className="workout-preview-header">
                    <span className="card-label">{previewWorkoutType}</span>
                    <strong>{formatPreviewDate(workoutForm.workoutDate)}</strong>
                  </div>

                  <div className="workout-preview-list">
                    {workoutForm.blocks.map((block, blockIndex) => (
                      <section className="preview-block-card" key={`preview-block-${blockIndex}`}>
                        <div className="preview-block-heading">
                          <div>
                            <span className="card-label">Bloque {blockIndex + 1}</span>
                            <strong>{block.name || `Bloque ${blockIndex + 1}`}</strong>
                          </div>
                          <span className="preview-block-properties">
                            {buildBlockProperties(block) || "Completa las propiedades del bloque"}
                          </span>
                        </div>

                        <div className="preview-exercise-list">
                          {block.exercises.map((exercise, exerciseIndex) => (
                            <div
                              className="preview-exercise-row"
                              key={`preview-exercise-${blockIndex}-${exerciseIndex}`}
                            >
                              <div>
                                <span className="preview-exercise-index">
                                  Ejercicio {exerciseIndex + 1}
                                </span>
                                <strong>{exercise.name || "Ejercicio pendiente"}</strong>
                              </div>
                              <span className="preview-exercise-properties">
                                {buildExerciseProperties(exercise) || "Define objetivo o cargas"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              </aside>
              </div>

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
