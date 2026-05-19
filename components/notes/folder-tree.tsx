"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FilePlus,
  Folder as FolderIcon,
  FolderPlus,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Folder } from "@/lib/supabase/types";

type Node = Folder & { children: Node[] };

function buildTree(folders: Folder[]): Node[] {
  const map = new Map<string, Node>();
  folders.forEach((f) => map.set(f.id, { ...f, children: [] }));
  const roots: Node[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sortRec = (nodes: Node[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

type Props = {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string) => void;
  onAddSubfolder: (parentId: string) => void;
  onAddPage: (folderId: string) => void;
};

export function FolderTree({
  folders,
  selectedFolderId,
  onSelectFolder,
  onAddSubfolder,
  onAddPage,
}: Props) {
  const tree = useMemo(() => buildTree(folders), [folders]);

  return (
    <ul className="space-y-0.5">
      {tree.map((node) => (
        <FolderNode
          key={node.id}
          node={node}
          depth={0}
          selectedFolderId={selectedFolderId}
          onSelectFolder={onSelectFolder}
          onAddSubfolder={onAddSubfolder}
          onAddPage={onAddPage}
        />
      ))}
    </ul>
  );
}

function FolderNode({
  node,
  depth,
  selectedFolderId,
  onSelectFolder,
  onAddSubfolder,
  onAddPage,
}: {
  node: Node;
  depth: number;
} & Omit<Props, "folders">) {
  const [expanded, setExpanded] = useState(depth === 0);
  const isVault = node.type === "vault";
  const isSelected = selectedFolderId === node.id;
  const Icon = isVault ? Lock : FolderIcon;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md pr-1 text-sm transition-colors",
          isSelected ? "bg-secondary text-secondary-foreground" : "hover:bg-accent/60"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex h-6 w-5 items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={expanded ? "Collapse folder" : "Expand folder"}
        >
          {node.children.length > 0 ? (
            expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="block h-3.5 w-3.5" />
          )}
        </button>
        <button
          type="button"
          onClick={() => onSelectFolder(node.id)}
          className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
        >
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isVault ? "text-amber-600" : "text-muted-foreground"
            )}
          />
          <span className="truncate">{node.name}</span>
        </button>
        <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onAddSubfolder(node.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="New subfolder"
            title="New subfolder"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAddPage(node.id)}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
            aria-label="New page in folder"
            title="New page"
          >
            <FilePlus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded && node.children.length > 0 && (
        <ul className="space-y-0.5">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelectFolder={onSelectFolder}
              onAddSubfolder={onAddSubfolder}
              onAddPage={onAddPage}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
