// lib/finances/net-worth.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  FinancialAccount,
  NwActivity,
  NwActivityKind,
  NwCategory,
  NwSnapshot,
  Subscription,
} from "@/lib/supabase/types";

export type NetWorthData = {
  accounts: FinancialAccount[];
  activity: NwActivity[];
  snapshots: NwSnapshot[];
};

export async function getNetWorthData(supabase: SupabaseClient): Promise<NetWorthData> {
  const [accountsRes, activityRes, snapshotsRes] = await Promise.all([
    supabase
      .from("financial_accounts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("nw_activity")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("nw_snapshots")
      .select("*")
      .order("captured_at", { ascending: true })
      .limit(500),
  ]);
  return {
    accounts: (accountsRes.data ?? []) as FinancialAccount[],
    activity: (activityRes.data ?? []) as NwActivity[],
    snapshots: (snapshotsRes.data ?? []) as NwSnapshot[],
  };
}

// Debt accounts are stored as positive balances (what you owe) but subtract
// from net worth — so grandTotal flips the sign when nw_category === "debt".
export function signedAmount(account: { amount: number | string; nw_category: NwCategory }): number {
  const v = Number(account.amount) || 0;
  return account.nw_category === "debt" ? -v : v;
}

export function grandTotal(accounts: FinancialAccount[]): number {
  return accounts.reduce((sum, a) => sum + signedAmount(a), 0);
}

// Signed total for a category — debt comes back negative, others positive.
export function totalByCategory(accounts: FinancialAccount[], category: NwCategory): number {
  return accounts
    .filter((a) => a.nw_category === category)
    .reduce((sum, a) => sum + signedAmount(a), 0);
}

export function monthlyEquivalentCHF(sub: Subscription): number {
  const amt = Number(sub.amount) || 0;
  switch (sub.billing_cycle) {
    case "weekly":
      return amt * 4.345;
    case "yearly":
      return amt / 12;
    case "monthly":
    default:
      return amt;
  }
}

export async function writeActivity(
  supabase: SupabaseClient,
  row: {
    account_id: string | null;
    account_name: string;
    nw_category: NwCategory;
    delta_chf: number;
    kind: NwActivityKind;
  }
): Promise<void> {
  await supabase.from("nw_activity").insert(row);
}

export async function maybeSnapshot(supabase: SupabaseClient, totalChf: number): Promise<void> {
  const { data } = await supabase
    .from("nw_snapshots")
    .select("total_chf")
    .order("captured_at", { ascending: false })
    .limit(1);
  const last = data?.[0]?.total_chf as number | undefined;
  if (last !== undefined && Math.abs(last - totalChf) < 0.005) return;
  await supabase.from("nw_snapshots").insert({ total_chf: totalChf });
}
