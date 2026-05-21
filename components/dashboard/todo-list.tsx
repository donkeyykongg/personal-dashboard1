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
import { createClient } from "@/lib/supabase/client";
import { CalendarDateField } from "@/components/ui/calendar-with-time-picker-inline";
import type { TodoGoal, TodoStreak } from "@/lib/supabase/types";
import { dateToKey, getActiveDateString } from "@/lib/dates";
import styles from "./todo-list.module.css";

const COLLAPSE_AT = 5;

type LocalGoal = {
  id?: string;            // undefined while an optimistic insert is in flight
  tempId: string;         // stable React key
  text: string;
  done: boolean;
  done_at: string | null;
  queued: boolean;
  sort_order: number;
};

function getTomorrowDateString(now: Date = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < 6) return dateToKey(d);
  const t = new Date(d);
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

function toLocal(g: TodoGoal): LocalGoal {
  return {
    id: g.id,
    tempId: g.id,
    text: g.text,
    done: g.done,
    done_at: g.done_at,
    queued: g.queued,
    sort_order: g.sort_order,
  };
}

function emitGoalsChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("goals-changed"));
  }
}

function randomId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ---------- row ----------

type RowProps = {
  goal: LocalGoal;
  index: number;
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
  date: string;
  variant: "today" | "tomorrow";
  initialGoals: TodoGoal[];
  initialStreak: number;
  tomorrowDate: string;
};

