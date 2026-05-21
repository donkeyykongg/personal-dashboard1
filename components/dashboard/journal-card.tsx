"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { JournalEntry } from "@/lib/supabase/types";

type Props = {
  recentEntries: JournalEntry[];
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function JournalCard({ recentEntries }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  async function save() {
    const content = draft.trim();
    if (!content) return;
    setSaving(true);
    setStatus("");
    const supabase = createClient();
    const { error } = await supabase.from("journal_entries").insert({
      content,
      source: "app",
    });
    setSaving(false);
    if (error) {
      setStatus(error.message);
      return;
    }
    setDraft("");
    setStatus("Logged");
    startTransition(() => router.refresh());
  }

  return (
    <div className="rowan-panel space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="rowan-eyebrow">Journaling</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Quick log</h2>
        </div>
        <Link
          href="/journal"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#B8B6B0] hover:text-white"
        >
          Open journal
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Quick note — mood, blocker, win…"
        className="rowan-input min-h-[100px] w-full p-3 text-sm"
      />

      <div className="flex items-center justify-between">
        <p className="text-xs text-[#B8B6B0]">{status}</p>
        <button
          type="button"
          onClick={save}
          disabled={saving || !draft.trim()}
          className="rowan-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          {saving ? "Logging" : "Log"}
        </button>
      </div>

      {recentEntries.length > 0 && (
        <div className="space-y-2 border-t border-white/[0.06] pt-3">
          <p className="rowan-eyebrow">Today so far</p>
          <ul className="space-y-1.5">
            {recentEntries.slice(0, 3).map((entry) => (
              <li key={entry.id} className="flex gap-2 text-sm">
                <span className="rowan-eyebrow mt-1 w-[52px] shrink-0 text-[#76746E]">
                  {formatTime(entry.created_at)}
                </span>
                <span className="line-clamp-2 text-white/90">{entry.content}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
