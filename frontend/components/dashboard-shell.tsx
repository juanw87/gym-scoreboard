"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStoredSession, getStoredSession, type AuthSession } from "@/lib/auth";
import { DashboardView } from "@/components/dashboard-view";

export function DashboardShell() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedSession = getStoredSession();

    if (!storedSession) {
      router.replace("/");
      return;
    }

    setSession(storedSession);
    setLoading(false);
  }, [router]);

  function handleLogout() {
    clearStoredSession();
    router.push("/");
  }

  if (loading || !session) {
    return <main className="page-shell status-card">Validando acceso del atleta...</main>;
  }

  return <DashboardView currentUser={session} onLogout={handleLogout} />;
}
