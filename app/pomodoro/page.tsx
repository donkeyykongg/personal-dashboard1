import { createClient } from "@/lib/supabase/server";
import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer";
import { PomodoroHistory } from "@/components/pomodoro/pomodoro-history";
import type { DailyTask, UserSettings, PomodoroSession } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function PomodoroPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const since = new Date();
  since.setMonth(since.getMonth() - 3);

  const [settingsRes, sessionsRes, tasksRes] = await Promise.all([
    supabase.from("user_settings").select("*").eq("user_id", user?.id).maybeSingle(),
    supabase
      .from("pomodoro_sessions")
      .select("*")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false }),
    supabase
      .from("daily_tasks")
      .select("*")
      .order("day_offset", { ascending: true })
      .order("sort", { ascending: true }),
  ]);

  const settings = (settingsRes.data ?? null) as UserSettings | null;
  const sessions = (sessionsRes.data ?? []) as PomodoroSession[];
  const tasks = (tasksRes.data ?? []) as DailyTask[];
  const initialMinutes = settings?.last_pomodoro_minutes ?? 25;

  return (
    <div className="dash-hub space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Focus</h1>
      </header>
      <PomodoroTimer initialMinutes={initialMinutes} tasks={tasks} userId={user?.id ?? ""} />
      <PomodoroHistory sessions={sessions} />
    </div>
  );
}
