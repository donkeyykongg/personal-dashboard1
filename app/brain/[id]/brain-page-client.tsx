"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  createPage,
  deletePage,
  generateBriefing,
  updatePage,
} from "../actions";
import type { BrainBriefing, BrainPage } from "@/lib/supabase/types";

type Props = {
  page: BrainPage;
  parent: BrainPage | null;
  ancestors: BrainPage[];
  children: BrainPage[];
  latestBriefing: BrainBriefing | null;
};

function dotColor(dot: string): string {
  if (dot === "yellow") return "#F2C063";
  if (dot === "red") return "#FF6B6B";
  return "var(--rowan-accent, #6BE3A4)";
}

function dotLabel(dot: string): string {
  if (dot === "yellow") return "Yellow";
  if (dot === "red") return "Red";
  return "Green";
}

function relAge(iso: string): string {
  const then = new Date(iso);
  const diffMs = Date.now() - then.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "TODAY";
  if (days < 7) return `${days}D AGO`;
  if (days < 30) return "THIS MONTH";
  return "SOMEDAY";
}

export function BrainPageClient({
  page,
  parent,
  ancestors,
  children,
  latestBriefing,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [title, setTitle] = useState(page.title);
  const [icon, setIcon] = useState(page.icon ?? "");
  const [editingIcon, setEditingIcon] = useState(false);
  const [notes, setNotes] = useState(page.content_md);
  const [status, setStatus] = useState<BrainPage["status_dot"]>(page.status_dot);
  const [savingMeta, setSavingMeta] = useState(false);

  const [renamingChildId, setRenamingChildId] = useState<string | null>(null);
  const [childDraftTitle, setChildDraftTitle] = useState("");
  const [childDraftIcon, setChildDraftIcon] = useState("");

  const [newChildTitle, setNewChildTitle] = useState("");
  const [newChildIcon, setNewChildIcon] = useState("");
  const [creatingChild, setCreatingChild] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<BrainBriefing | null>(latestBriefing);

  const saveMeta = async (
    override?: Partial<Pick<BrainPage, "title" | "icon" | "content_md" | "status_dot">>
  ) => {
    setSavingMeta(true);
    await updatePage(page.id, {
      title: override?.title ?? title,
      icon: override?.icon !== undefined ? override.icon : icon || null,
      content_md: override?.content_md ?? notes,
      status_dot: override?.status_dot ?? status,
    });
    setSavingMeta(false);
    startTransition(() => router.refresh());
  };

  const cycleStatus = async () => {
    const next: BrainPage["status_dot"] =
      status === "green" ? "yellow" : status === "yellow" ? "red" : "green";
    setStatus(next);
    await saveMeta({ status_dot: next });
  };

  const onTitleBlur = async () => {
    if (title.trim() && title !== page.title) await saveMeta();
  };

  const onIconCommit = async () => {
    const next = icon.trim() || null;
    setEditingIcon(false);
    if (next !== (page.icon ?? null)) await saveMeta({ icon: next });
  };

  const onNotesBlur = async () => {
    if (notes !== page.content_md) await saveMeta();
  };

  const addChild = async () => {
    const t = newChildTitle.trim();
    if (!t) return;
    setCreatingChild(true);
    const res = await createPage({
      title: t,
      parentId: page.id,
      icon: newChildIcon.trim() || null,
    });
    setCreatingChild(false);
    if (res.ok) {
      setNewChildTitle("");
      setNewChildIcon("");
      startTransition(() => router.refresh());
    }
  };

  const startRenameChild = (child: BrainPage) => {
    setRenamingChildId(child.id);
    setChildDraftTitle(child.title);
    setChildDraftIcon(child.icon ?? "");
  };

  const commitRenameChild = async (childId: string) => {
    const t = childDraftTitle.trim();
    if (!t) {
      setRenamingChildId(null);
      return;
    }
    await updatePage(childId, {
      title: t,
      icon: childDraftIcon.trim() || null,
    });
    setRenamingChildId(null);
    startTransition(() => router.refresh());
  };

  const onDeleteChild = async (child: BrainPage) => {
    if (
      !confirm(
        `Delete "${child.title}"? This permanently removes the page and any sub-pages inside it.`
      )
    )
      return;
    await deletePage(child.id);
    startTransition(() => router.refresh());
  };

  const onDeletePage = async () => {
    if (
      !confirm(
        `Delete "${page.title}"? This permanently removes the page and any sub-pages inside it.`
      )
    )
      return;
    const res = await deletePage(page.id);
    if (res.ok) {
      if (parent) router.push(`/brain/${parent.id}`);
      else router.push("/brain");
    }
  };

  const onGenerate = async () => {
    setGenerating(true);
    setGenError(null);
    const res = await generateBriefing(page.id);
    setGenerating(false);
    if (res.ok) {
      setBriefing({
        id: "live",
        page_id: page.id,
        summary: res.summary,
        model: res.model,
        created_at: new Date().toISOString(),
      });
    } else {
      setGenError(res.error);
    }
  };

  const breadcrumb = ancestors.slice().reverse();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em]">
          <Link
            href="/brain"
            className="inline-flex items-center gap-1 text-[#B8B6B0] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Brain
          </Link>
          {breadcrumb.map((a) => (
            <span key={a.id} className="flex items-center gap-1 text-[#76746E]">
              <ChevronRight className="h-3 w-3" />
              <Link
                href={`/brain/${a.id}`}
                className="text-[#B8B6B0] hover:text-white"
              >
                {a.title}
              </Link>
            </span>
          ))}
          <ChevronRight className="h-3 w-3 text-[#76746E]" />
          <span className="text-white">{page.title}</span>
        </div>
        <button
          type="button"
          onClick={onDeletePage}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-[#B8B6B0] hover:border-[#FF6B6B]/40 hover:text-[#FF6B6B]"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete page
        </button>
      </div>

      <div className="rowan-panel space-y-5 p-6">
        <div className="flex items-start gap-3">
          {editingIcon ? (
            <input
              autoFocus
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              onBlur={onIconCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") onIconCommit();
                if (e.key === "Escape") {
                  setIcon(page.icon ?? "");
                  setEditingIcon(false);
                }
              }}
              placeholder="🧠"
              className="h-12 w-12 shrink-0 rounded-lg border border-white/[0.10] bg-white/[0.04] text-center text-2xl text-white outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingIcon(true)}
              title="Click to change icon"
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.04] text-2xl transition-colors hover:border-white/20"
            >
              {page.icon || "🧠"}
            </button>
          )}
          <div className="flex-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={onTitleBlur}
              className="w-full bg-transparent text-3xl font-bold tracking-tight text-white outline-none"
            />
            <div className="mt-1 flex items-baseline gap-3 font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#76746E]">
              <span>
                <span className="text-white">{children.length}</span> sub-pages
              </span>
              <span className="text-[#F2C063]">●</span>
              <span>updated {relAge(page.updated_at).toLowerCase()}</span>
              {savingMeta && (
                <span className="ml-auto text-[var(--rowan-accent,#6BE3A4)]">
                  saving…
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={cycleStatus}
            title={`Status: ${dotLabel(status)} (click to cycle)`}
            className="mt-3 h-3 w-3 shrink-0 rounded-full"
            style={{
              background: dotColor(status),
              boxShadow: `0 0 10px ${dotColor(status)}`,
            }}
          />
        </div>

        <div className="rounded-xl bg-white/[0.025] p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="rowan-eyebrow">AI // Briefing</p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="rowan-primary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] disabled:opacity-40"
            >
              {generating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Generate
            </button>
          </div>
          {genError && <p className="mb-2 text-xs text-[#FF6B6B]">{genError}</p>}
          {briefing ? (
            <div>
              <p className="rowan-eyebrow mb-2 text-[#76746E]">
                {briefing.model ?? "AI"} ·{" "}
                {new Date(briefing.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-white">
                {briefing.summary}
              </div>
            </div>
          ) : (
            <p className="text-xs italic text-[#76746E]">
              No briefing yet. Hit GENERATE to get an AI status snapshot from your
              sub-pages + notes.
            </p>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="rowan-eyebrow">Sub-pages ({children.length})</p>
          </div>
          {children.length === 0 ? (
            <p className="text-sm italic text-[#76746E]">
              No sub-pages yet. Add one below.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {children.map((c) => {
                const isRenaming = renamingChildId === c.id;
                if (isRenaming) {
                  return (
                    <li
                      key={c.id}
                      className="rounded-lg border border-white/[0.10] bg-white/[0.04] p-3"
                    >
                      <div className="flex gap-2">
                        <input
                          value={childDraftIcon}
                          onChange={(e) => setChildDraftIcon(e.target.value)}
                          placeholder="🧠"
                          className="rowan-input h-9 w-12 text-center text-base"
                        />
                        <input
                          autoFocus
                          value={childDraftTitle}
                          onChange={(e) => setChildDraftTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRenameChild(c.id);
                            if (e.key === "Escape") setRenamingChildId(null);
                          }}
                          className="rowan-input flex-1 px-3 py-2 text-sm"
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => commitRenameChild(c.id)}
                          className="rowan-primary rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em]"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenamingChildId(null)}
                          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#B8B6B0]"
                        >
                          Cancel
                        </button>
                      </div>
                    </li>
                  );
                }
                return (
                  <li
                    key={c.id}
                    className="group flex items-center gap-3 rounded-lg border border-white/[0.04] bg-white/[0.015] p-3 transition-colors hover:border-white/[0.10] hover:bg-white/[0.03]"
                  >
                    <Link
                      href={`/brain/${c.id}`}
                      className="flex flex-1 items-center gap-3 text-sm text-white"
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/[0.06] bg-white/[0.04] text-base"
                        aria-hidden
                      >
                        {c.icon || "🧠"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="truncate font-medium">{c.title}</span>
                        {c.content_md && (
                          <span className="block truncate text-xs text-[#76746E]">
                            {c.content_md}
                          </span>
                        )}
                      </span>
                    </Link>
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#76746E]">
                      {relAge(c.updated_at)}
                    </span>
                    <button
                      type="button"
                      onClick={() => startRenameChild(c)}
                      className="text-[#76746E] opacity-0 transition-opacity hover:text-white group-hover:opacity-100"
                      title="Rename"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteChild(c)}
                      className="text-[#76746E] opacity-0 transition-opacity hover:text-[#FF6B6B] group-hover:opacity-100"
                      title="Delete sub-page"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 flex items-center gap-2">
            <input
              value={newChildIcon}
              onChange={(e) => setNewChildIcon(e.target.value)}
              placeholder="🧠"
              className="rowan-input h-9 w-12 text-center text-base"
            />
            <input
              value={newChildTitle}
              onChange={(e) => setNewChildTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addChild()}
              placeholder="New sub-page title"
              className="rowan-input flex-1 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={addChild}
              disabled={creatingChild || !newChildTitle.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-white hover:bg-white/[0.08] disabled:opacity-40"
            >
              {creatingChild ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Add
            </button>
          </div>
        </div>

        <div>
          <p className="rowan-eyebrow mb-2">Notes</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={onNotesBlur}
            placeholder="Description, links, anything…"
            className="rowan-input min-h-[120px] w-full p-3 text-sm"
          />
          <p className="rowan-eyebrow mt-2 text-[#76746E]">
            Auto-saves on blur
          </p>
        </div>
      </div>
    </div>
  );
}
