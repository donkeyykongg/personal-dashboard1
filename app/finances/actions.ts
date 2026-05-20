// app/finances/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { NwCategory } from "@/lib/supabase/types";
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
