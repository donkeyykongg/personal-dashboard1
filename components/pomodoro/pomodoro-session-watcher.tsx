"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  completeActivePomodoroSession,
  POMODORO_EVENT,
  readActivePomodoroSession,
} from "@/lib/pomodoro/session";

export function PomodoroSessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let completing = false;

    const reconcile = () => {
      const session = readActivePomodoroSession();
      if (!session || session.paused || session.logStatus || completing) return;
      if (Date.now() < new Date(session.endAt).getTime()) return;

      completing = true;
      void completeActivePomodoroSession(session, { ring: true, notify: true }).then(
        ({ logged }) => {
          completing = false;
          if (logged) router.refresh();
        }
      );
    };

    reconcile();
    interval = setInterval(reconcile, 1000);
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
