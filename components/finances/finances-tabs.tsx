"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Subscriptions"] as const;
type Tab = (typeof TABS)[number];

export function FinancesTabs({
  overviewContent,
  subscriptionsContent,
}: {
  overviewContent: React.ReactNode;
  subscriptionsContent: React.ReactNode;
}) {
  const [active, setActive] = useState<Tab>("Overview");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border bg-muted/40 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              active === tab
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {active === "Overview" && overviewContent}
      {active === "Subscriptions" && subscriptionsContent}
    </div>
  );
}
