import { MonthlyActivityHeatmap } from "@/components/activity/monthly-activity-heatmap";
import type { HabitLog, TodoGoal } from "@/lib/supabase/types";

type Props = {
  habitLogs?: HabitLog[];
  todoGoals?: TodoGoal[];
};

export function HabitHeatmap({ habitLogs = [], todoGoals = [] }: Props) {
  const values = [
    ...habitLogs
      .filter((log) => log.completed)
      .map((log) => ({ date: log.date, value: 1 })),
    ...todoGoals
      .filter((goal) => goal.done)
      .map((goal) => ({ date: goal.date, value: 1 })),
  ];

  return (
    <MonthlyActivityHeatmap
      eyebrow="Habits // Activity"
      title="Work rhythm"
      values={values}
      valueLabel="completion"
      thresholds={[2, 4, 7, 10]}
    />
  );
}
