"use client";

import { useState } from "react";

export function JournalCard() {
  const [journalEntry, setJournalEntry] = useState("");

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Journaling</p>
          <h2 className="text-2xl font-semibold">Quick daily log</h2>
        </div>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          Private
        </span>
      </div>
      <textarea
        value={journalEntry}
        onChange={(e) => setJournalEntry(e.target.value)}
        placeholder="What went well today? What should you track next?"
        className="min-h-[180px] w-full rounded-lg border border-input bg-background p-4 text-sm outline-none transition focus:border-primary"
      />
    </div>
  );
}
