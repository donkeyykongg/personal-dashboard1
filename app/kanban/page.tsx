import { createClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/kanban/kanban-board";
import type { KanbanCard } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kanban_cards")
    .select("*")
    .order("sort", { ascending: true });

  const cards = (data ?? []) as KanbanCard[];

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-3xl font-medium">Kanban</h1>
        <p className="text-sm text-muted-foreground">
          Tag tasks with priority + effort. High-priority / low-effort cards bubble
          up to your dashboard as quick wins.
        </p>
      </header>

      <div className="h-[calc(100vh-12rem)] overflow-hidden rounded-lg border bg-background">
        <KanbanBoard initialCards={cards} />
      </div>

      {error && (
        <p className="text-sm text-destructive">Couldn't load from Supabase: {error.message}</p>
      )}
    </div>
  );
}
