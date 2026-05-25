// components/layout/more-sheet.tsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Home,
  Wallet,
  Brain,
  BookOpen,
  CalendarClock,
  Bot,
  KanbanSquare,
  Moon,
  Search,
  Shield,
  Timer,
  LogOut,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "./theme-provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type MoreLink = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
};

const moreLinks: MoreLink[] = [
  { href: "/dashboard", label: "Home", icon: Home, keywords: "dashboard hub today" },
  { href: "/assistant", label: "Assistant", icon: Bot, keywords: "ai chat executive assistant todo schedule capture advice" },
  { href: "/finances", label: "Finances", icon: Wallet, keywords: "money net worth subscriptions cash flow biz" },
  { href: "/brain", label: "Brain", icon: Brain, keywords: "notes pages knowledge entities" },
  { href: "/journal", label: "Journal", icon: BookOpen, keywords: "entries telegram log reflections" },
  { href: "/schedule", label: "Schedule", icon: CalendarClock, keywords: "calendar events outlook" },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare, keywords: "board tasks columns" },
  { href: "/pomodoro", label: "Focus timer", icon: Timer, keywords: "pomodoro focus session" },
  { href: "/admin", label: "Admin", icon: Shield, keywords: "users sign up accounts access" },
];

export function MoreSheet({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState("");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onOpenChange(false);
    router.push("/login");
    router.refresh();
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return moreLinks;
    return moreLinks.filter((l) => {
      const hay = `${l.label} ${l.keywords ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery("");
      }}
    >
      <SheetContent
        side="top"
        className="rounded-b-2xl border-white/10 bg-[#0A0A0B] text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#76746E]">
            More
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
          <Search className="h-4 w-4 text-[#76746E]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#76746E]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-[#76746E] hover:text-white"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 pb-6">
          {filtered.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => {
                  onOpenChange(false);
                  setQuery("");
                }}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 transition-colors hover:bg-white/[0.05]"
              >
                <Icon className="h-5 w-5 text-[#B8B6B0]" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            );
          })}

          {filtered.length === 0 && (
            <p className="col-span-2 py-4 text-center text-sm italic text-[#76746E]">
              No pages match &ldquo;{query}&rdquo;.
            </p>
          )}

          {!query && (
            <>
              <button
                type="button"
                onClick={toggle}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-left transition-colors hover:bg-white/[0.05]"
              >
                <Moon className="h-5 w-5 text-[#B8B6B0]" />
                <span className="text-sm font-medium">
                  {theme === "dark" ? "White mode" : "Dark mode"}
                </span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="col-span-2 flex items-center justify-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 text-sm font-medium text-[#FF8A8A] transition-colors hover:bg-white/[0.05]"
              >
                <LogOut className="h-5 w-5" />
                Log out
              </button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
