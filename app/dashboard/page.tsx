import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NextSevenDays } from "@/components/dashboard/next-seven-days";
import { JournalCard } from "@/components/dashboard/journal-card";
import { FinancialSnapshot } from "@/components/dashboard/financial-snapshot";
import { RenewalAlerts } from "@/components/dashboard/renewal-alerts";
import { CaptureInbox } from "@/components/dashboard/capture-inbox";
import { HabitHeatmap } from "@/components/dashboard/habit-heatmap";
import { DashboardHub } from "@/components/dashboard/dashboard-hub";
import { TodaySpotlight } from "@/components/dashboard/today-spotlight";
import { getFinanceOverview } from "@/lib/finances";
import type {
  DailyTask,
  InboxItem,
  JournalPrompt,
  KanbanCard,
  PomodoroSession,
  Reflection,
  ScheduleEvent,
  Subscription,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const since120 = new Date();
  since120.setDate(since120.getDate() - 120);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    tasksRes,
    promptsRes,
    subsRes,
    inboxRes,
    sessionsRes,
    reflectionsRes,
    overview,
    quickWinsRes,
    todayEventsRes,
    settingsRes,
  ] = await Promise.all([
    supabase.from("daily_tasks").select("*").order("sort", { ascending: true }),
    supabase.from("journal_prompts").select("*").order("sort", { ascending: true }),
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
    getFinanceOverview(supabase),
    supabase
      .from("kanban_cards")
      .select("*")
      .eq("priority", "high")
      .eq("effort", "low")
      .neq("column_key", "done")
      .order("sort", { ascending: true }),
    supabase
      .from("schedule_events")
      .select("*")
      .gte("start_at", todayStart.toISOString())
      .lte("start_at", todayEnd.toISOString())
      .neq("sync_status", "deleted")
      .order("start_at", { ascending: true }),
    supabase
      .from("user_settings")
      .select("last_pomodoro_minutes")
      .eq("id", 1)
      .single(),
  ]);

  const tasks = (tasksRes.data ?? []) as DailyTask[];
  const prompts = (promptsRes.data ?? []) as JournalPrompt[];
  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const inboxItems = (inboxRes.data ?? []) as InboxItem[];
  const sessions = (sessionsRes.data ?? []) as PomodoroSession[];
  const reflections = (reflectionsRes.data ?? []) as Reflection[];
  const quickWins = (quickWinsRes.data ?? []) as KanbanCard[];
  const todayEvents = (todayEventsRes.data ?? []) as ScheduleEvent[];
  const pomodoroTargetMinutes = settingsRes.data?.last_pomodoro_minutes ?? 25;

  return (
    <div className="space-y-10">
      <DashboardHub
        rightContent={
          <div className="space-y-3">
            <FinancialSnapshot
              netWorth={overview.netWorth}
              totalCash={overview.totalCash}
              totalDebt={overview.totalDebt}
              monthExpenses={overview.currentExpenses}
              monthIncome={overview.currentIncome}
            />
            <HabitHeatmap sessions={sessions} reflections={reflections} />
          </div>
        }
      />

      <TodaySpotlight
        quickWins={quickWins}
        todayEvents={todayEvents}
        pomodoroTargetMinutes={pomodoroTargetMinutes}
      />

      <CaptureInbox items={inboxItems} />

      <RenewalAlerts subscriptions={subscriptions} />

      <NextSevenDays tasks={tasks} />

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <JournalCard />

        <aside className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Quick notes</p>
              <h2 className="text-xl">Journal prompts</h2>
            </div>
            <Link href="/reflections" className="text-xs text-primary hover:underline">
              Edit
            </Link>
          </div>
          {prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No prompts yet. Add some on the{" "}
              <Link href="/reflections" className="underline">
                Reflections
              </Link>{" "}
              page.
            </p>
          ) : (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {prompts.map((p) => (
                <li key={p.id} className="flex gap-2 rounded-lg border bg-background p-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>{p.prompt}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>
    </div>
  );
}
