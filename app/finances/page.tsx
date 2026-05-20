// app/finances/page.tsx
import { createClient } from "@/lib/supabase/server";
import { ExchangeRatesProvider } from "@/lib/exchange-rates";
import { FinanceTabs, parseTab } from "@/components/finances/finance-tabs";
import { NetWorthSection } from "@/components/finances/net-worth/net-worth-section";
import { getNetWorthData } from "@/lib/finances/net-worth";
import type { Subscription } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const active = parseTab(searchParams.tab);

  const [nwData, subsRes] = await Promise.all([
    getNetWorthData(supabase),
    supabase.from("subscriptions").select("*"),
  ]);
  const subscriptions = (subsRes.data ?? []) as Subscription[];

  return (
    <ExchangeRatesProvider>
      <div className="dash-hub space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Finances</h1>
          <p className="mt-1 text-sm text-[#76746E]">
            Net worth, subscriptions, cash flow, and business expenses.
          </p>
        </header>

        <div data-slot="renewal-ticker" />

        <FinanceTabs active={active} />

        {active === "net-worth" && (
          <NetWorthSection
            accounts={nwData.accounts}
            activity={nwData.activity}
            snapshots={nwData.snapshots}
            subscriptions={subscriptions}
          />
        )}
        {active === "subscriptions" && (
          <div data-slot="subscriptions">Subscriptions tab coming in Phase 5</div>
        )}
        {active === "cash-flow" && (
          <div data-slot="cash-flow">Cash Flow tab coming in Phase 6</div>
        )}
        {active === "business" && <div data-slot="business">Business tab coming in Phase 7</div>}
      </div>
    </ExchangeRatesProvider>
  );
}
