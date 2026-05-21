"use client";

import { useCallback, useMemo, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addDays, dateToKey, getActiveDateString } from "@/lib/dates";
import type { Habit, HabitLog } from "@/lib/supabase/types";
import styles from "./daily-habits.module.css";

type Props = {
  habits: Habit[];
  logs: HabitLog[];
};

type HabitNode = Habit & { children: HabitNode[] };

function buildTree(habits: Habit[]): HabitNode[] {
  const map = new Map<string, HabitNode>();
  habits.forEach((h) => map.set(h.id, { ...h, children: [] }));
  const roots: HabitNode[] = [];
  habits.forEach((h) => {
    const node = map.get(h.id)!;
    if (h.parent_id && map.has(h.parent_id)) {
      map.get(h.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortFn = (a: HabitNode, b: HabitNode) =>
    a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
  roots.sort(sortFn);
  map.forEach((n) => n.children.sort(sortFn));
  return roots;
}

function streakFor(habitId: string, logSet: Set<string>, today: string): number {
  let streak = 0;
  let cursor = new Date(today);
  // include today if checked, otherwise start from yesterday so an unchecked
  // today doesn't break a real streak built up earlier
  if (!logSet.has(`${habitId}|${today}`)) {
    cursor = addDays(cursor, -1);
  }
  while (logSet.has(`${habitId}|${dateToKey(cursor)}`)) {
    streak++;
    cursor = addDays(cursor, -1);
    if (streak > 365 * 2) break;
  }
  return streak;
}

export function DailyHabits({ habits, logs }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [optimisticLogs, setOptimisticLogs] = useState<Map<string, boolean>>(new Map());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const today = getActiveDateString();

  const logSet = useMemo(() => {
    const s = new Set<string>();
    logs.forEach((l) => {
      if (l.completed) s.add(`${l.habit_id}|${l.date}`);
    });
    optimisticLogs.forEach((completed, key) => {
      if (completed) s.add(key);
      else s.delete(key);
    });
    return s;
  }, [logs, optimisticLogs]);

  const tree = useMemo(() => buildTree(habits.filter((h) => h.active)), [habits]);

  // progress: count leaves (habits with no children) as the unit of completion.
  // a top-level habit with no children counts as a leaf too.
  const leaves = useMemo(() => {
    const out: HabitNode[] = [];
    const walk = (n: HabitNode) => {
      if (n.children.length === 0) out.push(n);
      else n.children.forEach(walk);
    };
    tree.forEach(walk);
    return out;
  }, [tree]);

  const doneCount = leaves.filter((l) => logSet.has(`${l.id}|${today}`)).length;

  const toggle = useCallback(
    async (habit: HabitNode) => {
      const key = `${habit.id}|${today}`;
      const currentlyChecked = logSet.has(key);
      const next = !currentlyChecked;

      setOptimisticLogs((prev) => {
        const m = new Map(prev);
        m.set(key, next);
        return m;
      });
      setPending((prev) => new Set(prev).add(habit.id));

      const supabase = createClient();
      if (next) {
        await supabase
          .from("habit_logs")
          .upsert(
            { habit_id: habit.id, date: today, completed: true },
            { onConflict: "habit_id,date" }
          );
      } else {
        await supabase
          .from("habit_logs")
          .delete()
          .eq("habit_id", habit.id)
          .eq("date", today);
      }

      setPending((prev) => {
        const s = new Set(prev);
        s.delete(habit.id);
        return s;
      });
      startTransition(() => router.refresh());
    },
    [logSet, router, today]
  );

  const addHabit = useCallback(async () => {
    const raw = newName.trim();
    if (!raw) return;
    setAdding(true);

    // support `Parent > Child` syntax
    let parentId: string | null = null;
    let name = raw;
    const arrow = raw.indexOf(">");
    if (arrow > 0) {
      const parentName = raw.slice(0, arrow).trim();
      const childName = raw.slice(arrow + 1).trim();
      if (parentName && childName) {
        name = childName;
        const existingParent = habits.find(
          (h) => h.parent_id === null && h.name.toLowerCase() === parentName.toLowerCase()
        );
        const supabase = createClient();
        if (existingParent) {
          parentId = existingParent.id;
        } else {
          const { data, error } = await supabase
            .from("habits")
            .insert({ name: parentName, sort_order: habits.length })
            .select("*")
            .single();
          if (!error && data) parentId = data.id;
        }
      }
    }

    const supabase = createClient();
    const siblingCount = habits.filter((h) => h.parent_id === parentId).length;
    await supabase.from("habits").insert({
      name,
      parent_id: parentId,
      sort_order: siblingCount,
    });

    setNewName("");
    setAdding(false);
    startTransition(() => router.refresh());
  }, [habits, newName, router]);

  const deleteHabit = useCallback(
    async (id: string) => {
      const supabase = createClient();
      await supabase.from("habits").update({ active: false }).eq("id", id);
      startTransition(() => router.refresh());
    },
    [router]
  );

  const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addHabit();
    }
  };

  const renderRow = (node: HabitNode, nested: boolean) => {
    const key = `${node.id}|${today}`;
    const checked = logSet.has(key);
    const streak = streakFor(node.id, logSet, today);
    const isPending = pending.has(node.id);
    return (
      <div
        key={node.id}
        className={`${styles.row} ${nested ? "" : styles.rowTopLevel}`}
      >
        <button
          type="button"
          className={`${styles.checkbox} ${checked ? styles.checkboxChecked : ""}`}
          onClick={() => toggle(node)}
          disabled={isPending}
          aria-pressed={checked}
          aria-label={`Toggle ${node.name}`}
        >
          {checked && <Check className={styles.checkmark} strokeWidth={3.5} />}
        </button>
        <span
          className={`${styles.label} ${checked ? styles.labelDone : ""}`}
          onClick={() => toggle(node)}
        >
          {node.name}
        </span>
        {streak > 0 && (
          <span
            className={`${styles.streak} ${checked ? styles.streakActive : ""}`}
            title={`${streak} day streak`}
          >
            <Flame
              className="inline-block h-3 w-3 align-[-2px]"
              style={{ marginRight: 2 }}
            />
            {streak}d
          </span>
        )}
        <button
          type="button"
          className={styles.deleteBtn}
          onClick={() => deleteHabit(node.id)}
          title="Remove habit"
          aria-label={`Remove ${node.name}`}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <section className={styles.section}>
      <div className={`rowan-panel ${styles.card}`}>
        <div className={styles.header}>
          <div>
            <p className="rowan-eyebrow">Habits // Daily</p>
            <h2 className={styles.title}>Daily Habits</h2>
          </div>
          <div className={styles.progress}>
            <span className={styles.progressNum}>{doneCount}</span>
            <span className={styles.progressDenom}>/ {leaves.length} done</span>
          </div>
        </div>

        {tree.length === 0 ? (
          <p className={styles.empty}>
            No habits yet. Add one below — try{" "}
            <span style={{ fontFamily: "var(--font-mono)" }}>
              Creator&apos;s Corner &gt; Script writing
            </span>{" "}
            for subsections.
          </p>
        ) : (
          <div className={styles.groups}>
            {tree.map((node) => {
              if (node.children.length === 0) {
                return (
                  <div key={node.id} className={styles.group}>
                    {renderRow(node, false)}
                  </div>
                );
              }
              const isCollapsed = collapsed.has(node.id);
              const childLeaves = node.children;
              const done = childLeaves.filter((c) =>
                logSet.has(`${c.id}|${today}`)
              ).length;
              return (
                <div key={node.id} className={styles.group}>
                  <div
                    className={styles.groupHeader}
                    onClick={() =>
                      setCollapsed((prev) => {
                        const s = new Set(prev);
                        if (s.has(node.id)) s.delete(node.id);
                        else s.add(node.id);
                        return s;
                      })
                    }
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={`${styles.chevron} ${
                          isCollapsed ? "" : styles.chevronOpen
                        }`}
                      />
                      <span className={styles.groupTitle}>{node.name}</span>
                    </div>
                    <span className={styles.groupCount}>
                      {done} / {childLeaves.length}
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div className={styles.groupBody}>
                      {childLeaves.map((c) => renderRow(c, true))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className={styles.addRow}>
          <input
            type="text"
            className={styles.addInput}
            placeholder="New habit  ·  Parent > Subhabit"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={onAddKey}
            disabled={adding}
          />
          <button
            type="button"
            className={styles.addBtn}
            onClick={addHabit}
            disabled={!newName.trim() || adding}
          >
            Add
          </button>
        </div>
      </div>
    </section>
  );
}
