"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { Reflection } from "@/lib/supabase/types";

function scoreTone(score: number) {
  if (score >= 8)
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (score >= 5)
    return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
  return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200";
}

export function ReflectionList({ reflections }: { reflections: Reflection[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string) {
    if (!confirm("Delete this reflection?")) return;
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("reflections").delete().eq("id", id);
      router.refresh();
    });
  }

  if (reflections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
        No reflections yet. Log your first one to start the streak.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {reflections.map((r) => (
        <li
          key={r.id}
          className="flex items-start gap-3 rounded-lg border bg-card p-3 shadow-sm"
        >
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-sm font-semibold",
              scoreTone(r.score)
            )}
          >
            {r.score}
          </div>
          <div className="min-w-0 flex-1">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{r.content}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(r.date + "T00:00").toLocaleDateString()}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            disabled={isPending}
            onClick={() => handleDelete(r.id)}
            aria-label="Delete reflection"
          >
            <Trash2 className="h-4 w-4 text-rose-500" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
