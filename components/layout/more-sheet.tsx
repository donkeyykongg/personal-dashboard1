// components/layout/more-sheet.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, KanbanSquare, Moon, NotebookPen, Timer, LogOut } from "lucide-react";
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

const moreLinks = [
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/reflections", label: "Reflections", icon: NotebookPen },
  { href: "/pomodoro", label: "Focus timer", icon: Timer },
];

export function MoreSheet({ open, onOpenChange }: Props) {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    onOpenChange(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="rounded-b-2xl border-white/10 bg-[#0A0A0B] text-white"
      >
        <SheetHeader>
          <SheetTitle className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#76746E]">
            More
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-2 gap-2 pb-6">
          {moreLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.025] p-4 transition-colors hover:bg-white/[0.05]"
              >
                <Icon className="h-5 w-5 text-[#B8B6B0]" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            );
          })}
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
