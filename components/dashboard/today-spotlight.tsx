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
    <section className="rowan-panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="rowan-eyebrow">
            Spotlight
          </p>
          <h2 className="mt-1 text-3xl font-semibold text-white">Today</h2>
        </div>
        <Calendar className="h-6 w-6 text-[#B8B6B0]" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Quick wins */}
        <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-[#F2C063]" />
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
              <p className="text-xs text-[#B8B6B0]">
              No high-priority / low-effort cards yet. Tag cards on the kanban to
              promote them here.
            </p>
          ) : (
            <ul className="space-y-2">
              {quickWins.slice(0, 3).map((c) => (
                <li
                  key={c.id}
                  className="rounded-md bg-white/[0.035] p-2 text-sm text-white"
                >
                  {c.title}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Today's events */}
        <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-[#7DD3FC]" />
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
              <p className="text-xs text-[#B8B6B0]">
              Nothing scheduled today.
            </p>
          ) : (
            <ul className="space-y-2">
              {todayEvents.slice(0, 4).map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-md bg-white/[0.035] p-2 text-sm text-white"
                >
                  <p className="font-medium">{ev.title}</p>
                  <p className="text-xs text-[#B8B6B0]">
                    {fmtTime(ev.start_at)} – {fmtTime(ev.end_at)}
                    {ev.location ? ` · ${ev.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Focus target */}
        <div className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-[var(--rowan-accent)]" />
              Focus target
            </p>
            <Link
              href="/pomodoro"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Pomodoro <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="rounded-md border border-white/5 bg-white/[0.035] p-3">
            <p className="font-mono text-3xl text-white">{pomodoroTargetMinutes}m</p>
            <p className="mt-1 text-xs text-[#B8B6B0]">
              Default sprint length
            </p>
            <Link
              href="/pomodoro"
              className="rowan-primary mt-3 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold"
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
