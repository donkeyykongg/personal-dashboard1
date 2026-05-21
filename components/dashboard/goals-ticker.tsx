"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveDateString } from "@/lib/dates";
import type { Habit, HabitLog, TodoGoal } from "@/lib/supabase/types";
import { buildTodayProgress, type TodayProgress } from "./today-progress";
import styles from "./goals-ticker.module.css";

type Props = {
  initialHabits: Habit[];
  initialHabitLogs: HabitLog[];
  initialTodos: TodoGoal[];
  date: string;
};

type TickerItem = {
  status: "done" | "pending" | "empty";
  text: string;
};

const CYCLE_MS = 5000;
const ANIM_MS = 460;

function buildItems(progress: TodayProgress): {
  items: TickerItem[];
  done: number;
  total: number;
} {
  const { done, total } = progress;

  if (total === 0) {
    return {
      items: [
        {
          status: "empty",
          text: "No habits or todos set for today — add one to get rolling.",
        },
      ],
      done,
      total,
    };
  }

  if (done === total) {
    return {
      items: [{ status: "done", text: "✓ All goals done — solid day." }],
      done,
      total,
    };
  }

  return {
    items: progress.items
      .filter((item) => !item.done)
      .map<TickerItem>((item) => ({
        status: "pending",
        text: `${item.kind === "habit" ? "Habit" : "Todo"}: ${item.text}`,
      })),
    done,
    total,
  };
}

function statusGlyph(status: TickerItem["status"]): string {
  if (status === "done") return "✓";
  if (status === "pending") return "○";
  return "·";
}

function statusClass(status: TickerItem["status"]): string {
  if (status === "done") return styles.statusDone;
  if (status === "pending") return styles.statusPending;
  return styles.statusEmpty;
}

export function GoalsTicker({
  initialHabits,
  initialHabitLogs,
  initialTodos,
  date,
}: Props) {
  const [progress, setProgress] = useState<TodayProgress>(() =>
    buildTodayProgress({
      habits: initialHabits,
      habitLogs: initialHabitLogs,
      todos: initialTodos,
      date,
    })
  );
  const [current, setCurrent] = useState<TickerItem | null>(null);
  const [leaving, setLeaving] = useState<TickerItem | null>(null);
  const [didFirstShow, setDidFirstShow] = useState(false);

  const cycleIdxRef = useRef(0);
  const itemsRef = useRef<TickerItem[]>([]);
  const currentRef = useRef<TickerItem | null>(null);
  const leaveTimerRef = useRef<number | null>(null);
  const tickTimerRef = useRef<number | null>(null);

  useEffect(() => {
    currentRef.current = current;
  }, [current]);

  useEffect(() => {
    setProgress(
      buildTodayProgress({
        habits: initialHabits,
        habitLogs: initialHabitLogs,
        todos: initialTodos,
        date,
      })
    );
  }, [date, initialHabitLogs, initialHabits, initialTodos]);

  // Sync with Supabase-backed habits and todos.
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
        setProgress(
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

  const { items, done, total } = useMemo(() => buildItems(progress), [progress]);

  // Drive the rotation
  useEffect(() => {
    itemsRef.current = items;
    cycleIdxRef.current = 0;

    const advance = () => {
      const list = itemsRef.current;
      if (list.length === 0) return;

      const idx = cycleIdxRef.current % list.length;
      const next = list[idx];
      cycleIdxRef.current += 1;

      const prev = currentRef.current;
      const isFirst = !prev;

      if (!isFirst) {
        if (leaveTimerRef.current !== null) {
          window.clearTimeout(leaveTimerRef.current);
        }
        setLeaving(prev);
        leaveTimerRef.current = window.setTimeout(() => {
          setLeaving(null);
          leaveTimerRef.current = null;
        }, ANIM_MS);
      }

      setCurrent(next);
      if (isFirst) setDidFirstShow(true);
    };

    // Reset visible state when items change
    setCurrent(null);
    setLeaving(null);
    setDidFirstShow(false);
    currentRef.current = null;

    advance();
    tickTimerRef.current = window.setInterval(advance, CYCLE_MS);

    return () => {
      if (tickTimerRef.current !== null) {
        window.clearInterval(tickTimerRef.current);
        tickTimerRef.current = null;
      }
      if (leaveTimerRef.current !== null) {
        window.clearTimeout(leaveTimerRef.current);
        leaveTimerRef.current = null;
      }
    };
  }, [items]);

  return (
    <div
      className={styles.ticker}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className={styles.led}>
        <span className={styles.ledDot} />
      </div>
      <div className={styles.label}>GOALS</div>
      <div className={styles.stage}>
        {leaving && (
          <div
            key={`leave-${leaving.text}`}
            className={`${styles.row} ${styles.leaving}`}
          >
            <span className={`${styles.status} ${statusClass(leaving.status)}`}>
              {statusGlyph(leaving.status)}
            </span>
            <span className={styles.text}>{leaving.text}</span>
          </div>
        )}
        {current && (
          <div
            key={`enter-${current.text}-${cycleIdxRef.current}`}
            className={`${styles.row} ${
              didFirstShow && leaving ? styles.entering : ""
            }`}
          >
            <span className={`${styles.status} ${statusClass(current.status)}`}>
              {statusGlyph(current.status)}
            </span>
            <span className={styles.text}>{current.text}</span>
          </div>
        )}
      </div>
      <div className={styles.meta}>
        {done}/{total}
      </div>
    </div>
  );
}

export default GoalsTicker;
