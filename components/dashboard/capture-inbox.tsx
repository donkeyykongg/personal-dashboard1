"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Send, Trash2, Archive } from "lucide-react";
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
    <section className="rowan-panel p-5">
      <div className="mb-3 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-[#B8B6B0]" />
        <p className="rowan-eyebrow">Capture inbox</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          placeholder="Dump anything — idea, link, task, expense to log later. Cmd+Enter to capture."
          className="rowan-input min-h-[60px] flex-1 p-3 text-sm"
        />
        <div className="flex flex-row gap-2 sm:flex-col">
          <select
            value={dest}
            onChange={(e) => setDest(e.target.value)}
            className="rowan-input px-2 py-1 text-xs"
          >
            {DESTINATIONS.map((d) => (
              <option key={d || "_none"} value={d}>
                {d || "untagged"}
              </option>
            ))}
          </select>
          <button
            onClick={add}
            disabled={busy || !text.trim()}
            className="rowan-primary inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-bold disabled:opacity-40"
          >
            <Send className="mr-2 h-3 w-3" />
            Capture
          </button>
        </div>
      </div>

      {live.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {live.map((it) => (
            <li
              key={it.id}
              className="group flex items-start gap-2 rounded-lg bg-white/[0.025] p-2 text-sm text-white"
            >
              {it.destination && (
                <span className="mt-0.5 rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#B8B6B0]">
                  {it.destination}
                </span>
              )}
              <span className="flex-1 whitespace-pre-wrap">{it.content}</span>
              <span className="hidden gap-1 group-hover:flex">
                <button
                  onClick={() => archive(it.id)}
                  className="text-[#B8B6B0] hover:text-white"
                  title="Archive"
                >
                  <Archive className="h-3 w-3" />
                </button>
                <button
                  onClick={() => remove(it.id)}
                  className="text-[#B8B6B0] hover:text-[#FF8A8A]"
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
