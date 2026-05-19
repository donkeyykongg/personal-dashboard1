"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_META, CYCLE_LABEL } from "@/lib/subscriptions";
import type {
  BillingCycle,
  Subscription,
  SubscriptionCategory,
} from "@/lib/supabase/types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: Subscription | null;
};

export function SubscriptionForm({ open, onOpenChange, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDate, setBillingDate] = useState("1");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [category, setCategory] = useState<SubscriptionCategory>("software");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initial) {
      setName(initial.name);
      setAmount(String(initial.amount));
      setBillingDate(String(initial.billing_date));
      setBillingCycle(initial.billing_cycle);
      setCategory(initial.category);
      setActive(initial.active);
    } else {
      setName("");
      setAmount("");
      setBillingDate("1");
      setBillingCycle("monthly");
      setCategory("software");
      setActive(true);
    }
  }, [initial, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!name.trim()) return setError("Name is required");
    if (!numAmount || numAmount <= 0) return setError("Amount must be greater than 0");
    const day = parseInt(billingDate, 10);
    if (!day || day < 1 || day > 31) return setError("Billing date must be 1–31");

    startTransition(async () => {
      const supabase = createClient();
      const payload = {
        name: name.trim(),
        amount: numAmount,
        billing_date: day,
        billing_cycle: billingCycle,
        category,
        active,
      };

      const { error: dbError } = initial
        ? await supabase.from("subscriptions").update(payload).eq("id", initial.id)
        : await supabase.from("subscriptions").insert(payload);

      if (dbError) {
        setError(dbError.message);
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!initial) return;
    if (!confirm(`Delete "${initial.name}"?`)) return;
    startTransition(async () => {
      const supabase = createClient();
      const { error: dbError } = await supabase
        .from("subscriptions")
        .delete()
        .eq("id", initial.id);
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
          <DialogTitle>{initial ? "Edit subscription" : "Add subscription"}</DialogTitle>
          <DialogDescription>
            {initial
              ? "Update the details or remove this subscription."
              : "Track a recurring charge so it counts toward your monthly total."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="sub-name">Name</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Notion, Spotify, Adobe…"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="sub-amount">Amount</Label>
              <Input
                id="sub-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sub-day">Billing date (day)</Label>
              <Input
                id="sub-day"
                type="number"
                min={1}
                max={31}
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Billing cycle</Label>
              <Select
                value={billingCycle}
                onValueChange={(v) => setBillingCycle(v as BillingCycle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CYCLE_LABEL) as BillingCycle[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CYCLE_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as SubscriptionCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_META) as SubscriptionCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_META[c].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Active (counts toward monthly total)
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {initial && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving…" : initial ? "Save changes" : "Add subscription"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
