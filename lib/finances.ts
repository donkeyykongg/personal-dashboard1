import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinanceEntry, FinancialAccount, Subscription } from "@/lib/supabase/types";

export type MonthlyFinancePoint = {
  key: string;
  month: string;
  income: number;
  expenses: number;
  subscriptionExpenses: number;
  net: number;
};

export type RecurringFinanceEntry = FinanceEntry & {
  type: "income" | "expense";
  nextDueDate: string;
};

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function monthStart(monthsAgo: number) {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - monthsAgo);
  return date;
}

function monthDateFromKey(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1);
}

function monthEndExclusive(key: string) {
  const d = monthDateFromKey(key);
  d.setMonth(d.getMonth() + 1);
  return d;
}

function periodStartFor(renewal: Date, cycle: Subscription["billing_cycle"]) {
  const d = new Date(renewal);
  if (cycle === "weekly") d.setDate(d.getDate() - 7);
  else if (cycle === "yearly") d.setFullYear(d.getFullYear() - 1);
  else d.setMonth(d.getMonth() - 1);
  return d;
}

function subscriptionMonthlyCharge(sub: Subscription) {
  const amount = Number(sub.amount) || 0;
  if (sub.amount_type === "total") return amount;
  if (sub.billing_cycle === "weekly") return amount * 4.345;
  if (sub.billing_cycle === "yearly") return amount / 12;
  return amount;
}

function addSubscriptionExpense(bucket: MonthlyFinancePoint, amount: number) {
  bucket.subscriptionExpenses += amount;
  bucket.expenses += amount;
}

function applySubscriptionCashFlow(
  buckets: Map<string, MonthlyFinancePoint>,
  subscriptions: Subscription[]
) {
  const firstKey = Array.from(buckets.keys())[0];
  if (!firstKey) return;
  const windowStart = monthDateFromKey(firstKey);

  for (const sub of subscriptions) {
    if (!sub.active) continue;
    const amount = Number(sub.amount) || 0;
    if (amount <= 0) continue;

    if (sub.amount_type !== "total") {
      const created = sub.created_at ? new Date(sub.created_at) : windowStart;
      for (const [key, bucket] of buckets) {
        if (monthEndExclusive(key) < created) continue;
        addSubscriptionExpense(bucket, subscriptionMonthlyCharge(sub));
      }
      continue;
    }

    if (!sub.next_renewal) continue;
    const renewal = new Date(`${sub.next_renewal}T00:00`);
    if (isNaN(renewal.getTime())) continue;

    const paidOn = sub.paid_on ? new Date(`${sub.paid_on}T00:00`) : null;
    const periodStart =
      paidOn && !isNaN(paidOn.getTime()) ? paidOn : periodStartFor(renewal, sub.billing_cycle);
    if (renewal.getTime() <= periodStart.getTime()) continue;
    const totalDays = Math.max(1, (renewal.getTime() - periodStart.getTime()) / 86_400_000);

    for (const [key, bucket] of buckets) {
      const start = monthDateFromKey(key);
      const end = monthEndExclusive(key);
      const overlapStart = Math.max(start.getTime(), periodStart.getTime());
      const overlapEnd = Math.min(end.getTime(), renewal.getTime());
      const overlapDays = Math.max(0, (overlapEnd - overlapStart) / 86_400_000);
      if (overlapDays > 0) addSubscriptionExpense(bucket, amount * (overlapDays / totalDays));
    }
  }
}

