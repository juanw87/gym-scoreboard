"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession, type AuthSession } from "@/lib/auth";
import { ScoreSubmitView } from "@/components/score-submit-view";

export function ScoreSubmitShell() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    const storedSession = getStoredSession();

    if (!storedSession) {
      router.replace("/");
      return;
    }

    setSession(storedSession);
  }, [router]);

  if (!session) {
    return <main className="page-shell status-card">Validando acceso del atleta...</main>;
  }

  return <ScoreSubmitView currentUser={session} />;
}
