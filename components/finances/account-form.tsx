"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import type { FinancialAccountKind } from "@/lib/supabase/types";

const accountKinds: { value: FinancialAccountKind; label: string }[] = [
  { value: "asset", label: "Asset / cash" },
  { value: "liability", label: "Debt / liability" },
  { value: "income", label: "Income source" },
  { value: "expense", label: "Expense bucket" },
];

export function AccountForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<FinancialAccountKind>("asset");
  const [amount, setAmount] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsedAmount = parseFloat(amount);
    if (!name.trim()) return setError("Name is required");
    if (isNaN(parsedAmount)) return setError("Amount must be a number");

    startTransition(async () => {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("financial_accounts").insert({
        name: name.trim(),
        kind,
        amount: parsedAmount,
      });

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setName("");
      setAmount("");
      setKind("asset");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add balance item</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="account-name">Name</Label>
            <Input
              id="account-name"
              placeholder="Checking, Visa, student loan..."
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-kind">Type</Label>
            <select
              id="account-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as FinancialAccountKind)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {accountKinds.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="account-amount">Amount</Label>
            <Input
              id="account-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Saving..." : "Save balance item"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
