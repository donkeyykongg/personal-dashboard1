import type { ReactNode } from "react";
import { DashboardTitle } from "./dashboard-title";
import { GoalsTicker } from "./goals-ticker";
import { CommandCenter } from "./command-center";
import { MacroTimeGrid } from "./macro-time-grid";
import { TodoList } from "./todo-list";
import { DailyHabits } from "./daily-habits";
import type { Habit, HabitLog, TodoGoal } from "@/lib/supabase/types";

type Props = {
  habits: Habit[];
  habitLogs: HabitLog[];
  todoActiveDate: string;
  todoTomorrowDate: string;
  todoToday: TodoGoal[];
  todoTomorrow: TodoGoal[];
  todoStreakCount: number;
  rightContent?: ReactNode;
};

export function DashboardHub({
  habits,
  habitLogs,
  todoActiveDate,
  todoTomorrowDate,
  todoToday,
  todoTomorrow,
  todoStreakCount,
  rightContent,
}: Props) {
  return (
    <div className="dash-hub">
      <DashboardTitle>My Dashboard</DashboardTitle>
      <div className="mb-4">
        <GoalsTicker
          initialHabits={habits}
          initialHabitLogs={habitLogs}
          initialTodos={todoToday}
          date={todoActiveDate}
        />
      </div>

      <div className="dash-main-grid">
        <CommandCenter
          initialHabits={habits}
          initialHabitLogs={habitLogs}
          initialTodos={todoToday}
          date={todoActiveDate}
        />
        <MacroTimeGrid />
      </div>

      <DailyHabits habits={habits} logs={habitLogs} />

      <TodoList
        initialActiveDate={todoActiveDate}
        initialTomorrowDate={todoTomorrowDate}
        todayGoals={todoToday}
        tomorrowGoals={todoTomorrow}
        streakCount={todoStreakCount}
      />

      {rightContent}
    </div>
  );
}

export default DashboardHub;
