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
  searchParams: { tab?: string; imported?: string; skipped?: string };
}) {
  // Fire-and-process auto-deduct before reading subscription/account state.
  await processAutoDeductSubs();

  const supabase = createClient();
  const active = parseTab(searchParams.tab);

  const [nwData, subsRes, overview, businessIncomeRes, businessExpenseRes] = await Promise.all([
    getNetWorthData(supabase),
    supabase.from("subscriptions").select("*").order("created_at", { ascending: false }),
    getFinanceOverview(supabase),
    supabase.from("income").select("*").eq("is_business", true).order("date", { ascending: false }),
    supabase.from("expenses").select("*").eq("is_business", true).order("date", { ascending: false }),
  ]);
  const subscriptions = (subsRes.data ?? []) as Subscription[];
  const businessIncome = (businessIncomeRes.data ?? []) as FinanceEntry[];
  const businessExpenses = (businessExpenseRes.data ?? []) as FinanceEntry[];

  const importedCount = Number(searchParams.imported ?? 0);
  const skippedCount = Number(searchParams.skipped ?? 0);
  const showImportBanner = active === "cash-flow" && (importedCount > 0 || skippedCount > 0);

  return (
    <ExchangeRatesProvider>
      <div className="dash-hub space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Finances</h1>
        </header>

        {showImportBanner && (
          <div className="rounded-md border border-[#6EE7B7]/30 bg-[#6EE7B7]/10 px-3 py-2 text-sm text-[#6EE7B7]">
            Imported {importedCount} transaction{importedCount === 1 ? "" : "s"}
            {skippedCount > 0 ? ` · skipped ${skippedCount} duplicate${skippedCount === 1 ? "" : "s"}` : ""}.
          </div>
        )}

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
            recentExpenses={overview.recentExpenses}
            categoryDeltas={overview.expenseCategoryDeltas}
            knownIncomeCategories={overview.knownIncomeCategories}
            knownExpenseCategories={overview.knownExpenseCategories}
          />
        )}
        {active === "business" && (
          <BusinessExpensesSection income={businessIncome} expenses={businessExpenses} />
        )}
      </div>
    </ExchangeRatesProvider>
  );
}