function GoalCard({
  date,
  variant,
  initialGoals,
  initialStreak,
  tomorrowDate,
}: CardProps) {
  const [goals, setGoals] = useState<LocalGoal[]>(() =>
    initialGoals.map(toLocal)
  );
  const [streak, setStreak] = useState<number>(initialStreak);
  const [expanded, setExpanded] = useState(false);
  const [flashIndex, setFlashIndex] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean }>({ text: "" });
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setGoals(initialGoals.map(toLocal));
  }, [initialGoals]);

  useEffect(() => {
    setStreak(initialStreak);
  }, [initialStreak]);

  const total = goals.length;
  const done = goals.filter((g) => g.done).length;
  const allDone = total > 0 && done === total;
  const readOnly = variant === "tomorrow";

  const supabase = useMemo(() => createClient(), []);

  const persistGoals = useCallback(
    async (next: LocalGoal[], opts?: { skipEmit?: boolean }) => {
      setGoals(next);
      if (!opts?.skipEmit) emitGoalsChanged();
    },
    []
  );

  const handleCheck = useCallback(
    async (idx: number, checked: boolean) => {
      const target = goals[idx];
      if (!target) return;
      const doneAt = checked ? new Date().toISOString() : null;
      const next = goals.slice();
      next[idx] = { ...target, done: checked, done_at: doneAt };
      await persistGoals(next);
      if (target.id) {
        await supabase
          .from("todo_goals")
          .update({ done: checked, done_at: doneAt })
          .eq("id", target.id);
      }
    },
    [goals, persistGoals, supabase]
  );

  const handleEdit = useCallback(
    async (idx: number, text: string) => {
      const target = goals[idx];
      if (!target) return;
      const next = goals.slice();
      next[idx] = { ...target, text };
      await persistGoals(next);
      if (target.id) {
        await supabase.from("todo_goals").update({ text }).eq("id", target.id);
      }
    },
    [goals, persistGoals, supabase]
  );

  const handleDelete = useCallback(
    async (idx: number) => {
      const target = goals[idx];
      if (!target) return;
      const next = goals.slice();
      next.splice(idx, 1);
      await persistGoals(next);
      if (target.id) {
        await supabase.from("todo_goals").delete().eq("id", target.id);
      }
    },
    [goals, persistGoals, supabase]
  );

  const handleQueueToggle = useCallback(
    async (idx: number) => {
      const target = goals[idx];
      if (!target) return;
      setFlashIndex(idx);
      const queued = !target.queued;
      const next = goals.slice();
      next[idx] = { ...target, queued };
      await persistGoals(next);
      if (target.id) {
        await supabase.from("todo_goals").update({ queued }).eq("id", target.id);
      }
      window.setTimeout(() => setFlashIndex(null), 480);
    },
    [goals, persistGoals, supabase]
  );

  const handleReorder = useCallback(
    async (from: number, to: number) => {
      const next = goals.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      // re-stamp sort_order
      const renumbered = next.map((g, i) => ({ ...g, sort_order: i }));
      await persistGoals(renumbered);
      // Send only ids that exist (skip optimistic-only rows).
      const updates = renumbered
        .filter((g) => g.id)
        .map((g) => ({ id: g.id!, sort_order: g.sort_order }));
      await Promise.all(
        updates.map((u) =>
          supabase.from("todo_goals").update({ sort_order: u.sort_order }).eq("id", u.id)
        )
      );
    },
    [goals, persistGoals, supabase]
  );

  const handlePushRemaining = useCallback(async () => {
    const remaining = goals.filter((g) => !g.done);
    if (remaining.length === 0) return;
    if (!window.confirm(`Push ${remaining.length} unchecked goal(s) to tomorrow?`)) return;

    // Pull current tomorrow rows to dedupe by text.
    const { data: tomorrowRows } = await supabase
      .from("todo_goals")
      .select("text, sort_order")
      .eq("date", tomorrowDate)
      .order("sort_order", { ascending: true });

    const seen = new Set((tomorrowRows ?? []).map((r) => r.text));
    let nextSort = (tomorrowRows ?? []).length;
    const toInsert: Array<Pick<TodoGoal, "date" | "text" | "sort_order">> = [];
    for (const g of remaining) {
      if (seen.has(g.text)) continue;
      toInsert.push({ date: tomorrowDate, text: g.text, sort_order: nextSort++ });
      seen.add(g.text);
    }
    if (toInsert.length > 0) {
      await supabase.from("todo_goals").insert(toInsert);
    }
    // Delete the remaining ones from today.
    const remainingIds = remaining.map((g) => g.id).filter((id): id is string => !!id);
    if (remainingIds.length > 0) {
      await supabase.from("todo_goals").delete().in("id", remainingIds);
    }
    const next = goals.filter((g) => g.done);
    await persistGoals(next);
  }, [goals, persistGoals, supabase, tomorrowDate]);

  const flashStatus = useCallback((text: string, error = false) => {
    setStatusMsg({ text, error });
    window.setTimeout(() => setStatusMsg({ text: "" }), 3500);
  }, []);

  const handleAdd = useCallback(async () => {
    const input = inputRef.current;
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    const tempId = randomId();
    const optimistic: LocalGoal = {
      tempId,
      text,
      done: false,
      done_at: null,
      queued: false,
      sort_order: goals.length,
    };
    const next = [...goals, optimistic];
    input.value = "";
    await persistGoals(next);

    const { data, error } = await supabase
      .from("todo_goals")
      .insert({ date, text, sort_order: optimistic.sort_order })
      .select("*")
      .single();
    if (!error && data) {
      setGoals((curr) =>
        curr.map((g) => (g.tempId === tempId ? toLocal(data as TodoGoal) : g))
      );
    }
  }, [date, goals, persistGoals, supabase]);

  const handlePolish = useCallback(async () => {
    // Polish requires server-side AI — for now, just add as-typed and flash a status.
    await handleAdd();
    flashStatus("Polish not wired in browser — added as-typed.");
  }, [flashStatus, handleAdd]);

  const onInputKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  const visibleGoals = useMemo(() => {
    if (goals.length <= COLLAPSE_AT || expanded) return goals;
    return goals.slice(0, COLLAPSE_AT);
  }, [goals, expanded]);

  const hiddenCount = Math.max(0, goals.length - COLLAPSE_AT);
  const showStreakActive = streak > 0;

  const progressLabel =
    total === 0 ? "no goals yet" : allDone ? "all done — solid day" : "complete";

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
            <span className={styles.streakNum}>{streak}</span>
            <span>day streak</span>
          </span>
        ) : (
          <span className={styles.countBadge}>{total} planned</span>
        )}
      </div>

      {variant === "today" && (
        <div className={styles.bar}>
          {goals.map((g) => (
            <div
              key={g.tempId}
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
              key={g.tempId}
              goal={g}
              index={i}
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
        <textarea
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

// ---------- rollover + streak (run once on mount, syncs Supabase) ----------

async function rolloverAndStreak(
  supabase: ReturnType<typeof createClient>,
  activeDate: string
): Promise<number> {
  // 1. Process streak: fetch all distinct dates older than today.
  const { data: streakRow } = await supabase
    .from("todo_streak")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const streak: TodoStreak | null = (streakRow as TodoStreak | null) ?? null;
  let count = streak?.count ?? 0;
  const lastProcessed = streak?.last_processed_date ?? null;

  const { data: oldRows } = await supabase
    .from("todo_goals")
    .select("date, done, text")
    .lt("date", activeDate);

  const byDate = new Map<string, { done: number; total: number }>();
  (oldRows ?? []).forEach((r) => {
    const k = r.date as string;
    const cur = byDate.get(k) ?? { done: 0, total: 0 };
    cur.total += 1;
    if (r.done) cur.done += 1;
    byDate.set(k, cur);
  });

  const datesToProcess = Array.from(byDate.keys())
    .filter((d) => (lastProcessed ? d > lastProcessed : true))
    .sort();
  for (const d of datesToProcess) {
    const v = byDate.get(d)!;
    if (v.total === 0) continue;
    if (v.done === v.total) count += 1;
    else count = 0;
  }

  await supabase
    .from("todo_streak")
    .update({ count, last_processed_date: activeDate })
    .eq("id", 1);

  // 2. Rollover undone goals from older dates → today (dedupe by text).
  const undone = (oldRows ?? []).filter((r) => !r.done);
  if (undone.length > 0) {
    const { data: todayRows } = await supabase
      .from("todo_goals")
      .select("text, sort_order")
      .eq("date", activeDate)
      .order("sort_order", { ascending: true });
    const seenText = new Set((todayRows ?? []).map((r) => r.text));
    let sort = (todayRows ?? []).length;
    const toInsert: Array<{ date: string; text: string; sort_order: number }> = [];
    for (const r of undone) {
      const t = r.text as string;
      if (seenText.has(t)) continue;
      toInsert.push({ date: activeDate, text: t, sort_order: sort++ });
      seenText.add(t);
    }
    if (toInsert.length > 0) {
      await supabase.from("todo_goals").insert(toInsert);
    }
  }
  // 3. Delete all old rows (done or rolled-over). Keeps the table from growing forever.
  if ((oldRows ?? []).length > 0) {
    await supabase.from("todo_goals").delete().lt("date", activeDate);
  }

  return count;
}

// ---------- public component ----------

type TodoListProps = {
  initialActiveDate: string;
  initialTomorrowDate: string;
  todayGoals: TodoGoal[];
  tomorrowGoals: TodoGoal[];
  streakCount: number;
};

export function TodoList({
  initialActiveDate,
  initialTomorrowDate,
  todayGoals,
  tomorrowGoals,
  streakCount,
}: TodoListProps) {
  const [activeDate, setActiveDate] = useState(initialActiveDate);
  const [tomorrowDate, setTomorrowDate] = useState(initialTomorrowDate);
  const [todayList, setTodayList] = useState<TodoGoal[]>(todayGoals);
  const [tomorrowList, setTomorrowList] = useState<TodoGoal[]>(tomorrowGoals);
  const [streak, setStreak] = useState<number>(streakCount);

  const loadGoalsForDate = useCallback(async (date: string, target: "today" | "tomorrow") => {
    const supabase = createClient();
    const { data } = await supabase
      .from("todo_goals")
      .select("*")
      .eq("date", date)
      .order("sort_order", { ascending: true });

    if (target === "today") {
      setTodayList((data as TodoGoal[] | null) ?? []);
      setActiveDate(date);
    } else {
      setTomorrowList((data as TodoGoal[] | null) ?? []);
      setTomorrowDate(date);
    }
  }, []);

  // Sync if server-fetched props change.
  useEffect(() => setTodayList(todayGoals), [todayGoals]);
  useEffect(() => setTomorrowList(tomorrowGoals), [tomorrowGoals]);
  useEffect(() => setStreak(streakCount), [streakCount]);

  // Client-side rollover + streak update on first mount, in case the server
  // fetched stale data (e.g. the user kept the tab open across the 6am boundary).
  useEffect(() => {
    const today = getActiveDateString();
    const tomorrow = getTomorrowDateString();
    if (today !== activeDate) setActiveDate(today);
    if (tomorrow !== tomorrowDate) setTomorrowDate(tomorrow);

    const supabase = createClient();
    void rolloverAndStreak(supabase, today).then(async (newCount) => {
      setStreak(newCount);
      // Re-fetch lists in case rollover migrated rows in.
      const [{ data: t }, { data: tm }] = await Promise.all([
        supabase
          .from("todo_goals")
          .select("*")
          .eq("date", today)
          .order("sort_order", { ascending: true }),
        supabase
          .from("todo_goals")
          .select("*")
          .eq("date", tomorrow)
          .order("sort_order", { ascending: true }),
      ]);
      setTodayList((t as TodoGoal[] | null) ?? []);
      setTomorrowList((tm as TodoGoal[] | null) ?? []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.section}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="section-title">To Do List</div>
        <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-2">
          <div className="min-w-44">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
              Today card
            </div>
            <CalendarDateField
              value={activeDate}
              onChange={(date) => void loadGoalsForDate(date, "today")}
              calendarClassName="bg-[#080e1a] text-white"
            />
          </div>
          <div className="min-w-44">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
              Planning card
            </div>
            <CalendarDateField
              value={tomorrowDate}
              onChange={(date) => void loadGoalsForDate(date, "tomorrow")}
              calendarClassName="bg-[#080e1a] text-white"
            />
          </div>
        </div>
      </div>
      <div className={styles.cardsGrid}>
        <GoalCard
          date={activeDate}
          variant="today"
          initialGoals={todayList}
          initialStreak={streak}
          tomorrowDate={tomorrowDate}
        />
        <GoalCard
          date={tomorrowDate}
          variant="tomorrow"
          initialGoals={tomorrowList}
          initialStreak={0}
          tomorrowDate={tomorrowDate}
        />
      </div>
    </div>
  );
}

export default TodoList;
