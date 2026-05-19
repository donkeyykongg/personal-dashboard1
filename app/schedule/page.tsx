import { createClient } from "@/lib/supabase/server";
import { ScheduleShell } from "@/components/schedule/schedule-shell";
import type { ScheduleEvent } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_events")
    .select("*")
    .order("start_at", { ascending: true });

  const events = (data ?? []) as ScheduleEvent[];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Schedule</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Add and manage events. Events are stored locally in your database.
        </p>
      </header>

      <ScheduleShell events={events} />

      {error && (
        <p className="text-sm text-destructive">Couldn&apos;t load from Supabase: {error.message}</p>
      )}
    </div>
  );
}
