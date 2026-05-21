"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "./event-form-dialog";
import type { ScheduleEvent } from "@/lib/supabase/types";

type Props = {
  events: ScheduleEvent[];
};

function fmtDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function daysUntil(iso: string): number {
  const start = new Date(iso);
  if (isNaN(start.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  return Math.round((day.getTime() - today.getTime()) / 86_400_000);
}

function urgencyLabel(days: number): string | null {
  if (days < 0) return "PAST DUE";
  if (days === 0) return "TODAY";
  if (days === 1) return "TOMORROW";
  if (days <= 7) return `IN ${days}D`;
  return null;
}

export function ScheduleShell({ events }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);

  const grouped = useMemo(() => {
    // Skip past days entirely so the user sees what's coming next.
    const todayKey = new Date().toISOString().slice(0, 10);
    const map = new Map<string, ScheduleEvent[]>();
    [...events]
      .filter((ev) => ev.start_at.slice(0, 10) >= todayKey)
      .sort((a, b) => a.start_at.localeCompare(b.start_at))
      .forEach((ev) => {
        const day = ev.start_at.slice(0, 10);
        if (!map.has(day)) map.set(day, []);
        map.get(day)!.push(ev);
      });
    return [...map.entries()];
  }, [events]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          {events.length === 0
            ? "No events yet."
            : `${events.length} event${events.length === 1 ? "" : "s"} scheduled.`}
        </p>
        <Button onClick={() => setOpenNew(true)} size="sm">
          <Plus className="mr-2 h-3 w-3" />
          New event
        </Button>
      </div>

      {grouped.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          Nothing upcoming. Add an event with &quot;New event&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([day, dayEvents]) => {
            const days = daysUntil(`${day}T00:00:00`);
            const urgent = days <= 7;
            return (
              <section
                key={day}
                className={`rounded-lg border bg-card p-4 ${
                  urgent
                    ? "animate-pulse border-[#FF8A8A]/40 bg-gradient-to-br from-[#FF8A8A]/12 to-[#FF8A8A]/[0.04]"
                    : ""
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {fmtDay(day)}
                  </h3>
                  {urgent && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#FF8A8A]/40 bg-[#FF8A8A]/15 px-2 py-0.5 font-mono text-[10px] font-bold tracking-[0.14em] text-[#FF8A8A]">
                      <AlertTriangle className="h-3 w-3" />
                      {urgencyLabel(days)}
                    </span>
                  )}
                </div>
                <ul className="space-y-2">
                  {dayEvents.map((ev) => (
                    <li key={ev.id}>
                      <button
                        onClick={() => setEditing(ev)}
                        className="flex w-full items-start gap-3 rounded-md border bg-background p-3 text-left hover:bg-accent"
                      >
                        <span className="w-24 shrink-0 text-xs text-muted-foreground">
                          {fmtTime(ev.start_at)}
                          <br />
                          <span>– {fmtTime(ev.end_at)}</span>
                        </span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">{ev.title}</span>
                          {ev.location ? (
                            <span className="block text-xs text-muted-foreground">
                              {ev.location}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <EventFormDialog
        event={null}
        open={openNew}
        onOpenChange={(o) => {
          setOpenNew(o);
          if (!o) startTransition(() => router.refresh());
        }}
      />
      <EventFormDialog
        event={editing}
        open={!!editing}
        onOpenChange={(o) => {
          if (!o) {
            setEditing(null);
            startTransition(() => router.refresh());
          }
        }}
      />
    </div>
  );
}
