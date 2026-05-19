import { Clock, Flame, Target } from "lucide-react";
import type { PomodoroSession } from "@/lib/supabase/types";

type Props = { sessions: PomodoroSession[] };

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PomodoroHistory({ sessions }: Props) {
  const today = new Date();
  const days: { key: string; label: string; minutes: number; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      key: dayKey(d),
      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      minutes: 0,
      count: 0,
    });
  }
  const map = new Map(days.map((d, i) => [d.key, i]));
  sessions.forEach((s) => {
    if (!s.completed) return;
    const k = s.started_at.slice(0, 10);
    const idx = map.get(k);
    if (idx == null) return;
    days[idx].minutes += s.minutes;
    days[idx].count += 1;
  });

  const max = Math.max(60, ...days.map((d) => d.minutes));
  const todayKey = dayKey(today);
  const todayMin = days.find((d) => d.key === todayKey)?.minutes ?? 0;
  const todayCount = days.find((d) => d.key === todayKey)?.count ?? 0;
  const weekMin = days.slice(-7).reduce((s, d) => s + d.minutes, 0);
  const streak = (() => {
    let n = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].minutes > 0) n += 1;
      else break;
    }
    return n;
  })();

  const stats = [
    { label: "Today", value: `${todayMin}m`, hint: `${todayCount} sprint${todayCount === 1 ? "" : "s"}`, icon: Target },
    { label: "Last 7 days", value: `${weekMin}m`, hint: "total focus", icon: Clock },
    { label: "Streak", value: `${streak}d`, hint: "consecutive days", icon: Flame },
  ];

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-muted-foreground">History</p>
        <h2 className="text-xl">Recent sessions</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-background px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <p className="mt-2 font-mono text-2xl">{value}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Last 14 days
        </p>
        <div className="flex h-28 items-end gap-1.5">
          {days.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-sm bg-muted/40">
                <div
                  className="w-full rounded-sm bg-primary/80 transition-all"
                  style={{ height: `${(d.minutes / max) * 100}%` }}
                  title={`${d.minutes} min · ${d.count} sprint${d.count === 1 ? "" : "s"}`}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
