"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarDateField } from "@/components/ui/calendar-with-time-picker-inline";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { treeFor } from "@/lib/finance-categories";
import type { FinanceEntry } from "@/lib/supabase/types";

type EntryTable = "income" | "expenses";

type Props = {
  title: string;
  entries: FinanceEntry[];
  table: EntryTable;
  tone: string;
};

export function EntryList({ title, entries, table, tone }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete(entry: FinanceEntry) {
    if (!confirm(`Delete ${entry.category} for ${formatCurrency(entry.amount)}?`)) return;

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from(table).delete().eq("id", entry.id);
      if (error) {
        alert(error.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">{entries.length} latest</span>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
            No entries yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {entry.item || entry.subcategory || entry.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[entry.category, entry.subcategory].filter(Boolean).join(" › ")}
                    {" · "}
                    {entry.date}
                    {entry.is_recurring ? ` · ${entry.recurring_interval ?? "monthly"}` : ""}
                    {entry.notes ? ` · ${entry.notes}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`text-sm font-semibold ${tone}`}>
                    {formatCurrency(entry.amount)}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditing(entry)}
                    aria-label={`Edit ${entry.category}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleDelete(entry)}
                    aria-label={`Delete ${entry.category}`}
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EntryDialog
        entry={editing}
        table={table}
        open={Boolean(editing)}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </>
  );
}

function EntryDialog({
  entry,
  table,
  open,
  onOpenChange,
}: {
  entry: FinanceEntry | null;
  table: EntryTable;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [item, setItem] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [nextDueDate, setNextDueDate] = useState("");

  useEffect(() => {
    if (!entry || !open) return;
    setError(null);
    setAmount(String(entry.amount));
    setCategory(entry.category);
    setSubcategory(entry.subcategory ?? "");
    setItem(entry.item ?? "");
    setDate(entry.date);
    setNotes(entry.notes ?? "");
    setIsRecurring(Boolean(entry.is_recurring));
    setRecurringInterval(entry.recurring_interval ?? "monthly");
    setNextDueDate(entry.next_due_date ?? entry.date);
  }, [entry, open]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!entry) return;

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (!category) {
      setError("Pick a category");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const payload: Record<string, string | number | boolean | null> = {
        amount: parsedAmount,
        category,
        subcategory: subcategory || null,
        item: item.trim() || null,
        date,
        notes: notes.trim() || null,
      };

      if (isRecurring) {
        payload.is_recurring = true;
        payload.recurring_interval = recurringInterval;
        payload.next_due_date = nextDueDate;
      } else if (entry.is_recurring !== undefined) {
        payload.is_recurring = false;
        payload.recurring_interval = null;
        payload.next_due_date = null;
      }

      const { error: dbError } = await supabase.from(table).update(payload).eq("id", entry.id);

      if (dbError) {
        setError(dbError.message);
        return;
      }

      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {table === "income" ? "income" : "expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-amount">Amount</Label>
            <Input
              id="edit-amount"
              type="number"
              step="0.01"
              min={0}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-category">Category</Label>
            <select
              id="edit-category"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setSubcategory("");
              }}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Pick a category…</option>
              {Object.keys(treeFor(table === "income" ? "income" : "expense")).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {category && !Object.keys(treeFor(table === "income" ? "income" : "expense")).includes(category) ? (
                <option value={category}>{category} (legacy)</option>
              ) : null}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-subcategory">Subcategory</Label>
            <select
              id="edit-subcategory"
              value={subcategory}
              onChange={(event) => setSubcategory(event.target.value)}
              disabled={!category}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">{category ? "Pick a subcategory…" : "Pick category first"}</option>
              {(treeFor(table === "income" ? "income" : "expense")[category] ?? []).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {subcategory && !(treeFor(table === "income" ? "income" : "expense")[category] ?? []).includes(subcategory) ? (
                <option value={subcategory}>{subcategory} (legacy)</option>
              ) : null}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-item">Item / merchant</Label>
            <Input
              id="edit-item"
              value={item}
              onChange={(event) => setItem(event.target.value)}
              placeholder={table === "income" ? "Source" : "e.g. Pai"}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-date">Date</Label>
            <CalendarDateField
              id="edit-date"
              value={date}
              onChange={setDate}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(event) => setIsRecurring(event.target.checked)}
              />
              Recurring {table === "income" ? "income" : "expense"}
            </label>

            {isRecurring && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="edit-recurring-interval">Repeats</Label>
                  <select
                    id="edit-recurring-interval"
                    value={recurringInterval}
                    onChange={(event) =>
                      setRecurringInterval(event.target.value as "weekly" | "monthly" | "yearly")
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-next-due-date">Next due date</Label>
                  <CalendarDateField
                    id="edit-next-due-date"
                    value={nextDueDate}
                    onChange={setNextDueDate}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
