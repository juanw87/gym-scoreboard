"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

const RESPONSIVE_BREAKPOINT = 980;

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
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth >= RESPONSIVE_BREAKPOINT : true
  );
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth < RESPONSIVE_BREAKPOINT : false
  );

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((previous) => !previous);
  }, []);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth < RESPONSIVE_BREAKPOINT;
      setIsMobile(mobile);
      // El comportamiento por defecto se adapta al nuevo tamaño:
      // visible en pantallas grandes, oculto en pantallas pequeñas.
      setIsMenuOpen(!mobile);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile || !isMenuOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isMenuOpen]);

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
    activeSection === "home" ? "Entrená. Registrá. Supérate." : "Ranking de atletas";

  const mainDescription =
    activeSection === "home"
      ? "Registrá tus resultados, seguí tu evolución y descubrí de lo que sos capaz. Cada entrenamiento cuenta. Cada marca superada es un paso más hacia tu mejor versión."
      : "Revisa el leaderboard actual y entra al detalle individual de cada atleta.";

  return (
    <main className="page-shell">
      <header className="top-header">
        <div>
          <h1>{mainTitle}</h1>
          <p className="header-copy">{mainDescription}</p>
        </div>
        <div className="header-actions">
         
          <div className="session-badge">
            <div>
               {isMobile ? (
                  <button
                    aria-controls="side-nav"
                    aria-expanded={isMenuOpen}
                    aria-label={isMenuOpen ? "Ocultar menu de navegacion" : "Mostrar menu de navegacion"}
                    className={`ghost-button icon-button menu-toggle${isMenuOpen ? " is-open" : ""}`}
                    onClick={toggleMenu}
                    type="button"
                  >
                    <span aria-hidden="true" className="menu-float-icon is-hamburger">
                      <svg
                        fill="none"
                        height="20"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="20"
                      >
                        <path d="M3 12h18M3 6h18M3 18h18" />
                      </svg>
                    </span>
                    <span aria-hidden="true" className="menu-float-icon is-close">
                      <svg
                        fill="none"
                        height="20"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                        width="20"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </span>
                  </button>
                ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
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
        </div>
      </header>

      <section
        className={`dashboard-layout${!isMobile && !isMenuOpen ? " sidebar-collapsed" : ""}`}
      >
        <aside
          aria-hidden={isMobile && !isMenuOpen ? true : undefined}
          aria-label="Menu principal"
          className={`side-nav${isMobile ? " side-nav--mobile" : ""} ${isMenuOpen ? "is-open" : "is-closed"}`}
          id="side-nav"
          inert={isMobile && !isMenuOpen ? true : undefined}
        >
          <div className="side-nav-header">
            <span className="card-label">Tu espacio de entrenamiento</span>
            <p>Todo lo que necesitás para registrar tus WODs, consultar tus marcas y seguir tu progreso.</p>
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

            <Link className="side-nav-link" href="/rms/new">
              <strong>Cargar RM</strong>
              <span>Registrar tus marcas de repeticion maxima por ejercicio.</span>
            </Link>
          </nav>

          <div className="side-nav-summary">
            <strong>{dashboard?.stats.activeAthletes ?? 0}</strong>
            <span>Atletas con actividad registrada</span>
          </div>
        </aside>

        {isMobile && isMenuOpen ? (
          <div
            aria-hidden="true"
            className="menu-backdrop is-visible"
            onClick={() => setIsMenuOpen(false)}
          />
        ) : null}

        <div className="dashboard-main">
          {activeSection === "home" ? (
            <>
              <section className="hero-panel">
                <div>
                  <h1>Cada WOD cuenta. Cada marca importa.</h1>
                  <p className="hero-copy">
                    Convertí los entrenamientos en progreso medible. Registrá resultados, seguí la evolución de tus atletas y descubrí hasta dónde puede llegar tu box.
                  </p>
                </div>

                <div className="highlight-card">
                  <span className="card-label">Acceso rapido</span>
                  <h2>No pierdas de vista tu progreso.</h2>
                  <p>
                    Carga el WOD del día o registra tus marcas para tener un historial completo de tu evolución. 
                  </p>
                  <div className="form-actions">
                    <Link className="ghost-button link-button" href="/workouts/new">
                      Cargar WOD
                    </Link>
                    <Link className="ghost-button link-button" href="/scores/new">
                      Registrar score
                    </Link>
                  </div>
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
                  <div>
                    <div className="panel-heading">
                      <div>
                        <p className="eyebrow">Ranking express</p>
                        <h2>Podio diario</h2>
                      </div>                   
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
                  </div>
                  
                     <button
                      className="ghost-button"
                      onClick={() => setActiveSection("ranking")}
                      type="button"
                    >
                      Ranking completo
                    </button>
                </article>

                <article className="panel">
                  <div className="panel-heading">
                    <div>
                      <p className="eyebrow">Historial</p>
                      <h2>Ultimos WODs cargados</h2>
                    </div>
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
