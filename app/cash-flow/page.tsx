import { createClient } from "@/lib/supabase/server";
import { CashFlowChart } from "@/components/cash-flow/cash-flow-chart";
import { CashFlowStatements } from "@/components/cash-flow/cash-flow-statements";
import type { MonthlyCashFlow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function CashFlowPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("monthly_cash_flow")
    .select("*")
    .order("month", { ascending: true });

  const statements = (data ?? []) as MonthlyCashFlow[];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Monthly Cash Flow</h1>
        <p className="text-sm text-muted-foreground">
          Log actual income vs. expenses and measure cash flow trends.
        </p>
      </header>

      <CashFlowChart statements={statements} />
      <CashFlowStatements statements={statements} />

      {error && (
        <p className="text-sm text-destructive">
          Couldn't load from Supabase: {error.message}
        </p>
      )}
    </div>
  );
}
