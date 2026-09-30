"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildAuthHeaders, type AuthSession } from "@/lib/auth";
import { rmExerciseOptions, type CreateRmRecordPayload } from "@/lib/types";

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

export function RmSubmitView({ currentUser }: { currentUser: AuthSession }) {
  const [exerciseName, setExerciseName] = useState<string>(rmExerciseOptions[0]);
  const [rmDate, setRmDate] = useState<string>(todayIsoDate());
  const [rmValue, setRmValue] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    const numericValue = Number(rmValue);

    if (!exerciseName) {
      setError("Selecciona un ejercicio de la lista.");
      setSubmitting(false);
      return;
    }

    if (!rmDate) {
      setError("Selecciona la fecha de la marca.");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      setError("Ingresa una carga maxima valida mayor a 0.");
      setSubmitting(false);
      return;
    }

    const payload: CreateRmRecordPayload = {
      exerciseName,
      rmValue: numericValue,
      rmDate
    };

    try {
      await apiFetch("/api/rms", {
        method: "POST",
        headers: buildAuthHeaders(currentUser),
        body: JSON.stringify(payload)
      });

      setRmValue("");
      setMessage(`RM de ${exerciseName} guardado correctamente para el ${rmDate}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo guardar el RM."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-shell">
      <Link className="back-link" href="/dashboard">
        Volver al dashboard
      </Link>

      <section className="hero-panel">
        <div>
          <p className="eyebrow">RM</p>
          <h1>Carga tus marcas de repeticion maxima.</h1>
          <p className="hero-copy">
            Registra la fecha, el ejercicio y la carga maxima que lograste levantar. Solo se guarda
            una marca por ejercicio y por fecha.
          </p>
        </div>

        <div className="highlight-card">
          <span className="card-label">Perfil</span>
          <h2>Tus RMs viven en tu perfil.</h2>
          <p>Consulta el historial por ejercicio desde tu ficha de atleta.</p>
          <Link className="ghost-button link-button" href="/profile">
            Ir a mi perfil
          </Link>
        </div>
      </section>

      <section className="full-width-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Carga personal</p>
              <h2>Subir mi RM</h2>
            </div>
            <span className="panel-caption">{currentUser.name}</span>
          </div>

          <form className="workout-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="field-grid">
              <label>
                <span>Fecha</span>
                <input
                  onChange={(event) => setRmDate(event.target.value)}
                  required
                  type="date"
                  value={rmDate}
                />
              </label>

              <label>
                <span>Ejercicio</span>
                <select
                  onChange={(event) => setExerciseName(event.target.value)}
                  required
                  value={exerciseName}
                >
                  {rmExerciseOptions.map((exercise) => (
                    <option key={exercise} value={exercise}>
                      {exercise}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              <span>Carga maxima (kg)</span>
              <input
                min="0"
                onChange={(event) => setRmValue(event.target.value)}
                placeholder="100"
                required
                step="0.01"
                type="number"
                value={rmValue}
              />
            </label>

            <div className="form-actions">
              <button className="primary-button" disabled={submitting} type="submit">
                {submitting ? "Guardando..." : "Guardar RM"}
              </button>
              {message ? <span className="success-message">{message}</span> : null}
              {error ? <span className="error-message">{error}</span> : null}
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}
