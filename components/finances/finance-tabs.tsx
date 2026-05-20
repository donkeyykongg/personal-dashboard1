// components/finances/finance-tabs.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { FINANCE_TABS, type FinanceTabKey } from "@/lib/finances/finance-tab";

export type { FinanceTabKey };

export function FinanceTabs({ active }: { active: FinanceTabKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  return (
    <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.025] p-1">
      {FINANCE_TABS.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("tab", t.key);
              router.replace(`${pathname}?${next.toString()}`, { scroll: false });
            }}
            className={cn(
              "rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.10em] transition-colors",
              isActive
                ? "bg-white/[0.06] text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
                : "text-[#76746E] hover:text-[#B8B6B0]"
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
