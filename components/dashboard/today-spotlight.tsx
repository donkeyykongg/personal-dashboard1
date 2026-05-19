import Link from "next/link";
import { ArrowUpRight, Calendar, Target, Timer, Zap } from "lucide-react";
import type { KanbanCard, ScheduleEvent } from "@/lib/supabase/types";

type Props = {
  quickWins: KanbanCard[];
  todayEvents: ScheduleEvent[];
  pomodoroTargetMinutes: number;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TodaySpotlight({
  quickWins,
  todayEvents,
  pomodoroTargetMinutes,
}: Props) {
  return (
    <section className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 p-6 shadow-md">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-primary">
            Spotlight
          </p>
          <h2 className="text-3xl">Today</h2>
        </div>
        <Calendar className="h-6 w-6 text-muted-foreground" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick wins */}
        <div className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-yellow-600" />
              Quick wins
            </p>
            <Link
              href="/kanban"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Board <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {quickWins.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No high-priority / low-effort cards yet. Tag cards on the kanban to
              promote them here.
            </p>
          ) : (
            <ul className="space-y-2">
              {quickWins.slice(0, 3).map((c) => (
                <li
                  key={c.id}
                  className="rounded-md border bg-card p-2 text-sm"
                >
                  {c.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Today's events */}
        <div className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-sky-600" />
              On the calendar
            </p>
            <Link
              href="/schedule"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Schedule <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nothing scheduled today.
            </p>
          ) : (
            <ul className="space-y-2">
              {todayEvents.slice(0, 4).map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-md border bg-card p-2 text-sm"
                >
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtTime(ev.start_at)} – {fmtTime(ev.end_at)}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Focus target */}
        <div className="rounded-xl border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-emerald-600" />
              Focus target
            </p>
            <Link
              href="/pomodoro"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Pomodoro <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="font-mono text-3xl">{pomodoroTargetMinutes}m</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Default sprint length
            </p>
            <Link
              href="/pomodoro"
              className="mt-3 flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Timer className="h-3 w-3" />
              Start a sprint
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
