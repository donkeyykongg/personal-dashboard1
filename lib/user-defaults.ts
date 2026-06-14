import type { SupabaseClient } from "@supabase/supabase-js";

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

  const { count: promptCount } = await supabase
    .from("journal_prompts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

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
