"use client";

import { useExchangeRates } from "@/lib/exchange-rates";
import type { FinancialAccount, Subscription } from "@/lib/supabase/types";
import { monthlyEquivalentCHF } from "@/lib/finances/net-worth";
import { SubscriptionRow } from "./subscription-row";
import { SubscriptionAddForm } from "./subscription-add-form";

export function SubscriptionsSection({
  subscriptions,
  accounts,
}: {
  subscriptions: Subscription[];
  accounts: FinancialAccount[];
}) {
  const { format } = useExchangeRates();
  const active = subscriptions.filter((s) => s.active);
  const monthly = active.reduce((s, x) => s + monthlyEquivalentCHF(x), 0);

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-5"
        style={{
          background:
            "linear-gradient(135deg, rgba(83,74,183,0.07), rgba(216,90,48,0.05))",
          borderColor: "rgba(83,74,183,0.20)",
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.04em] text-[#76746E]">
              Monthly burn
            </div>
            <div className="mt-0.5 text-3xl font-bold leading-tight text-white">
              {format(monthly)}{" "}
              <span className="text-sm font-medium text-[#76746E]">/ mo</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#76746E]">
              ~{format(monthly * 12)} per year
            </div>
          </div>
          <div className="text-[11px] text-[#76746E]">
            {active.length} subscription{active.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {active.length === 0 ? (
            <div className="rounded-lg py-4 text-center text-[10px] font-bold uppercase tracking-[0.10em] text-[#76746E]">
              No subscriptions yet
            </div>
          ) : (
            active.map((s) => <SubscriptionRow key={s.id} sub={s} accounts={accounts} />)
          )}
        </div>

        <div className="mt-3">
          <SubscriptionAddForm accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
