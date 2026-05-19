"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

const PRESETS = [15, 25, 45, 60];

function format(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ringBell() {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const ring = (offset: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime + offset);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + offset + 1.4);
    gain.gain.setValueAtTime(0.001, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 1.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 1.5);
  };
  ring(0);
  ring(0.55);
  ring(1.1);
  setTimeout(() => ctx.close(), 3000);
}

export function PomodoroTimer({ initialMinutes }: { initialMinutes: number }) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [secondsLeft, setSecondsLeft] = useState(initialMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [customInput, setCustomInput] = useState(String(initialMinutes));
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);
  const totalSeconds = minutes * 60;
  const progress = useMemo(
    () => (totalSeconds === 0 ? 0 : 1 - secondsLeft / totalSeconds),
    [secondsLeft, totalSeconds]
  );

  useEffect(() => {
    if (!isRunning) return;
    tickRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          setIsRunning(false);
          ringBell();
          void logSession(startedAtRef.current, minutes, true);
          startedAtRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isRunning]);

  function applyMinutes(m: number) {
    const clamped = Math.max(1, Math.min(180, Math.round(m)));
    setMinutes(clamped);
    setSecondsLeft(clamped * 60);
    setIsRunning(false);
    setCustomInput(String(clamped));
    void persistMinutes(clamped);
  }

  async function persistMinutes(m: number) {
    const supabase = createClient();
    await supabase
      .from("user_settings")
      .upsert({ id: 1, last_pomodoro_minutes: m, updated_at: new Date().toISOString() });
  }

  function toggleStart() {
    if (secondsLeft === 0) setSecondsLeft(minutes * 60);
    setIsRunning((r) => {
      const next = !r;
      if (next && !startedAtRef.current) startedAtRef.current = new Date();
      return next;
    });
  }

  async function logSession(startedAt: Date | null, mins: number, completed: boolean) {
    if (!startedAt) return;
    const supabase = createClient();
    await supabase.from("pomodoro_sessions").insert({
      started_at: startedAt.toISOString(),
      ended_at: new Date().toISOString(),
      minutes: mins,
      completed,
    });
  }

  function reset() {
    setIsRunning(false);
    setSecondsLeft(minutes * 60);
  }

  const radius = 120;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8">
      <div className="relative">
        <svg width="280" height="280" viewBox="0 0 280 280">
          <circle
            cx="140"
            cy="140"
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth="14"
            fill="none"
          />
          <circle
            cx="140"
            cy="140"
            r={radius}
            stroke="hsl(var(--primary))"
            strokeWidth="14"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progress)}
            transform="rotate(-90 140 140)"
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-6xl font-semibold tabular-nums">{format(secondsLeft)}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {isRunning ? "Focus" : secondsLeft === 0 ? "Done" : "Ready"}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={toggleStart} size="lg" className="min-w-32">
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
        </Button>
        <Button onClick={reset} variant="outline" size="lg">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button onClick={ringBell} variant="ghost" size="lg" title="Test bell">
          <Volume2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-full space-y-3 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">Presets</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => applyMinutes(m)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition ${
                minutes === m
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2 pt-2">
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground">
              Custom (1–180 min)
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const n = parseInt(customInput, 10);
                  if (!Number.isNaN(n)) applyMinutes(n);
                }
              }}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </div>
          <Button
            onClick={() => {
              const n = parseInt(customInput, 10);
              if (!Number.isNaN(n)) applyMinutes(n);
            }}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
