"use client";

import { createClient } from "@/lib/supabase/client";

export const ACTIVE_POMODORO_KEY = "active-pomodoro-session";
export const POMODORO_EVENT = "pomodoro-session-change";

export type ActivePomodoroSession = {
  id: string;
  startedAt: string;
  endAt: string;
  plannedMinutes: number;
  remainingSeconds: number;
  activityLabel: string;
  activityCategory: string;
  mode: "focus" | "break";
  paused: boolean;
  logStatus?: "logging" | "logged";
};

function emitPomodoroChange() {
  window.dispatchEvent(new Event(POMODORO_EVENT));
}

export function readActivePomodoroSession() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_POMODORO_KEY);
    return raw ? (JSON.parse(raw) as ActivePomodoroSession) : null;
  } catch {
    return null;
  }
}

export function writeActivePomodoroSession(session: ActivePomodoroSession) {
  localStorage.setItem(ACTIVE_POMODORO_KEY, JSON.stringify(session));
  emitPomodoroChange();
}

export function clearActivePomodoroSession(id?: string) {
  const current = readActivePomodoroSession();
  if (id && current?.id !== id) return;
  localStorage.removeItem(ACTIVE_POMODORO_KEY);
  emitPomodoroChange();
}

export function ringPomodoroBell() {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const ring = (offset: number, frequency: number) => {
    const osc = ctx.createOscillator();
    const shimmer = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    shimmer.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + offset);
    shimmer.frequency.setValueAtTime(frequency * 2, ctx.currentTime + offset);
    gain.gain.setValueAtTime(0.001, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.72);
    osc.connect(gain);
    shimmer.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    shimmer.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.78);
    shimmer.stop(ctx.currentTime + offset + 0.78);
  };
  ring(0, 659.25);
  ring(0.18, 783.99);
  ring(0.36, 1046.5);
  setTimeout(() => void ctx.close(), 1600);
}

export function requestPomodoroNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    void Notification.requestPermission();
  }
}

export function notifyPomodoroComplete(session: ActivePomodoroSession) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const title = session.mode === "break" ? "Break complete" : "Focus session complete";
  const body =
    session.mode === "break"
      ? "Time to come back in."
      : `${session.plannedMinutes} minutes logged automatically.`;
  new Notification(title, { body });
}

export async function completeActivePomodoroSession(
  session: ActivePomodoroSession,
  options: { ring?: boolean; notify?: boolean } = {}
) {
  const current = readActivePomodoroSession();
  if (!current || current.id !== session.id || current.logStatus === "logged") {
    return { logged: false, error: null };
  }
  if (current.logStatus === "logging") {
    return { logged: false, error: null };
  }

  writeActivePomodoroSession({ ...current, logStatus: "logging" });

  const supabase = createClient();
  const endedAt = new Date().toISOString();
  const minutes = current.plannedMinutes;
  const { error } = await supabase.from("pomodoro_sessions").insert({
    started_at: current.startedAt,
    ended_at: endedAt,
    minutes,
    planned_minutes: current.plannedMinutes,
    completed: true,
    activity_label: current.activityLabel,
    activity_category: current.activityCategory,
    mode: current.mode,
    notes: null,
  });

  if (error) {
    writeActivePomodoroSession({ ...current, logStatus: undefined });
    return { logged: false, error };
  }

  if (options.ring) ringPomodoroBell();
  if (options.notify) notifyPomodoroComplete(current);
  clearActivePomodoroSession(current.id);
  window.dispatchEvent(new Event("pomodoro-session-logged"));
  return { logged: true, error: null };
}
