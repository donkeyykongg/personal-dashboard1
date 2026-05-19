"use client";

import { FileText, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Folder, Page } from "@/lib/supabase/types";

type Props = {
  folder: Folder | null;
  pages: Page[];
  selectedPageId: string | null;
  onSelectPage: (id: string) => void;
};

export function PageList({ folder, pages, selectedPageId, onSelectPage }: Props) {
  const isVault = folder?.type === "vault";
  const Icon = isVault ? KeyRound : FileText;

  if (!folder) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Select a folder to see its pages.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {isVault ? "Account vault" : "Folder"}
        </p>
        <h2 className="truncate text-sm font-semibold">{folder.name}</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {pages.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
            No pages yet. Use “+ New Page” to create one.
          </div>
        ) : (
          <ul className="space-y-0.5">
            {pages.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onSelectPage(p.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    selectedPageId === p.id
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-accent/60"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isVault ? "text-amber-600" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">{p.title || "Untitled"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
