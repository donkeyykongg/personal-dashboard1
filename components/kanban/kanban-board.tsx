"use client";

import {
  DragEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { Plus, Trash2, Pencil, Check, X, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type {
  KanbanCard,
  KanbanColumn,
  KanbanEffort,
  KanbanPriority,
} from "@/lib/supabase/types";

const COLUMNS: { key: KanbanColumn; title: string; tone: string }[] = [
  { key: "backlog", title: "Backlog", tone: "text-slate-600" },
  { key: "todo", title: "TODO", tone: "text-amber-700" },
  { key: "doing", title: "In progress", tone: "text-blue-700" },
  { key: "done", title: "Complete", tone: "text-emerald-700" },
];

const PRIORITY_TONE: Record<KanbanPriority, string> = {
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200",
  low: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};
const EFFORT_TONE: Record<KanbanEffort, string> = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200",
  medium: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200",
  high: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200",
};

export function KanbanBoard({ initialCards }: { initialCards: KanbanCard[] }) {
  const [cards, setCards] = useState<KanbanCard[]>(initialCards);

  useEffect(() => {
    setCards(initialCards);
  }, [initialCards]);

  return (
    <div className="flex h-full w-full gap-4 overflow-auto p-6">
      {COLUMNS.map((col) => (
        <Column
          key={col.key}
          column={col.key}
          title={col.title}
          tone={col.tone}
          cards={cards}
          setCards={setCards}
        />
      ))}
    </div>
  );
}

type ColProps = {
  column: KanbanColumn;
  title: string;
  tone: string;
  cards: KanbanCard[];
  setCards: React.Dispatch<React.SetStateAction<KanbanCard[]>>;
};

function Column({ column, title, tone, cards, setCards }: ColProps) {
  const [active, setActive] = useState(false);
  const filtered = cards
    .filter((c) => c.column_key === column)
    .sort((a, b) => a.sort - b.sort);

  function handleDragStart(e: DragEvent, card: KanbanCard) {
    e.dataTransfer.setData("cardId", card.id);
  }

  async function handleDrop(e: DragEvent) {
    const cardId = e.dataTransfer.getData("cardId");
    setActive(false);
    clearHighlights();
    const indicators = getIndicators(column);
    const { element } = nearestIndicator(e, indicators);
    const before = element.dataset.before || "-1";
    if (before === cardId) return;

    const supabase = createClient();
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;

    const others = cards.filter((c) => c.id !== cardId);
    const colCards = others
      .filter((c) => c.column_key === column)
      .sort((a, b) => a.sort - b.sort);
    const insertIdx =
      before === "-1" ? colCards.length : colCards.findIndex((c) => c.id === before);
    colCards.splice(insertIdx, 0, { ...card, column_key: column });

    const updates = colCards.map((c, i) => ({ ...c, sort: i, column_key: column }));

    const next = [
      ...others.filter((c) => c.column_key !== column),
      ...updates,
    ];
    setCards(next);

    await Promise.all(
      updates.map((u) =>
        supabase
          .from("kanban_cards")
          .update({ column_key: u.column_key, sort: u.sort })
          .eq("id", u.id)
      )
    );
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    highlightIndicator(e, column);
    setActive(true);
  }

  function handleDragLeave() {
    clearHighlights();
    setActive(false);
  }

  return (
    <div className="w-72 shrink-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`font-medium ${tone}`}>{title}</h3>
        <span className="rounded text-sm text-muted-foreground">{filtered.length}</span>
      </div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "min-h-[28rem] rounded-lg border border-dashed p-2 transition-colors",
          active ? "bg-muted" : "bg-card"
        )}
      >
        {filtered.map((c) => (
          <CardItem
            key={c.id}
            card={c}
            onDragStart={handleDragStart}
            onChange={(updated) =>
              setCards((all) => all.map((x) => (x.id === updated.id ? updated : x)))
            }
            onDelete={(id) => setCards((all) => all.filter((x) => x.id !== id))}
          />
        ))}
        <DropIndicator beforeId={null} column={column} />
        <AddCard column={column} cards={cards} setCards={setCards} />
      </div>
    </div>
  );
}

