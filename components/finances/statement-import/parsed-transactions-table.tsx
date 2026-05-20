"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { ParsedTransaction } from "@/lib/finances/parse-statement";

type Row = ParsedTransaction & { id: string; include: boolean; isBusiness: boolean };

export function ParsedTransactionsTable({
  transactions,
  onReset,
}: {
  transactions: ParsedTransaction[];
  onReset: () => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    transactions.map((t, i) => ({
      ...t,
      id: `r${i}_${Date.now()}`,
      include: true,
      isBusiness: false,
    }))
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateRow = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  async function handleImport() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/parse-statement/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: rows.filter((r) => r.include).map(({ id, include, ...rest }) => rest),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `HTTP ${res.status}`);
        return;
      }
      router.push(`/finances?tab=cash-flow&imported=${data.inserted ?? 0}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPending(false);
    }
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#B8B6B0]">
          {includedCount} of {rows.length} selected
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.10em] text-[#B8B6B0] hover:bg-white/[0.04]"
        >
          Start over
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/5 bg-white/[0.025]">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#76746E]">
              <th className="p-3">✓</th>
              <th className="p-3">Date</th>
              <th className="p-3">Description</th>
              <th className="p-3">Category</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Type</th>
              <th className="p-3">Business?</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/[0.03]">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                  />
                </td>
                <td className="p-3 font-mono text-[12px] tabular-nums text-[#B8B6B0]">{r.date}</td>
                <td className="p-3 text-white">
                  <input
                    value={r.description}
                    onChange={(e) => updateRow(r.id, { description: e.target.value })}
                    className="w-full bg-transparent outline-none"
                  />
                </td>
                <td className="p-3">
                  <input
                    value={r.category}
                    onChange={(e) => updateRow(r.id, { category: e.target.value })}
                    className="w-full rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white outline-none"
                  />
                </td>
                <td className="p-3 text-right font-mono tabular-nums text-white">
                  <input
                    type="number"
                    step="0.01"
                    value={r.amount}
                    onChange={(e) => updateRow(r.id, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-24 bg-transparent text-right outline-none"
                  />
                </td>
                <td className="p-3">
                  <select
                    value={r.type}
                    onChange={(e) => updateRow(r.id, { type: e.target.value as "income" | "expense" })}
                    className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-white outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </td>
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={r.isBusiness}
                    onChange={(e) => updateRow(r.id, { isBusiness: e.target.checked })}
                    disabled={r.type === "income"}
                  />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="rounded p-1 text-[#76746E] hover:text-[#FF8A8A]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <div className="rounded-md border border-[#FF8A8A]/30 bg-[#FF8A8A]/10 px-3 py-2 text-sm text-[#FF8A8A]">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleImport}
        disabled={pending || includedCount === 0}
        className="inline-flex items-center gap-2 rounded-md bg-[#6EE7B7] px-4 py-2 text-sm font-bold uppercase tracking-[0.10em] text-[#04201A] hover:bg-[#4ED4A0] disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Import {includedCount} transaction{includedCount === 1 ? "" : "s"}
      </button>
    </div>
  );
}
