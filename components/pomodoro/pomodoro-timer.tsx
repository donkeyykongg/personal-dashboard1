"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  clearActivePomodoroSession,
  completeActivePomodoroSession,
  isPomodoroAlarmMuted,
  POMODORO_EVENT,
  readActivePomodoroSession,
  requestPomodoroNotificationPermission,
  remainingSecondsForSession,
  setPomodoroAlarmMuted,
  unlockPomodoroAudio,
  writeActivePomodoroSession,
  type ActivePomodoroSession,
} from "@/lib/pomodoro/session";
import type { DailyTask } from "@/lib/supabase/types";
import styles from "./focus-page.module.css";

const ACTIVITY_CATEGORIES = [
  "School",
  "Studying",
  "Club work",
  "Work",
  "Admin",
  "Personal",
  "Break",
  "Other",
];

type LocalGoal = {
  text: string;
  done?: boolean;
};

type WorkItem = {
  id: string;
  label: string;
  dayLabel: string;
  source: string;
  category?: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dateForOffset(offset: number) {
  const d = new Date();
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  d.setDate(d.getDate() + offset);
  return dateKey(d);
}

function readGoals(key: string): LocalGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocalGoal[]) : [];
  } catch {
    return [];
  }
}

function taskDayLabel(offset: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function format(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PomodoroTimer({
  initialMinutes,
  tasks,
  userId,
}: {
  initialMinutes: number;
  tasks: DailyTask[];
  userId: string;
}) {
  const router = useRouter();
  const [focusMinutes, setFocusMinutes] = useState(initialMinutes);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [focusInput, setFocusInput] = useState(String(initialMinutes));
  const [breakInput, setBreakInput] = useState("5");
  const [minutes, setMinutes] = useState(initialMinutes);
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [activityCategory, setActivityCategory] = useState("Studying");
  const [customCategory, setCustomCategory] = useState("");
  const [activityLabel, setActivityLabel] = useState("Focused work");
  const [selectedWorkId, setSelectedWorkId] = useState("");
  const [localGoals, setLocalGoals] = useState<Record<number, LocalGoal[]>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [alarmMuted, setAlarmMuted] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const skipNextActiveWriteRef = useRef(false);
  const totalSeconds = minutes * 60;
  const progress = useMemo(
    () => (totalSeconds === 0 ? 0 : 1 - secondsLeft / totalSeconds),
    [secondsLeft, totalSeconds]
  );

  function buildActiveSession(remaining: number): ActivePomodoroSession {
    const now = new Date();
    const startedAt = startedAtRef.current ?? now;
    startedAtRef.current = startedAt;
    const id =
      activeSessionIdRef.current ??
      (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
    activeSessionIdRef.current = id;

    return {
      id,
      startedAt: startedAt.toISOString(),
      endAt: new Date(Date.now() + remaining * 1000).toISOString(),
      plannedMinutes: minutes,
      remainingSeconds: remaining,
      activityLabel: activityLabel.trim() || activityCategory,
      activityCategory: customCategory.trim() || activityCategory,
      mode,
      paused: false,
      autoRestart: true,
    };
  }

  function hydrateSession(session: ActivePomodoroSession) {
    startedAtRef.current = new Date(session.startedAt);
    activeSessionIdRef.current = session.id;
    skipNextActiveWriteRef.current = true;
    setMode(session.mode);
    setMinutes(session.plannedMinutes);
    if (session.mode === "focus") {
      setFocusMinutes(session.plannedMinutes);
      setFocusInput(String(session.plannedMinutes));
    } else {
      setBreakMinutes(session.plannedMinutes);
      setBreakInput(String(session.plannedMinutes));
    }
    setActivityLabel(session.activityLabel);
    setActivityCategory(session.activityCategory);
    setSecondsLeft(session.paused ? session.remainingSeconds : remainingSecondsForSession(session));
    setIsRunning(!session.paused);
  }

  function persistRunningSession(remaining = secondsLeft) {
    writeActivePomodoroSession(buildActiveSession(Math.max(1, remaining)), userId);
  }

  function persistPausedSession(remaining = secondsLeft) {
    const current = readActivePomodoroSession(userId);
    if (!current || current.id !== activeSessionIdRef.current) return;
    writeActivePomodoroSession({
      ...current,
      endAt: new Date(Date.now() + Math.max(1, remaining) * 1000).toISOString(),
      remainingSeconds: Math.max(1, remaining),
      activityLabel: activityLabel.trim() || activityCategory,
      activityCategory: customCategory.trim() || activityCategory,
      mode,
      paused: true,
      autoRestart: true,
    }, userId);
  }

  useEffect(() => {
    setAlarmMuted(isPomodoroAlarmMuted());
  }, []);

  useEffect(() => {
    const refreshGoals = () => {
      const nextGoals: Record<number, LocalGoal[]> = {};
      for (let offset = 0; offset < 7; offset += 1) {
        nextGoals[offset] = readGoals(`goals:${dateForOffset(offset)}`).filter(
          (goal) => !goal.done && goal.text.trim()
        );
      }
      setLocalGoals(nextGoals);
    };
    refreshGoals();
    window.addEventListener("goals-changed", refreshGoals as EventListener);
    window.addEventListener("storage", refreshGoals);
    return () => {
      window.removeEventListener("goals-changed", refreshGoals as EventListener);
      window.removeEventListener("storage", refreshGoals);
    };
  }, []);

  useEffect(() => {
    const session = readActivePomodoroSession(userId);
    if (!session || session.logStatus) return;

    hydrateSession(session);

    if (session.paused) {
      return;
    }

    const remaining = remainingSecondsForSession(session);
    if (remaining > 0) {
      return;
    }

    void completeActivePomodoroSession(session, {
      ring: true,
      notify: true,
      restart: true,
      userId,
    }).then(({ logged, error, nextSession }) => {
        if (error) {
          setStatus(error.message);
          return;
        }
        if (logged) {
          if (nextSession) hydrateSession(nextSession);
          setStatus("Session logged. Next session started.");
          router.refresh();
        }
      });
  }, [router, userId]);

  useEffect(() => {
    const syncActiveSession = () => {
      const session = readActivePomodoroSession(userId);
      if (!session || session.logStatus || session.id === activeSessionIdRef.current) return;
      hydrateSession(session);
    };

    window.addEventListener(POMODORO_EVENT, syncActiveSession);
    window.addEventListener("storage", syncActiveSession);
    return () => {
      window.removeEventListener(POMODORO_EVENT, syncActiveSession);
      window.removeEventListener("storage", syncActiveSession);
    };
  }, [userId]);

  useEffect(() => {
    if (!isRunning) return;

    const reconcile = async () => {
      const session = readActivePomodoroSession(userId);
      if (!session || session.paused || session.logStatus) {
        setIsRunning(false);
        return;
      }

      activeSessionIdRef.current = session.id;
      const remaining = remainingSecondsForSession(session);
      setSecondsLeft(remaining);
      if (remaining > 0) return;

      const { logged, error, nextSession } = await completeActivePomodoroSession(session, {
        ring: true,
        notify: true,
        restart: true,
        userId,
      });
      if (error) {
        setStatus(error.message);
        return;
      }
      if (logged && nextSession) {
        hydrateSession(nextSession);
        setStatus("Session logged. Next session started.");
        router.refresh();
      }
    };

    void reconcile();
    tickRef.current = setInterval(() => void reconcile(), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isRunning, router, userId]);

  useEffect(() => {
    if (skipNextActiveWriteRef.current) {
      skipNextActiveWriteRef.current = false;
      return;
    }
    const current = readActivePomodoroSession(userId);
    if (!current || current.id !== activeSessionIdRef.current) return;
    writeActivePomodoroSession({
      ...current,
      plannedMinutes: minutes,
      activityLabel: activityLabel.trim() || activityCategory,
      activityCategory: customCategory.trim() || activityCategory,
      mode,
    }, userId);
  }, [activityCategory, activityLabel, customCategory, minutes, mode, userId]);

  function applyMinutes(m: number, nextMode = mode) {
    const clamped = Math.max(1, Math.min(180, Math.round(m)));
    setMinutes(clamped);
    setSecondsLeft(clamped * 60);
    setIsRunning(false);
    setMode(nextMode);
    if (nextMode === "break" && activityCategory !== "Break") {
      setActivityCategory("Break");
      setActivityLabel("Break");
    } else if (nextMode === "focus" && activityCategory === "Break") {
      setActivityCategory("Studying");
      setActivityLabel("Focused work");
    }
    void persistMinutes(clamped);
  }

  async function persistMinutes(m: number) {
    const supabase = createClient();
    await supabase
      .from("user_settings")
      .upsert(
        { id: 1, user_id: userId, last_pomodoro_minutes: m, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
  }

  async function toggleStart() {
    const nextSeconds = secondsLeft === 0 ? minutes * 60 : secondsLeft;
    if (secondsLeft === 0) setSecondsLeft(nextSeconds);

    if (isRunning) {
      persistPausedSession(nextSeconds);
      setIsRunning(false);
      return;
    }

    requestPomodoroNotificationPermission();
    await unlockPomodoroAudio();
    persistRunningSession(nextSeconds);
    setIsRunning(true);
  }

  async function logSession(startedAt: Date | null, mins: number, completed: boolean) {
    if (!startedAt) return;
    const supabase = createClient();
    const elapsedMinutes = Math.max(
      1,
      Math.round((Date.now() - startedAt.getTime()) / 60000)
    );
    const { error } = await supabase.from("pomodoro_sessions").insert({
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
      minutes: completed ? mins : Math.min(mins, elapsedMinutes),
      planned_minutes: mins,
      completed,
      activity_label: activityLabel.trim() || activityCategory,
      activity_category: customCategory.trim() || activityCategory,
      mode,
      notes: null,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    clearActivePomodoroSession(activeSessionIdRef.current ?? undefined, userId);
    setStatus(completed ? "Session logged." : "Partial session logged.");
    router.refresh();
  }

  function reset() {
    setIsRunning(false);
    setSecondsLeft(minutes * 60);
    clearActivePomodoroSession(activeSessionIdRef.current ?? undefined, userId);
    startedAtRef.current = null;
    activeSessionIdRef.current = null;
  }

  function switchMode(nextMode: "focus" | "break") {
    clearActivePomodoroSession(activeSessionIdRef.current ?? undefined, userId);
    startedAtRef.current = null;
    activeSessionIdRef.current = null;
    setMode(nextMode);
    const nextMinutes = nextMode === "focus" ? focusMinutes : breakMinutes;
    setMinutes(nextMinutes);
    setSecondsLeft(nextMinutes * 60);
    setIsRunning(false);
    if (nextMode === "break") {
      setActivityCategory("Break");
      setActivityLabel("Break");
    } else if (activityLabel === "Break") {
      setActivityCategory("Studying");
      setActivityLabel("Focused work");
    }
  }

  function updateFocusMinutes(value: string) {
    setFocusInput(value);
    if (value.trim() === "") return;
    const next = Math.max(1, Math.min(180, Number(value) || 1));
    setFocusMinutes(next);
    if (mode === "focus" && !isRunning) applyMinutes(next, "focus");
  }

  function updateBreakMinutes(value: string) {
    setBreakInput(value);
    if (value.trim() === "") return;
    const next = Math.max(1, Math.min(60, Number(value) || 1));
    setBreakMinutes(next);
    if (mode === "break" && !isRunning) applyMinutes(next, "break");
  }

  function commitFocusMinutes() {
    const next = Math.max(1, Math.min(180, Number(focusInput) || focusMinutes || 1));
    setFocusMinutes(next);
    setFocusInput(String(next));
    if (mode === "focus" && !isRunning) applyMinutes(next, "focus");
  }

  function commitBreakMinutes() {
    const next = Math.max(1, Math.min(60, Number(breakInput) || breakMinutes || 1));
    setBreakMinutes(next);
    setBreakInput(String(next));
    if (mode === "break" && !isRunning) applyMinutes(next, "break");
  }

  function finishNow() {
    if (!startedAtRef.current) return;
    setIsRunning(false);
    void logSession(startedAtRef.current, minutes, false);
    startedAtRef.current = null;
    activeSessionIdRef.current = null;
    setSecondsLeft(minutes * 60);
  }

  function toggleAlarmMuted() {
    const next = !alarmMuted;
    setAlarmMuted(next);
    setPomodoroAlarmMuted(next);
    setStatus(next ? "Alarm muted." : "Alarm sound on.");
  }

  const workItems = useMemo<WorkItem[]>(() => {
    const localItems = Object.entries(localGoals).flatMap(([offsetKey, goals]) => {
      const offset = Number(offsetKey);
      return goals.map((goal, index) => ({
        id: `goal-${offset}-${index}-${goal.text}`,
        label: goal.text,
        dayLabel: taskDayLabel(offset),
        source: "Goal",
      }));
    });

    const taskItems = tasks
      .filter((task) => task.day_offset >= 0 && task.day_offset < 7)
      .sort((a, b) => a.day_offset - b.day_offset || a.sort - b.sort)
      .map((task) => ({
        id: `task-${task.id}`,
        label: task.task,
        dayLabel: taskDayLabel(task.day_offset),
        source: "7-day",
        category: task.tone.includes("emerald") ? "Studying" : undefined,
      }));

    return [...localItems, ...taskItems];
  }, [localGoals, tasks]);

  function selectWorkItem(id: string) {
    setSelectedWorkId(id);
    const item = workItems.find((work) => work.id === id);
    if (!item) return;
    setActivityLabel(item.label);
    if (item.category) setActivityCategory(item.category);
    setCustomCategory("");
  }

  const smallRadius = 58;
  const smallCirc = 2 * Math.PI * smallRadius;
  const progressPct = Math.round(progress * 100);
  const modeLabel = mode === "break" ? "Rest" : "Focus";

  return (
    <div className={`grid gap-4 xl:grid-cols-[0.9fr_1.1fr] ${styles.focusShell}`}>
      <section className={`${styles.panel} p-5`}>
        <div className={styles.timerCard}>
          <div className={styles.timerContent}>
            <div className="min-w-0">
              <div className={`${styles.timerText} tabular-nums`}>{format(secondsLeft)}</div>
              <div className={styles.timerMeta}>
                {isRunning ? `${modeLabel} in progress` : secondsLeft === 0 ? "Done" : "Ready"}
              </div>
              <div className={styles.timerSub}>
                {activityLabel || modeLabel} · {minutes} min
              </div>
            </div>
            <div className={styles.timerRingBox}>
              <svg viewBox="0 0 140 140">
                <circle
                  cx="70"
                  cy="70"
                  r={smallRadius}
                  fill="none"
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="5"
                />
                <circle
                  cx="70"
                  cy="70"
                  r={smallRadius}
                  fill="none"
                  stroke="var(--rowan-accent, #6BE3A4)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={smallCirc}
                  strokeDashoffset={smallCirc * (1 - progress)}
                  transform="rotate(-90 70 70)"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <div className={styles.timerRingOverlay}>
                <div className={styles.timerRingPct}>{progressPct}%</div>
                <div className={styles.timerRingLabel}>{mode}</div>
              </div>
            </div>
          </div>
          <div className={styles.timerBarTrack}>
            <div className={styles.timerBarFill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>

      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <button onClick={toggleStart} className={`${styles.primaryButton} inline-flex h-12 min-w-32 items-center justify-center px-5`}>
          {isRunning ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              {secondsLeft === minutes * 60 ? "Start" : "Resume"}
            </>
          )}
        </button>
        <button onClick={reset} className={`${styles.ghostButton} inline-flex h-12 items-center justify-center px-5`}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </button>
        <button
          onClick={finishNow}
          className={`${styles.ghostButton} inline-flex h-12 items-center justify-center px-5 disabled:opacity-40`}
          disabled={!startedAtRef.current}
        >
          Log now
        </button>
        <button
          onClick={toggleAlarmMuted}
          className={`${styles.ghostButton} inline-flex h-12 items-center justify-center px-4`}
          title={alarmMuted ? "Unmute alarm" : "Mute alarm"}
          aria-pressed={alarmMuted}
        >
          {alarmMuted ? (
            <VolumeX className="mr-2 h-4 w-4" />
          ) : (
            <Volume2 className="mr-2 h-4 w-4" />
          )}
          {alarmMuted ? "Muted" : "Alarm"}
        </button>
      </div>
      {status && <p className="mt-4 text-center text-sm text-[#B8B6B0]">{status}</p>}
      </section>

      <section className={`${styles.panel} space-y-5 p-5`}>
        <div>
          <p className={styles.eyebrow}>Focus setup</p>
          <h2 className="mt-1 text-xl font-semibold">What are you working on?</h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => switchMode("focus")}
              className={`${styles.modeButton} ${mode === "focus" ? styles.modeActive : ""} px-4 py-3`}
            >
              <span className="block font-semibold">Focus</span>
              <span className="font-mono text-xs opacity-75">{focusMinutes}m</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("break")}
              className={`${styles.modeButton} ${mode === "break" ? styles.modeActive : ""} px-4 py-3`}
            >
              <span className="block font-semibold">Rest</span>
              <span className="font-mono text-xs opacity-75">{breakMinutes}m</span>
            </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#B8B6B0]">
            Focus time
            <input
              type="number"
              min={1}
              max={180}
              value={focusInput}
              onChange={(e) => updateFocusMinutes(e.target.value)}
              onBlur={commitFocusMinutes}
              className={styles.darkInput}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#B8B6B0]">
            Rest time
            <input
              type="number"
              min={1}
              max={60}
              value={breakInput}
              onChange={(e) => updateBreakMinutes(e.target.value)}
              onBlur={commitBreakMinutes}
              className={styles.darkInput}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_0.8fr]">
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#B8B6B0]">
            Activity
            <input
              value={activityLabel}
              onChange={(e) => setActivityLabel(e.target.value)}
              className={styles.darkInput}
              placeholder="AFM433, LeetCode, DSC planning..."
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#B8B6B0]">
            Category
            <select
              value={activityCategory}
              onChange={(e) => setActivityCategory(e.target.value)}
              className={styles.darkSelect}
            >
              {ACTIVITY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[#B8B6B0]">
          Custom category
            <input
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            className={styles.darkInput}
            placeholder="Type your own category, optional"
            />
        </label>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={styles.eyebrow}>Current work outstanding</p>
            <span className="font-mono text-[10px] text-[#B8B6B0]">
              {workItems.length} available
            </span>
          </div>
          {workItems.length === 0 ? (
            <p className="rounded-lg bg-white/[0.025] p-3 text-sm italic text-[#B8B6B0]">
              Add tasks in the home dashboard and they will appear here.
            </p>
          ) : (
            <select
              value={selectedWorkId}
              onChange={(event) => selectWorkItem(event.target.value)}
              className={styles.darkSelect}
            >
              <option value="">Select a Home task or 7-day item...</option>
              {workItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.dayLabel} · {item.source} · {item.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>
    </div>
  );
}
