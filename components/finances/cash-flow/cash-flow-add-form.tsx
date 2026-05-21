"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import { addCashFlowEntry } from "@/app/finances/actions";

const fallbackIncomeCategories = ["Income", "Client", "Payout", "Refund", "Other"];
const fallbackExpenseCategories = ["Software", "Subscriptions", "Ads", "Operations", "Other"];

export function CashFlowAddForm({
  knownIncomeCategories,
  knownExpenseCategories,
}: {
  knownIncomeCategories: string[];
  knownExpenseCategories: string[];
}) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Income");
  const [item, setItem] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isBusiness, setIsBusiness] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = Array.from(
    new Set(
      type === "income"
        ? [...knownIncomeCategories, ...fallbackIncomeCategories]
        : [...knownExpenseCategories, ...fallbackExpenseCategories]
    )
  );

  function switchType(next: "income" | "expense") {
    setType(next);
    setCategory(next === "income" ? "Income" : "Software");
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    if (!category.trim()) {
      setError("Enter a category.");
      return;
    }

    startTransition(async () => {
      try {
        await addCashFlowEntry({
          type,
          amount: parsed,
          category: category.trim(),
          item: item.trim(),
          date,
          notes: notes.trim() || null,
          is_business: isBusiness,
        });
        setAmount("");
        setItem("");
        setNotes("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save entry.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-white/5 bg-white/[0.025] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
            Add cash flow
          </div>
          <div className="mt-1 text-xs text-[#B8B6B0]">
            Log inflows and outflows without importing a statement.
          </div>
        </div>
        <div className="flex rounded-lg border border-white/8 bg-black/20 p-1">
          <TypeButton active={type === "income"} onClick={() => switchType("income")}>
            <ArrowUpRight className="h-3.5 w-3.5" />
            Inflow
          </TypeButton>
          <TypeButton active={type === "expense"} onClick={() => switchType("expense")}>
            <ArrowDownLeft className="h-3.5 w-3.5" />
            Outflow
          </TypeButton>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
        <Field label="Amount" className="lg:col-span-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0.00"
            className="h-10 w-full rounded-lg border border-white/8 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-[#76746E] focus:border-[#6BE3A4]/50"
          />
        </Field>

        <Field label="Category" className="lg:col-span-2">
          <input
            list={`cash-flow-${type}-categories`}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Category"
            className="h-10 w-full rounded-lg border border-white/8 bg-black/20 px-3 text-sm font-semibold text-white outline-none placeholder:text-[#76746E] focus:border-[#6BE3A4]/50"
          />
          <datalist id={`cash-flow-${type}-categories`}>
            {categories.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Field>

        <Field label="Source / merchant" className="lg:col-span-3">
          <input
            value={item}
            onChange={(event) => setItem(event.target.value)}
            placeholder={type === "income" ? "Payout, client, platform" : "Merchant, tool, VA"}
            className="h-10 w-full rounded-lg border border-white/8 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-[#76746E] focus:border-[#6BE3A4]/50"
          />
        </Field>

        <Field label="Date" className="lg:col-span-2">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 w-full rounded-lg border border-white/8 bg-black/20 px-3 text-sm text-white outline-none focus:border-[#6BE3A4]/50"
            style={{ colorScheme: "dark" }}
          />
        </Field>

        <Field label="Notes" className="lg:col-span-3">
          <input
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional context"
            className="h-10 w-full rounded-lg border border-white/8 bg-black/20 px-3 text-sm text-white outline-none placeholder:text-[#76746E] focus:border-[#6BE3A4]/50"
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#B8B6B0]">
          <input
            type="checkbox"
            checked={isBusiness}
            onChange={(event) => setIsBusiness(event.target.checked)}
            className="h-4 w-4"
          />
          Biz
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-white/[0.08] px-4 text-sm font-bold text-white hover:bg-white/[0.14] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {isPending ? "Saving..." : "Add entry"}
        </button>
      </div>

      {error && <div className="mt-3 text-xs font-semibold text-[#FF8A8A]">{error}</div>}
    </form>
  );
}

function TypeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-bold transition-colors ${
        active ? "bg-white/[0.10] text-white" : "text-[#76746E] hover:text-[#B8B6B0]"
      }`}
    >
      {children}
    </button>
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
