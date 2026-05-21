"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarWithTimePickerInline } from "@/components/ui/calendar-with-time-picker-inline";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ScheduleEvent } from "@/lib/supabase/types";

type Props = {
  event: ScheduleEvent | null;
  defaultStart?: Date;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string) {
  return new Date(local).toISOString();
}

function splitLocalInput(local: string) {
  const [date = "", time = ""] = local.split("T");
  return { date, time };
}

function combineLocalInput(date: string, time: string) {
  return `${date}T${time || "00:00"}`;
}

export function EventFormDialog({ event, defaultStart, open, onOpenChange }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setTitle(event.title);
      setStart(toLocalInput(event.start_at));
      setEnd(toLocalInput(event.end_at));
      setLocation(event.location ?? "");
      setBody(event.body ?? "");
    } else {
      const now = defaultStart ?? new Date();
      const later = new Date(now.getTime() + 60 * 60_000);
      setTitle("");
      setStart(toLocalInput(now.toISOString()));
      setEnd(toLocalInput(later.toISOString()));
      setLocation("");
      setBody("");
    }
    setError(null);
  }, [event, defaultStart, open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        id: event?.id,
        title: title.trim(),
        start_at: fromLocalInput(start),
        end_at: fromLocalInput(end),
        location: location.trim() || null,
        body: body.trim() || null,
      };
      const res = await fetch("/api/schedule/events", {
        method: event ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const startParts = splitLocalInput(start);
  const endParts = splitLocalInput(end);

  async function remove() {
    if (!event) return;
    if (!confirm(`Delete "${event.title}"?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/schedule/events?id=${event.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="ev-title">Title</Label>
            <Input
              id="ev-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label>When</Label>
            <CalendarWithTimePickerInline
              date={startParts.date}
              startTime={startParts.time}
              endTime={endParts.time}
              disabled={busy}
              onDateChange={(date) => {
                setStart(combineLocalInput(date, startParts.time));
                setEnd(combineLocalInput(date, endParts.time));
              }}
              onStartTimeChange={(time) => setStart(combineLocalInput(startParts.date, time))}
              onEndTimeChange={(time) => setEnd(combineLocalInput(startParts.date, time))}
              className="max-w-full"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-loc">Location</Label>
            <Input
              id="ev-loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ev-body">Notes</Label>
            <Textarea
              id="ev-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter className="gap-2 sm:justify-between">
            {event ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={remove}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
