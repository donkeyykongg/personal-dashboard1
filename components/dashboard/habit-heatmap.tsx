import type { PomodoroSession, Reflection } from "@/lib/supabase/types";

type Props = {
  sessions: PomodoroSession[];
  reflections: Reflection[];
  weeks?: number;
};

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function HabitHeatmap({ sessions, reflections, weeks = 16 }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // grid: weeks columns × 7 rows (Mon..Sun, Mon = 0)
  const totalDays = weeks * 7;
  const start = new Date(today);
  start.setDate(today.getDate() - totalDays + 1);
  const dow = (start.getDay() + 6) % 7; // Mon = 0
  start.setDate(start.getDate() - dow);

  const counts = new Map<string, number>();
  sessions.forEach((s) => {
    if (!s.completed) return;
    const k = s.started_at.slice(0, 10);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  reflections.forEach((r) => {
    counts.set(r.date, (counts.get(r.date) ?? 0) + 1);
  });

  const days: { key: string; date: Date; count: number; future: boolean }[] = [];
  const cur = new Date(start);
  while (cur <= today || days.length % 7 !== 0) {
    const k = dayKey(cur);
    days.push({
      key: k,
      date: new Date(cur),
      count: counts.get(k) ?? 0,
      future: cur > today,
    });
    cur.setDate(cur.getDate() + 1);
  }

  const cols: typeof days[] = [];
  for (let i = 0; i < days.length; i += 7) cols.push(days.slice(i, i + 7));

  function level(c: number) {
    if (c === 0) return "bg-white/5";
    if (c === 1) return "bg-emerald-500/20";
    if (c === 2) return "bg-emerald-500/40";
    if (c <= 4) return "bg-emerald-500/65";
    return "bg-emerald-400";
  }

  const totalActive = days.filter((d) => d.count > 0 && !d.future).length;
  const totalCount = days.reduce((s, d) => s + (d.future ? 0 : d.count), 0);

  return (
    <section className="space-y-3 rounded-lg border bg-card p-5 shadow-sm">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Habits</p>
          <h2 className="text-xl">Activity heatmap</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          {totalCount} entries · {totalActive} active days
        </p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1">
          {cols.map((col, i) => (
            <div key={i} className="flex flex-col gap-1">
              {col.map((d) => (
                <div
                  key={d.key}
                  title={`${d.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })} — ${d.count} entries`}
                  className={`h-3 w-3 rounded-sm ${
                    d.future ? "bg-transparent" : level(d.count)
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>less</span>
        {[0, 1, 2, 4, 5].map((c) => (
          <span key={c} className={`h-3 w-3 rounded-sm ${level(c)}`} />
        ))}
        <span>more</span>
      </div>
    </section>
  );
}
