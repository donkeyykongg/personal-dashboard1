"use client";

import { useEffect, useState, useTransition } from "react";
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

function toneColor(tone: string) {
  if (tone.includes("emerald")) return "#6BE3A4";
  if (tone.includes("sky")) return "#7DD3FC";
  if (tone.includes("amber")) return "#F2C063";
  if (tone.includes("indigo")) return "#A5B4FC";
  if (tone.includes("rose")) return "#FF8A8A";
  if (tone.includes("violet")) return "#B794F4";
  return "#FAFAFA";
}

function dayLabel(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function activeGoalDate() {
  const d = new Date();
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return dateKey(d);
}

function tomorrowGoalDate() {
  const now = new Date();
  if (now.getHours() < 6) return dateKey(now);
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  return dateKey(d);
}

type LocalGoal = { text: string; done?: boolean };

function readGoals(key: string): LocalGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as LocalGoal[]) : [];
  } catch {
    return [];
  }
}

function writeGoals(key: string, goals: LocalGoal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(goals));
  window.dispatchEvent(new Event("goals-changed"));
}

function offsetToGoalKey(offset: number): string {
  return `goals:${offset === 0 ? activeGoalDate() : tomorrowGoalDate()}`;
}

function deleteGoal(offset: number, index: number) {
  const key = offsetToGoalKey(offset);
  const all = readGoals(key);
  const undone = all.filter((g) => !g.done);
  const target = undone[index];
  if (!target) return;
  const targetIdx = all.findIndex((g) => g.text === target.text && !g.done);
  if (targetIdx === -1) return;
  all.splice(targetIdx, 1);
  writeGoals(key, all);
}

function editGoal(offset: number, index: number, newText: string) {
  const key = offsetToGoalKey(offset);
  const all = readGoals(key);
  const undone = all.filter((g) => !g.done);
  const target = undone[index];
  if (!target) return;
  const targetIdx = all.findIndex((g) => g.text === target.text && !g.done);
  if (targetIdx === -1) return;
  all[targetIdx] = { ...all[targetIdx], text: newText };
  writeGoals(key, all);
}

export function NextSevenDays({ tasks }: { tasks: DailyTask[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editTone, setEditTone] = useState(TONES[0].value);
  const [editingGoal, setEditingGoal] = useState<{ offset: number; index: number } | null>(null);
  const [editGoalText, setEditGoalText] = useState("");
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [newText, setNewText] = useState("");
  const [newTone, setNewTone] = useState(TONES[0].value);
  const [localGoals, setLocalGoals] = useState<Record<number, LocalGoal[]>>({ 0: [], 1: [] });

  useEffect(() => {
    const refreshGoals = () => {
      setLocalGoals({
        0: readGoals(`goals:${activeGoalDate()}`).filter((g) => !g.done),
        1: readGoals(`goals:${tomorrowGoalDate()}`).filter((g) => !g.done),
      });
    };
    refreshGoals();
    window.addEventListener("goals-changed", refreshGoals as EventListener);
    window.addEventListener("storage", refreshGoals);
    return () => {
      window.removeEventListener("goals-changed", refreshGoals as EventListener);
      window.removeEventListener("storage", refreshGoals);
    };
  }, []);

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
    <section className="rowan-panel space-y-4 p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="rowan-eyebrow">Next seven days</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">What’s going on</h2>
        </div>
        <span className="font-mono text-xs text-[#B8B6B0]">7-day view</span>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, dayOffset) => {
          const dayTasks = tasks
            .filter((t) => t.day_offset === dayOffset)
            .sort((a, b) => a.sort - b.sort);
          const dayGoals = localGoals[dayOffset] ?? [];
          return (
            <article
              key={dayOffset}
              className="flex flex-col gap-2 rounded-xl border border-white/5 bg-white/[0.025] p-4"
            >
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#B8B6B0]">
                {dayLabel(dayOffset)}
              </p>
              <ul className="space-y-2 text-sm text-white">
                {dayGoals.map((goal, index) => {
                  const isEditing =
                    editingGoal?.offset === dayOffset && editingGoal?.index === index;
                  return (
                    <li key={`goal-${dayOffset}-${index}`} className="flex items-start gap-2">
                      <span
                        className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                        style={{
                          background: "var(--rowan-accent, #6BE3A4)",
                          boxShadow:
                            "0 0 8px color-mix(in srgb, var(--rowan-accent, #6BE3A4) 66%, transparent)",
                        }}
                      />
                      {isEditing ? (
                        <div className="flex flex-1 flex-col gap-1">
                          <input
                            value={editGoalText}
                            onChange={(e) => setEditGoalText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const v = editGoalText.trim();
                                if (v) editGoal(dayOffset, index, v);
                                setEditingGoal(null);
                              }
                              if (e.key === "Escape") setEditingGoal(null);
                            }}
                            className="rowan-input px-2 py-1 text-xs"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                const v = editGoalText.trim();
                                if (v) editGoal(dayOffset, index, v);
                                setEditingGoal(null);
                              }}
                              className="rowan-primary rounded px-2 py-0.5 text-xs"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => setEditingGoal(null)}
                              className="rounded border border-white/10 px-2 py-0.5 text-xs text-[#B8B6B0]"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1 leading-relaxed">
                            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#76746E]">
                              Goal ·{" "}
                            </span>
                            {goal.text}
                          </span>
                          <span className="flex gap-1">
                            <button
                              onClick={() => {
                                setEditingGoal({ offset: dayOffset, index });
                                setEditGoalText(goal.text);
                              }}
                              className="text-[#76746E] hover:text-white"
                              aria-label="Edit goal"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => deleteGoal(dayOffset, index)}
                              className="text-[#76746E] hover:text-[#FF8A8A]"
                              aria-label="Delete goal"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </span>
                        </>
                      )}
                    </li>
                  );
                })}
                {dayTasks.map((t) => (
                  <li key={t.id} className="group flex items-start gap-2">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: toneColor(t.tone),
                        boxShadow: `0 0 8px ${toneColor(t.tone)}66`,
                      }}
                    />
                    {editingId === t.id ? (
                      <div className="flex flex-1 flex-col gap-1">
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEdit(t.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          className="rowan-input px-2 py-1 text-xs"
                          autoFocus
                        />
                        <select
                          value={editTone}
                          onChange={(e) => setEditTone(e.target.value)}
                          className="rowan-input px-2 py-1 text-xs"
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
                            className="rowan-primary rounded px-2 py-0.5 text-xs"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="rounded border border-white/10 px-2 py-0.5 text-xs text-[#B8B6B0]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 leading-relaxed text-white">{t.task}</span>
                        <span className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingId(t.id);
                              setEditText(t.task);
                              setEditTone(t.tone);
                            }}
                            className="text-[#76746E] hover:text-white"
                            aria-label="Edit"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="text-[#76746E] hover:text-[#FF8A8A]"
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
                    className="rowan-input px-2 py-1 text-xs"
                    autoFocus
                  />
                  <select
                    value={newTone}
                    onChange={(e) => setNewTone(e.target.value)}
                    className="rowan-input px-2 py-1 text-xs"
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
                      className="rowan-primary flex-1 rounded px-2 py-0.5 text-xs"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setAddingFor(null);
                        setNewText("");
                      }}
                      className="rounded border border-white/10 px-2 py-0.5 text-xs text-[#B8B6B0]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingFor(dayOffset)}
                  className="mt-auto flex items-center gap-1 self-start text-xs text-[#B8B6B0] hover:text-white"
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
