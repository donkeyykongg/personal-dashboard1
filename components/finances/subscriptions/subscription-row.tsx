"use client";

import { useState, type ReactNode } from "react";
import { Check, Trash2 } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type {
  FinancialAccount,
  Subscription,
  SubscriptionAmountType,
} from "@/lib/supabase/types";
import { monthlyEquivalentCHF } from "@/lib/finances/net-worth";
import { updateSubscription, deleteSubscription } from "@/app/finances/actions";

function fmtRenewal(iso: string | null): { label: string; daysLeft: number | null } {
  if (!iso) return { label: "", daysLeft: null };
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso;
  const d = new Date(safe);
  if (isNaN(d.getTime())) return { label: iso, daysLeft: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  const date = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  let prefix = "";
  if (diff < 0) prefix = "past · ";
  else if (diff === 0) prefix = "today · ";
  else if (diff === 1) prefix = "tomorrow · ";
  else if (diff <= 7) prefix = `in ${diff}d · `;
  return { label: `${prefix}${date}`, daysLeft: diff };
}

export function SubscriptionRow({
  sub,
  accounts,
}: {
  sub: Subscription;
  accounts: FinancialAccount[];
}) {
  const { format } = useExchangeRates();
  const monthly = monthlyEquivalentCHF(sub);
  const renewal = fmtRenewal(sub.next_renewal);
  const urgent = sub.amount_type !== "total" && renewal.daysLeft != null && renewal.daysLeft <= 5;
  const linked = accounts.find((a) => a.id === sub.from_account_id);
  const [pending, setPending] = useState(false);

  async function toggleAuto() {
    if (sub.already_outflow) {
      alert("This subscription is marked as already paid/outflowed, so auto-deduct is disabled.");
      return;
    }
    if (!sub.auto_deduct && !sub.from_account_id) {
      alert('Pick a "From account" first (use the edit form) so auto-deduct knows where to take the money from.');
      return;
    }
    setPending(true);
    try {
      await updateSubscription({ id: sub.id, auto_deduct: !sub.auto_deduct });
    } finally {
      setPending(false);
    }
  }

  async function toggleAlreadyOutflow() {
    setPending(true);
    try {
      await updateSubscription({ id: sub.id, already_outflow: !sub.already_outflow });
    } finally {
      setPending(false);
    }
  }

  async function updateTreatment(patch: {
    amount_type?: SubscriptionAmountType;
    paid_on?: string | null;
    next_renewal?: string | null;
  }) {
    setPending(true);
    try {
      await updateSubscription({ id: sub.id, ...patch });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update subscription.");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${sub.name}"?`)) return;
    setPending(true);
    try {
      await deleteSubscription(sub.id);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-xl p-3.5 transition-colors ${
        urgent
          ? "animate-pulse border border-[#FF8A8A]/30 bg-gradient-to-br from-[#FF8A8A]/14 to-[#FF8A8A]/[0.06]"
          : "bg-white/[0.025]"
      }`}
    >
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white">{sub.name}</div>
        <div className="mt-0.5 text-[11px] capitalize text-[#76746E]">
          {sub.amount_type === "total" ? "total prepaid" : "monthly amount"} · {sub.billing_cycle}
        </div>
        {sub.amount_type !== "total" && renewal.label && (
          <div
            className={`mt-1 text-[10px] ${urgent ? "font-bold text-[#FF8A8A]" : "text-[#F2C063]"}`}
          >
            ↻ Renews {renewal.label}
          </div>
        )}
        {sub.amount_type === "total" && sub.paid_on && sub.next_renewal && (
          <div className="mt-1 text-[10px] text-[#B8B6B0]">
            Amortizing {sub.paid_on} → {sub.next_renewal}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {linked && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-[#BFE3F8]">
              from · {linked.name}
            </span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={toggleAuto}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] ${
              sub.auto_deduct
                ? "border-[#6BE3A4]/30 bg-[#6BE3A4]/10 text-[#6BE3A4]"
                : "border-white/8 bg-white/[0.04] text-[#76746E]"
            }`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: sub.auto_deduct ? "#6BE3A4" : "rgba(255,255,255,0.25)",
                boxShadow: sub.auto_deduct ? "0 0 6px rgba(107,227,164,0.7)" : "none",
              }}
            />
            {sub.auto_deduct ? "Auto-deduct ON" : "Auto-deduct off"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={toggleAlreadyOutflow}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] ${
              sub.already_outflow
                ? "border-[#F2C063]/30 bg-[#F2C063]/10 text-[#F2C063]"
                : "border-white/8 bg-white/[0.04] text-[#76746E]"
            }`}
          >
            {sub.already_outflow ? (
              <Check className="h-3 w-3" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-white/25" />
            )}
            {sub.already_outflow ? "Already outflow" : "Not outflowed"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          <CompactField label="Treatment">
            <select
              value={sub.amount_type ?? "monthly"}
              disabled={pending}
              onChange={(e) =>
                updateTreatment({ amount_type: e.target.value as SubscriptionAmountType })
              }
              className="h-8 w-full rounded-md border border-white/8 bg-black/25 px-2 text-[11px] font-semibold text-white"
            >
              <option value="monthly">Monthly amount</option>
              <option value="total">Total prepaid</option>
            </select>
          </CompactField>
          <CompactField label="Start date">
            <input
              type="date"
              value={sub.paid_on ?? ""}
              disabled={pending || sub.amount_type !== "total"}
              onChange={(e) => updateTreatment({ paid_on: e.target.value || null })}
              className="h-8 w-full rounded-md border border-white/8 bg-black/25 px-2 text-[11px] text-white disabled:opacity-45"
              style={{ colorScheme: "dark" }}
            />
          </CompactField>
          <CompactField label={sub.amount_type === "total" ? "End date" : "Next renewal"}>
            <input
              type="date"
              value={sub.next_renewal ?? ""}
              disabled={pending}
              onChange={(e) => updateTreatment({ next_renewal: e.target.value || null })}
              className="h-8 w-full rounded-md border border-white/8 bg-black/25 px-2 text-[11px] text-white"
              style={{ colorScheme: "dark" }}
            />
          </CompactField>
        </div>
        <div className="mt-2 text-[10px] leading-snug text-[#76746E]">
          Total prepaid spreads cost across Start → End in Cash Flow. Already outflow keeps
          net worth from being deducted again.
        </div>
      </div>

      <div className="text-right leading-tight">
        <div className="text-xl font-bold tabular-nums text-white">{format(monthly)}</div>
        <div className="mt-0.5 text-[10px] text-[#76746E]">/ month</div>
        {sub.entered_currency !== "CAD" && sub.entered_amount != null && (
          <div className="mt-0.5 text-[10px] text-[#76746E]">
            billed {sub.entered_currency} {sub.entered_amount.toFixed(2)} / {sub.billing_cycle}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={handleDelete}
          className="rounded border border-white/10 p-1 text-[#76746E] hover:text-[#FF8A8A]"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function CompactField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-1">
      <span className="block text-[9px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
        {label}
      </span>
      {children}
    </label>
  );
}
