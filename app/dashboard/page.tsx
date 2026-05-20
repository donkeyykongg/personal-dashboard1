import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NextSevenDays } from "@/components/dashboard/next-seven-days";
import { JournalCard } from "@/components/dashboard/journal-card";
import { RenewalAlerts } from "@/components/dashboard/renewal-alerts";
import { CaptureInbox } from "@/components/dashboard/capture-inbox";
import { HabitHeatmap } from "@/components/dashboard/habit-heatmap";
import { DashboardHub } from "@/components/dashboard/dashboard-hub";
import type {
  DailyTask,
  InboxItem,
  JournalPrompt,
  PomodoroSession,
  Reflection,
  Subscription,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();

  const since120 = new Date();
  since120.setDate(since120.getDate() - 120);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    tasksRes,
    promptsRes,
    subsRes,
    inboxRes,
    sessionsRes,
    reflectionsRes,
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
  ]);

  const tasks = (tasksRes.data ?? []) as DailyTask[];
  const prompts = (promptsRes.data ?? []) as JournalPrompt[];
  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const inboxItems = (inboxRes.data ?? []) as InboxItem[];
  const sessions = (sessionsRes.data ?? []) as PomodoroSession[];
  const reflections = (reflectionsRes.data ?? []) as Reflection[];
  const todayIso = todayStart.toISOString().slice(0, 10);
  const todayReflection =
    reflections.find((reflection) => reflection.date === todayIso) ?? null;

  return (
    <div className="space-y-10">
      <DashboardHub
        rightContent={
          <HabitHeatmap sessions={sessions} reflections={reflections} />
        }
      />

      <CaptureInbox items={inboxItems} />

      <RenewalAlerts subscriptions={subscriptions} />

      <NextSevenDays tasks={tasks} />

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <JournalCard initialReflection={todayReflection} />

        <aside className="rowan-panel space-y-4 p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="rowan-eyebrow">Quick notes</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Journal prompts</h2>
            </div>
            <Link href="/reflections" className="text-xs text-[#B8B6B0] hover:text-white">
              Edit
            </Link>
          </div>
          {prompts.length === 0 ? (
            <p className="text-sm text-[#B8B6B0]">
              No prompts yet. Add some on the{" "}
              <Link href="/reflections" className="underline hover:text-white">
                Reflections
              </Link>{" "}
              page.
            </p>
          ) : (
            <ul className="space-y-2 text-sm text-white">
              {prompts.map((p) => (
                <li key={p.id} className="flex gap-2 rounded-lg bg-white/[0.025] p-3">
                  <span className="rowan-accent-dot mt-1.5 h-2 w-2 shrink-0 rounded-full" />
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
