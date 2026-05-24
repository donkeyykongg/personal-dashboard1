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
  autoRestart?: boolean;
  logStatus?: "logging" | "logged";
};

function storageKey(userId?: string) {
  return userId ? `${ACTIVE_POMODORO_KEY}:${userId}` : ACTIVE_POMODORO_KEY;
}

function emitPomodoroChange() {
  window.dispatchEvent(new Event(POMODORO_EVENT));
}

export function readActivePomodoroSession(userId?: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      localStorage.getItem(storageKey(userId)) ??
      (userId ? localStorage.getItem(ACTIVE_POMODORO_KEY) : null);
    return raw ? (JSON.parse(raw) as ActivePomodoroSession) : null;
  } catch {
    return null;
  }
}

export function writeActivePomodoroSession(session: ActivePomodoroSession, userId?: string) {
  localStorage.setItem(storageKey(userId), JSON.stringify(session));
  emitPomodoroChange();
}

export function clearActivePomodoroSession(id?: string, userId?: string) {
  const current = readActivePomodoroSession(userId);
  if (id && current?.id !== id) return;
  localStorage.removeItem(storageKey(userId));
  if (userId) localStorage.removeItem(ACTIVE_POMODORO_KEY);
  emitPomodoroChange();
}

function makeSessionId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nextSessionFrom(session: ActivePomodoroSession) {
  const durationMs = session.plannedMinutes * 60 * 1000;
  const startedAt = new Date(session.endAt);
  const endAt = new Date(startedAt.getTime() + durationMs);

  return {
    ...session,
    id: makeSessionId(),
    startedAt: startedAt.toISOString(),
    endAt: endAt.toISOString(),
    remainingSeconds: session.plannedMinutes * 60,
    paused: false,
    logStatus: undefined,
  };
}

export function remainingSecondsForSession(session: ActivePomodoroSession) {
  return Math.max(0, Math.ceil((new Date(session.endAt).getTime() - Date.now()) / 1000));
}

export async function unlockPomodoroAudio() {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const win = window as typeof window & { __pomodoroAudioContext?: AudioContext };
  const ctx = win.__pomodoroAudioContext ?? new Ctx();
  win.__pomodoroAudioContext = ctx;
  if (ctx.state === "suspended") await ctx.resume();

  const gain = ctx.createGain();
  const osc = ctx.createOscillator();
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.02);
}

export function ringPomodoroBell() {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const win = window as typeof window & { __pomodoroAudioContext?: AudioContext };
  const ctx = win.__pomodoroAudioContext ?? new Ctx();
  win.__pomodoroAudioContext = ctx;
  if (ctx.state === "suspended") void ctx.resume();
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
  for (let i = 0; i < 4; i += 1) {
    const offset = i * 1.35;
    ring(offset, 659.25);
    ring(offset + 0.18, 783.99);
    ring(offset + 0.36, 1046.5);
  }
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
  new Notification(title, { body, requireInteraction: true, silent: false });
}

export async function completeActivePomodoroSession(
  session: ActivePomodoroSession,
  options: { ring?: boolean; notify?: boolean; restart?: boolean; userId?: string } = {}
) {
  const current = readActivePomodoroSession(options.userId);
  if (!current || current.id !== session.id || current.logStatus === "logged") {
    return { logged: false, error: null };
  }
  if (current.logStatus === "logging") {
    return { logged: false, error: null };
  }

  writeActivePomodoroSession({ ...current, logStatus: "logging" }, options.userId);

  const supabase = createClient();
  const endedAt = current.endAt;
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
    writeActivePomodoroSession({ ...current, logStatus: undefined }, options.userId);
    return { logged: false, error };
  }

  if (options.ring) ringPomodoroBell();
  if (options.notify) notifyPomodoroComplete(current);
  const nextSession =
    options.restart && current.autoRestart !== false ? nextSessionFrom(current) : null;

  if (nextSession) {
    writeActivePomodoroSession(nextSession, options.userId);
  } else {
    clearActivePomodoroSession(current.id, options.userId);
  }
  window.dispatchEvent(new Event("pomodoro-session-logged"));
  return { logged: true, error: null, nextSession };
}
