"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredSession, getStoredSession, storeSession } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import type { AuthResponse, LoginPayload, RegisterPayload } from "@/lib/types";

type AuthMode = "login" | "register";

const initialLoginForm: LoginPayload = {
  email: "",
  password: ""
};

const initialRegisterForm: RegisterPayload = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: ""
};

export function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loginForm, setLoginForm] = useState(initialLoginForm);
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const session = getStoredSession();

    if (session) {
      router.replace("/dashboard");
    } else {
      clearStoredSession();
    }
  }, [router]);

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const session = await apiFetch<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(loginForm)
      });

      storeSession(session);
      router.push("/dashboard");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "No se pudo iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const session = await apiFetch<AuthResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(registerForm)
      });

      storeSession(session);
      setMessage("Registro completado. Ya puedes ingresar al tablero.");
      router.push("/dashboard");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-hero">
        <div className="auth-copy">
          <p className="eyebrow">Gym Scoreboard</p>
          <h1>Ingresa al box digital y sigue tu progreso.</h1>
          <p className="header-copy">
            Accede con tu cuenta para revisar el ranking, consultar el WOD destacado y cargar tus
            resultados. Si todavía no tienes usuario, puedes registrarte en menos de un minuto.
          </p>
        </div>

        <div className="auth-panel">
          <div className="auth-toggle" role="tablist" aria-label="Acceso de atletas">
            <button
              aria-selected={mode === "login"}
              className={`auth-toggle-button ${mode === "login" ? "is-active" : ""}`}
              onClick={() => {
                setMode("login");
                setError(null);
                setMessage(null);
              }}
              type="button"
            >
              Ingresar
            </button>
            <button
              aria-selected={mode === "register"}
              className={`auth-toggle-button ${mode === "register" ? "is-active" : ""}`}
              onClick={() => {
                setMode("register");
                setError(null);
                setMessage(null);
              }}
              type="button"
            >
              Registrarme
            </button>
          </div>

          {mode === "login" ? (
            <form className="workout-form auth-form" onSubmit={(event) => void handleLoginSubmit(event)}>
              <div>
                <p className="eyebrow">Ingreso</p>
                <h2>Bienvenido de nuevo</h2>
              </div>

              <label>
                <span>Correo electrónico</span>
                <input
                  autoComplete="email"
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="atleta@box.com"
                  type="email"
                  value={loginForm.email}
                />
              </label>

              <label>
                <span>Contraseña</span>
                <input
                  autoComplete="current-password"
                  onChange={(event) =>
                    setLoginForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="Tu contraseña"
                  type="password"
                  value={loginForm.password}
                />
              </label>

              <div className="form-actions">
                <button className="primary-button" disabled={loading} type="submit">
                  {loading ? "Validando..." : "Entrar al sitio"}
                </button>
                {error ? <span className="error-message">{error}</span> : null}
              </div>
            </form>
          ) : (
            <form
              className="workout-form auth-form"
              onSubmit={(event) => void handleRegisterSubmit(event)}
            >
              <div>
                <p className="eyebrow">Registro</p>
                <h2>Crea tu cuenta de atleta</h2>
              </div>

              <div className="field-grid">
                <label>
                  <span>Nombre</span>
                  <input
                    autoComplete="given-name"
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, firstName: event.target.value }))
                    }
                    placeholder="Mora"
                    value={registerForm.firstName}
                  />
                </label>

                <label>
                  <span>Apellido</span>
                  <input
                    autoComplete="family-name"
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, lastName: event.target.value }))
                    }
                    placeholder="Gimenez"
                    value={registerForm.lastName}
                  />
                </label>
              </div>

              <label>
                <span>Correo electrónico</span>
                <input
                  autoComplete="email"
                  onChange={(event) =>
                    setRegisterForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="atleta@box.com"
                  type="email"
                  value={registerForm.email}
                />
              </label>

              <div className="field-grid">
                <label>
                  <span>Contraseña</span>
                  <input
                    autoComplete="new-password"
                    onChange={(event) =>
                      setRegisterForm((current) => ({ ...current, password: event.target.value }))
                    }
                    placeholder="Minimo 8 caracteres"
                    type="password"
                    value={registerForm.password}
                  />
                </label>

                <label>
                  <span>Repite la contraseña</span>
                  <input
                    autoComplete="new-password"
                    onChange={(event) =>
                      setRegisterForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value
                      }))
                    }
                    placeholder="Confirma la contraseña"
                    type="password"
                    value={registerForm.confirmPassword}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button className="primary-button" disabled={loading} type="submit">
                  {loading ? "Creando cuenta..." : "Registrarme"}
                </button>
                {message ? <span className="success-message">{message}</span> : null}
                {error ? <span className="error-message">{error}</span> : null}
              </div>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
