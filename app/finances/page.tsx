// app/finances/page.tsx
import { createClient } from "@/lib/supabase/server";
import { ExchangeRatesProvider } from "@/lib/exchange-rates";
import { FinanceTabs } from "@/components/finances/finance-tabs";
import { parseTab } from "@/lib/finances/finance-tab";
import { NetWorthSection } from "@/components/finances/net-worth/net-worth-section";
import { SubscriptionsSection } from "@/components/finances/subscriptions/subscriptions-section";
import { RenewalTicker } from "@/components/finances/renewal-ticker";
import { getNetWorthData } from "@/lib/finances/net-worth";
import { getFinanceOverview } from "@/lib/finances";
import { processAutoDeductSubs } from "@/app/finances/actions";
import { CashFlowSection } from "@/components/finances/cash-flow/cash-flow-section";
import { BusinessExpensesSection } from "@/components/finances/business/business-expenses-section";
import type { Subscription, FinanceEntry } from "@/lib/supabase/types";

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

  const [nwData, subsRes, overview, businessRes] = await Promise.all([
    getNetWorthData(supabase),
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
    getFinanceOverview(supabase),
    supabase.from("expenses").select("*").eq("is_business", true).order("date", { ascending: false }),
  ]);
  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const businessEntries = (businessRes.data ?? []) as FinanceEntry[];

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
          <CashFlowSection
            monthly={overview.monthly}
            recentIncome={overview.recentIncome}
            recentExpenses={overview.recentExpenses.filter((e: FinanceEntry) => !e.is_business)}
          />
        )}
        {active === "business" && <BusinessExpensesSection entries={businessEntries} />}
      </div>
    </ExchangeRatesProvider>
  );
}
