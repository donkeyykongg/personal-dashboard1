import type { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_DAILY_TASKS = [
  [0, "Review today's priorities", "bg-emerald-100 text-emerald-700", 0],
  [0, "Capture any loose tasks", "bg-emerald-100 text-emerald-700", 1],
  [1, "Plan tomorrow's first focus sprint", "bg-sky-100 text-sky-700", 0],
  [1, "Check upcoming deadlines", "bg-sky-100 text-sky-700", 1],
  [2, "Clean loose notes", "bg-amber-100 text-amber-700", 0],
  [2, "Move useful ideas into Brain", "bg-amber-100 text-amber-700", 1],
  [3, "Review active projects", "bg-indigo-100 text-indigo-700", 0],
  [3, "Update any recurring tasks", "bg-indigo-100 text-indigo-700", 1],
  [4, "Schedule one admin block", "bg-rose-100 text-rose-700", 0],
  [4, "Check personal finance inbox", "bg-rose-100 text-rose-700", 1],
  [5, "Write a quick reflection", "bg-violet-100 text-violet-700", 0],
  [5, "Capture blockers and follow-ups", "bg-violet-100 text-violet-700", 1],
  [6, "Clear open loops", "bg-slate-100 text-slate-700", 0],
  [6, "Set priorities for next week", "bg-slate-100 text-slate-700", 1],
] as const;

const DEFAULT_JOURNAL_PROMPTS = [
  ["What felt easy today, and what felt heavier than expected?", 0],
  ["What decision do I want to understand better?", 1],
  ["What should I move into notes, schedule, or Kanban?", 2],
  ["What should tomorrow's first focus sprint be?", 3],
] as const;

export async function ensureUserDefaults(supabase: SupabaseClient) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await Promise.all([
    supabase
      .from("user_settings")
      .upsert(
        { id: 1, user_id: user.id, last_pomodoro_minutes: 25 },
        { onConflict: "user_id", ignoreDuplicates: true }
      ),
    supabase
      .from("todo_streak")
      .upsert(
        { id: 1, user_id: user.id, count: 0 },
        { onConflict: "user_id", ignoreDuplicates: true }
      ),
  ]);

  const [{ count: taskCount }, { count: promptCount }] = await Promise.all([
    supabase
      .from("daily_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("journal_prompts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if ((taskCount ?? 0) === 0) {
    await supabase.from("daily_tasks").insert(
      DEFAULT_DAILY_TASKS.map(([day_offset, task, tone, sort]) => ({
        user_id: user.id,
        day_offset,
        task,
        tone,
        sort,
      }))
    );
  }

  if ((promptCount ?? 0) === 0) {
    await supabase.from("journal_prompts").insert(
      DEFAULT_JOURNAL_PROMPTS.map(([prompt, sort]) => ({
        user_id: user.id,
        prompt,
        sort,
      }))
    );
  }
}
