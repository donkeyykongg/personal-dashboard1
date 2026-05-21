import type { SupabaseClient } from "@supabase/supabase-js";
import { activeTodoDateKey, tomorrowKey } from "@/lib/assistant/datetime";

export async function gatherAssistantContext(supabase: SupabaseClient) {
  const now = new Date();
  const today = activeTodoDateKey(now);
  const tomorrow = tomorrowKey();
  const inThirtyDays = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  const sinceWeek = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const [
    todayTodos,
    tomorrowTodos,
    events,
    habits,
    habitLogs,
    journal,
    inbox,
    subscriptions,
    sessions,
  ] = await Promise.all([
    supabase
      .from("todo_goals")
      .select("date,text,done,queued,sort_order")
      .eq("date", today)
      .order("sort_order", { ascending: true })
      .limit(30),
    supabase
      .from("todo_goals")
      .select("date,text,done,queued,sort_order")
      .eq("date", tomorrow)
      .order("sort_order", { ascending: true })
      .limit(30),
    supabase
      .from("schedule_events")
      .select("title,start_at,end_at,location,body,sync_status")
      .gte("start_at", now.toISOString())
      .lte("start_at", inThirtyDays)
      .order("start_at", { ascending: true })
      .limit(30),
    supabase
      .from("habits")
      .select("name,category,parent_id,sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(40),
    supabase
      .from("habit_logs")
      .select("habit_id,date,completed,completed_at")
      .gte("date", today)
      .limit(80),
    supabase
      .from("journal_entries")
      .select("content,source,created_at,date")
      .gte("created_at", sinceWeek)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("inbox_items")
      .select("content,destination,created_at")
      .eq("archived", false)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("subscriptions")
      .select("name,next_renewal,billing_cycle,amount_type,active")
      .eq("active", true)
      .limit(30),
    supabase
      .from("pomodoro_sessions")
      .select("started_at,minutes,activity_label,activity_category,completed")
      .gte("started_at", sinceWeek)
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  return {
    now_iso: now.toISOString(),
    timezone: "America/Toronto",
    active_todo_date: today,
    tomorrow_date: tomorrow,
    today_todos: todayTodos.data ?? [],
    tomorrow_todos: tomorrowTodos.data ?? [],
    upcoming_events: events.data ?? [],
    active_habits: habits.data ?? [],
    today_habit_logs: habitLogs.data ?? [],
    recent_journal_entries: journal.data ?? [],
    open_inbox_items: inbox.data ?? [],
    active_subscriptions: subscriptions.data ?? [],
    recent_pomodoro_sessions: sessions.data ?? [],
  };
}

