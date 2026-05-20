// components/layout/bottom-tab-bar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Wallet, KanbanSquare, StickyNote, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoreSheet } from "./more-sheet";

type Tab = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
};

const tabs: Tab[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/finances", label: "Finances", icon: Wallet, matchPrefix: "/finances" },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/notes", label: "Notes", icon: StickyNote, matchPrefix: "/notes" },
];

export function BottomTabBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (tab: Tab) =>
    tab.matchPrefix ? pathname.startsWith(tab.matchPrefix) : pathname === tab.href;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-1 px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-2"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(5,5,6,0.92) 30%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
        aria-label="Primary navigation"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-3 right-3 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)",
          }}
        />
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex max-w-[140px] flex-1 flex-col items-center gap-0.5 rounded-xl border border-transparent px-3.5 py-2 transition-colors",
                active
                  ? "border-white/10 bg-white/[0.06] text-white"
                  : "text-[#76746E] hover:bg-white/[0.025] hover:text-[#B8B6B0]"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.10em]">
                {tab.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex max-w-[140px] flex-1 flex-col items-center gap-0.5 rounded-xl border border-transparent px-3.5 py-2 text-[#76746E] transition-colors",
            "hover:bg-white/[0.025] hover:text-[#B8B6B0]"
          )}
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
          <span className="text-[10px] font-bold uppercase tracking-[0.10em]">More</span>
        </button>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
