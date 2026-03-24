"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { buildAuthHeaders, type AuthSession } from "@/lib/auth";
import type { AthleteProfileForm, AthleteProfileResponse } from "@/lib/types";

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

      <section className="content-grid profile-grid">
        <article className="panel profile-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Datos personales</p>
              <h2>Ficha del atleta</h2>
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

          <form className="workout-form profile-form" onSubmit={(event) => void handleSubmit(event)}>
            <div className="field-grid">
              <label>
                <span>Nombre</span>
                <input
                  disabled={!isEditing}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, firstName: event.target.value }))
                  }
                  value={formData.firstName}
                />
              </label>

              <label>
                <span>Apellido</span>
                <input
                  disabled={!isEditing}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, lastName: event.target.value }))
                  }
                  value={formData.lastName}
                />
              </label>
            </div>

            <div className="field-grid">
              <label>
                <span>Edad</span>
                <input
                  disabled={!isEditing}
                  min="1"
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, age: event.target.value }))
                  }
                  placeholder="28"
                  type="number"
                  value={formData.age}
                />
              </label>

              <label>
                <span>Correo electronico</span>
                <input disabled value={profile?.email ?? currentUser.email} />
              </label>
            </div>

            <div className="field-grid">
              <label>
                <span>Estatura (cm)</span>
                <input
                  disabled={!isEditing}
                  min="1"
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, heightCm: event.target.value }))
                  }
                  placeholder="170"
                  step="0.01"
                  type="number"
                  value={formData.heightCm}
                />
              </label>

              <label>
                <span>Peso (kg)</span>
                <input
                  disabled={!isEditing}
                  min="1"
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, weightKg: event.target.value }))
                  }
                  placeholder="70"
                  step="0.01"
                  type="number"
                  value={formData.weightKg}
                />
              </label>
            </div>

            <div className="form-actions">
              <button className="primary-button" disabled={!isEditing || saving} type="submit">
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              {isEditing ? (
                <button className="ghost-button" onClick={handleCancel} type="button">
                  Cancelar
                </button>
              ) : null}
              {message ? <span className="success-message">{message}</span> : null}
              {error ? <span className="error-message">{error}</span> : null}
            </div>
          </form>
        </article>

        <article className="panel profile-summary-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Estado actual</p>
              <h2>Resumen rapido</h2>
            </div>
          </div>

          <div className="metric-grid">
            <div>
              <span>Nombre completo</span>
              <strong>{`${formData.firstName} ${formData.lastName}`.trim() || "-"}</strong>
            </div>
            <div>
              <span>Edad</span>
              <strong>{formData.age || "-"}</strong>
            </div>
            <div>
              <span>Estatura</span>
              <strong>{formData.heightCm ? `${formData.heightCm} cm` : "-"}</strong>
            </div>
            <div>
              <span>Peso</span>
              <strong>{formData.weightKg ? `${formData.weightKg} kg` : "-"}</strong>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
