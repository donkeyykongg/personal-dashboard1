"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DailyTask } from "@/lib/supabase/types";

const TONES = [
  { label: "Emerald", value: "bg-emerald-100 text-emerald-700" },
  { label: "Sky",     value: "bg-sky-100 text-sky-700" },
  { label: "Amber",   value: "bg-amber-100 text-amber-700" },
  { label: "Indigo",  value: "bg-indigo-100 text-indigo-700" },
  { label: "Rose",    value: "bg-rose-100 text-rose-700" },
  { label: "Violet",  value: "bg-violet-100 text-violet-700" },
  { label: "Slate",   value: "bg-slate-100 text-slate-700" },
];

function dayLabel(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function NextSevenDays({ tasks }: { tasks: DailyTask[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTone, setEditTone] = useState(TONES[0].value);
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [newText, setNewText] = useState("");
  const [newTone, setNewTone] = useState(TONES[0].value);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function addTask(dayOffset: number) {
    const text = newText.trim();
    if (!text) return;
    const supabase = createClient();
    const sort = tasks.filter((t) => t.day_offset === dayOffset).length;
    const { error } = await supabase
      .from("daily_tasks")
      .insert({ day_offset: dayOffset, task: text, tone: newTone, sort });
    if (error) {
      alert(error.message);
      return;
    }
    setNewText("");
    setAddingFor(null);
    refresh();
  }

  async function saveEdit(id: string) {
    const text = editText.trim();
    if (!text) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("daily_tasks")
      .update({ task: text, tone: editTone })
      .eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function deleteTask(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("daily_tasks").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    refresh();
  }

  return (
    <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Next seven days</p>
          <h2 className="text-2xl font-semibold">What’s going on</h2>
        </div>
        <span className="text-sm text-muted-foreground">7-day view</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, dayOffset) => {
          const dayTasks = tasks
            .filter((t) => t.day_offset === dayOffset)
            .sort((a, b) => a.sort - b.sort);
          return (
            <article
              key={dayOffset}
              className="flex flex-col gap-2 rounded-lg border bg-background p-4"
            >
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {dayLabel(dayOffset)}
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {dayTasks.map((t) => (
                  <li key={t.id} className="group flex items-start gap-2">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${t.tone}`} />
                    {editingId === t.id ? (
                      <div className="flex flex-1 flex-col gap-1">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(t.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="rounded border border-input bg-background px-2 py-1 text-xs"
                          autoFocus
                        />
                        <select
                          value={editTone}
                          onChange={(e) => setEditTone(e.target.value)}
                          className="rounded border border-input bg-background px-2 py-1 text-xs"
                        >
                          {TONES.map((tone) => (
                            <option key={tone.value} value={tone.value}>
                              {tone.label}
                            </option>
                          ))}
                        </select>
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveEdit(t.id)}
                            className="rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border px-2 py-0.5 text-xs"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1">{t.task}</span>
                        <span className="hidden gap-1 group-hover:flex">
                          <button
                            onClick={() => {
                              setEditingId(t.id);
                              setEditText(t.task);
                              setEditTone(t.tone);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="text-muted-foreground hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {addingFor === dayOffset ? (
                <div className="flex flex-col gap-1">
                  <input
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTask(dayOffset);
                      if (e.key === "Escape") {
                        setAddingFor(null);
                        setNewText("");
                      }
                    }}
                    placeholder="New task"
                    className="rounded border border-input bg-background px-2 py-1 text-xs"
                    autoFocus
                  />
                  <select
                    value={newTone}
                    onChange={(e) => setNewTone(e.target.value)}
                    className="rounded border border-input bg-background px-2 py-1 text-xs"
                  >
                    {TONES.map((tone) => (
                      <option key={tone.value} value={tone.value}>
                        {tone.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      onClick={() => addTask(dayOffset)}
                      className="flex-1 rounded bg-primary px-2 py-0.5 text-xs text-primary-foreground"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingFor(null);
                        setNewText("");
                      }}
                      className="rounded border px-2 py-0.5 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingFor(dayOffset)}
                  className="mt-auto flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
