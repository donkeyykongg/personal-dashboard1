import Link from "next/link";
import { ArrowUpRight, Coins, Flame, Scale, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = {
  netWorth: number;
  totalCash: number;
  totalDebt: number;
  monthExpenses: number;
  monthIncome: number;
};

export function FinancialSnapshot({
  netWorth,
  totalCash,
  totalDebt,
  monthExpenses,
  monthIncome,
}: Props) {
  const net = monthIncome - monthExpenses;
  const items = [
    {
      label: "Net worth",
      value: formatCurrency(netWorth),
      icon: Scale,
      hint: `${formatCurrency(totalCash)} − ${formatCurrency(totalDebt)}`,
      tone: netWorth >= 0 ? "text-emerald-600" : "text-rose-600",
    },
    {
      label: "Burn (this month)",
      value: formatCurrency(monthExpenses),
      icon: Flame,
      hint: `${formatCurrency(monthIncome)} in`,
      tone: "text-rose-600",
    },
    {
      label: "Net (this month)",
      value: formatCurrency(net),
      icon: net >= 0 ? Coins : TrendingDown,
      hint: net >= 0 ? "Saving" : "Spending more than earning",
      tone: net >= 0 ? "text-emerald-600" : "text-rose-600",
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-[#B8B6B0]">Money</p>
          <h2 className="text-xl text-white">Financial snapshot</h2>
        </div>
        <Link
          href="/finances"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open finances <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map(({ label, value, icon: Icon, hint, tone }) => (
          <div
            key={label}
            className="rounded-xl border bg-card px-5 py-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-[#B8B6B0]">
                {label}
              </p>
              <Icon className="h-4 w-4 text-[#B8B6B0]" />
            </div>
            <p className={`mt-3 font-mono text-3xl ${tone}`}>{value}</p>
            <p className="mt-1 text-xs text-[#B8B6B0]">{hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
