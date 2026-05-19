"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./goals-ticker.module.css";

type Goal = {
  text: string;
  done?: boolean;
  doneAt?: number;
  queued?: boolean;
};

type TickerItem = {
  status: "done" | "pending" | "empty";
  text: string;
};

const CYCLE_MS = 5000;
const ANIM_MS = 460;

function getActiveDateString(): string {
  const now = new Date();
  if (now.getHours() < 6) now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readGoals(): Goal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`goals:${getActiveDateString()}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function buildItems(goals: Goal[]): {
  items: TickerItem[];
  done: number;
  total: number;
} {
  const total = goals.length;
  const done = goals.filter((g) => g.done).length;

  if (total === 0) {
    return {
      items: [
        {
          status: "empty",
          text: "No goals set for today — add one to get rolling.",
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
    items: goals
      .filter((g) => !g.done)
      .map<TickerItem>((g) => ({ status: "pending", text: g.text })),
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

export function GoalsTicker() {
  const [goals, setGoals] = useState<Goal[]>([]);
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

  // Sync goals with localStorage and listen for changes
  useEffect(() => {
    const refresh = () => setGoals(readGoals());
    refresh();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith("goals:")) refresh();
    };
    const onChange = () => refresh();

    window.addEventListener("storage", onStorage);
    window.addEventListener("goals-changed", onChange as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("goals-changed", onChange as EventListener);
    };
  }, []);

  const { items, done, total } = useMemo(() => buildItems(goals), [goals]);

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
