"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  completeActivePomodoroSession,
  POMODORO_EVENT,
  readActivePomodoroSession,
  remainingSecondsForSession,
} from "@/lib/pomodoro/session";
import { createClient } from "@/lib/supabase/client";

export function PomodoroSessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let completing = false;
    let userId: string | undefined;
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id;
      void reconcile();
    });

    const reconcile = async () => {
      let session = readActivePomodoroSession(userId);
      if (!session || session.paused || session.logStatus || completing) return;
      if (remainingSecondsForSession(session) > 0) return;

      completing = true;
      let loggedAny = false;
      for (let i = 0; i < 48; i += 1) {
        if (!session || session.paused || remainingSecondsForSession(session) > 0) break;
        const { logged, nextSession } = await completeActivePomodoroSession(session, {
          ring: i === 0,
          notify: i === 0,
          restart: true,
          userId,
        });
        if (!logged) break;
        loggedAny = true;
        session = nextSession ?? readActivePomodoroSession(userId);
      }
      completing = false;
      if (loggedAny) router.refresh();
    };

    void reconcile();
    interval = setInterval(() => void reconcile(), 1000);
    window.addEventListener(POMODORO_EVENT, reconcile);
    window.addEventListener("focus", reconcile);
    window.addEventListener("visibilitychange", reconcile);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener(POMODORO_EVENT, reconcile);
      window.removeEventListener("focus", reconcile);
      window.removeEventListener("visibilitychange", reconcile);
    };
  }, [router]);

  return null;
}
