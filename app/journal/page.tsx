import { createClient } from "@/lib/supabase/server";
import type { JournalEntry, JournalSummary, JournalSummaryPeriod } from "@/lib/supabase/types";
import { JournalClient } from "./journal-client";
import { JournalStats } from "./journal-stats";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = createClient();

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [entriesRes, summariesRes] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("*")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("journal_summaries")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const entries = (entriesRes.data ?? []) as JournalEntry[];
  const summariesRaw = (summariesRes.data ?? []) as JournalSummary[];

  // Pick the latest summary for each period.
  const summaries: Partial<Record<JournalSummaryPeriod, JournalSummary>> = {};
  summariesRaw.forEach((s) => {
    if (!summaries[s.period]) summaries[s.period] = s;
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="rowan-eyebrow">Journal // Stream</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
          Journal
        </h1>
        <p className="mt-1 text-sm text-[#B8B6B0]">
          Log raw notes — typed here, or piped in via Telegram. AI summaries spot
          recurring themes.
        </p>
      </header>

      <JournalStats entries={entries} />

      <JournalClient entries={entries} summaries={summaries} />
    </div>
  );
}
