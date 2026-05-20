// components/finances/business/business-add-form.tsx
"use client";

import { useState } from "react";
import { addBusinessExpense } from "@/app/finances/actions";

export function BusinessAddForm({ knownCategories }: { knownCategories: string[] }) {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [pending, setPending] = useState(false);

  async function handleAdd() {
    const i = item.trim();
    const a = parseFloat(amount);
    const c = category.trim();
    if (!i || isNaN(a) || !c) return;
    setPending(true);
    try {
      await addBusinessExpense({ item: i, amount: a, category: c, date });
      setItem("");
      setAmount("");
      setCategory("");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-1.5 rounded-xl bg-black/30 p-1.5 sm:grid-cols-[2fr_1fr_1.5fr_1.2fr_auto]">
      <input
        value={item}
        onChange={(e) => setItem(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Description"
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
      <input
        list="biz-categories"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="Category (Software, Travel...)"
        className="rounded-md bg-white/[0.04] px-3 py-2 text-sm text-white outline-none placeholder:text-[#76746E]"
      />
      <datalist id="biz-categories">
        {knownCategories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-md bg-white/[0.04] px-3 py-2 text-sm text-white"
        style={{ colorScheme: "dark" }}
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={pending}
        className="rounded-md bg-white/[0.06] px-4 py-2 text-sm font-bold text-white hover:bg-white/[0.12] disabled:opacity-50"
      >
        + Add
      </button>
    </div>
  );
}
