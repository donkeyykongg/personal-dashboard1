"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventFormDialog } from "./event-form-dialog";
import type { ScheduleEvent } from "@/lib/supabase/types";

type Props = {
  events: ScheduleEvent[];
};

function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
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

export function ScheduleShell({ events }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [openNew, setOpenNew] = useState(false);
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    [...events]
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
          No events yet. Add one with &quot;New event&quot;.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([day, dayEvents]) => (
            <section key={day} className="rounded-lg border bg-card p-4">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                {fmtDay(day)}
              </h3>
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
          ))}
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
