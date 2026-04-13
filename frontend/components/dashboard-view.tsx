"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { type AuthSession } from "@/lib/auth";
import type { AthleteSummary, DashboardResponse } from "@/lib/types";

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
    activeSection === "home" ? "Pantalla principal del atleta" : "Ranking de atletas";

  const mainDescription =
    activeSection === "home"
      ? "Consulta el WOD destacado del dia, el score ganador hasta el momento y el pulso general del box."
      : "Revisa el leaderboard actual y entra al detalle individual de cada atleta.";

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

            <Link className="side-nav-link" href="/workouts/new">
              <strong>Cargar WOD</strong>
              <span>Ir a la pantalla dedicada para publicar y editar el WOD.</span>
            </Link>

            <Link className="side-nav-link" href="/scores/new">
              <strong>Cargar score</strong>
              <span>Entrar a la pantalla dedicada para registrar resultados.</span>
            </Link>
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

                <div className="highlight-card">
                  <span className="card-label">Acceso rapido</span>
                  <h2>Carga el proximo WOD en una vista dedicada.</h2>
                  <p>
                    Separo el flujo de carga para que la publicacion del WOD y la vista previa
                    vivan en su propia pantalla.
                  </p>
                  <Link className="ghost-button link-button" href="/workouts/new">
                    Ir a cargar WOD
                  </Link>
                  <Link className="ghost-button link-button" href="/scores/new">
                    Ir a cargar score
                  </Link>
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
        </div>
      </section>
    </main>
  );
}
