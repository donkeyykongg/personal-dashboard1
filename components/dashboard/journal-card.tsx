"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Reflection } from "@/lib/supabase/types";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function JournalCard({ initialReflection }: { initialReflection: Reflection | null }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [journalEntry, setJournalEntry] = useState(initialReflection?.content ?? "");
  const [reflectionId, setReflectionId] = useState(initialReflection?.id ?? null);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    const content = journalEntry.trim();
    if (!content) return;
    setSaving(true);
    setStatus("");
    const supabase = createClient();
    const payload = { date: todayKey(), score: 5, content };
    const result = reflectionId
      ? await supabase
          .from("reflections")
          .update({ content })
          .eq("id", reflectionId)
          .select("*")
          .single()
      : await supabase
          .from("reflections")
          .insert(payload)
          .select("*")
          .single();
    setSaving(false);
    if (result.error) {
      setStatus(result.error.message);
      return;
    }
    setReflectionId(result.data.id);
    setStatus("Saved");
    startTransition(() => router.refresh());
  }

  return (
    <div className="rowan-panel space-y-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="rowan-eyebrow">Journaling</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Quick daily log</h2>
        </div>
        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs font-semibold text-[#B8B6B0]">
          Private
        </span>
      </div>
      <textarea
        value={journalEntry}
        onChange={(e) => setJournalEntry(e.target.value)}
        placeholder="What went well today? What should you track next?"
        className="rowan-input min-h-[180px] w-full p-4 text-sm"
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#B8B6B0]">{status}</p>
        <button
          type="button"
          onClick={save}
          disabled={saving || !journalEntry.trim()}
          className="rowan-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving" : "Save"}
        </button>
      </div>
    </div>
  );
}
