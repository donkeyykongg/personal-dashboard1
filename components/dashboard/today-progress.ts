import type { Habit, HabitLog, TodoGoal } from "@/lib/supabase/types";

export type TodayProgressItem = {
  id: string;
  kind: "habit" | "todo";
  text: string;
  done: boolean;
};

export type TodayProgress = {
  items: TodayProgressItem[];
  done: number;
  total: number;
  pct: number;
};

type HabitNode = Habit & { children: HabitNode[] };

function buildTree(habits: Habit[]): HabitNode[] {
  const map = new Map<string, HabitNode>();
  habits.forEach((habit) => map.set(habit.id, { ...habit, children: [] }));

  const roots: HabitNode[] = [];
  habits.forEach((habit) => {
    const node = map.get(habit.id);
    if (!node) return;
    if (habit.parent_id && map.has(habit.parent_id)) {
      map.get(habit.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortFn = (a: HabitNode, b: HabitNode) =>
    a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);
  roots.sort(sortFn);
  map.forEach((node) => node.children.sort(sortFn));

  return roots;
}

function habitLeaves(habits: Habit[]): HabitNode[] {
  const leaves: HabitNode[] = [];
  const walk = (node: HabitNode) => {
    if (node.children.length === 0) {
      leaves.push(node);
      return;
    }
    node.children.forEach(walk);
  };

  buildTree(habits.filter((habit) => habit.active)).forEach(walk);
  return leaves;
}

export function buildTodayProgress({
  habits,
  habitLogs,
  todos,
  date,
}: {
  habits: Habit[];
  habitLogs: HabitLog[];
  todos: TodoGoal[];
  date: string;
}): TodayProgress {
  const completedHabits = new Set(
    habitLogs
      .filter((log) => log.completed && log.date === date)
      .map((log) => log.habit_id)
  );

  const habitItems = habitLeaves(habits).map<TodayProgressItem>((habit) => ({
    id: `habit:${habit.id}`,
    kind: "habit",
    text: habit.name,
    done: completedHabits.has(habit.id),
  }));

  const todoItems = todos.map<TodayProgressItem>((todo) => ({
    id: `todo:${todo.id}`,
    kind: "todo",
    text: todo.text,
    done: todo.done,
  }));

  const items = [...habitItems, ...todoItems];
  const total = items.length;
  const done = items.filter((item) => item.done).length;

  return {
    items,
    done,
    total,
    pct: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}
