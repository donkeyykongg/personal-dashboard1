import { createClient } from "@/lib/supabase/server";
import { NotesShell } from "@/components/notes/notes-shell";
import type { Folder, Page } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = createClient();

  const [foldersRes, pagesRes] = await Promise.all([
    supabase.from("folders").select("*").order("created_at", { ascending: true }),
    supabase.from("notes").select("*").order("updated_at", { ascending: false }),
  ]);

  const folders = (foldersRes.data ?? []) as Folder[];
  const pages = (pagesRes.data ?? []) as Page[];
  const error = foldersRes.error?.message ?? pagesRes.error?.message;

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground">
          Folders, pages, and an account vault — auto-saves as you write.
        </p>
      </header>

      <NotesShell initialFolders={folders} initialPages={pages} />

      {error && (
        <p className="text-sm text-destructive">Couldn’t load from Supabase: {error}</p>
      )}
    </div>
  );
}
