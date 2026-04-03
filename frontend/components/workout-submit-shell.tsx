"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredSession, type AuthSession } from "@/lib/auth";
import { WorkoutSubmitView } from "@/components/workout-submit-view";

export function WorkoutSubmitShell() {
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

  return <WorkoutSubmitView currentUser={session} />;
}
