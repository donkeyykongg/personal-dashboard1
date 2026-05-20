// app/finances/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NwCategory, Subscription, BillingCycle } from "@/lib/supabase/types";
import { writeActivity, maybeSnapshot, grandTotal } from "@/lib/finances/net-worth";

async function refreshSnapshot() {
  const supabase = createClient();
  const { data } = await supabase.from("financial_accounts").select("amount");
  const total = grandTotal((data ?? []) as { amount: number }[] as any);
  await maybeSnapshot(supabase, total);
}

export async function addAccount(input: {
  name: string;
  amount_chf: number;
  nw_category: NwCategory;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("financial_accounts")
    .insert({
      name: input.name,
      amount: input.amount_chf,
      nw_category: input.nw_category,
      kind: "asset",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  await writeActivity(supabase, {
    account_id: data.id,
    account_name: data.name,
    nw_category: input.nw_category,
    delta_chf: input.amount_chf,
    kind: "add",
  });
  await refreshSnapshot();
  revalidatePath("/finances");
}

export async function updateAccount(input: {
  id: string;
  name?: string;
  amount_chf?: number;
}) {
  const supabase = createClient();
  const { data: existing, error: readErr } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("id", input.id)
    .single();
  if (readErr || !existing) throw new Error(readErr?.message ?? "Account not found");

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.amount_chf !== undefined) patch.amount = input.amount_chf;

  const { error } = await supabase.from("financial_accounts").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);

  if (input.amount_chf !== undefined) {
    const delta = input.amount_chf - Number(existing.amount);
    if (Math.abs(delta) > 0.005) {
      await writeActivity(supabase, {
        account_id: existing.id,
        account_name: input.name ?? existing.name,
        nw_category: existing.nw_category,
        delta_chf: delta,
        kind: "edit",
      });
    }
  }
  await refreshSnapshot();
  revalidatePath("/finances");
}

export async function deleteAccount(id: string) {
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("financial_accounts")
    .select("*")
    .eq("id", id)
    .single();
  const { error } = await supabase.from("financial_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  if (existing) {
    await writeActivity(supabase, {
      account_id: null,
      account_name: existing.name,
      nw_category: existing.nw_category,
      delta_chf: -(Number(existing.amount) || 0),
      kind: "delete",
    });
  }
  await refreshSnapshot();
  revalidatePath("/finances");
}

function rollNextRenewal(iso: string, cycle: BillingCycle): string {
  const d = new Date(`${iso}T00:00`);
  if (cycle === "weekly") d.setDate(d.getDate() + 7);
  else if (cycle === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function addSubscription(input: {
  name: string;
  amount_chf: number;
  entered_amount: number;
  entered_currency: string;
  billing_cycle: BillingCycle;
  next_renewal: string | null;
  from_account_id: string | null;
  auto_deduct: boolean;
}) {
  const supabase = createClient();
  // billing_date keeps day-of-month for legacy compatibility
  let billing_date = 1;
  if (input.next_renewal) {
    const d = new Date(`${input.next_renewal}T00:00`);
    billing_date = d.getDate();
  }
  const { error } = await supabase.from("subscriptions").insert({
    name: input.name,
    amount: input.amount_chf,
    billing_date,
    billing_cycle: input.billing_cycle,
    category: "personal",
    active: true,
    next_renewal: input.next_renewal,
    from_account_id: input.from_account_id,
    auto_deduct: input.auto_deduct,
    entered_amount: input.entered_amount,
    entered_currency: input.entered_currency,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/finances");
}

export async function updateSubscription(input: {
  id: string;
  name?: string;
  amount_chf?: number;
  entered_amount?: number;
  entered_currency?: string;
  billing_cycle?: BillingCycle;
  next_renewal?: string | null;
  from_account_id?: string | null;
  auto_deduct?: boolean;
}) {
  const supabase = createClient();
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.amount_chf !== undefined) patch.amount = input.amount_chf;
  if (input.entered_amount !== undefined) patch.entered_amount = input.entered_amount;
  if (input.entered_currency !== undefined) patch.entered_currency = input.entered_currency;
  if (input.billing_cycle !== undefined) patch.billing_cycle = input.billing_cycle;
  if (input.next_renewal !== undefined) patch.next_renewal = input.next_renewal;
  if (input.from_account_id !== undefined) patch.from_account_id = input.from_account_id;
  if (input.auto_deduct !== undefined) patch.auto_deduct = input.auto_deduct;
  const { error } = await supabase.from("subscriptions").update(patch).eq("id", input.id);
  if (error) throw new Error(error.message);
  revalidatePath("/finances");
}

export async function deleteSubscription(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/finances");
}

export async function processAutoDeductSubs(): Promise<{ deducted: number }> {
  const supabase = createClient();
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("active", true)
    .eq("auto_deduct", true);
  if (!subs || subs.length === 0) return { deducted: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let deducted = 0;

  for (const sub of subs as Subscription[]) {
    if (!sub.next_renewal || !sub.from_account_id) continue;
    let renewal = new Date(`${sub.next_renewal}T00:00`);
    let safety = 0;

    while (renewal.getTime() <= today.getTime() && safety++ < 200) {
      const renewalMs = renewal.getTime();
      const alreadyDeducted = sub.last_deducted_at && new Date(sub.last_deducted_at).getTime() >= renewalMs;
      if (!alreadyDeducted) {
        const { data: acct } = await supabase
          .from("financial_accounts")
          .select("*")
          .eq("id", sub.from_account_id)
          .single();
        if (!acct) break;
        const newAmount = (Number(acct.amount) || 0) - (Number(sub.amount) || 0);
        await supabase.from("financial_accounts").update({ amount: newAmount }).eq("id", acct.id);
        await writeActivity(supabase, {
          account_id: acct.id,
          account_name: acct.name,
          nw_category: acct.nw_category,
          delta_chf: -(Number(sub.amount) || 0),
          kind: "edit",
        });
        deducted++;
        sub.last_deducted_at = new Date().toISOString();
      }
      const nextIso = rollNextRenewal(
        `${renewal.getFullYear()}-${String(renewal.getMonth() + 1).padStart(2, "0")}-${String(renewal.getDate()).padStart(2, "0")}`,
        sub.billing_cycle
      );
      renewal = new Date(`${nextIso}T00:00`);
      sub.next_renewal = nextIso;
    }

    await supabase
      .from("subscriptions")
      .update({
        next_renewal: sub.next_renewal,
        last_deducted_at: sub.last_deducted_at,
      })
      .eq("id", sub.id);
  }

  if (deducted > 0) {
    const { data: accts } = await supabase.from("financial_accounts").select("amount");
    const total = (accts ?? []).reduce(
      (s: number, a: { amount: number }) => s + (Number(a.amount) || 0),
      0
    );
    await maybeSnapshot(supabase, total);
    revalidatePath("/finances");
  }
  return { deducted };
}
