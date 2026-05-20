// components/finances/net-worth/category-card.tsx
"use client";

import { useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinancialAccount, NwCategory } from "@/lib/supabase/types";
import { totalByCategory } from "@/lib/finances/net-worth";
import { addAccount, updateAccount, deleteAccount } from "@/app/finances/actions";

const META: Record<NwCategory, { label: string; emoji: string }> = {
  bank: { label: "Bank accounts", emoji: "🏦" },
  stocks: { label: "Stocks / Investments", emoji: "📈" },
  crypto: { label: "Crypto", emoji: "🪙" },
  other: { label: "Other assets", emoji: "💼" },
};

export function CategoryCard({
  category,
  accounts,
}: {
  category: NwCategory;
  accounts: FinancialAccount[];
}) {
  const { format, rates, currency } = useExchangeRates();
  const filtered = accounts.filter((a) => a.nw_category === category);
  const total = totalByCategory(accounts, category);
  const meta = META[category];
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    const n = name.trim();
    const a = parseFloat(amount);
    if (!n || isNaN(a)) return;
    setPending(true);
    try {
      const rate = rates[currency] || 1;
      await addAccount({ name: n, amount_chf: a / rate, nw_category: category });
      setName("");
      setAmount("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-white/5 bg-white/[0.025] p-5"
      style={{ backdropFilter: "blur(24px) saturate(1.2)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#76746E]">
          {meta.emoji} {meta.label}
        </span>
        <span className="text-xs font-semibold text-white">{format(total)}</span>
      </div>

      <ul className="space-y-1.5 text-sm">
        {filtered.map((a) => (
          <CategoryRow key={a.id} account={a} />
        ))}
        {filtered.length === 0 && (
          <li className="py-2 text-center text-[10px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
            No accounts yet
          </li>
        )}
      </ul>

      <div className="mt-3 flex gap-1.5 rounded-xl bg-black/30 p-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Account name"
          className="flex-1 bg-transparent px-2.5 py-2 text-sm text-white outline-none placeholder:text-[#76746E]"
        />
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Amount"
          step="0.01"
          className="w-24 bg-transparent px-2.5 py-2 text-right text-sm text-white outline-none placeholder:text-[#76746E]"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="rounded-lg bg-white/[0.06] px-3 text-sm font-bold text-white hover:bg-white/[0.12] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function CategoryRow({ account }: { account: FinancialAccount }) {
  const { format, convert, rates, currency } = useExchangeRates();
  const [editing, setEditing] = useState<"name" | "amount" | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);

  async function saveName() {
    const v = draft.trim();
    setEditing(null);
    if (!v || v === account.name) return;
    setPending(true);
    try {
      await updateAccount({ id: account.id, name: v });
    } finally {
      setPending(false);
    }
  }

  async function saveAmount() {
    const rate = rates[currency] || 1;
    setEditing(null);
    const v = draft.trim();
    if (!v) return;
    const curDisplay = convert(Number(account.amount));
    let nextDisplay = curDisplay;
    if (/^[+\-]\s*\d/.test(v)) {
      const delta = parseFloat(v.replace(/\s+/g, ""));
      if (!isNaN(delta)) nextDisplay = curDisplay + delta;
    } else {
      const n = parseFloat(v);
      if (!isNaN(n)) nextDisplay = n;
    }
    if (nextDisplay < 0) nextDisplay = 0;
    setPending(true);
    try {
      await updateAccount({ id: account.id, amount_chf: nextDisplay / rate });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      await deleteAccount(account.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 py-1">
      {editing === "name" ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveName();
            else if (e.key === "Escape") setEditing(null);
          }}
          onBlur={saveName}
          className="flex-1 rounded-md bg-black/30 px-2 py-1 text-sm text-white outline-none"
        />
      ) : (
        <span
          className="flex-1 cursor-pointer truncate text-white hover:bg-white/[0.06] rounded px-1 py-0.5 -mx-1"
          onClick={() => {
            setDraft(account.name);
            setEditing("name");
          }}
        >
          {account.name}
        </span>
      )}
      {editing === "amount" ? (
        <input
          autoFocus
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveAmount();
            else if (e.key === "Escape") setEditing(null);
          }}
          onBlur={saveAmount}
          className="w-28 rounded-md bg-black/30 px-2 py-1 text-right text-xs font-mono text-white outline-none"
        />
      ) : (
        <span
          className="cursor-pointer font-mono text-xs font-semibold text-white hover:bg-white/[0.06] rounded px-1 py-0.5 -mx-1"
          title="Click to edit · type +500 to add or -200 to subtract"
          onClick={() => {
            setDraft(convert(Number(account.amount)).toFixed(2));
            setEditing("amount");
          }}
        >
          {format(Number(account.amount))}
        </span>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="rounded p-1 text-[#76746E] hover:bg-white/[0.06] hover:text-[#FF8A8A] disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}
