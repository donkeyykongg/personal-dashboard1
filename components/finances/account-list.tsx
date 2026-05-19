"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { FinancialAccount } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";

export function AccountList({ accounts }: { accounts: FinancialAccount[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(account: FinancialAccount) {
    if (!confirm(`Delete ${account.name}?`)) return;

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("financial_accounts")
        .delete()
        .eq("id", account.id);

      if (error) {
        alert(error.message);
        return;
      }

      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold">Balance sheet</h2>
        <span className="text-xs text-muted-foreground">{accounts.length} items</span>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
          Add cash, assets, and debts to calculate net worth.
        </div>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-background p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{account.name}</p>
                <p className="text-xs capitalize text-muted-foreground">{account.kind}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-sm font-semibold ${
                    account.kind === "liability" ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {formatCurrency(account.amount)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={isPending}
                  onClick={() => handleDelete(account)}
                  aria-label={`Delete ${account.name}`}
                >
                  <Trash2 className="h-4 w-4 text-rose-500" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
