import { Banknote, Landmark, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type Props = {
  totalCash: number;
  totalInflow: number;
  totalDebt: number;
  netWorth: number;
};

export function BalanceSheetSummary({
  totalCash,
  totalInflow,
  totalDebt,
  netWorth,
}: Props) {
  const items = [
    {
      label: "Total cash",
      value: totalCash,
      icon: Wallet,
      tone: "text-emerald-600",
    },
    {
      label: "Total inflow",
      value: totalInflow,
      icon: TrendingUp,
      tone: "text-blue-600",
    },
    {
      label: "Total debt",
      value: totalDebt,
      icon: Landmark,
      tone: "text-rose-600",
    },
    {
      label: "Net worth",
      value: netWorth,
      icon: Banknote,
      tone: netWorth >= 0 ? "text-emerald-600" : "text-rose-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {label}
            </CardTitle>
            <Icon className={`h-4 w-4 ${tone}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${tone}`}>
              {formatCurrency(value)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
