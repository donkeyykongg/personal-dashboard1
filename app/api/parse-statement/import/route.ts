import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParsedTransaction } from "@/lib/finances/parse-statement";

type Row = ParsedTransaction & { isBusiness: boolean };

export const runtime = "nodejs";

function normalizeDesc(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
}

function amountsMatch(a: number, b: number): boolean {
  const big = Math.max(Math.abs(a), Math.abs(b));
  const tolerance = big >= 100 ? 5 : 0.01;
  return Math.abs(a - b) <= tolerance;
}

function isDuplicate(
  row: { date: string; description: string; amount: number },
  existing: { date: string; item: string | null; amount: number }[]
): boolean {
  const key = normalizeDesc(row.description);
  return existing.some(
    (e) =>
      e.date === row.date &&
      normalizeDesc(e.item ?? "") === key &&
      amountsMatch(Number(e.amount), row.amount)
  );
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { rows?: Row[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const dates = rows.map((r) => r.date).filter(Boolean).sort();
  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];

  const [existingExpRes, existingIncRes] = await Promise.all([
    supabase.from("expenses").select("date,item,amount").gte("date", minDate).lte("date", maxDate),
    supabase.from("income").select("date,item,amount").gte("date", minDate).lte("date", maxDate),
  ]);
  const existingExp = (existingExpRes.data ?? []) as { date: string; item: string | null; amount: number }[];
  const existingInc = (existingIncRes.data ?? []) as { date: string; item: string | null; amount: number }[];

  let skipped = 0;
  const expenses: any[] = [];
  const incomes: any[] = [];

  for (const r of rows) {
    if (r.type === "expense") {
      if (isDuplicate({ date: r.date, description: r.description, amount: r.amount }, existingExp)) {
        skipped++;
        continue;
      }
      expenses.push({
        item: r.description,
        category: r.category,
        amount: r.amount,
        date: r.date,
        is_business: r.isBusiness,
        notes: null,
      });
      existingExp.push({ date: r.date, item: r.description, amount: r.amount });
    } else {
      if (isDuplicate({ date: r.date, description: r.description, amount: r.amount }, existingInc)) {
        skipped++;
        continue;
      }
      incomes.push({
        item: r.description,
        category: r.category,
        amount: r.amount,
        date: r.date,
        notes: null,
      });
      existingInc.push({ date: r.date, item: r.description, amount: r.amount });
    }
  }

  let inserted = 0;
  if (expenses.length) {
    const { error, count } = await supabase
      .from("expenses")
      .insert(expenses, { count: "exact" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted += count ?? expenses.length;
  }
  if (incomes.length) {
    const { error, count } = await supabase
      .from("income")
      .insert(incomes, { count: "exact" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    inserted += count ?? incomes.length;
  }

  return NextResponse.json({ inserted, skipped });
}
