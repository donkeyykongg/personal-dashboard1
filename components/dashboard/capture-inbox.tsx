"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Send, Trash2, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { InboxItem } from "@/lib/supabase/types";

const DESTINATIONS = ["", "note", "task", "idea", "expense"];

export function CaptureInbox({ items }: { items: InboxItem[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [dest, setDest] = useState("");
  const [busy, setBusy] = useState(false);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function add() {
    const content = text.trim();
    if (!content) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("inbox_items")
      .insert({ content, destination: dest || null });
    setBusy(false);
    if (error) {
      alert(error.message);
      return;
    }
    setText("");
    refresh();
  }

  async function archive(id: string) {
    const supabase = createClient();
    await supabase.from("inbox_items").update({ archived: true }).eq("id", id);
    refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("inbox_items").delete().eq("id", id);
    refresh();
  }

  const live = items.filter((i) => !i.archived).slice(0, 6);

  return (
    <section className="rounded-lg border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-muted-foreground">Capture inbox</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          placeholder="Dump anything — idea, link, task, expense to log later. Cmd+Enter to capture."
          className="min-h-[60px] flex-1 rounded-md border border-input bg-background p-3 text-sm outline-none transition focus:border-primary"
        />
        <div className="flex flex-row gap-2 sm:flex-col">
          <select
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            className="rounded-md border border-input bg-background px-2 py-1 text-xs"
          >
            {DESTINATIONS.map((d) => (
              <option key={d || "_none"} value={d}>
                {d || "untagged"}
              </option>
            ))}
          </select>
          <Button onClick={add} disabled={busy || !text.trim()} size="sm">
            <Send className="mr-2 h-3 w-3" />
            Capture
          </Button>
        </div>
      </div>

      {live.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {live.map((it) => (
            <li
              key={it.id}
              className="group flex items-start gap-2 rounded-md border bg-background p-2 text-sm"
            >
              {it.destination && (
                <span className="mt-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                  {it.destination}
                </span>
              )}
              <span className="flex-1 whitespace-pre-wrap">{it.content}</span>
              <span className="hidden gap-1 group-hover:flex">
                <button
                  onClick={() => archive(it.id)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Archive"
                >
                  <Archive className="h-3 w-3" />
                </button>
                <button
                  onClick={() => remove(it.id)}
                  className="text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
