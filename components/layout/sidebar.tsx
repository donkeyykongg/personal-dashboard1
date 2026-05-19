"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  StickyNote,
  CalendarClock,
  KanbanSquare,
  Timer,
  NotebookPen,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Search,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./theme-provider";
import { useSidebarState } from "./sidebar-state";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/cash-flow", label: "Cash flow", icon: TrendingUp },
  { href: "/notes", label: "Notes", icon: StickyNote },
  { href: "/schedule", label: "Schedule", icon: CalendarClock },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/pomodoro", label: "Pomodoro", icon: Timer },
  { href: "/reflections", label: "Reflections", icon: NotebookPen },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const { collapsed, toggle: toggleCollapsed } = useSidebarState();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r bg-card transition-[width] duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="flex items-center justify-between border-b px-4 py-5">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-sans font-semibold tracking-tight">
            Personal Dashboard
          </Link>
        )}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "mx-auto"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="px-2 pt-3">
        <button
          type="button"
          onClick={() =>
            window.dispatchEvent(
              new KeyboardEvent("keydown", { key: "k", metaKey: true })
            )
          }
          title={collapsed ? "Search (⌘K)" : undefined}
          className={cn(
            "flex w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground hover:bg-accent",
            collapsed && "justify-center px-2"
          )}
        >
          <Search className="h-4 w-4 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left">Search…</span>
              <kbd className="rounded border bg-muted px-1 text-[10px]">⌘K</kbd>
            </>
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <button
          onClick={toggleTheme}
          title={collapsed ? "Toggle theme" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          aria-label="Toggle dark mode"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 shrink-0" />
          ) : (
            <Moon className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </button>
      </div>

      <div className="border-t p-2">
        <button
          onClick={handleLogout}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center px-2"
          )}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {!collapsed && (
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">v0.2</div>
      )}
    </aside>
  );
}
