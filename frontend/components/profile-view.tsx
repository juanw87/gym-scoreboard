"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildAuthHeaders, type AuthSession } from "@/lib/auth";
import type { AthleteProfileForm, AthleteProfileResponse, RmRecordGroup } from "@/lib/types";

function toFormState(profile: AthleteProfileResponse): AthleteProfileForm {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    age: profile.age === null ? "" : String(profile.age),
    heightCm: profile.heightCm === null ? "" : String(profile.heightCm),
    weightKg: profile.weightKg === null ? "" : String(profile.weightKg)
  };
}

function toNullableNumber(value: string) {
  if (value.trim() === "") {
    return null;
  }

  return Number(value);
}

export function ProfileView({ currentUser }: { currentUser: AuthSession }) {
  const [profile, setProfile] = useState<AthleteProfileResponse | null>(null);
  const [formData, setFormData] = useState<AthleteProfileForm>({
    firstName: "",
    lastName: "",
    age: "",
    heightCm: "",
    weightKg: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rmGroups, setRmGroups] = useState<RmRecordGroup[]>([]);
  const [rmLoading, setRmLoading] = useState(true);
  const [rmError, setRmError] = useState<string | null>(null);
  const [expandedExercises, setExpandedExercises] = useState<string[]>([]);

  async function loadProfile() {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch<AthleteProfileResponse>(
        `/api/profile/${currentUser.athleteId}`,
        {
          headers: buildAuthHeaders(currentUser)
        }
      );

      setProfile(response);
      setFormData(toFormState(response));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo cargar el perfil."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, [currentUser.athleteId]);

  useEffect(() => {
    async function loadRms() {
      setRmLoading(true);
      setRmError(null);

      try {
        const response = await apiFetch<RmRecordGroup[]>(
          `/api/rms/${currentUser.athleteId}`,
          {
            headers: buildAuthHeaders(currentUser)
          }
        );

        setRmGroups(response);
      } catch (requestError) {
        setRmError(
          requestError instanceof Error ? requestError.message : "No se pudieron cargar los RMs."
        );
      } finally {
        setRmLoading(false);
      }
    }

    void loadRms();
  }, [currentUser.athleteId]);

  function toggleExercise(exerciseName: string) {
    setExpandedExercises((current) =>
      current.includes(exerciseName)
        ? current.filter((name) => name !== exerciseName)
        : [...current, exerciseName]
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const updatedProfile = await apiFetch<AthleteProfileResponse>(
        `/api/profile/${currentUser.athleteId}`,
        {
          method: "PUT",
          headers: buildAuthHeaders(currentUser),
          body: JSON.stringify({
            firstName: formData.firstName,
            lastName: formData.lastName,
            age: toNullableNumber(formData.age),
            heightCm: toNullableNumber(formData.heightCm),
            weightKg: toNullableNumber(formData.weightKg)
          })
        }
      );

      setProfile(updatedProfile);
      setFormData(toFormState(updatedProfile));
      setIsEditing(false);
      setMessage("Perfil actualizado correctamente.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo actualizar el perfil."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (profile) {
      setFormData(toFormState(profile));
    }

    setIsEditing(false);
    setError(null);
    setMessage(null);
  }

  if (loading) {
    return <main className="page-shell status-card">Cargando perfil del atleta...</main>;
  }

  if (error && !profile) {
    return (
      <main className="page-shell status-card">
        <p>{error}</p>
        <Link
          aria-label="Volver al dashboard"
          className="ghost-button link-button icon-button"
          href="/dashboard"
          title="Volver al dashboard"
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
            <path d="M15 18l-6-6 6-6" />
            <path d="M21 12H9" />
          </svg>
        </Link>
      </main>
    );
  }

  return (
    <main className="page-shell profile-page">
      <header className="top-header">
        <div>
          <p className="eyebrow">Perfil del atleta</p>
          <h1>Tu informacion personal</h1>
        </div>
        <div className="header-actions">
          <p className="header-copy">
            Completa y actualiza tus datos cuando lo necesites. Solo los atletas con sesion activa
            pueden acceder a esta pantalla.
          </p>
          <div className="session-badge">
            <span>{currentUser.name}</span>
            <Link
              aria-label="Volver al dashboard"
              className="ghost-button link-button icon-button"
              href="/dashboard"
              title="Volver al dashboard"
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
                <path d="M15 18l-6-6 6-6" />
                <path d="M21 12H9" />
              </svg>
            </Link>
          </div>
        </div>
      </header>

      <section className="full-width-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Datos personales</p>
              <h2>Resumen rapido</h2>
            </div>

            <button
              aria-label={isEditing ? "Desactivar edicion" : "Editar perfil"}
              className={`ghost-button icon-button ${isEditing ? "is-active-toggle" : ""}`}
              onClick={() => {
                setIsEditing((current) => !current);
                setMessage(null);
                setError(null);
              }}
              title={isEditing ? "Desactivar edicion" : "Editar perfil"}
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
                {isEditing ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </>
                )}
              </svg>
            </button>
          </div>

          <form className="workout-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="metric-grid">
              <div>
                <span>Nombre</span>
                {isEditing ? (
                  <input
                    minLength={2}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, firstName: event.target.value }))
                    }
                    required
                    value={formData.firstName}
                  />
                ) : (
                  <strong>{formData.firstName || "-"}</strong>
                )}
              </div>

              <div>
                <span>Apellido</span>
                {isEditing ? (
                  <input
                    minLength={2}
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, lastName: event.target.value }))
                    }
                    required
                    value={formData.lastName}
                  />
                ) : (
                  <strong>{formData.lastName || "-"}</strong>
                )}
              </div>

              <div>
                <span>Edad</span>
                {isEditing ? (
                  <input
                    min="1"
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, age: event.target.value }))
                    }
                    placeholder="28"
                    type="number"
                    value={formData.age}
                  />
                ) : (
                  <strong>{formData.age || "-"}</strong>
                )}
              </div>

              <div>
                <span>Correo electronico</span>
                <strong style={{ fontSize: "1.1rem", overflowWrap: "anywhere" }}>
                  {profile?.email ?? currentUser.email}
                </strong>
              </div>

              <div>
                <span>Estatura (cm)</span>
                {isEditing ? (
                  <input
                    min="1"
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, heightCm: event.target.value }))
                    }
                    placeholder="170"
                    step="0.01"
                    type="number"
                    value={formData.heightCm}
                  />
                ) : (
                  <strong>{formData.heightCm ? `${formData.heightCm} cm` : "-"}</strong>
                )}
              </div>

              <div>
                <span>Peso (kg)</span>
                {isEditing ? (
                  <input
                    min="1"
                    onChange={(event) =>
                      setFormData((current) => ({ ...current, weightKg: event.target.value }))
                    }
                    placeholder="70"
                    step="0.01"
                    type="number"
                    value={formData.weightKg}
                  />
                ) : (
                  <strong>{formData.weightKg ? `${formData.weightKg} kg` : "-"}</strong>
                )}
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "16px" }}>
              {isEditing ? (
                <>
                  <button className="primary-button" disabled={saving} type="submit">
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                  <button className="ghost-button" onClick={handleCancel} type="button">
                    Cancelar
                  </button>
                </>
              ) : null}
              {message ? <span className="success-message">{message}</span> : null}
              {error ? <span className="error-message">{error}</span> : null}
            </div>
          </form>

          <div className="panel-heading" style={{ marginTop: "22px", marginBottom: "14px" }}>
            <div>
              <p className="eyebrow">Personal records</p>
              <h2 style={{ fontSize: "1.4rem" }}>Mejores marcas</h2>
            </div>
          </div>

          {rmLoading ? (
            <p>Cargando RMs...</p>
          ) : rmGroups.length === 0 ? (
            <p style={{ color: "var(--muted)", margin: 0 }}>
              Todavia no cargaste RMs.{" "}
              <Link className="back-link" href="/rms/new" style={{ marginBottom: 0 }}>
                Cargar RM
              </Link>
            </p>
          ) : (
            <>
              <div className="metric-grid">
                {rmGroups.slice(0, 4).map((group) => (
                  <div key={group.exerciseName}>
                    <span>{group.exerciseName}</span>
                    <strong>{group.latest.rmValue} kg</strong>
                  </div>
                ))}
              </div>
              <p style={{ margin: "14px 0 0" }}>
                <a className="back-link" href="#mis-rms" style={{ marginBottom: 0 }}>
                  Ver todos en Mis RMs
                </a>
              </p>
            </>
          )}
        </article>
      </section>

      <section className="full-width-grid">
        <article className="panel" id="mis-rms">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Fuerza</p>
              <h2>Mis RMs por ejercicio</h2>
            </div>
            <Link className="ghost-button link-button" href="/rms/new">
              Cargar RM
            </Link>
          </div>

          {rmLoading ? (
            <p>Cargando RMs...</p>
          ) : rmError ? (
            <p className="error-message">{rmError}</p>
          ) : rmGroups.length === 0 ? (
            <div className="highlight-card">
              <span className="card-label">Sin marcas</span>
              <strong>Todavia no cargaste RMs</strong>
              <p>Registra tu primera marca desde la pantalla de carga de RMs.</p>
            </div>
          ) : (
            <div className="history-list">
              {rmGroups.map((group) => {
                const isExpanded = expandedExercises.includes(group.exerciseName);

                return (
                  <div className="history-row" key={group.exerciseName}>
                    <div style={{ width: "100%" }}>
                      <button
                        aria-expanded={isExpanded}
                        className="ghost-button"
                        onClick={() => toggleExercise(group.exerciseName)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          width: "100%",
                          alignItems: "center"
                        }}
                        type="button"
                      >
                        <strong>{group.exerciseName}</strong>
                        <span>
                          {group.latest.rmValue} kg ({group.latest.rmDate}){" "}
                          {isExpanded ? "-" : "+"}
                        </span>
                      </button>

                      {isExpanded ? (
                        <div style={{ marginTop: "0.75rem" }}>
                          {group.history.map((record) => (
                            <div
                              className="history-meta"
                              key={record.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "0.35rem 0"
                              }}
                            >
                              <span>{record.rmDate}</span>
                              <span>
                                <strong>{record.rmValue} kg</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
