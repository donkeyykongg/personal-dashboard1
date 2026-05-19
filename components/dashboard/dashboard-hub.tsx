import type { ReactNode } from "react";
import { DashboardTitle } from "./dashboard-title";
import { GoalsTicker } from "./goals-ticker";
import { CommandCenter } from "./command-center";
import { MacroTimeGrid } from "./macro-time-grid";
import { TodoList } from "./todo-list";

export function DashboardHub({ rightContent }: { rightContent?: ReactNode }) {
  return (
    <div className="dash-hub">
      <DashboardTitle>My Dashboard</DashboardTitle>
      <div className="mb-4">
        <GoalsTicker />
      </div>

      <div className="dash-main-grid">
        {/* Left column: command center + to-do */}
        <div className="dash-col">
          <CommandCenter />
          <TodoList />
        </div>

        {/* Right column: macro time + server-data widgets */}
        <div className="dash-col">
          <MacroTimeGrid />
          {rightContent}
        </div>
      </div>
    </div>
  );
}

export default DashboardHub;
