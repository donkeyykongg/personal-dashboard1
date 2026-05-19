"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, FolderPlus, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FolderTree } from "./folder-tree";
import { PageList } from "./page-list";
import { Editor } from "./editor";
import { createClient } from "@/lib/supabase/client";
import type { Folder, Page } from "@/lib/supabase/types";

type Props = {
  initialFolders: Folder[];
  initialPages: Page[];
};

export function NotesShell({ initialFolders, initialPages }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const folders = initialFolders;
  const pages = initialPages;

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    folders[0]?.id ?? null
  );
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.id === selectedFolderId) ?? null,
    [folders, selectedFolderId]
  );

  const folderPages = useMemo(
    () =>
      pages
        .filter((p) => p.folder_id === selectedFolderId)
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1)),
    [pages, selectedFolderId]
  );

  const selectedPage = useMemo(
    () => pages.find((p) => p.id === selectedPageId) ?? null,
    [pages, selectedPageId]
  );

  useEffect(() => {
    if (selectedPage && selectedPage.folder_id !== selectedFolderId) {
      setSelectedPageId(null);
    }
  }, [selectedFolderId, selectedPage]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function handleNewFolder(parentId: string | null, type: "standard" | "vault" = "standard") {
    const name = prompt(
      type === "vault" ? "Name your account vault" : "New folder name"
    );
    if (!name?.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("folders")
      .insert({ name: name.trim(), parent_id: parentId, type })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    if (data) setSelectedFolderId(data.id);
    refresh();
  }

  async function handleNewPage(folderId: string | null) {
    if (!folderId) {
      alert("Pick a folder first.");
      return;
    }
    const folder = folders.find((f) => f.id === folderId);
    const isVault = folder?.type === "vault";
    const supabase = createClient();
    const { data, error } = await supabase
      .from("notes")
      .insert({
        folder_id: folderId,
        title: isVault ? "New account" : "Untitled",
        content: null,
      })
      .select()
      .single();
    if (error) {
      alert(error.message);
      return;
    }
    if (data) {
      setSelectedFolderId(folderId);
      setSelectedPageId(data.id);
    }
    refresh();
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-lg border bg-card shadow-sm">
      <aside className="flex w-64 shrink-0 flex-col border-r">
        <div className="flex items-center justify-between border-b px-3 py-3">
          <p className="text-sm font-semibold">Workspace</p>
        </div>

        <div className="flex flex-col gap-1 border-b px-2 py-2">
          <Button
            size="sm"
            variant="ghost"
            className="justify-start"
            onClick={() => handleNewFolder(null, "standard")}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            New folder
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="justify-start"
            onClick={() => handleNewPage(selectedFolderId)}
          >
            <FilePlus className="mr-2 h-4 w-4" />
            New page
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="justify-start text-amber-700 hover:text-amber-800 dark:text-amber-300"
            onClick={() => handleNewFolder(null, "vault")}
          >
            <Lock className="mr-2 h-4 w-4" />
            New account vault
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {folders.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 px-3 text-center text-xs text-muted-foreground">
              No folders yet. Create one above to get started.
            </div>
          ) : (
            <FolderTree
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={(id) => {
                setSelectedFolderId(id);
                setSelectedPageId(null);
              }}
              onAddSubfolder={(parentId) => handleNewFolder(parentId, "standard")}
              onAddPage={(folderId) => handleNewPage(folderId)}
            />
          )}
        </div>
      </aside>

      <div className="flex w-64 shrink-0 flex-col border-r">
        <PageList
          folder={selectedFolder}
          pages={folderPages}
          selectedPageId={selectedPageId}
          onSelectPage={setSelectedPageId}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {selectedPage ? (
          <Editor key={selectedPage.id} page={selectedPage} folder={selectedFolder} />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
            {selectedFolder
              ? "Select a page on the left, or create a new one."
              : "Pick a folder, then a page, to start writing."}
          </div>
        )}
      </div>
    </div>
  );
}
