import type { SupabaseClient } from "@supabase/supabase-js";
import type { FinanceEntry, FinancialAccount } from "@/lib/supabase/types";

export type MonthlyFinancePoint = {
  month: string;
  income: number;
  expenses: number;
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

export async function getFinanceOverview(supabase: SupabaseClient) {
  const start = monthStart(11);
  const startDate = start.toISOString().slice(0, 10);

  const [incomeRes, expensesRes, accountsRes] = await Promise.all([
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
  ]);

  const income = (incomeRes.data ?? []) as FinanceEntry[];
  const expenses = (expensesRes.data ?? []) as FinanceEntry[];
  const accounts = (accountsRes.data ?? []) as FinancialAccount[];
  const buckets = new Map<string, MonthlyFinancePoint>();

  for (let i = 0; i < 12; i += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() + i);
    const key = monthKey(date);
    buckets.set(key, { month: monthLabel(key), income: 0, expenses: 0 });
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

  const currentMonth = monthKey(new Date());
  const monthly = Array.from(buckets.values());
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

  return {
    monthly,
    currentIncome: income
      .filter((entry) => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    currentExpenses: expenses
      .filter((entry) => entry.date.startsWith(currentMonth))
      .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0),
    recentIncome: income.slice(0, 6),
    recentExpenses: expenses.slice(0, 6),
    recurringExpenses,
    recurringIncome,
    accounts,
    totalCash,
    totalDebt,
    netWorth: totalCash - totalDebt,
    error:
      incomeRes.error?.message ??
      expensesRes.error?.message ??
      accountsRes.error?.message ??
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
