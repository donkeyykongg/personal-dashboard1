"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { JournalPrompt } from "@/lib/supabase/types";

export function PromptManager({ initialPrompts }: { initialPrompts: JournalPrompt[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newText, setNewText] = useState("");

  const prompts = [...initialPrompts].sort((a, b) => a.sort - b.sort);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function add() {
    const text = newText.trim();
    if (!text) return;
    const supabase = createClient();
    const sort = prompts.length;
    const { error } = await supabase
      .from("journal_prompts")
      .insert({ prompt: text, sort });
    if (error) {
      alert(error.message);
      return;
    }
    setNewText("");
    refresh();
  }

  async function save(id: string) {
    const text = editText.trim();
    if (!text) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("journal_prompts")
      .update({ prompt: text })
      .eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function remove(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("journal_prompts").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    refresh();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = prompts.findIndex((p) => p.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= prompts.length) return;
    const a = prompts[idx];
    const b = prompts[swapIdx];
    const supabase = createClient();
    await Promise.all([
      supabase.from("journal_prompts").update({ sort: b.sort }).eq("id", a.id),
      supabase.from("journal_prompts").update({ sort: a.sort }).eq("id", b.id),
    ]);
    refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Quick notes</p>
          <h3 className="text-base font-semibold">Journal prompts</h3>
        </div>
      </div>

      <ul className="space-y-2">
        {prompts.map((p) => (
          <li
            key={p.id}
            className="group flex items-start gap-2 rounded-md border bg-background p-2 text-sm"
          >
            {editingId === p.id ? (
              <>
                <input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") save(p.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="flex-1 rounded border border-input bg-background px-2 py-1 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => save(p.id)}
                  className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                >
                  <Check className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded border px-2 py-1 text-xs"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <span className="flex-1">{p.prompt}</span>
                <span className="hidden gap-1 group-hover:flex">
                  <button onClick={() => move(p.id, -1)} title="Move up">
                    <ArrowUp className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                  <button onClick={() => move(p.id, 1)} title="Move down">
                    <ArrowDown className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setEditText(p.prompt);
                    }}
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                  <button onClick={() => remove(p.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2 pt-2">
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="New prompt…"
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <Button onClick={add} size="sm">
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
    </div>
  );
}