export async function getFinanceOverview(supabase: SupabaseClient) {
  const start = monthStart(11);
  const startDate = start.toISOString().slice(0, 10);

  const [incomeRes, expensesRes, accountsRes, subscriptionsRes] = await Promise.all([
    supabase
      .from("income")
      .select("*")
      .gte("date", startDate)
      .order("date", { ascending: false }),
    supabase
      .from("expenses")
      .select("*")
      .gte("date", startDate)
      .order("date", { ascending: false }),
    supabase
      .from("financial_accounts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("subscriptions").select("*").eq("active", true),
  ]);

  const income = (incomeRes.data ?? []) as FinanceEntry[];
  const expenses = (expensesRes.data ?? []) as FinanceEntry[];
  const accounts = (accountsRes.data ?? []) as FinancialAccount[];
  const subscriptions = (subscriptionsRes.data ?? []) as Subscription[];
  const buckets = new Map<string, MonthlyFinancePoint>();

  for (let i = 0; i < 12; i += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + i);
    const key = monthKey(date);
    buckets.set(key, {
      key,
      month: monthLabel(key),
      income: 0,
      expenses: 0,
      subscriptionExpenses: 0,
      net: 0,
    });
  }

  income.forEach((entry) => {
    const key = entry.date.slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) bucket.income += Number(entry.amount) || 0;
  });

  expenses.forEach((entry) => {
    const key = entry.date.slice(0, 7);
    const bucket = buckets.get(key);
    if (bucket) bucket.expenses += Number(entry.amount) || 0;
  });

  applySubscriptionCashFlow(buckets, subscriptions);
  buckets.forEach((bucket) => {
    bucket.net = bucket.income - bucket.expenses;
  });

  const now = new Date();
  const currentMonth = monthKey(now);
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = monthKey(prevDate);
  const monthly = Array.from(buckets.values());

  const sumBy = (entries: FinanceEntry[], month: string) => {
    const out = new Map<string, number>();
    for (const e of entries) {
      if (!e.date.startsWith(month)) continue;
      const k = e.category || "Other";
      out.set(k, (out.get(k) ?? 0) + (Number(e.amount) || 0));
    }
    return out;
  };
  const currExpensesByCat = sumBy(expenses, currentMonth);
  const prevExpensesByCat = sumBy(expenses, prevMonth);
  const currSubscriptionOutflow = buckets.get(currentMonth)?.subscriptionExpenses ?? 0;
  const prevSubscriptionOutflow = buckets.get(prevMonth)?.subscriptionExpenses ?? 0;
  if (currSubscriptionOutflow > 0) {
    currExpensesByCat.set("Subscriptions", currSubscriptionOutflow);
  }
  if (prevSubscriptionOutflow > 0) {
    prevExpensesByCat.set("Subscriptions", prevSubscriptionOutflow);
  }
  const cats = new Set<string>([...currExpensesByCat.keys(), ...prevExpensesByCat.keys()]);
  const expenseCategoryDeltas = Array.from(cats)
    .map((cat) => {
      const curr = currExpensesByCat.get(cat) ?? 0;
      const prev = prevExpensesByCat.get(cat) ?? 0;
      return { category: cat, curr, prev, abs: curr - prev };
    })
    .sort((a, b) => Math.abs(b.abs) - Math.abs(a.abs));
  const recurringExpenses = expenses
    .filter((entry) => entry.is_recurring)
    .map((entry) => ({
      ...entry,
      type: "expense" as const,
      nextDueDate: nextDueDate(entry),
    }))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  const recurringIncome = income
    .filter((entry) => entry.is_recurring)
    .map((entry) => ({
      ...entry,
      type: "income" as const,
      nextDueDate: nextDueDate(entry),
    }))
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate));

  const totalCash = accounts
    .filter((account) => account.kind === "asset")
    .reduce((sum, account) => sum + (Number(account.amount) || 0), 0);
  const totalDebt = accounts
    .filter((account) => account.kind === "liability")
    .reduce((sum, account) => sum + (Number(account.amount) || 0), 0);
  const knownIncomeCategories = Array.from(
    new Set(income.map((entry) => entry.category).filter(Boolean))
  ).sort();
  const knownExpenseCategories = Array.from(
    new Set(expenses.map((entry) => entry.category).filter(Boolean))
  ).sort();

  return {
    monthly,
    currentIncome: income
      .filter((entry) => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    currentExpenses: expenses
      .filter((entry) => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0) + currSubscriptionOutflow,
    income,
    expenses,
    subscriptions,
    recentIncome: income.slice(0, 6),
    recentExpenses: expenses.slice(0, 6),
    expenseCategoryDeltas,
    recurringExpenses,
    recurringIncome,
    accounts,
    totalCash,
    totalDebt,
    netWorth: totalCash - totalDebt,
    knownIncomeCategories,
    knownExpenseCategories,
    error:
      incomeRes.error?.message ??
      expensesRes.error?.message ??
      accountsRes.error?.message ??
      subscriptionsRes.error?.message ??
      null,
  };
}

function nextDueDate(entry: FinanceEntry) {
  if (entry.next_due_date) return entry.next_due_date;

  const interval = entry.recurring_interval ?? "monthly";
  const dueDate = new Date(`${entry.date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (dueDate < today) {
    if (interval === "weekly") dueDate.setDate(dueDate.getDate() + 7);
    if (interval === "monthly") dueDate.setMonth(dueDate.getMonth() + 1);
    if (interval === "yearly") dueDate.setFullYear(dueDate.getFullYear() + 1);
  }

  return dueDate.toISOString().slice(0, 10);
}
