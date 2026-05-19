import { createClient } from "@/lib/supabase/server";
import { ReflectionForm } from "@/components/reflections/reflection-form";
import { ReflectionList } from "@/components/reflections/reflection-list";
import { ReflectionChart } from "@/components/reflections/reflection-chart";
import { PromptManager } from "@/components/reflections/prompt-manager";
import type { Reflection, JournalPrompt } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function ReflectionsPage() {
  const supabase = createClient();
  const [reflectionsRes, promptsRes] = await Promise.all([
    supabase.from("reflections").select("*").order("date", { ascending: false }),
    supabase.from("journal_prompts").select("*").order("sort", { ascending: true }),
  ]);

  const reflections = (reflectionsRes.data ?? []) as Reflection[];
  const prompts = (promptsRes.data ?? []) as JournalPrompt[];
  const error = reflectionsRes.error?.message ?? promptsRes.error?.message;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reflections</h1>
        <p className="text-sm text-muted-foreground">
          End-of-day reflections to track how you're doing — and what to improve tomorrow.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="space-y-6">
          <ReflectionForm />
          <PromptManager initialPrompts={prompts} />
          <ReflectionChart reflections={reflections} />
        </div>

        <div className="space-y-3">
          <h2 className="text-base font-semibold">All reflections</h2>
          <ReflectionList reflections={reflections} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">Couldn't load from Supabase: {error}</p>
      )}
    </div>
  );
}
