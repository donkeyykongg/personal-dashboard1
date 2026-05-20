// app/finances/page.tsx
import { createClient } from "@/lib/supabase/server";
import { ExchangeRatesProvider } from "@/lib/exchange-rates";
import { FinanceTabs } from "@/components/finances/finance-tabs";
import { parseTab } from "@/lib/finances/finance-tab";
import { NetWorthSection } from "@/components/finances/net-worth/net-worth-section";
import { SubscriptionsSection } from "@/components/finances/subscriptions/subscriptions-section";
import { RenewalTicker } from "@/components/finances/renewal-ticker";
import { getNetWorthData } from "@/lib/finances/net-worth";
import { processAutoDeductSubs } from "@/app/finances/actions";
import type { Subscription } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  // Fire-and-process auto-deduct before reading subscription/account state.
  await processAutoDeductSubs();

  const supabase = createClient();
  const active = parseTab(searchParams.tab);

  const [nwData, subsRes] = await Promise.all([
    getNetWorthData(supabase),
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
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

        <RenewalTicker subscriptions={subscriptions} />

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
          <SubscriptionsSection subscriptions={subscriptions} accounts={nwData.accounts} />
        )}
        {active === "cash-flow" && (
          <div data-slot="cash-flow">Cash Flow tab coming in Phase 6</div>
        )}
        {active === "business" && <div data-slot="business">Business tab coming in Phase 7</div>}
      </div>
    </ExchangeRatesProvider>
  );
}
