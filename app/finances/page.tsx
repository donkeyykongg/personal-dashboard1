// app/finances/page.tsx
import { createClient } from "@/lib/supabase/server";
import { ExchangeRatesProvider } from "@/lib/exchange-rates";
import { FinanceTabs, parseTab } from "@/components/finances/finance-tabs";

export const dynamic = "force-dynamic";

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const active = parseTab(searchParams.tab);

  // Data fetching is deferred to each section component (added in later tasks).
  void supabase;

  return (
    <ExchangeRatesProvider>
      <div className="dash-hub space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Finances</h1>
          <p className="mt-1 text-sm text-[#76746E]">
            Net worth, subscriptions, cash flow, and business expenses.
          </p>
        </header>

        {/* Renewal ticker placeholder — filled by Phase 5 */}
        <div data-slot="renewal-ticker" />

        <FinanceTabs active={active} />

        {/* Section content — filled by Phase 4-7 */}
        {active === "net-worth" && <div data-slot="net-worth">Net Worth tab coming in Phase 4</div>}
        {active === "subscriptions" && <div data-slot="subscriptions">Subscriptions tab coming in Phase 5</div>}
        {active === "cash-flow" && <div data-slot="cash-flow">Cash Flow tab coming in Phase 6</div>}
        {active === "business" && <div data-slot="business">Business tab coming in Phase 7</div>}
      </div>
    </ExchangeRatesProvider>
  );
}
