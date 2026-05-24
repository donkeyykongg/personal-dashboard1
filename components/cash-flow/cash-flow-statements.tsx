"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { MonthlyCashFlow } from "@/lib/supabase/types";

function monthDisplay(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export function CashFlowStatements({ statements }: { statements: MonthlyCashFlow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MonthlyCashFlow | null>(null);
  const [isPending, startTransition] = useTransition();

  const sorted = [...statements].sort((a, b) => b.month.localeCompare(a.month));

  function openNew() {
    setEditing(null);
    setOpen(true);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this statement?")) return;
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("monthly_cash_flow").delete().eq("id", id);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base uppercase tracking-wide text-muted-foreground">
              Monthly cash flow statements
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Log actuals to understand the delta between your plan and reality.
            </p>
          </div>
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add month
          </Button>
        </CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <div className="rounded-md border border-dashed py-12 text-center text-sm text-muted-foreground">
              No statements yet. Add one to start the trend chart.
            </div>
          ) : (
            <ul className="space-y-2">
              {sorted.map((s) => {
                const net = s.revenue - s.expenses;
                return (
                  <li
                    key={s.id}
                    className="group flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold">{monthDisplay(s.month)}</p>
                      <p className="text-xs text-muted-foreground">
                        Revenue: {formatCurrency(s.revenue)} · Expenses:{" "}
                        {formatCurrency(s.expenses)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-semibold tabular-nums ${
                          net >= 0 ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {formatCurrency(net)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                      >
                        Show details
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => handleDelete(s.id)}
                        aria-label="Delete statement"
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <CashFlowDialog open={open} onOpenChange={setOpen} initial={editing} />
    </>
  );
}

function CashFlowDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: MonthlyCashFlow | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [month, setMonth] = useState("");
  const [revenue, setRevenue] = useState("");
  const [expenses, setExpenses] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setMonth(initial.month);
      setRevenue(String(initial.revenue));
      setExpenses(String(initial.expenses));
      setNotes(initial.notes ?? "");
    } else {
      const now = new Date();
      setMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
      setRevenue("");
      setExpenses("");
      setNotes("");
    }
  }, [initial, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      setError("Month must be YYYY-MM");
      return;
    }
    const r = parseFloat(revenue);
    const ex = parseFloat(expenses);
    if (isNaN(r) || r < 0) return setError("Revenue must be 0 or higher");
    if (isNaN(ex) || ex < 0) return setError("Expenses must be 0 or higher");

    startTransition(async () => {
      const supabase = createClient();
      const payload = { month, revenue: r, expenses: ex, notes: notes.trim() || null };
      const { error: dbError } = initial
        ? await supabase.from("monthly_cash_flow").update(payload).eq("id", initial.id)
        : await supabase.from("monthly_cash_flow").upsert(payload, { onConflict: "user_id,month" });
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
          <DialogTitle>{initial ? "Edit month" : "Add month"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="cf-month">Month</Label>
            <Input
              id="cf-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cf-revenue">Revenue</Label>
              <Input
                id="cf-revenue"
                type="number"
                step="0.01"
                min={0}
                value={revenue}
                onChange={(e) => setRevenue(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cf-expenses">Expenses</Label>
              <Input
                id="cf-expenses"
                type="number"
                step="0.01"
                min={0}
                value={expenses}
                onChange={(e) => setExpenses(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cf-notes">Notes (optional)</Label>
            <Textarea
              id="cf-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : initial ? "Save changes" : "Add month"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
