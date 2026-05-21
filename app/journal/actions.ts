"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { dateKeyInZone } from "@/lib/dates";
import { summarizeJournal } from "@/lib/journal/summarize";
import type { JournalEntry, JournalSummaryPeriod } from "@/lib/supabase/types";

const TZ = "America/Toronto";

// Window expressed as inclusive start date / exclusive end date in TZ-local days.
// The journal_entries.date column is generated in this same timezone, so we
// can filter directly on `date` without timezone gymnastics on created_at.
function periodWindow(
  period: JournalSummaryPeriod,
  now: Date = new Date()
): { startDate: string; endDateExclusive: string } {
  const todayKey = dateKeyInZone(now, TZ);
  const [y, m, d] = todayKey.split("-").map(Number);

  const addDaysToKey = (key: string, days: number): string => {
    const [yy, mm, dd] = key.split("-").map(Number);
    const dt = new Date(Date.UTC(yy, mm - 1, dd));
    dt.setUTCDate(dt.getUTCDate() + days);
    return dt.toISOString().slice(0, 10);
  };

  if (period === "day") {
    return { startDate: todayKey, endDateExclusive: addDaysToKey(todayKey, 1) };
  }

  if (period === "week") {
    // Monday-anchored. JS getDay: Sun=0…Sat=6. Convert to Mon=0…Sun=6.
    const probe = new Date(Date.UTC(y, m - 1, d));
    const dow = (probe.getUTCDay() + 6) % 7;
    const startKey = addDaysToKey(todayKey, -dow);
    return { startDate: startKey, endDateExclusive: addDaysToKey(startKey, 7) };
  }

  // month — first day of current month → first day of next month
  const startKey = `${y}-${String(m).padStart(2, "0")}-01`;
  const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { startDate: startKey, endDateExclusive: nextMonth };
}

export async function createJournalEntry(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return { ok: false as const, error: "Empty entry" };

  const supabase = createClient();
  const { error } = await supabase.from("journal_entries").insert({
    content: trimmed,
    source: "app",
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function deleteJournalEntry(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/journal");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function generateSummary(period: JournalSummaryPeriod) {
  const supabase = createClient();
  const { startDate, endDateExclusive } = periodWindow(period);

  const { data: entries, error } = await supabase
    .from("journal_entries")
    .select("*")
    .gte("date", startDate)
    .lt("date", endDateExclusive)
    .order("created_at", { ascending: true });

  if (error) return { ok: false as const, error: error.message };

  const list = (entries ?? []) as JournalEntry[];
  const { summary, model } = await summarizeJournal(period, list);

  const { error: upsertError } = await supabase
    .from("journal_summaries")
    .upsert(
      { period, period_start: startDate, summary, model },
      { onConflict: "period,period_start" }
    );

  if (upsertError) return { ok: false as const, error: upsertError.message };
  revalidatePath("/journal");
  return { ok: true as const, summary, model, entryCount: list.length };
}
