"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import type { JournalEntry, JournalSummary, JournalSummaryPeriod } from "@/lib/supabase/types";
import {
  createJournalEntry,
  deleteJournalEntry,
  generateSummary,
} from "./actions";

type Props = {
  entries: JournalEntry[];
  summaries: Partial<Record<JournalSummaryPeriod, JournalSummary>>;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDayHeader(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function groupByDate(entries: JournalEntry[]): Map<string, JournalEntry[]> {
  const map = new Map<string, JournalEntry[]>();
  entries.forEach((e) => {
    const list = map.get(e.date) ?? [];
    list.push(e);
    map.set(e.date, list);
  });
  return map;
}

export function JournalClient({ entries, summaries }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [activePeriod, setActivePeriod] = useState<JournalSummaryPeriod>("day");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [liveSummaries, setLiveSummaries] =
    useState<Partial<Record<JournalSummaryPeriod, JournalSummary>>>(summaries);

  const onPost = async () => {
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    const res = await createJournalEntry(content);
    setPosting(false);
    if (res.ok) {
      setDraft("");
      startTransition(() => router.refresh());
    }
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this entry?")) return;
    await deleteJournalEntry(id);
    startTransition(() => router.refresh());
  };

  const onGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    const res = await generateSummary(activePeriod);
    setGenerating(false);
    if (res.ok) {
      setLiveSummaries((prev) => ({
        ...prev,
        [activePeriod]: {
          id: "live",
          period: activePeriod,
          period_start: new Date().toISOString().slice(0, 10),
          summary: res.summary,
          model: res.model,
          created_at: new Date().toISOString(),
        },
      }));
    } else {
      setGenError(res.error);
    }
  };

  const grouped = groupByDate(entries);
  const dayKeys = Array.from(grouped.keys()).sort((a, b) => (a < b ? 1 : -1));

  const currentSummary = liveSummaries[activePeriod];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
      <div className="space-y-6">
        <div className="rowan-panel space-y-3 p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="rowan-eyebrow">Journal // Compose</p>
              <h2 className="mt-1 text-xl font-semibold text-white">New entry</h2>
            </div>
            <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#B8B6B0]">
              Private
            </span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's going on right now? Mood, blockers, wins, anything…"
            className="rowan-input min-h-[140px] w-full p-4 text-sm"
          />
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onPost}
              disabled={posting || !draft.trim()}
              className="rowan-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {posting ? "Logging" : "Log entry"}
            </button>
          </div>
        </div>

        <div className="rowan-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="rowan-eyebrow">Journal // Stream</p>
              <h2 className="mt-1 text-xl font-semibold text-white">Recent entries</h2>
            </div>
            <span className="rowan-eyebrow">{entries.length} ENTRIES</span>
          </div>

          {entries.length === 0 ? (
            <p className="mt-6 text-sm text-[#B8B6B0]">
              No entries yet. Type one above, or send a plain-text message to the Telegram bot — it
              auto-routes here.
            </p>
          ) : (
            <div className="mt-5 space-y-6">
              {dayKeys.map((day) => (
                <div key={day} className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="rowan-eyebrow">{formatDayHeader(day)}</span>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                  </div>
                  <ul className="space-y-2">
                    {grouped.get(day)!.map((entry) => (
                      <li
                        key={entry.id}
                        className="group flex gap-3 rounded-lg bg-white/[0.025] p-3"
                      >
                        <span className="rowan-eyebrow mt-[3px] w-[68px] shrink-0 text-[#76746E]">
                          {formatTime(entry.created_at)}
                        </span>
                        <span
                          className={`mt-[2px] shrink-0 rounded px-1.5 py-[1px] text-[9px] font-bold tracking-[0.14em] ${
                            entry.source === "telegram"
                              ? "bg-[color-mix(in_srgb,var(--rowan-accent,#6BE3A4)_18%,transparent)] text-[var(--rowan-accent,#6BE3A4)]"
                              : "bg-white/[0.06] text-[#B8B6B0]"
                          }`}
                        >
                          {entry.source === "telegram" ? "TG" : "APP"}
                        </span>
                        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-white">
                          {entry.content}
                        </p>
                        <button
                          type="button"
                          onClick={() => onDelete(entry.id)}
                          className="text-[#76746E] opacity-0 transition-opacity hover:text-[#FF6B6B] group-hover:opacity-100"
                          aria-label="Delete entry"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rowan-panel space-y-4 p-6">
          <div>
            <p className="rowan-eyebrow">AI // Summary</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Patterns &amp; rollup</h2>
            <p className="mt-1 text-xs text-[#B8B6B0]">
              Condenses your entries and flags recurring themes.
            </p>
          </div>

          <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.025] p-1">
            {(["day", "week", "month"] as JournalSummaryPeriod[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setActivePeriod(p)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition-colors ${
                  activePeriod === p
                    ? "bg-white/[0.10] text-white"
                    : "text-[#76746E] hover:text-[#B8B6B0]"
                }`}
              >
                {p === "day" ? "Today" : p === "week" ? "Week" : "Month"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="rowan-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {generating ? "Generating" : "Generate"}
          </button>

          {genError && (
            <p className="text-xs text-[#FF6B6B]">{genError}</p>
          )}

          {currentSummary ? (
            <div className="rounded-xl bg-white/[0.025] p-4">
              <p className="rowan-eyebrow mb-2 text-[#76746E]">
                {currentSummary.model ?? "AI"} ·{" "}
                {new Date(currentSummary.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                {currentSummary.summary}
              </div>
            </div>
          ) : (
            <p className="rounded-xl bg-white/[0.015] p-4 text-xs italic text-[#76746E]">
              No summary for this period yet. Hit Generate.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
