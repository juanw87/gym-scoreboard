export type AuthSession = {
  athleteId: number;
  name: string;
  email: string;
};

const AUTH_STORAGE_KEY = "gym-scoreboard-session";

export function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function buildAuthHeaders(session: AuthSession) {
  return {
    "x-athlete-id": String(session.athleteId)
  };
}
