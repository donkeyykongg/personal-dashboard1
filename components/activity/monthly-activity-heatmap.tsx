import styles from "./monthly-activity-heatmap.module.css";

type HeatValue = {
  date: string;
  value: number;
};

type Props = {
  eyebrow?: string;
  title: string;
  values: HeatValue[];
  valueLabel: string;
  activeLabel?: string;
  thresholds?: [number, number, number, number];
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shortDate(date: Date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function levelClass(value: number, thresholds: [number, number, number, number]) {
  if (value <= 0) return styles.level0;
  if (value < thresholds[0]) return styles.level1;
  if (value < thresholds[1]) return styles.level2;
  if (value < thresholds[2]) return styles.level3;
  return styles.level4;
}

function formatValue(value: number, label: string) {
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

export function MonthlyActivityHeatmap({
  eyebrow = "Activity heatmap",
  title,
  values,
  valueLabel,
  activeLabel = "active days",
  thresholds = [1, 2, 4, 6],
}: Props) {
  const now = new Date();
  const today = dayKey(now);
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  const end = new Date(last);
  end.setDate(last.getDate() + (4 - ((last.getDay() + 6) % 7)));

  const valueByDate = new Map<string, number>();
  values.forEach(({ date, value }) => {
    valueByDate.set(date, (valueByDate.get(date) ?? 0) + value);
  });

  const weeks: Array<Array<{ key: string; date: Date; value: number; inMonth: boolean; isWeekday: boolean }>> = [];
  let week: Array<{ key: string; date: Date; value: number; inMonth: boolean; isWeekday: boolean }> = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const weekday = (d.getDay() + 6) % 7;
    if (weekday < 5) {
      const key = dayKey(d);
      week.push({
        key,
        date: new Date(d),
        value: valueByDate.get(key) ?? 0,
        inMonth: d.getMonth() === now.getMonth(),
        isWeekday: true,
      });
    }
    if (weekday === 6 || d >= end) {
      if (week.length > 0) {
        if (week.some((day) => day.inMonth)) weeks.push(week);
        week = [];
      }
    }
  }

  const monthDays = weeks.flat().filter((day) => day.inMonth);
  const activeDays = monthDays.filter((day) => day.value > 0).length;
  const totalValue = monthDays.reduce((sum, day) => sum + day.value, 0);
  const monthLabel = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className={`${styles.panel} p-5`}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
          <p className="mt-1 font-mono text-xs text-[#B8B6B0]">{monthLabel}</p>
        </div>
        <p className="text-right font-mono text-[11px] text-[#B8B6B0]">
          {formatValue(totalValue, valueLabel)} · {activeDays} {activeLabel}
        </p>
      </div>

      <div className={styles.heatmapBoard}>
        <div className={styles.heatWeekHeader}>
          <span />
          {WEEKDAYS.map((day) => (
            <span key={day}>{day}</span>
          ))}
          <span />
        </div>
        <div className={styles.heatWeekStack}>
          {weeks.map((days) => {
            const firstDay = days.find((day) => day.inMonth) ?? days[0];
            const lastDay = [...days].reverse().find((day) => day.inMonth) ?? days[days.length - 1];
            return (
              <div key={days[0].key} className={styles.heatWeekRow}>
                <span className={styles.heatDateLabel}>{shortDate(firstDay.date)}</span>
                {Array.from({ length: 5 }, (_, index) => {
                  const day = days[index];
                  if (!day || !day.inMonth) {
                    return <span key={`blank-${days[0].key}-${index}`} className={styles.heatBlank} />;
                  }
                  return (
                    <div
                      key={day.key}
                      title={`${day.date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}: ${formatValue(day.value, valueLabel)}`}
                      className={`${styles.heatCell} ${levelClass(day.value, thresholds)} ${
                        day.key === today ? styles.todayCell : ""
                      }`}
                    />
                  );
                })}
                <span className={styles.heatDateLabel}>{shortDate(lastDay.date)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${styles.heatLegend} mt-5 flex items-center gap-2 text-xs text-[#B8B6B0]`}>
        <span>less</span>
        {[0, thresholds[0], thresholds[1], thresholds[2], thresholds[3]].map((value) => (
          <span key={value} className={`${styles.heatCell} ${levelClass(value, thresholds)}`} />
        ))}
        <span>more</span>
      </div>
    </div>
  );
}
