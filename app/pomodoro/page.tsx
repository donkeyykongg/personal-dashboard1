import { createClient } from "@/lib/supabase/server";
import { PomodoroTimer } from "@/components/pomodoro/pomodoro-timer";
import { PomodoroHistory } from "@/components/pomodoro/pomodoro-history";
import type { UserSettings, PomodoroSession } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function PomodoroPage() {
  const supabase = createClient();
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [settingsRes, sessionsRes] = await Promise.all([
    supabase.from("user_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("pomodoro_sessions")
      .select("*")
      .gte("started_at", since.toISOString())
      .order("started_at", { ascending: false }),
  ]);

  const settings = (settingsRes.data ?? null) as UserSettings | null;
  const sessions = (sessionsRes.data ?? []) as PomodoroSession[];
  const initialMinutes = settings?.last_pomodoro_minutes ?? 25;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-medium">Pomodoro</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Pick a preset, set a custom focus length, and start your sprint. Bell rings
          when time’s up. Completed sessions are logged automatically.
        </p>
      </header>
      <PomodoroTimer initialMinutes={initialMinutes} />
      <PomodoroHistory sessions={sessions} />
    </div>
  );
}
