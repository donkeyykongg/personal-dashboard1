"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import styles from "./todo-list.module.css";

const ANTHROPIC_API_KEY = "";
const STREAK_KEY = "goal_streak_v1";
const COLLAPSE_AT = 5;

type Goal = {
  text: string;
  done?: boolean;
  doneAt?: number;
  queued?: boolean;
};

type StreakState = { count: number; lastProcessedDate: string };

// ---------- date helpers ----------

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateToKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getActiveDateString(): string {
  const now = new Date();
  if (now.getHours() < 6) now.setDate(now.getDate() - 1);
  return dateToKey(now);
}

function getTomorrowDateString(): string {
  const now = new Date();
  if (now.getHours() < 6) return dateToKey(now);
  const t = new Date(now);
  t.setDate(t.getDate() + 1);
  return dateToKey(t);
}

function formatDate(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday}, ${month} ${d}`;
}

// ---------- store helpers ----------

function storeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function storeSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    if (key.startsWith("goals:")) {
      window.dispatchEvent(new CustomEvent("goals-changed"));
    }
  } catch {
    // ignore
  }
}

function storeDelete(key: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(key);
}

function storeListKeys(prefix: string): string[] {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  return keys;
}

// ---------- rollover + streak (run once on mount) ----------

function rolloverUndoneGoals(activeDate: string) {
  const todayKey = `goals:${activeDate}`;
  const todayGoals = (storeGet<Goal[]>(todayKey) ?? []).slice();
  const todayTexts = new Set(todayGoals.map((g) => g.text));

  const allKeys = storeListKeys("goals:");
  let mutated = false;
  for (const key of allKeys) {
    const datePart = key.slice("goals:".length);
    if (datePart >= activeDate) continue;
    const goals = storeGet<Goal[]>(key) ?? [];
    for (const g of goals) {
      if (!g.done && !todayTexts.has(g.text)) {
        todayGoals.push({ text: g.text, done: false });
        todayTexts.add(g.text);
        mutated = true;
      }
    }
    storeDelete(key);
  }
  if (mutated) storeSet(todayKey, todayGoals);
}

function processStreak(activeDate: string) {
  const state = storeGet<StreakState>(STREAK_KEY) ?? {
    count: 0,
    lastProcessedDate: "",
  };
  const allKeys = storeListKeys("goals:")
    .map((k) => k.slice("goals:".length))
    .filter((d) => d < activeDate && d > state.lastProcessedDate)
    .sort();

  let { count } = state;
  for (const date of allKeys) {
    const goals = storeGet<Goal[]>(`goals:${date}`) ?? [];
    if (goals.length === 0) continue;
    if (goals.every((g) => g.done)) count += 1;
    else count = 0;
  }
  storeSet(STREAK_KEY, { count, lastProcessedDate: activeDate });
}

// ---------- polish ----------

async function polishGoalText(input: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Polish this single goal into a clean, action-oriented one-liner. Return ONLY a one-element JSON array of strings, no preamble, no fences.\n\nGoal: ${input}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`status ${res.status}`);
  const data = await res.json();
  const text: string = data?.content?.[0]?.text ?? "";
  const parsed = JSON.parse(text.trim()) as unknown;
  if (!Array.isArray(parsed) || typeof parsed[0] !== "string") {
    throw new Error("bad shape");
  }
  return parsed[0];
}

// ---------- hooks ----------

function useGoals(key: string) {
  const [goals, setGoals] = useState<Goal[]>([]);

  const refresh = useCallback(() => {
    setGoals(storeGet<Goal[]>(key) ?? []);
  }, [key]);

  useEffect(() => {
    refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) refresh();
    };
    const onChange = () => refresh();
    window.addEventListener("storage", onStorage);
    window.addEventListener("goals-changed", onChange as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("goals-changed", onChange as EventListener);
    };
  }, [key, refresh]);

  const save = useCallback(
    (next: Goal[]) => {
      storeSet(key, next);
      setGoals(next);
    },
    [key],
  );

  return { goals, save, refresh };
}

// ---------- row ----------

type RowProps = {
  goal: Goal;
  index: number;
  total: number;
  readOnly?: boolean;
  onCheck: (idx: number, checked: boolean) => void;
  onEdit: (idx: number, text: string) => void;
  onDelete: (idx: number) => void;
  onQueueToggle: (idx: number) => void;
  onReorder: (from: number, to: number) => void;
  flashIndex: number | null;
};

function GoalRow({
  goal,
  index,
  readOnly,
  onCheck,
  onEdit,
  onDelete,
  onQueueToggle,
  onReorder,
  flashIndex,
}: RowProps) {
  const [dragOver, setDragOver] = useState(false);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const originalRef = useRef<string>(goal.text);

  const startEdit = () => {
    const el = textRef.current;
    if (!el) return;
    originalRef.current = goal.text;
    el.contentEditable = "true";
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  const commitEdit = () => {
    const el = textRef.current;
    if (!el) return;
    el.contentEditable = "false";
    const next = (el.textContent ?? "").trim();
    if (next && next !== originalRef.current) {
      onEdit(index, next);
    } else {
      el.textContent = originalRef.current;
    }
  };

  const cancelEdit = () => {
    const el = textRef.current;
    if (!el) return;
    el.contentEditable = "false";
    el.textContent = originalRef.current;
  };

  const onTextKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  const onDragStart = (e: DragEvent<HTMLLIElement>) => {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e: DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    setDragOver(false);
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isInteger(from) && from !== index) {
      onReorder(from, index);
    }
  };

  const classes = [
    styles.row,
    goal.done ? styles.rowDone : "",
    goal.queued && !goal.done ? styles.rowQueued : "",
    flashIndex === index ? styles.rowFlash : "",
    dragOver ? styles.rowDragOver : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li
      className={classes}
      draggable={!readOnly}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <span className={styles.handle} aria-hidden="true">
        ⋮⋮
      </span>
      <input
        type="checkbox"
        className={styles.checkbox}
        checked={!!goal.done}
        disabled={readOnly}
        title={readOnly ? "Activates at 6 AM tomorrow" : undefined}
        onChange={(e) => onCheck(index, e.target.checked)}
      />
      <span
        ref={textRef}
        className={styles.text}
        onClick={startEdit}
        onBlur={commitEdit}
        onKeyDown={onTextKeyDown}
        suppressContentEditableWarning
      >
        {goal.text}
      </span>
      <button
        type="button"
        className={`${styles.queue} ${goal.queued ? styles.queueActive : ""}`}
        title="Queue for productivity window"
        disabled={readOnly}
        onClick={() => onQueueToggle(index)}
      >
        ⚡
      </button>
      <button
        type="button"
        className={styles.delete}
        title="Delete"
        onClick={() => onDelete(index)}
      >
        ×
      </button>
    </li>
  );
}

// ---------- card ----------

type CardProps = {
  storageKey: string;
  date: string;
  variant: "today" | "tomorrow";
};

function GoalCard({ storageKey, date, variant }: CardProps) {
  const { goals, save } = useGoals(storageKey);
  const [expanded, setExpanded] = useState(false);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [streak, setStreak] = useState<StreakState>({ count: 0, lastProcessedDate: "" });
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean }>({ text: "" });
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Streak read for TODAY card
  useEffect(() => {
    if (variant !== "today") return;
    const refreshStreak = () => {
      setStreak(storeGet<StreakState>(STREAK_KEY) ?? { count: 0, lastProcessedDate: "" });
    };
    refreshStreak();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STREAK_KEY) refreshStreak();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [variant]);

  const total = goals.length;
  const done = goals.filter((g) => g.done).length;
  const allDone = total > 0 && done === total;
  const readOnly = variant === "tomorrow";

  const updateAt = (idx: number, fn: (g: Goal) => Goal) => {
    const next = goals.slice();
    next[idx] = fn(next[idx]);
    save(next);
  };

  const handleCheck = (idx: number, checked: boolean) => {
    updateAt(idx, (g) => {
      if (checked) return { ...g, done: true, doneAt: Date.now() };
      const { doneAt: _omit, ...rest } = g;
      return { ...rest, done: false };
    });
  };

  const handleEdit = (idx: number, text: string) => {
    updateAt(idx, (g) => ({ ...g, text }));
  };

  const handleDelete = (idx: number) => {
    const next = goals.slice();
    next.splice(idx, 1);
    save(next);
  };

  const handleQueueToggle = (idx: number) => {
    setFlashIndex(idx);
    updateAt(idx, (g) => ({ ...g, queued: !g.queued }));
    window.setTimeout(() => setFlashIndex(null), 480);
  };

  const handleReorder = (from: number, to: number) => {
    const next = goals.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    save(next);
  };

  const handlePushRemaining = () => {
    const remaining = goals.filter((g) => !g.done);
    if (remaining.length === 0) return;
    if (!window.confirm(`Push ${remaining.length} unchecked goal(s) to tomorrow?`)) return;
    const tomorrowKey = `goals:${getTomorrowDateString()}`;
    const tomorrowList = (storeGet<Goal[]>(tomorrowKey) ?? []).slice();
    const seen = new Set(tomorrowList.map((g) => g.text));
    for (const g of remaining) {
      if (!seen.has(g.text)) {
        tomorrowList.push({ text: g.text, done: false });
        seen.add(g.text);
      }
    }
    storeSet(tomorrowKey, tomorrowList);
    save(goals.filter((g) => g.done));
  };

  const flashStatus = (text: string, error = false) => {
    setStatusMsg({ text, error });
    window.setTimeout(() => setStatusMsg({ text: "" }), 3500);
  };

  const handleAdd = () => {
    const input = inputRef.current;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    save([...goals, { text, done: false }]);
    input.value = "";
  };

  const handlePolish = async () => {
    const input = inputRef.current;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    if (!ANTHROPIC_API_KEY) {
      save([...goals, { text, done: false }]);
      input.value = "";
      flashStatus("Polish needs an Anthropic API key — added as-typed.");
      return;
    }

    try {
      const polished = await polishGoalText(text);
      save([...goals, { text: polished ?? text, done: false }]);
      input.value = "";
    } catch {
      save([...goals, { text, done: false }]);
      input.value = "";
      flashStatus("Polish failed — added as-typed.", true);
    }
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const visibleGoals = useMemo(() => {
    if (goals.length <= COLLAPSE_AT || expanded) return goals;
    return goals.slice(0, COLLAPSE_AT);
  }, [goals, expanded]);

  const hiddenCount = Math.max(0, goals.length - COLLAPSE_AT);
  const showStreakActive = streak.count > 0;

  const progressLabel = total === 0 ? "no goals yet" : allDone ? "all done — solid day" : "complete";

  const cardClass = `${styles.card} dash-card ${variant === "today" && allDone ? styles.allDone : ""}`;

  return (
    <div className={cardClass}>
      <div className={styles.cardHeader}>
        <div>
          <div className={styles.eyebrow}>
            {variant === "today" ? "Today" : "Plan tomorrow"} — {formatDate(date)}
          </div>
          {variant === "today" ? (
            <div className={styles.progressRow}>
              <span className={styles.progressNum}>{done}</span>
              <span className={styles.progressTotal}>/ {total}</span>
              <span className={styles.progressLabel}>{progressLabel}</span>
            </div>
          ) : (
            <div className={styles.subText}>Write tonight, locked until 6 AM.</div>
          )}
        </div>
        {variant === "today" ? (
          <span className={`${styles.streak} ${showStreakActive ? styles.streakActive : ""}`}>
            <span className={styles.streakBolt}>⚡</span>
            <span className={styles.streakNum}>{streak.count}</span>
            <span>day streak</span>
          </span>
        ) : (
          <span className={styles.countBadge}>{total} planned</span>
        )}
      </div>

      {variant === "today" && (
        <div className={styles.bar}>
          {goals.map((g, i) => (
            <div
              key={i}
              className={`${styles.barSeg} ${g.done ? styles.barSegDone : ""}`}
            />
          ))}
        </div>
      )}

      {goals.length === 0 ? (
        <div className={styles.empty}>
          {variant === "today"
            ? "No goals for today yet — add one below."
            : "Nothing planned for tomorrow yet"}
        </div>
      ) : (
        <ul className={styles.list}>
          {visibleGoals.map((g, i) => (
            <GoalRow
              key={`${g.text}-${i}`}
              goal={g}
              index={i}
              total={goals.length}
              readOnly={readOnly}
              onCheck={handleCheck}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onQueueToggle={handleQueueToggle}
              onReorder={handleReorder}
              flashIndex={flashIndex}
            />
          ))}
        </ul>
      )}

      {goals.length > COLLAPSE_AT && (
        <button
          type="button"
          className={styles.showMore}
          onClick={() => setExpanded((s) => !s)}
        >
          {expanded ? "Show less ▴" : `Show ${hiddenCount} more ▾`}
        </button>
      )}

      {variant === "today" && goals.some((g) => !g.done) && (
        <button type="button" className={styles.pushBtn} onClick={handlePushRemaining}>
          Push remaining to tomorrow
        </button>
      )}

      <div className={styles.inputWrap}>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder={
            variant === "today" ? "Add a goal for today…" : "Plan a goal for tomorrow…"
          }
          onKeyDown={onInputKeyDown}
        />
        <button type="button" className={styles.addBtn} onClick={handleAdd}>
          + Add
        </button>
        <button type="button" className={styles.polishBtn} onClick={handlePolish}>
          ✨ Polish
        </button>
      </div>
      <div className={`${styles.status} ${statusMsg.error ? styles.statusError : ""}`}>
        {statusMsg.text}
      </div>
    </div>
  );
}

// ---------- public component ----------

export function TodoList() {
  const [activeDate, setActiveDate] = useState<string>("");
  const [tomorrowDate, setTomorrowDate] = useState<string>("");

  useEffect(() => {
    const today = getActiveDateString();
    const tomorrow = getTomorrowDateString();
    setActiveDate(today);
    setTomorrowDate(tomorrow);

    rolloverUndoneGoals(today);
    processStreak(today);
  }, []);

  if (!activeDate) {
    return <div className={styles.section}>{/* hydration placeholder */}</div>;
  }

  return (
    <div className={styles.section}>
      <div className="section-title">To Do List</div>
      <GoalCard
        storageKey={`goals:${activeDate}`}
        date={activeDate}
        variant="today"
      />
      <GoalCard
        storageKey={`goals:${tomorrowDate}`}
        date={tomorrowDate}
        variant="tomorrow"
      />
    </div>
  );
}

export default TodoList;
