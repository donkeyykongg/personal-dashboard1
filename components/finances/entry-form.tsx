"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { treeFor } from "@/lib/finance-categories";

export function EntryForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [item, setItem] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringInterval, setRecurringInterval] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [nextDueDate, setNextDueDate] = useState(() => new Date().toISOString().slice(0, 10));

  const tree = treeFor(type);
  const categories = Object.keys(tree);
  const subcategories = useMemo(() => (category ? tree[category] ?? [] : []), [category, tree]);

  function resetCategory() {
    setCategory("");
    setSubcategory("");
    setItem("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError("Amount must be greater than 0");
      return;
    }
    if (!category) {
      setError("Pick a category");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const table = type === "income" ? "income" : "expenses";
      const payload: Record<string, string | number | boolean | null> = {
        amount: numAmount,
        category,
        subcategory: subcategory || null,
        item: item.trim() || null,
        date,
        notes: notes || null,
      };

      if (isRecurring) {
        payload.is_recurring = true;
        payload.recurring_interval = recurringInterval;
        payload.next_due_date = nextDueDate;
      }

      const { error: insertError } = await supabase.from(table).insert(payload);

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setAmount("");
      resetCategory();
      setNotes("");
      setIsRecurring(false);
      setRecurringInterval("monthly");
      setNextDueDate(new Date().toISOString().slice(0, 10));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              {(["expense", "income"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setType(t);
                    resetCategory();
                  }}
                >
                  {t === "income" ? "Income" : "Expense"}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
              }}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Pick a category…</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subcategory">Subcategory</Label>
            <select
              id="subcategory"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={!category}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <option value="">{category ? "Pick a subcategory…" : "Pick category first"}</option>
              {subcategories.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item">Item / merchant</Label>
            <Input
              id="item"
              placeholder={
                type === "income" ? "e.g. ACME Corp" : "e.g. Pai, Loblaws"
              }
              value={item}
              onChange={(e) => setItem(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              Recurring {type === "income" ? "income" : "expense"}
            </label>

            {isRecurring && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="recurring-interval">Repeats</Label>
                  <select
                    id="recurring-interval"
                    value={recurringInterval}
                    onChange={(e) =>
                      setRecurringInterval(e.target.value as "weekly" | "monthly" | "yearly")
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="next-due-date">Next due date</Label>
                  <Input
                    id="next-due-date"
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    required={isRecurring}
                  />
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving…" : "Save entry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
