"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useExchangeRates } from "@/lib/exchange-rates";
import type {
  FinancialAccount,
  Subscription,
  SubscriptionAmountType,
} from "@/lib/supabase/types";
import { monthlyEquivalentCHF } from "@/lib/finances/net-worth";
import { updateSubscription, deleteSubscription } from "@/app/finances/actions";
import { CalendarDateField } from "@/components/ui/calendar-with-time-picker-inline";

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

function fmtDateOnly(iso: string | null): string {
  if (!iso) return "—";
  const safe = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00` : iso;
  const d = new Date(safe);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
  const urgent =
    sub.amount_type !== "total" && renewal.daysLeft != null && renewal.daysLeft <= 5;
  const linked = accounts.find((a) => a.id === sub.from_account_id);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  // Form draft state, reset whenever the underlying sub changes.
  const [draftAmountType, setDraftAmountType] = useState<SubscriptionAmountType>(
    sub.amount_type ?? "monthly"
  );
  const [draftPaidOn, setDraftPaidOn] = useState<string>(sub.paid_on ?? "");
  const [draftNextRenewal, setDraftNextRenewal] = useState<string>(sub.next_renewal ?? "");

  useEffect(() => {
    setDraftAmountType(sub.amount_type ?? "monthly");
    setDraftPaidOn(sub.paid_on ?? "");
    setDraftNextRenewal(sub.next_renewal ?? "");
    setEditing(false);
  }, [sub.amount_type, sub.paid_on, sub.next_renewal]);

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

  async function saveDraft() {
    setPending(true);
    try {
      await updateSubscription({
        id: sub.id,
        amount_type: draftAmountType,
        paid_on: draftPaidOn || null,
        next_renewal: draftNextRenewal || null,
      });
      setEditing(false);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not update subscription.");
    } finally {
      setPending(false);
    }
  }

  function cancelEdit() {
    setDraftAmountType(sub.amount_type ?? "monthly");
    setDraftPaidOn(sub.paid_on ?? "");
    setDraftNextRenewal(sub.next_renewal ?? "");
    setEditing(false);
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
      className={`rounded-xl transition-colors ${
        urgent
          ? "animate-pulse border border-[#FF8A8A]/30 bg-gradient-to-br from-[#FF8A8A]/14 to-[#FF8A8A]/[0.06]"
          : "bg-white/[0.025]"
      }`}
    >
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl p-3.5 text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <span className="text-[#76746E]">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="truncate text-sm font-semibold text-white">{sub.name}</span>
            {urgent && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#FF8A8A]/40 bg-[#FF8A8A]/15 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-[0.12em] text-[#FF8A8A]">
                DUE {renewal.daysLeft}D
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[11px] text-[#76746E]">
            {sub.amount_type === "total" ? "Prepaid · amortizing" : sub.billing_cycle}
            {sub.amount_type !== "total" && renewal.label
              ? ` · renews ${renewal.label}`
              : ""}
          </div>
        </div>
        <div className="text-right leading-tight">
          <div className="text-lg font-bold tabular-nums text-white">{format(monthly)}</div>
          <div className="mt-0.5 text-[10px] text-[#76746E]">/ month</div>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="space-y-3 border-t border-white/[0.05] p-3.5">
          {/* Status pills row — quick toggles, always interactive */}
          <div className="flex flex-wrap items-center gap-1.5">
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

            <div className="ml-auto flex items-center gap-1">
              {!editing && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[10.5px] font-bold uppercase tracking-[0.10em] text-[#B8B6B0] hover:text-white"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
              <button
                type="button"
                disabled={pending}
                onClick={handleDelete}
                className="rounded-md border border-white/10 bg-white/[0.04] p-1.5 text-[#76746E] hover:text-[#FF8A8A]"
                title="Delete subscription"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Detail grid — locked by default, editable when editing */}
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Field label="Treatment">
              {editing ? (
                <select
                  value={draftAmountType}
                  disabled={pending}
                  onChange={(e) =>
                    setDraftAmountType(e.target.value as SubscriptionAmountType)
                  }
                  className="h-8 w-full rounded-md border border-white/10 bg-black/25 px-2 text-[12px] font-semibold text-white"
                >
                  <option value="monthly">Monthly amount</option>
                  <option value="total">Total prepaid</option>
                </select>
              ) : (
                <ReadOnlyValue>
                  {sub.amount_type === "total" ? "Total prepaid" : "Monthly amount"}
                </ReadOnlyValue>
              )}
            </Field>

            <Field label="Start date">
              {editing ? (
                <CalendarDateField
                  value={draftPaidOn}
                  disabled={pending || draftAmountType !== "total"}
                  onChange={setDraftPaidOn}
                  calendarClassName="bg-[#080e1a] text-white"
                />
              ) : (
                <ReadOnlyValue>{fmtDateOnly(sub.paid_on)}</ReadOnlyValue>
              )}
            </Field>

            <Field label={(editing ? draftAmountType : sub.amount_type) === "total" ? "End date" : "Next renewal"}>
              {editing ? (
                <CalendarDateField
                  value={draftNextRenewal}
                  disabled={pending}
                  onChange={setDraftNextRenewal}
                  calendarClassName="bg-[#080e1a] text-white"
                />
              ) : (
                <ReadOnlyValue>{fmtDateOnly(sub.next_renewal)}</ReadOnlyValue>
              )}
            </Field>
          </dl>

          {sub.amount_type === "total" && sub.paid_on && sub.next_renewal && (
            <p className="text-[10.5px] text-[#B8B6B0]">
              Amortizing {fmtDateOnly(sub.paid_on)} → {fmtDateOnly(sub.next_renewal)}
            </p>
          )}

          {sub.entered_currency !== "CAD" && sub.entered_amount != null && (
            <p className="text-[10.5px] text-[#76746E]">
              Billed {sub.entered_currency} {sub.entered_amount.toFixed(2)} / {sub.billing_cycle}
            </p>
          )}

          {editing && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={saveDraft}
                className="rounded-md bg-[#6BE3A4] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.10em] text-[#06100B] disabled:opacity-50"
              >
                Save
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={cancelEdit}
                className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.10em] text-[#B8B6B0] hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          <p className="text-[10px] leading-snug text-[#76746E]">
            Total prepaid spreads cost across Start → End in Cash Flow. Already outflow keeps
            net worth from being deducted again.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-[9px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function ReadOnlyValue({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-8 items-center rounded-md border border-white/[0.04] bg-black/15 px-2 text-[12px] font-medium text-white">
      {children}
    </div>
  );
}
