"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveDateString } from "@/lib/dates";
import type { Habit, HabitLog, TodoGoal } from "@/lib/supabase/types";
import { buildTodayProgress, type TodayProgress } from "./today-progress";
import styles from "./command-center.module.css";

// Waterloo, ON — change to match your location
const LAT = 43.4723;
const LON = -80.5449;

type Props = {
  initialHabits: Habit[];
  initialHabitLogs: HabitLog[];
  initialTodos: TodoGoal[];
  date: string;
};

function getActiveDate(d: Date): Date {
  return d.getHours() < 6 ? new Date(d.getTime() - 86_400_000) : d;
}

function wmoIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤";
  if (code <= 3) return "☁️";
  if (code <= 48) return "🌫";
  if (code <= 55) return "🌦";
  if (code <= 65) return "🌧";
  if (code <= 75) return "❄️";
  if (code <= 82) return "🌧";
  if (code <= 99) return "⛈";
  return "🌡";
}

const R = 34;
const C = 2 * Math.PI * R;

function GoalPie({ pct }: { pct: number }) {
  const filled = (pct / 100) * C;
  return (
    <svg width="80" height="80" viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      <circle
        cx="40"
        cy="40"
        r={R}
        fill="none"
        stroke="var(--rowan-accent, #6be3a4)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${C}`}
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="40"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#fafafa"
        fontSize="14"
        fontFamily="var(--font-mono)"
        fontWeight="700"
      >
        {pct}%
      </text>
    </svg>
  );
}

export function CommandCenter({
  initialHabits,
  initialHabitLogs,
  initialTodos,
  date,
}: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [goals, setGoals] = useState<TodayProgress>(() =>
    buildTodayProgress({
      habits: initialHabits,
      habitLogs: initialHabitLogs,
      todos: initialTodos,
      date,
    })
  );
  const [weather, setWeather] = useState<{
    temp: number;
    icon: string;
    sunrise: string;
    sunset: string;
  } | null>(null);

  useEffect(() => {
    const tick = () => {
      setNow(new Date());
    };
    tick();
    const id = setInterval(tick, 60_000);

    (async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&daily=sunrise,sunset&timezone=America%2FToronto&forecast_days=1`;
        const res = await fetch(url);
        const data = await res.json();
        setWeather({
          temp: Math.round(data.current?.temperature_2m ?? 0),
          icon: wmoIcon(data.current?.weather_code ?? 0),
          sunrise: data.daily?.sunrise?.[0]?.slice(11, 16) ?? "--:--",
          sunset: data.daily?.sunset?.[0]?.slice(11, 16) ?? "--:--",
        });
      } catch {
        // weather is optional — silently fail
      }
    })();

    return () => {
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    setGoals(
      buildTodayProgress({
        habits: initialHabits,
        habitLogs: initialHabitLogs,
        todos: initialTodos,
        date,
      })
    );
  }, [date, initialHabitLogs, initialHabits, initialTodos]);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const refresh = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        const activeDate = getActiveDateString();
        const supabase = createClient();
        const [habitsRes, logsRes, todosRes] = await Promise.all([
          supabase
            .from("habits")
            .select("*")
            .eq("active", true)
            .order("sort_order", { ascending: true }),
          supabase.from("habit_logs").select("*").eq("date", activeDate),
          supabase
            .from("todo_goals")
            .select("*")
            .eq("date", activeDate)
            .order("sort_order", { ascending: true }),
        ]);

        if (cancelled) return;
        setGoals(
          buildTodayProgress({
            habits: (habitsRes.data ?? []) as Habit[],
            habitLogs: (logsRes.data ?? []) as HabitLog[],
            todos: (todosRes.data ?? []) as TodoGoal[],
            date: activeDate,
          })
        );
      }, 150);
    };

    window.addEventListener("goals-changed", refresh);
    window.addEventListener("habits-changed", refresh);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("goals-changed", refresh);
      window.removeEventListener("habits-changed", refresh);
    };
  }, []);

  if (!now) {
    return (
      <div
        style={{
          height: 116,
          borderRadius: 14,
          background: "#0d1424",
          marginBottom: 12,
          opacity: 0.5,
        }}
      />
    );
  }

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const dayPct = ((now.getTime() - midnight.getTime()) / 86_400_000) * 100;

  return (
    <div className={styles.card}>
      <div className={styles.content}>
        {/* Left: time, date, weather */}
        <div className={styles.left}>
          <div className={styles.time}>
            {now.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </div>
          <div className={styles.date}>
            {getActiveDate(now).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </div>
          {weather && (
            <div className={styles.weather}>
              <span className={styles.weatherIcon}>{weather.icon}</span>
              <span className={styles.weatherTemp}>{weather.temp}°C</span>
              <span className={styles.sunRow}>
                · 🌅 {weather.sunrise} &nbsp;🌇 {weather.sunset}
              </span>
            </div>
          )}
        </div>

        {/* Right: goal completion donut */}
        <div className={styles.right}>
          <GoalPie pct={goals.pct} />
          <div className={styles.goalLabel}>
            {goals.done}/{goals.total} goals
          </div>
        </div>
      </div>

      {/* Day progress — 2px bar at bottom edge */}
      <div className={styles.barTrack}>
        <div className={styles.barFill} style={{ width: `${dayPct.toFixed(3)}%` }} />
      </div>
    </div>
  );
}
