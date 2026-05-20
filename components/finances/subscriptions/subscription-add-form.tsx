// components/finances/subscriptions/subscription-add-form.tsx
"use client";

import { useState } from "react";
import { useExchangeRates, type Currency } from "@/lib/exchange-rates";
import type { BillingCycle, FinancialAccount } from "@/lib/supabase/types";
import { addSubscription } from "@/app/finances/actions";

export function SubscriptionAddForm({ accounts }: { accounts: FinancialAccount[] }) {
  const { rates } = useExchangeRates();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("CHF");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [renewal, setRenewal] = useState("");
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [autoDeduct, setAutoDeduct] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    const n = name.trim();
    const a = parseFloat(amount);
    if (!n || isNaN(a)) return;
    if (autoDeduct && !fromAccountId) {
      alert('Pick a "From account" — auto-deduct needs somewhere to take the money from.');
      return;
    }
    setPending(true);
    try {
      const rate = rates[currency] || 1;
      await addSubscription({
        name: n,
        amount_chf: a / rate,
        entered_amount: a,
        entered_currency: currency,
        billing_cycle: cycle,
        next_renewal: renewal || null,
        from_account_id: fromAccountId || null,
        auto_deduct: autoDeduct,
      });
      setName("");
      setAmount("");
      setRenewal("");
      setAutoDeduct(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 rounded-xl bg-black/30 p-1.5 sm:grid-cols-[2fr_1fr_1fr_1fr]">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Service (e.g. Netflix)"
        className="rounded-md bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-[#76746E]"
      />
      <input
        type="number"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Amount"
        className="rounded-md bg-transparent px-3 py-2 text-right text-sm text-white outline-none placeholder:text-[#76746E]"
      />
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value as Currency)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-white"
      >
        <option value="CHF">CHF</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="CAD">CAD</option>
      </select>
      <select
        value={cycle}
        onChange={(e) => setCycle(e.target.value as BillingCycle)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-center text-xs font-semibold text-white"
      >
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
        <option value="weekly">Weekly</option>
      </select>
      <input
        type="date"
        value={renewal}
        onChange={(e) => setRenewal(e.target.value)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-sm text-white sm:col-span-2"
        style={{ colorScheme: "dark" }}
      />
      <select
        value={fromAccountId}
        onChange={(e) => setFromAccountId(e.target.value)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white"
      >
        <option value="">No account linked</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <label className="flex items-center justify-center gap-2 rounded-md bg-white/[0.04] px-3 py-2 text-xs">
        <input
          type="checkbox"
          checked={autoDeduct}
          onChange={(e) => setAutoDeduct(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        <span className={autoDeduct ? "font-bold text-[#6BE3A4]" : "text-[#B8B6B0]"}>
          Auto-deduct
        </span>
      </label>
      <button
        type="button"
        onClick={handleAdd}
        disabled={pending}
        className="rounded-md bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:bg-white/[0.12] disabled:opacity-50 sm:col-span-4"
      >
        + Add
      </button>
    </div>
  );
}
