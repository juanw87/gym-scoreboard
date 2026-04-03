"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildAuthHeaders, type AuthSession } from "@/lib/auth";
import type {
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

function requiresBlockTimeCap(type: WorkoutBlockType) {
  return type === "emon" || type === "tabata";
}

function blockUsesRounds(type: WorkoutBlockType) {
  return type === "for_time";
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
    labelWorkoutType(block.type),
    block.rounds ? `${block.rounds} ronda${block.rounds === "1" ? "" : "s"}` : null,
    block.timeCap ? `TC ${block.timeCap}` : null
  ];

  return properties.filter(Boolean).join(" | ");
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

  return [target, ...loads].filter(Boolean).join(" | ");
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
  return {
    name: labelWorkoutType(type),
    type,
    rounds: "",
    timeCap: "",
    exercises: []
  };
}

const initialWorkoutForm: WorkoutFormState = {
  workoutDate: "",
  blocks: []
};

const initialScoreForm: ScoreInput = {
  athleteId: "",
  scoreDisplay: "",
  scoreValue: "",
  note: ""
};

export function WorkoutSubmitView({ currentUser }: { currentUser: AuthSession }) {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingWorkout, setSubmittingWorkout] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [workoutMessage, setWorkoutMessage] = useState<string | null>(null);
  const [scoreMessage, setScoreMessage] = useState<string | null>(null);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [workoutForm, setWorkoutForm] = useState(initialWorkoutForm);
  const [currentBlock, setCurrentBlock] = useState<WorkoutBlockForm>(createEmptyBlock());
  const [currentExercise, setCurrentExercise] = useState<WorkoutExerciseForm>(createEmptyExercise());
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

  function resetCurrentExercise(nextBlockType: WorkoutBlockType = currentBlock.type) {
    setCurrentExercise(createEmptyExercise(requiresBlockTimeCap(nextBlockType) ? "time_cap" : "reps"));
  }

  function resetCurrentBlock() {
    const nextBlock = createEmptyBlock();
    setCurrentBlock(nextBlock);
    resetCurrentExercise(nextBlock.type);
  }

  function updateCurrentBlock(updater: (block: WorkoutBlockForm) => WorkoutBlockForm) {
    setCurrentBlock((current) => updater(current));
  }

  function updateCurrentExercise(updater: (exercise: WorkoutExerciseForm) => WorkoutExerciseForm) {
    setCurrentExercise((current) => updater(current));
  }

  function updateCurrentBlockType(nextType: WorkoutBlockType) {
    updateCurrentBlock((current) => {
      const previousTypeLabel = labelWorkoutType(current.type);
      const nextTypeLabel = labelWorkoutType(nextType);

      return {
        ...current,
        name: current.name === previousTypeLabel ? nextTypeLabel : current.name,
        type: nextType,
        rounds: blockUsesRounds(nextType) ? current.rounds : ""
      };
    });

    setCurrentExercise((current) =>
      requiresBlockTimeCap(nextType)
        ? {
            ...current,
            targetType: "time_cap",
            reps: ""
          }
        : current
    );
  }

  function validateCurrentExercise() {
    if (!currentExercise.name.trim()) {
      return "Completa el nombre del ejercicio antes de agregarlo.";
    }

    if (currentExercise.targetType === "reps" && !currentExercise.reps.trim()) {
      return "Completa las repeticiones del ejercicio antes de agregarlo.";
    }

    if (currentExercise.targetType === "time_cap" && !currentExercise.timeCap.trim()) {
      return "Completa el time cap del ejercicio antes de agregarlo.";
    }

    return null;
  }

  function validateCurrentBlock() {
    if (!currentBlock.name.trim()) {
      return "Completa el nombre del bloque antes de agregarlo.";
    }

    if (blockUsesRounds(currentBlock.type) && !currentBlock.rounds.trim()) {
      return "Completa las rondas del bloque antes de agregarlo.";
    }

    if (!currentBlock.timeCap.trim()) {
      return "Completa el time cap del bloque antes de agregarlo.";
    }

    if (currentBlock.exercises.length === 0) {
      return "Agrega al menos un ejercicio al bloque antes de incorporarlo al WOD.";
    }

    return null;
  }

  function handleAddExercise() {
    const validationError = validateCurrentExercise();

    setWorkoutMessage(null);
    setWorkoutError(validationError);

    if (validationError) {
      return;
    }

    updateCurrentBlock((current) => ({
      ...current,
      exercises: [...current.exercises, currentExercise]
    }));

    resetCurrentExercise();
  }

  function handleRemoveDraftExercise(exerciseIndex: number) {
    updateCurrentBlock((current) => ({
      ...current,
      exercises: current.exercises.filter((_, index) => index !== exerciseIndex)
    }));
  }

  function handleAddBlock() {
    const validationError = validateCurrentBlock();

    setWorkoutMessage(null);
    setWorkoutError(validationError);

    if (validationError) {
      return;
    }

    setWorkoutForm((current) => ({
      ...current,
      blocks: [...current.blocks, currentBlock]
    }));

    setWorkoutError(null);
    resetCurrentBlock();
  }

  function handleRemoveBlock(blockIndex: number) {
    setWorkoutForm((current) => ({
      ...current,
      blocks: current.blocks.filter((_, index) => index !== blockIndex)
    }));
  }

  function handleRemoveBlockExercise(blockIndex: number, exerciseIndex: number) {
    setWorkoutForm((current) => ({
      ...current,
      blocks: current.blocks.map((block, index) =>
        index === blockIndex
          ? {
              ...block,
              exercises: block.exercises.filter((_, itemIndex) => itemIndex !== exerciseIndex)
            }
          : block
      )
    }));
  }

  async function handleCreateWorkout() {
    if (!workoutForm.workoutDate.trim()) {
      setWorkoutError("Completa la fecha del WOD antes de publicarlo.");
      setWorkoutMessage(null);
      return;
    }

    if (workoutForm.blocks.length === 0) {
      setWorkoutError("Agrega al menos un bloque a la vista previa antes de publicar el WOD.");
      setWorkoutMessage(null);
      return;
    }

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

      setWorkoutForm((current) => ({
        ...initialWorkoutForm,
        workoutDate: current.workoutDate
      }));
      resetCurrentBlock();
      setWorkoutMessage("WOD creado. Ahora cada atleta puede cargar su score por separado.");
      await loadDashboard();
    } catch (requestError) {
      setWorkoutError(
        requestError instanceof Error ? requestError.message : "No se pudo crear el WOD."
      );
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
      setScoreError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar el score."
      );
    } finally {
      setSubmittingScore(false);
    }
  }

  if (loading) {
    return <main className="page-shell status-card">Cargando pantalla de carga de WOD...</main>;
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

  const previewWorkoutType = deriveWorkoutType(
    workoutForm.blocks.length > 0 ? workoutForm.blocks : [currentBlock]
  );
  const previewBlocks = [...workoutForm.blocks];
  const currentExerciseHasData =
    currentExercise.name.trim() ||
    currentExercise.reps.trim() ||
    currentExercise.timeCap.trim() ||
    currentExercise.weightMen.trim() ||
    currentExercise.weightWomen.trim() ||
    currentExercise.percentRm.trim();
  const draftBlockExercises = currentExerciseHasData
    ? [...currentBlock.exercises, currentExercise]
    : currentBlock.exercises;
  const draftBlockLabel = workoutForm.blocks.length + 1;

  return (
    <main className="page-shell">
      <Link className="back-link" href="/dashboard">
        Volver al dashboard
      </Link>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Carga</p>
          <h1>Publica el WOD y revisa la vista previa en tiempo real.</h1>
          <p className="hero-copy">
            Completa el bloque en edicion, agrega sus ejercicios uno por uno y luego incorpora el
            bloque a la vista previa. Publica el WOD final desde el panel lateral.
          </p>
        </div>
      </section>

      <section className="content-grid submit-grid">
        <div className="workout-builder-layout">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Carga</p>
                <h2>Armar WOD del dia</h2>
              </div>
              <span className="panel-caption">Fecha, bloque actual y ejercicio actual</span>
            </div>

            <div className="workout-form">
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

              <section className="workout-block-card">
                <div className="form-section-header">
                  <div>
                    <span className="card-label">Bloque en edicion</span>
                    <p>Completa el bloque y luego agregalo a la vista previa.</p>
                  </div>
                  <button className="ghost-button" onClick={handleAddBlock} type="button">
                    + Agregar bloque
                  </button>
                </div>

                <div className="field-grid">
                  <label>
                    <span>Nombre</span>
                    <input
                      onChange={(event) =>
                        updateCurrentBlock((current) => ({
                          ...current,
                          name: event.target.value
                        }))
                      }
                      placeholder="Buy in"
                      required
                      value={currentBlock.name}
                    />
                  </label>
                  <label>
                    <span>Tipo</span>
                    <select
                      onChange={(event) =>
                        updateCurrentBlockType(event.target.value as WorkoutBlockType)
                      }
                      value={currentBlock.type}
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
                      disabled={!blockUsesRounds(currentBlock.type)}
                      min="1"
                      onChange={(event) =>
                        updateCurrentBlock((current) => ({
                          ...current,
                          rounds: event.target.value
                        }))
                      }
                      placeholder="3"
                      required={blockUsesRounds(currentBlock.type)}
                      type="number"
                      value={currentBlock.rounds}
                    />
                  </label>
                  <label>
                    <span>Time Cap</span>
                    <input
                      onChange={(event) =>
                        updateCurrentBlock((current) => ({
                          ...current,
                          timeCap: event.target.value
                        }))
                      }
                      placeholder="12:00"
                      required
                      value={currentBlock.timeCap}
                    />
                  </label>
                </div>

                <div className="form-section-header compact">
                  <div>
                    <span className="card-label">Ejercicios agregados al bloque</span>
                    <p>
                      {currentBlock.exercises.length > 0
                        ? `${currentBlock.exercises.length} ejercicio(s) listos para incorporar al bloque.`
                        : "Todavia no agregaste ejercicios a este bloque."}
                    </p>
                  </div>
                </div>

                {currentBlock.exercises.length > 0 ? (
                  <div className="exercise-list">
                    {currentBlock.exercises.map((exercise, exerciseIndex) => (
                      <div
                        className="workout-exercise-card"
                        key={`draft-exercise-${exerciseIndex}`}
                      >
                        <div className="form-section-header compact">
                          <div>
                            <span className="card-label">Ejercicio {exerciseIndex + 1}</span>
                          </div>
                          <button
                            className="ghost-button"
                            onClick={() => handleRemoveDraftExercise(exerciseIndex)}
                            type="button"
                          >
                            Quitar ejercicio
                          </button>
                        </div>
                        <div>
                          <strong>{exercise.name}</strong>
                          <p>{buildExerciseProperties(exercise) || "Sin propiedades"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="workout-exercise-card">
                <div className="form-section-header compact">
                  <div>
                    <span className="card-label">Ejercicio en edicion</span>
                    <p>
                      {requiresBlockTimeCap(currentBlock.type)
                        ? "Este bloque usa ejercicios por time cap."
                        : "Completa un ejercicio y agregalo al bloque actual."}
                    </p>
                  </div>
                  <button className="ghost-button" onClick={handleAddExercise} type="button">
                    + Agregar ejercicio
                  </button>
                </div>

                <div className="field-grid">
                  <label>
                    <span>Nombre</span>
                    <input
                      onChange={(event) =>
                        updateCurrentExercise((current) => ({
                          ...current,
                          name: event.target.value
                        }))
                      }
                      placeholder="Thruster"
                      required
                      value={currentExercise.name}
                    />
                  </label>

                  {requiresBlockTimeCap(currentBlock.type) ? (
                    <label>
                      <span>Time Cap</span>
                      <input
                        onChange={(event) =>
                          updateCurrentExercise((current) => ({
                            ...current,
                            timeCap: event.target.value
                          }))
                        }
                        placeholder="00:20"
                        required
                        value={currentExercise.timeCap}
                      />
                    </label>
                  ) : (
                    <>
                      <label>
                        <span>Objetivo</span>
                        <select
                          onChange={(event) =>
                            updateCurrentExercise((current) => ({
                              ...current,
                              targetType: event.target.value as WorkoutExerciseTargetType,
                              reps: event.target.value === "reps" ? current.reps : "",
                              timeCap: event.target.value === "time_cap" ? current.timeCap : ""
                            }))
                          }
                          value={currentExercise.targetType}
                        >
                          <option value="reps">Repeticiones</option>
                          <option value="time_cap">Time Cap</option>
                        </select>
                      </label>

                      {currentExercise.targetType === "reps" ? (
                        <label>
                          <span>Repeticiones</span>
                          <input
                            min="1"
                            onChange={(event) =>
                              updateCurrentExercise((current) => ({
                                ...current,
                                reps: event.target.value
                              }))
                            }
                            placeholder="21"
                            required
                            type="number"
                            value={currentExercise.reps}
                          />
                        </label>
                      ) : (
                        <label>
                          <span>Time Cap</span>
                          <input
                            onChange={(event) =>
                              updateCurrentExercise((current) => ({
                                ...current,
                                timeCap: event.target.value
                              }))
                            }
                            placeholder="01:00"
                            required
                            value={currentExercise.timeCap}
                          />
                        </label>
                      )}
                    </>
                  )}

                  <label>
                    <span>Peso Hombre</span>
                    <input
                      onChange={(event) =>
                        updateCurrentExercise((current) => ({
                          ...current,
                          weightMen: event.target.value
                        }))
                      }
                      placeholder="43/30 kg"
                      value={currentExercise.weightMen}
                    />
                  </label>
                  <label>
                    <span>Peso Mujer</span>
                    <input
                      onChange={(event) =>
                        updateCurrentExercise((current) => ({
                          ...current,
                          weightWomen: event.target.value
                        }))
                      }
                      placeholder="30/20 kg"
                      value={currentExercise.weightWomen}
                    />
                  </label>
                  <label className="field-span-2">
                    <span>% RM</span>
                    <input
                      onChange={(event) =>
                        updateCurrentExercise((current) => ({
                          ...current,
                          percentRm: event.target.value
                        }))
                      }
                      placeholder="75%"
                      value={currentExercise.percentRm}
                    />
                  </label>
                </div>
              </section>
            </div>
          </article>

          <aside className="panel workout-preview-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Vista previa</p>
                <h2>WOD en vivo</h2>
              </div>
              <span className="panel-caption">Se actualiza mientras completas la carga</span>
            </div>

            <div className="workout-preview-shell">
              <div className="workout-preview-header">
                <span className="card-label">{previewWorkoutType}</span>
                <strong>{formatPreviewDate(workoutForm.workoutDate)}</strong>
              </div>

              <div className="workout-preview-list">
                {previewBlocks.map((block, blockIndex) => (
                  <section className="preview-block-card" key={`preview-block-${blockIndex}`}>
                    <div className="preview-block-heading">
                      <div>
                        <span className="card-label">Bloque {blockIndex + 1}</span>
                        <strong>{block.name || `Bloque ${blockIndex + 1}`}</strong>
                      </div>
                      <div className="preview-inline-actions">
                        <span className="preview-block-properties">
                          {buildBlockProperties(block) || "Completa las propiedades del bloque"}
                        </span>
                        <button
                          className="ghost-button"
                          onClick={() => handleRemoveBlock(blockIndex)}
                          type="button"
                        >
                          Quitar bloque
                        </button>
                      </div>
                    </div>

                    <div className="preview-exercise-list">
                      {block.exercises.map((exercise, exerciseIndex) => (
                        <div
                          className="preview-exercise-row"
                          key={`preview-exercise-${blockIndex}-${exerciseIndex}`}
                        >
                          <div>
                            <span className="preview-exercise-index">Ejercicio {exerciseIndex + 1}</span>
                            <strong>{exercise.name || "Ejercicio pendiente"}</strong>
                          </div>
                          <div className="preview-inline-actions">
                            <span className="preview-exercise-properties">
                              {buildExerciseProperties(exercise) || "Define objetivo o cargas"}
                            </span>
                            <button
                              className="ghost-button"
                              onClick={() => handleRemoveBlockExercise(blockIndex, exerciseIndex)}
                              type="button"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                <section className="preview-block-card is-draft">
                  <div className="preview-block-heading">
                    <div>
                      <span className="card-label">Bloque {draftBlockLabel}</span>
                      <strong>{currentBlock.name || `Bloque ${draftBlockLabel}`}</strong>
                    </div>
                    <span className="preview-block-properties">
                      {buildBlockProperties(currentBlock) || "Completa las propiedades del bloque"}
                    </span>
                  </div>

                  <div className="preview-exercise-list">
                    {draftBlockExercises.length > 0 ? (
                      draftBlockExercises.map((exercise, exerciseIndex) => (
                        <div className="preview-exercise-row" key={`draft-preview-${exerciseIndex}`}>
                          <div>
                            <span className="preview-exercise-index">
                              {exerciseIndex < currentBlock.exercises.length
                                ? `Ejercicio ${exerciseIndex + 1}`
                                : "Ejercicio en edicion"}
                            </span>
                            <strong>{exercise.name || "Ejercicio pendiente"}</strong>
                          </div>
                          <span className="preview-exercise-properties">
                            {buildExerciseProperties(exercise) || "Define objetivo o cargas"}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="preview-exercise-row">
                        <div>
                          <span className="preview-exercise-index">Ejercicio en edicion</span>
                          <strong>{currentExercise.name || "Ejercicio pendiente"}</strong>
                        </div>
                        <span className="preview-exercise-properties">
                          {buildExerciseProperties(currentExercise) || "Define objetivo o cargas"}
                        </span>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="form-actions">
                <button
                  className="primary-button"
                  disabled={submittingWorkout}
                  onClick={() => void handleCreateWorkout()}
                  type="button"
                >
                  {submittingWorkout ? "Guardando..." : "Publicar WOD"}
                </button>
                {workoutMessage ? <span className="success-message">{workoutMessage}</span> : null}
                {workoutError ? <span className="error-message">{workoutError}</span> : null}
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
            <Link className="ghost-button link-button" href="/dashboard">
              Volver al dashboard
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
