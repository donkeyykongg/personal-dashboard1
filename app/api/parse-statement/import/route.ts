import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParsedTransaction } from "@/lib/finances/parse-statement";

type Row = ParsedTransaction & { isBusiness: boolean };

export const runtime = "nodejs";

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

  const expenses = rows
    .filter((r) => r.type === "expense")
    .map((r) => ({
      item: r.description,
      category: r.category,
      amount: r.amount,
      date: r.date,
      is_business: r.isBusiness,
      notes: null,
    }));
  const incomes = rows
    .filter((r) => r.type === "income")
    .map((r) => ({
      item: r.description,
      category: r.category,
      amount: r.amount,
      date: r.date,
      notes: null,
    }));

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

  return NextResponse.json({ inserted });
}
