"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { createPage, deletePage } from "./actions";
import type { BrainPage } from "@/lib/supabase/types";

type EntityCardData = {
  page: BrainPage;
  openCount: number;
  briefingCount: number;
  todayCount: number;
  lastEditedDays: number | null;
};

type Props = {
  entities: EntityCardData[];
};

function dotColor(dot: string): string {
  if (dot === "yellow") return "#F2C063";
  if (dot === "red") return "#FF6B6B";
  return "var(--rowan-accent, #6BE3A4)";
}

function relTime(days: number | null): string {
  if (days === null) return "—";
  if (days === 0) return "TODAY";
  if (days === 1) return "1D AGO";
  if (days < 30) return `${days}D AGO`;
  if (days < 365) return `${Math.floor(days / 30)}MO AGO`;
  return `${Math.floor(days / 365)}Y AGO`;
}

export function BrainIndexClient({ entities }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");

  const submit = async () => {
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    const res = await createPage({
      title: t,
      parentId: null,
      icon: icon.trim() || null,
    });
    setSaving(false);
    if (res.ok) {
      setTitle("");
      setIcon("");
      setAdding(false);
      startTransition(() => router.refresh());
    }
  };

  const onDelete = async (page: BrainPage, openCount: number) => {
    const subPart =
      openCount > 0 ? ` and its ${openCount} sub-page${openCount === 1 ? "" : "s"}` : "";
    if (
      !confirm(
        `Delete "${page.title}"${subPart}? This is permanent and removes everything inside it.`
      )
    )
      return;
    const res = await deletePage(page.id);
    if (res.ok) startTransition(() => router.refresh());
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entities;
    return entities.filter((e) => {
      const hay = `${e.page.title} ${e.page.content_md} ${e.page.icon ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [entities, query]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <p className="rowan-eyebrow">Brain // {entities.length} entities</p>
        <p className="rowan-eyebrow text-[#76746E]">
          Entity dashboards — live cockpit
        </p>
      </div>

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
        <Search className="h-4 w-4 text-[#76746E]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities…"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#76746E]"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-[#76746E] hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((e) => (
          <div
            key={e.page.id}
            className="rowan-panel group relative flex flex-col gap-3 p-4 transition-colors hover:border-white/20"
          >
            <button
              type="button"
              onClick={(ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                onDelete(e.page, e.openCount);
              }}
              className="absolute right-2 top-2 z-10 rounded-md border border-white/[0.06] bg-black/40 p-1.5 text-[#76746E] opacity-0 transition-all hover:border-[#FF6B6B]/40 hover:text-[#FF6B6B] group-hover:opacity-100"
              title="Delete entity"
              aria-label={`Delete ${e.page.title}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <Link
              href={`/brain/${e.page.id}`}
              className="flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-xl"
                  aria-hidden
                >
                  {e.page.icon || "🧠"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2 pr-7">
                    <h3 className="truncate text-base font-semibold text-white">
                      {e.page.title}
                    </h3>
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: dotColor(e.page.status_dot),
                        boxShadow: `0 0 8px ${dotColor(e.page.status_dot)}`,
                      }}
                    />
                  </div>
                  <div className="mt-1 flex items-baseline gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#76746E]">
                    <span>
                      <span className="text-white">{e.openCount}</span> open
                    </span>
                    <span className="text-[#F2C063]">●</span>
                    <span>
                      <span className="text-white">{e.todayCount}</span> today
                    </span>
                    <span className="ml-auto text-[#76746E]">
                      {relTime(e.lastEditedDays)}
                    </span>
                  </div>
                </div>
              </div>

            </Link>
          </div>
        ))}

        {!query && (adding ? (
          <div className="rowan-panel flex flex-col gap-2 p-4">
            <div className="flex items-center justify-between">
              <p className="rowan-eyebrow">New entity</p>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setTitle("");
                  setIcon("");
                }}
                className="text-[#76746E] hover:text-white"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Travel)"
              className="rowan-input w-full px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Icon (emoji, optional)"
              className="rowan-input w-full px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={submit}
              disabled={saving || !title.trim()}
              className="rowan-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.015] p-4 text-[#76746E] transition-colors hover:border-white/20 hover:text-[#B8B6B0]"
          >
            <Plus className="h-5 w-5" />
            <span className="rowan-eyebrow">New entity</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && query && (
        <p className="mt-6 text-center text-sm italic text-[#76746E]">
          No entities match &ldquo;{query}&rdquo;.
        </p>
      )}
    </div>
  );
}
