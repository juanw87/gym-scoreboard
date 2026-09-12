"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { apiFetch } from "@/lib/api";
import type {
  ExtractWorkoutImagePayload,
  ExtractWorkoutImageResponse,
  NewWorkoutPayload,
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

type WorkoutInputMode = "manual" | "photo";

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

function allowsRepsWithTimeCap(type: WorkoutBlockType) {
  return type !== "tabata";
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

function buildExerciseProperties(exercise: WorkoutExerciseForm, blockType?: WorkoutBlockType) {
  const shouldShowTimeCap =
    exercise.targetType === "time_cap" || blockType === "emon" || blockType === "tabata";

  const targets = [
    exercise.reps ? `${exercise.reps} reps` : null,
    shouldShowTimeCap && exercise.timeCap ? `TC ${exercise.timeCap}` : null
  ];

  const loads = [
    exercise.weightMen ? `H ${exercise.weightMen}` : null,
    exercise.weightWomen ? `M ${exercise.weightWomen}` : null,
    exercise.percentRm ? `%RM ${exercise.percentRm}` : null
  ];

  return [...targets, ...loads].filter(Boolean).join(" | ");
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

function mapPayloadExerciseToForm(exercise: NewWorkoutPayload["blocks"][number]["exercises"][number]) {
  return {
    name: exercise.name,
    targetType: exercise.targetType,
    reps: exercise.reps?.toString() ?? "",
    timeCap: exercise.timeCap ?? "",
    weightMen: exercise.weightMen ?? "",
    weightWomen: exercise.weightWomen ?? "",
    percentRm: exercise.percentRm ?? ""
  } satisfies WorkoutExerciseForm;
}

function mapPayloadBlockToForm(block: NewWorkoutPayload["blocks"][number]) {
  return {
    name: block.name,
    type: block.type,
    rounds: block.rounds.toString(),
    timeCap: block.timeCap,
    exercises: block.exercises.map(mapPayloadExerciseToForm)
  } satisfies WorkoutBlockForm;
}

function cloneExercise(exercise: WorkoutExerciseForm): WorkoutExerciseForm {
  return { ...exercise };
}

function cloneBlock(block: WorkoutBlockForm): WorkoutBlockForm {
  return {
    ...block,
    exercises: block.exercises.map(cloneExercise)
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    reader.onerror = () => {
      reject(new Error("No se pudo leer la imagen seleccionada."));
    };

    reader.readAsDataURL(file);
  });
}

const initialWorkoutForm: WorkoutFormState = {
  workoutDate: "",
  blocks: []
};

export function WorkoutSubmitView() {
  const [workoutInputMode, setWorkoutInputMode] = useState<WorkoutInputMode>("manual");
  const [submittingWorkout, setSubmittingWorkout] = useState(false);
  const [extractingWorkoutImage, setExtractingWorkoutImage] = useState(false);
  const [workoutMessage, setWorkoutMessage] = useState<string | null>(null);
  const [workoutError, setWorkoutError] = useState<string | null>(null);
  const [workoutForm, setWorkoutForm] = useState(initialWorkoutForm);
  const [currentBlock, setCurrentBlock] = useState<WorkoutBlockForm>(createEmptyBlock());
  const [currentExercise, setCurrentExercise] = useState<WorkoutExerciseForm>(createEmptyExercise());
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);

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
            targetType: "time_cap"
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
    console.log(currentBlock);
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

  function handleEditDraftExercise(exerciseIndex: number) {
    const exerciseToEdit = currentBlock.exercises[exerciseIndex];

    if (!exerciseToEdit) {
      return;
    }

    setCurrentExercise(cloneExercise(exerciseToEdit));
    updateCurrentBlock((current) => ({
      ...current,
      exercises: current.exercises.filter((_, index) => index !== exerciseIndex)
    }));
    setWorkoutMessage(null);
    setWorkoutError(null);
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

  function handleEditBlock(blockIndex: number) {
    const blockToEdit = workoutForm.blocks[blockIndex];

    if (!blockToEdit) {
      return;
    }

    setCurrentBlock(cloneBlock(blockToEdit));
    resetCurrentExercise(blockToEdit.type);
    setWorkoutForm((current) => ({
      ...current,
      blocks: current.blocks.filter((_, index) => index !== blockIndex)
    }));
    setWorkoutInputMode("manual");
    setWorkoutMessage("El bloque se movio al editor para que puedas ajustarlo.");
    setWorkoutError(null);
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

  async function handleExtractWorkoutFromPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPhoto) {
      setWorkoutError("Selecciona una foto del WOD antes de procesarla.");
      setWorkoutMessage(null);
      return;
    }

    setExtractingWorkoutImage(true);
    setWorkoutMessage(null);
    setWorkoutError(null);

    try {
      const imageDataUrl = await readFileAsDataUrl(selectedPhoto);
      const payload: ExtractWorkoutImagePayload = { imageDataUrl };
      const extractedWorkout = await apiFetch<ExtractWorkoutImageResponse>("/api/workouts/extract-image", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setWorkoutForm({
        workoutDate: extractedWorkout.workoutDate,
        blocks: extractedWorkout.blocks.map(mapPayloadBlockToForm)
      });
      resetCurrentBlock();
      setWorkoutInputMode("manual");
      setWorkoutMessage(
        extractedWorkout.usedFallbackDate
          ? "La foto fue procesada. No se detecto fecha y se uso la fecha de hoy; ahora puedes editar la vista previa antes de publicar."
          : "La foto fue procesada. Ahora puedes editar la vista previa antes de publicar el WOD."
      );
    } catch (requestError) {
      setWorkoutError(
        requestError instanceof Error ? requestError.message : "No se pudo procesar la foto del WOD."
      );
    } finally {
      setExtractingWorkoutImage(false);
    }
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
          reps: exercise.reps.trim() ? Number(exercise.reps) : undefined,
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
      setWorkoutMessage("WOD creado. Ahora cada atleta puede cargar su score desde la pantalla dedicada.");
    } catch (requestError) {
      setWorkoutError(
        requestError instanceof Error ? requestError.message : "No se pudo crear el WOD."
      );
    } finally {
      setSubmittingWorkout(false);
    }
  }

  const previewWorkoutType = deriveWorkoutType(
    workoutForm.blocks.length > 0
      ? workoutForm.blocks
      : workoutInputMode === "manual"
        ? [currentBlock]
        : []
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
            Puedes armar el WOD manualmente o subir una foto para que la IA reconstruya bloques y
            ejercicios antes de publicar.
          </p>
        </div>
        <div className="highlight-card">
          <span className="card-label">Siguiente paso</span>
          <h2>La carga de score ahora vive en una pantalla separada.</h2>
          <p>Publica el WOD aqui y luego entra a la vista dedicada para registrar resultados.</p>
          <Link className="ghost-button link-button" href="/scores/new">
            Ir a cargar score
          </Link>
        </div>
      </section>

      <section className="content-grid submit-grid">
        <div className="workout-builder-layout">
          <article className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Carga</p>
                <h2>{workoutInputMode === "manual" ? "Armar WOD del dia" : "Subir foto del WOD"}</h2>
              </div>
              <span className="panel-caption">
                {workoutInputMode === "manual"
                  ? "Fecha, bloque actual y ejercicio actual"
                  : "Carga una imagen y deja que la IA prepare la vista previa"}
              </span>
            </div>

            <div className="panel-tabs" role="tablist" aria-label="Modo de carga de WOD">
              <button
                aria-selected={workoutInputMode === "manual"}
                className={workoutInputMode === "manual" ? "tab-button is-active" : "tab-button"}
                onClick={() => setWorkoutInputMode("manual")}
                role="tab"
                type="button"
              >
                Formulario
              </button>
              <button
                aria-selected={workoutInputMode === "photo"}
                className={workoutInputMode === "photo" ? "tab-button is-active" : "tab-button"}
                onClick={() => setWorkoutInputMode("photo")}
                role="tab"
                type="button"
              >
                Subir foto
              </button>
            </div>

            {workoutInputMode === "manual" ? (
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
                  <button
                    aria-label="Agregar bloque"
                    className="ghost-button button-with-icon icon-button"
                    onClick={handleAddBlock}
                    title="Agregar bloque"
                    type="button"
                  >
                    <FontAwesomeIcon aria-hidden="true" icon={faPlus} />
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
                            aria-label={`Editar ejercicio ${exerciseIndex + 1}`}
                            className="ghost-button button-with-icon icon-button"
                            onClick={() => handleEditDraftExercise(exerciseIndex)}
                            title="Editar ejercicio"
                            type="button"
                          >
                            <FontAwesomeIcon aria-hidden="true" icon={faEdit} />
                          </button>
                          <button
                            aria-label={`Eliminar ejercicio ${exerciseIndex + 1}`}
                            className="ghost-button button-with-icon icon-button"
                            onClick={() => handleRemoveDraftExercise(exerciseIndex)}
                            title="Eliminar ejercicio"
                            type="button"
                          >
                            <FontAwesomeIcon aria-hidden="true" icon={faTrash} />
                          </button>
                        </div>
                        <div>
                          <strong>{exercise.name}</strong>
                          <p>{buildExerciseProperties(exercise, currentBlock.type) || "Sin propiedades"}</p>
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
                        ? allowsRepsWithTimeCap(currentBlock.type)
                          ? "Este bloque usa ejercicios por time cap y puede incluir repeticiones."
                          : "Este bloque usa ejercicios por time cap."
                        : "Completa un ejercicio y agregalo al bloque actual."}
                    </p>
                  </div>
                  <button
                    aria-label="Agregar ejercicio"
                    className="ghost-button button-with-icon icon-button"
                    onClick={handleAddExercise}
                    title="Agregar ejercicio"
                    type="button"
                  >
                    <FontAwesomeIcon aria-hidden="true" icon={faPlus} />
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
                    <>
                      {allowsRepsWithTimeCap(currentBlock.type) ? (
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
                            placeholder="15"
                            type="number"
                            value={currentExercise.reps}
                          />
                        </label>
                      ) : null}
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
                    </>
                  ) : (
                    <>
                      <label>
                        <span>Objetivo</span>
                        <select
                          onChange={(event) =>
                            updateCurrentExercise((current) => ({
                              ...current,
                              targetType: event.target.value as WorkoutExerciseTargetType,
                              reps: current.reps,
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
                        <>
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
                              placeholder="15"
                              type="number"
                              value={currentExercise.reps}
                            />
                          </label>
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
                        </>
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
            ) : (
              <form className="workout-form" onSubmit={(event) => void handleExtractWorkoutFromPhoto(event)}>
                <section className="workout-photo-card">
                  <div className="form-section-header">
                    <div>
                      <span className="card-label">Foto del WOD</span>
                      <p>Sube una imagen clara. La IA va a reconstruir bloques y ejercicios.</p>
                    </div>
                  </div>

                  <label className="upload-field">
                    <span>Imagen</span>
                    <input
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => setSelectedPhoto(event.target.files?.[0] ?? null)}
                      type="file"
                    />
                  </label>

                  <div className="upload-meta">
                    <strong>{selectedPhoto?.name ?? "Todavia no seleccionaste una imagen."}</strong>
                    <p>Formatos permitidos: PNG, JPG o WEBP.</p>
                  </div>

                  <div className="form-actions">
                    <button className="primary-button" disabled={extractingWorkoutImage} type="submit">
                      {extractingWorkoutImage ? "Procesando..." : "Procesar foto"}
                    </button>
                  </div>
                </section>
              </form>
            )}
          </article>

          <aside className="panel workout-preview-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Vista previa</p>
                <h2>WOD en vivo</h2>
              </div>
              <span className="panel-caption">
                {workoutInputMode === "manual"
                  ? "Se actualiza mientras completas la carga"
                  : "Valida la extraccion antes de publicar"}
              </span>
            </div>

            <div className="workout-preview-shell">
              <div className="workout-preview-header">
                <span className="card-label">{previewWorkoutType}</span>
                <strong>{formatPreviewDate(workoutForm.workoutDate)}</strong>
              </div>

              <div className="workout-preview-list">
                {previewBlocks.length === 0 && workoutInputMode === "photo" ? (
                  <section className="preview-block-card">
                    <div className="preview-block-heading">
                      <div>
                        <span className="card-label">Pendiente</span>
                        <strong>Sube una foto para generar la vista previa</strong>
                      </div>
                      <span className="preview-block-properties">
                        La extraccion cargara aqui la estructura del WOD.
                      </span>
                    </div>
                  </section>
                ) : null}

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
                          aria-label={`Editar bloque ${blockIndex + 1}`}
                          className="ghost-button button-with-icon icon-button"
                          onClick={() => handleEditBlock(blockIndex)}
                          title="Editar bloque"
                          type="button"
                        >
                          <FontAwesomeIcon aria-hidden="true" icon={faEdit} />
                        </button>
                        {workoutInputMode === "manual" ? (
                          <button
                            aria-label={`Eliminar bloque ${blockIndex + 1}`}
                            className="ghost-button button-with-icon icon-button"
                            onClick={() => handleRemoveBlock(blockIndex)}
                            title="Eliminar bloque"
                            type="button"
                          >
                            <FontAwesomeIcon aria-hidden="true" icon={faTrash} />
                          </button>
                        ) : null}
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
                              {buildExerciseProperties(exercise, block.type) || "Define objetivo o cargas"}
                            </span>
                            {workoutInputMode === "manual" ? (
                              <button
                                aria-label={`Eliminar ejercicio ${exerciseIndex + 1} del bloque ${blockIndex + 1}`}
                                className="ghost-button button-with-icon icon-button"
                                onClick={() => handleRemoveBlockExercise(blockIndex, exerciseIndex)}
                                title="Eliminar ejercicio"
                                type="button"
                              >
                                <FontAwesomeIcon aria-hidden="true" icon={faTrash} />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ))}

                {workoutInputMode === "manual" ? (
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
                              {buildExerciseProperties(exercise, currentBlock.type) || "Define objetivo o cargas"}
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
                            {buildExerciseProperties(currentExercise, currentBlock.type) || "Define objetivo o cargas"}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>
                ) : null}
              </div>

              <div className="form-actions">
                <button
                  className="primary-button"
                  disabled={submittingWorkout || extractingWorkoutImage}
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
      </section>
    </main>
  );
}
