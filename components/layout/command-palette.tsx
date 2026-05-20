"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  CalendarClock,
  KanbanSquare,
  LayoutDashboard,
  NotebookPen,
  Repeat,
  Search,
  StickyNote,
  Timer,
  Wallet,
  Inbox as InboxIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  InboxItem,
  JournalPrompt,
  KanbanCard,
  Page,
  ScheduleEvent,
  Subscription,
} from "@/lib/supabase/types";

type Bundle = {
  notes: Page[];
  events: ScheduleEvent[];
  cards: KanbanCard[];
  subs: Subscription[];
  prompts: JournalPrompt[];
  inbox: InboxItem[];
};

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/pomodoro", label: "Pomodoro", icon: Timer },
  { href: "/reflections", label: "Reflections", icon: NotebookPen },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Bundle | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || data) return;
    (async () => {
      const supabase = createClient();
      const [n, e, k, s, p, i] = await Promise.all([
        supabase.from("notes").select("id, folder_id, title, updated_at, created_at").limit(50),
        supabase.from("schedule_events").select("*").limit(50),
        supabase.from("kanban_cards").select("*").limit(100),
        supabase.from("subscriptions").select("*").limit(50),
        supabase.from("journal_prompts").select("*").limit(20),
        supabase.from("inbox_items").select("*").eq("archived", false).limit(20),
      ]);
      setData({
        notes: (n.data ?? []) as Page[],
        events: (e.data ?? []) as ScheduleEvent[],
        cards: (k.data ?? []) as KanbanCard[],
        subs: (s.data ?? []) as Subscription[],
        prompts: (p.data ?? []) as JournalPrompt[],
        inbox: (i.data ?? []) as InboxItem[],
      });
    })();
  }, [open, data]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[10vh] px-4"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover shadow-2xl"
          >
            <Command label="Global search" className="flex flex-col">
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  autoFocus
                  placeholder="Search across the dashboard…"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <kbd className="rounded border bg-muted px-1.5 text-[10px] text-muted-foreground">
                  esc
                </kbd>
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No results.
                </Command.Empty>

                <Command.Group heading="Pages" className="text-xs text-muted-foreground">
                  {NAV.map(({ href, label, icon: Icon }) => (
                    <Command.Item
                      key={href}
                      value={`page ${label}`}
                      onSelect={() => go(href)}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-accent"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </Command.Item>
                  ))}
                </Command.Group>

                {data?.cards.length ? (
                  <Command.Group heading="Kanban cards" className="text-xs text-muted-foreground">
                    {data.cards.map((c) => (
                      <Command.Item
                        key={c.id}
                        value={`card ${c.title} ${c.priority} ${c.effort}`}
                        onSelect={() => go("/kanban")}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                      >
                        <span className="flex items-center gap-2">
                          <KanbanSquare className="h-4 w-4 text-muted-foreground" />
                          {c.title}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {c.column_key} · {c.priority}/{c.effort}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {data?.events.length ? (
                  <Command.Group heading="Events" className="text-xs text-muted-foreground">
                    {data.events.map((ev) => (
                      <Command.Item
                        key={ev.id}
                        value={`event ${ev.title} ${ev.location ?? ""}`}
                        onSelect={() => go("/schedule")}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                      >
                        <span className="flex items-center gap-2">
                          <CalendarClock className="h-4 w-4 text-muted-foreground" />
                          {ev.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(ev.start_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {data?.notes.length ? (
                  <Command.Group heading="Notes" className="text-xs text-muted-foreground">
                    {data.notes.map((p) => (
                      <Command.Item
                        key={p.id}
                        value={`note ${p.title}`}
                        onSelect={() => go("/notes")}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                      >
                        <StickyNote className="h-4 w-4 text-muted-foreground" />
                        {p.title}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {data?.subs.length ? (
                  <Command.Group heading="Subscriptions" className="text-xs text-muted-foreground">
                    {data.subs.map((s) => (
                      <Command.Item
                        key={s.id}
                        value={`sub ${s.name} ${s.category}`}
                        onSelect={() => go("/finances?tab=subscriptions")}
                        className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                      >
                        <span className="flex items-center gap-2">
                          <Repeat className="h-4 w-4 text-muted-foreground" />
                          {s.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ${s.amount} / {s.billing_cycle}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {data?.prompts.length ? (
                  <Command.Group heading="Journal prompts" className="text-xs text-muted-foreground">
                    {data.prompts.map((pr) => (
                      <Command.Item
                        key={pr.id}
                        value={`prompt ${pr.prompt}`}
                        onSelect={() => go("/reflections")}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                      >
                        <NotebookPen className="h-4 w-4 text-muted-foreground" />
                        {pr.prompt}
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}

                {data?.inbox.length ? (
                  <Command.Group heading="Inbox" className="text-xs text-muted-foreground">
                    {data.inbox.map((it) => (
                      <Command.Item
                        key={it.id}
                        value={`inbox ${it.content}`}
                        onSelect={() => go("/dashboard")}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                      >
                        <InboxIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{it.content}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ) : null}
              </Command.List>

              <div className="flex items-center justify-between border-t px-3 py-2 text-[10px] text-muted-foreground">
                <span>↑↓ navigate · ↵ select</span>
                <span>⌘K toggle</span>
              </div>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
