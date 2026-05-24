import { createClient } from "@/lib/supabase/server";
import { dateKeyInZone } from "@/lib/dates";
import { NextSevenDays } from "@/components/dashboard/next-seven-days";
import { JournalCard } from "@/components/dashboard/journal-card";
import { RenewalAlerts } from "@/components/dashboard/renewal-alerts";
import { CaptureInbox } from "@/components/dashboard/capture-inbox";
import { HabitHeatmap } from "@/components/dashboard/habit-heatmap";
import { DashboardHub } from "@/components/dashboard/dashboard-hub";
import type {
  DailyTask,
  Habit,
  HabitLog,
  InboxItem,
  JournalEntry,
  PomodoroSession,
  Reflection,
  Subscription,
  TodoGoal,
  TodoStreak,
} from "@/lib/supabase/types";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function activeDateKey(now: Date = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tomorrowDateKey(now: Date = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < 6) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const t = new Date(d);
  t.setDate(t.getDate() + 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const since120 = new Date();
  since120.setDate(since120.getDate() - 120);

  const todoActiveDate = activeDateKey();
  const todoTomorrowDate = tomorrowDateKey();

  const [
    tasksRes,
    subsRes,
    inboxRes,
    sessionsRes,
    reflectionsRes,
    habitsRes,
    habitLogsRes,
    journalRes,
    todayTodoRes,
    tomorrowTodoRes,
    todoStreakRes,
  ] = await Promise.all([
    supabase.from("daily_tasks").select("*").order("sort", { ascending: true }),
    supabase.from("subscriptions").select("*").eq("active", true),
    supabase
      .from("inbox_items")
      .select("*")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("pomodoro_sessions")
      .select("*")
      .gte("started_at", since120.toISOString()),
    supabase
      .from("reflections")
      .select("*")
      .gte("date", since120.toISOString().slice(0, 10)),
    supabase
      .from("habits")
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("habit_logs")
      .select("*")
      .gte("date", since120.toISOString().slice(0, 10)),
    supabase
      .from("journal_entries")
      .select("*")
      .eq("date", dateKeyInZone())
      .order("created_at", { ascending: false }),
    supabase
      .from("todo_goals")
      .select("*")
      .eq("date", todoActiveDate)
      .order("sort_order", { ascending: true }),
    supabase
      .from("todo_goals")
      .select("*")
      .eq("date", todoTomorrowDate)
      .order("sort_order", { ascending: true }),
    supabase.from("todo_streak").select("*").eq("user_id", user?.id).maybeSingle(),
  ]);

  const tasks = (tasksRes.data ?? []) as DailyTask[];
  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const inboxItems = (inboxRes.data ?? []) as InboxItem[];
  const sessions = (sessionsRes.data ?? []) as PomodoroSession[];
  const reflections = (reflectionsRes.data ?? []) as Reflection[];
  const habits = (habitsRes.data ?? []) as Habit[];
  const habitLogs = (habitLogsRes.data ?? []) as HabitLog[];
  const todayJournalEntries = (journalRes.data ?? []) as JournalEntry[];
  const todoToday = (todayTodoRes.data ?? []) as TodoGoal[];
  const todoTomorrow = (tomorrowTodoRes.data ?? []) as TodoGoal[];
  const todoStreakRow = (todoStreakRes.data ?? null) as TodoStreak | null;
  const todoStreakCount = todoStreakRow?.count ?? 0;

  return (
    <div className="space-y-10">
      <DashboardHub
        habits={habits}
        habitLogs={habitLogs}
        todoActiveDate={todoActiveDate}
        todoTomorrowDate={todoTomorrowDate}
        todoToday={todoToday}
        todoTomorrow={todoTomorrow}
        todoStreakCount={todoStreakCount}
        rightContent={
          <HabitHeatmap
            sessions={sessions}
            reflections={reflections}
            habitLogs={habitLogs}
          />
        }
      />

      <CaptureInbox items={inboxItems} />

      <RenewalAlerts subscriptions={subscriptions} />

      <NextSevenDays tasks={tasks} />

      <JournalCard recentEntries={todayJournalEntries} />
    </div>
  );
}
