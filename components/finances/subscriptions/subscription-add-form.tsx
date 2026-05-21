// components/finances/subscriptions/subscription-add-form.tsx
"use client";

import { useState, type ReactNode } from "react";
import { useExchangeRates, type Currency } from "@/lib/exchange-rates";
import type {
  BillingCycle,
  FinancialAccount,
  SubscriptionAmountType,
} from "@/lib/supabase/types";
import { addSubscription } from "@/app/finances/actions";
import { CalendarDateField } from "@/components/ui/calendar-with-time-picker-inline";

export function SubscriptionAddForm({ accounts }: { accounts: FinancialAccount[] }) {
  const { rates } = useExchangeRates();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("CAD");
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [amountType, setAmountType] = useState<SubscriptionAmountType>("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [autoDeduct, setAutoDeduct] = useState(false);
  const [alreadyOutflow, setAlreadyOutflow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    setError(null);
    const n = name.trim();
    const a = parseFloat(amount);
    if (!n || isNaN(a)) return;
    if (amountType === "total") {
      if (!startDate || !endDate) {
        setError("Add a Start date and End date so prepaid subscriptions can be spread monthly.");
        return;
      }
      if (new Date(`${endDate}T00:00`).getTime() <= new Date(`${startDate}T00:00`).getTime()) {
        setError("End date must be after Start date.");
        return;
      }
    }
    if (autoDeduct && !fromAccountId) {
      setError('Pick a "From account" — auto-deduct needs somewhere to take the money from.');
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
        amount_type: amountType,
        paid_on: amountType === "total" ? startDate : null,
        next_renewal: endDate || null,
        from_account_id: fromAccountId || null,
        auto_deduct: alreadyOutflow ? false : autoDeduct,
        already_outflow: alreadyOutflow,
      });
      setName("");
      setAmount("");
      setStartDate("");
      setEndDate("");
      setAutoDeduct(false);
      setAlreadyOutflow(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add subscription.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/5 bg-black/25 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#B8B6B0]">
            Add subscription
          </div>
          <div className="mt-0.5 text-[11px] text-[#76746E]">
            Total prepaid spreads cost between Start date and End date. Already outflow means
            the payment already hit net worth, so it will not auto-deduct again.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
        <Field label="Service" className="md:col-span-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nord VPN"
            className="h-10 w-full rounded-lg border border-white/8 bg-white/[0.035] px-3 text-sm text-white outline-none placeholder:text-[#76746E] focus:border-[#6BE3A4]/50"
          />
        </Field>

        <Field label="Amount" className="md:col-span-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="0.00"
            className="h-10 w-full rounded-lg border border-white/8 bg-white/[0.035] px-3 text-right text-sm text-white outline-none placeholder:text-[#76746E] focus:border-[#6BE3A4]/50"
          />
        </Field>

        <Field label="Currency" className="md:col-span-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as Currency)}
            className="h-10 w-full rounded-lg border border-white/8 bg-white/[0.035] px-3 text-sm font-semibold text-white outline-none"
          >
            <option value="CAD">CAD</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </Field>

        <Field label="Billing period" className="md:col-span-2">
          <select
            value={cycle}
            onChange={(e) => setCycle(e.target.value as BillingCycle)}
            className="h-10 w-full rounded-lg border border-white/8 bg-white/[0.035] px-3 text-sm font-semibold text-white outline-none"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="weekly">Weekly</option>
          </select>
        </Field>

        <Field label="Cash-flow treatment" className="md:col-span-2">
          <select
            value={amountType}
            onChange={(e) => setAmountType(e.target.value as SubscriptionAmountType)}
            className="h-10 w-full rounded-lg border border-white/8 bg-white/[0.035] px-3 text-sm font-semibold text-white outline-none"
          >
            <option value="monthly">Monthly amount</option>
            <option value="total">Total prepaid</option>
          </select>
        </Field>

        {amountType === "total" && (
          <Field label="Start date" className="md:col-span-3">
            <CalendarDateField
              value={startDate}
              onChange={setStartDate}
              calendarClassName="bg-[#080e1a] text-white"
            />
          </Field>
        )}

        <Field
          label={amountType === "total" ? "End date" : "Next renewal"}
          className="md:col-span-3"
        >
          <CalendarDateField
            value={endDate}
            onChange={setEndDate}
            calendarClassName="bg-[#080e1a] text-white"
          />
        </Field>

        <Field label="From account" className={amountType === "total" ? "md:col-span-3" : "md:col-span-4"}>
          <select
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            className="h-10 w-full rounded-lg border border-white/8 bg-white/[0.035] px-3 text-sm font-semibold text-white outline-none"
          >
            <option value="">No account linked</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 gap-2 md:col-span-3 md:grid-cols-2">
          <ToggleLabel
            checked={autoDeduct && !alreadyOutflow}
            disabled={alreadyOutflow}
            label="Auto-deduct"
            tone="green"
            onChange={(checked) => setAutoDeduct(checked)}
          />
          <ToggleLabel
            checked={alreadyOutflow}
            label="Already outflow"
            tone="gold"
            onChange={(checked) => {
              setAlreadyOutflow(checked);
              if (checked) setAutoDeduct(false);
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="h-10 rounded-lg bg-white/[0.08] px-4 text-sm font-bold text-white hover:bg-white/[0.14] disabled:opacity-50 md:col-span-12"
        >
          + Add subscription
        </button>
        {error && (
          <div className="rounded-lg border border-[#FF8A8A]/20 bg-[#FF8A8A]/10 px-3 py-2 text-xs font-semibold text-[#FF8A8A] md:col-span-12">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block space-y-1.5 ${className ?? ""}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleLabel({
  checked,
  disabled,
  label,
  tone,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  tone: "green" | "gold";
  onChange: (checked: boolean) => void;
}) {
  const activeColor = tone === "green" ? "text-[#6BE3A4]" : "text-[#F2C063]";
  return (
    <label className="flex h-full min-h-10 items-center gap-2 rounded-lg border border-white/8 bg-white/[0.035] px-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      <span className={`text-xs font-semibold ${checked ? activeColor : "text-[#B8B6B0]"}`}>
        {label}
      </span>
    </label>
  );
}