function CardItem({
  card,
  onDragStart,
  onChange,
  onDelete,
}: {
  card: KanbanCard;
  onDragStart: (e: DragEvent, c: KanbanCard) => void;
  onChange: (c: KanbanCard) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [priority, setPriority] = useState<KanbanPriority>(card.priority);
  const [effort, setEffort] = useState<KanbanEffort>(card.effort);

  async function save() {
    const supabase = createClient();
    const { error } = await supabase
      .from("kanban_cards")
      .update({ title: title.trim(), priority, effort })
      .eq("id", card.id);
    if (error) {
      alert(error.message);
      return;
    }
    onChange({ ...card, title: title.trim(), priority, effort });
    setEditing(false);
  }

  async function remove() {
    if (!confirm(`Delete "${card.title}"?`)) return;
    const supabase = createClient();
    await supabase.from("kanban_cards").delete().eq("id", card.id);
    onDelete(card.id);
  }

  return (
    <>
      <DropIndicator beforeId={card.id} column={card.column_key} />
      <motion.div
        layout
        layoutId={card.id}
        draggable={!editing}
        onDragStart={(e) =>
          onDragStart(e as unknown as DragEvent<HTMLDivElement>, card)
        }
        className="group mb-1 cursor-grab rounded-lg border bg-background p-3 shadow-sm active:cursor-grabbing"
      >
        {editing ? (
          <div className="space-y-2">
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-input bg-background p-2 text-sm"
              rows={2}
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as KanbanPriority)}
                className="rounded border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="high">High priority</option>
                <option value="medium">Med priority</option>
                <option value="low">Low priority</option>
              </select>
              <select
                value={effort}
                onChange={(e) => setEffort(e.target.value as KanbanEffort)}
                className="rounded border border-input bg-background px-2 py-1 text-xs"
              >
                <option value="low">Low effort</option>
                <option value="medium">Med effort</option>
                <option value="high">High effort</option>
              </select>
            </div>
            <div className="flex justify-end gap-1">
              <button
                onClick={() => setEditing(false)}
                className="rounded border px-2 py-1 text-xs"
              >
                <X className="h-3 w-3" />
              </button>
              <button
                onClick={save}
                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
              >
                <Check className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-foreground">{card.title}</p>
              <span className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => setEditing(true)}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Edit"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={remove}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose-600"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${PRIORITY_TONE[card.priority]}`}
              >
                {card.priority}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${EFFORT_TONE[card.effort]}`}
              >
                {card.effort} effort
              </span>
              {card.priority === "high" && card.effort === "low" && (
                <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium uppercase text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200">
                  <Zap className="h-2.5 w-2.5" />
                  quick win
                </span>
              )}
            </div>
          </>
        )}
      </motion.div>
    </>
  );
}

function DropIndicator({
  beforeId,
  column,
}: {
  beforeId: string | null;
  column: string;
}) {
  return (
    <div
      data-before={beforeId || "-1"}
      data-column={column}
      className="my-1 h-0.5 w-full bg-primary opacity-0"
    />
  );
}

function AddCard({
  column,
  cards,
  setCards,
}: {
  column: KanbanColumn;
  cards: KanbanCard[];
  setCards: React.Dispatch<React.SetStateAction<KanbanCard[]>>;
}) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [priority, setPriority] = useState<KanbanPriority>("medium");
  const [effort, setEffort] = useState<KanbanEffort>("medium");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    const supabase = createClient();
    const sort = cards.filter((c) => c.column_key === column).length;
    const { data, error } = await supabase
      .from("kanban_cards")
      .insert({
        title: text.trim(),
        column_key: column,
        priority,
        effort,
        sort,
      })
      .select()
      .single();
    if (error || !data) {
      alert(error?.message ?? "Insert failed");
      return;
    }
    setCards((all) => [...all, data as KanbanCard]);
    setText("");
    setAdding(false);
  }

  return adding ? (
    <motion.form layout onSubmit={handleSubmit} className="space-y-2">
      <textarea
        onChange={(e) => setText(e.target.value)}
        value={text}
        autoFocus
        placeholder="Add new task..."
        className="w-full rounded-lg border border-input bg-background p-3 text-sm focus:outline-0"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as KanbanPriority)}
          className="rounded border border-input bg-background px-2 py-1 text-xs"
        >
          <option value="high">High priority</option>
          <option value="medium">Med priority</option>
          <option value="low">Low priority</option>
        </select>
        <select
          value={effort}
          onChange={(e) => setEffort(e.target.value as KanbanEffort)}
          className="rounded border border-input bg-background px-2 py-1 text-xs"
        >
          <option value="low">Low effort</option>
          <option value="medium">Med effort</option>
          <option value="high">High effort</option>
        </select>
      </div>
      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={() => {
            setAdding(false);
            setText("");
          }}
          className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Close
        </button>
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs text-primary-foreground hover:bg-primary/90"
        >
          <span>Add</span>
          <Plus className="h-3 w-3" />
        </button>
      </div>
    </motion.form>
  ) : (
    <motion.button
      layout
      onClick={() => setAdding(true)}
      className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
    >
      <span>Add card</span>
      <Plus className="h-3 w-3" />
    </motion.button>
  );
}

function getIndicators(column: KanbanColumn) {
  return Array.from(
    document.querySelectorAll(
      `[data-column="${column}"]`
    ) as unknown as HTMLElement[]
  );
}

function nearestIndicator(e: DragEvent, indicators: HTMLElement[]) {
  const OFFSET = 50;
  return indicators.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = e.clientY - (box.top + OFFSET);
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    },
    {
      offset: Number.NEGATIVE_INFINITY,
      element: indicators[indicators.length - 1],
    }
  );
}

function highlightIndicator(e: DragEvent, column: KanbanColumn) {
  const indicators = getIndicators(column);
  clearHighlights(indicators);
  const { element } = nearestIndicator(e, indicators);
  element.style.opacity = "1";
}

function clearHighlights(els?: HTMLElement[]) {
  const indicators = els ?? Array.from(document.querySelectorAll("[data-before]") as unknown as HTMLElement[]);
  indicators.forEach((i) => (i.style.opacity = "0"));
}
