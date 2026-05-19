"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import type { Folder, Page } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved";

const SAVE_DELAY_MS = 500;

export function Editor({ page, folder }: { page: Page; folder: Folder | null }) {
  const [title, setTitle] = useState(page.title);
  const [status, setStatus] = useState<Status>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<{ title: string; content: any }>({
    title: page.title,
    content: page.content,
  });

  const isVault = folder?.type === "vault";

  useEffect(() => {
    setTitle(page.title);
    latest.current = { title: page.title, content: page.content };
    setStatus("idle");
  }, [page.id]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const supabase = createClient();
      await supabase
        .from("notes")
        .update({
          title: latest.current.title,
          content: latest.current.content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", page.id);
      setStatus("saved");
    }, SAVE_DELAY_MS);
  }, [page.id]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: isVault
            ? "Add account details here…"
            : "Start writing — auto-saves as you type",
        }),
      ],
      content: page.content || vaultStarterContent(isVault),
      editorProps: {
        attributes: {
          class:
            "prose prose-sm max-w-none focus:outline-none min-h-[60vh] [&_p]:my-2 [&_h1]:mt-6 [&_h1]:mb-2 [&_h2]:mt-5 [&_h2]:mb-2",
        },
      },
      onUpdate: ({ editor }) => {
        latest.current.content = editor.getJSON();
        scheduleSave();
      },
      immediatelyRender: false,
    },
    [page.id]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    latest.current.title = e.target.value;
    scheduleSave();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-8 py-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isVault && (
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <Lock className="h-3 w-3" />
              Account vault
            </span>
          )}
        </div>
        <SaveIndicator status={status} />
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        <Input
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className={cn(
            "mb-4 h-auto border-none bg-transparent px-0 text-3xl font-bold tracking-tight shadow-none focus-visible:ring-0",
          )}
        />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function SaveIndicator({ status }: { status: Status }) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-emerald-600">
        <Check className="h-3 w-3" />
        Saved
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">Auto-saving</span>;
}

function vaultStarterContent(isVault: boolean) {
  if (!isVault) return undefined;
  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Account details" }] },
      {
        type: "bulletList",
        content: [
          listItem("Platform: "),
          listItem("Username: "),
          listItem("Email: "),
          listItem("Recovery: "),
          listItem("2FA: "),
        ],
      },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Notes" }] },
      { type: "paragraph" },
    ],
  };
}

function listItem(text: string) {
  return {
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}
