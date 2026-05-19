import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Props = { income: number; expenses: number };

export function SummaryCards({ income, expenses }: Props) {
  const net = income - expenses;
  const items = [
    {
      label: "Income (this month)",
      value: income,
      icon: ArrowUpRight,
      tone: "text-emerald-600",
    },
    {
      label: "Expenses (this month)",
      value: expenses,
      icon: ArrowDownRight,
      tone: "text-rose-600",
    },
    {
      label: "Net profit",
      value: net,
      icon: Scale,
      tone: net >= 0 ? "text-emerald-600" : "text-rose-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map(({ label, value, icon: Icon, tone }) => (
        <Card key={label}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
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
