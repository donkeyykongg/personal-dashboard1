// lib/finances/finance-tab.ts
// Server-safe helpers shared by `components/finances/finance-tabs.tsx` (client)
// and `app/finances/page.tsx` (server). Moved out of the client component so
// the server can call `parseTab` directly instead of getting an opaque
// client-reference proxy.

export const FINANCE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "net-worth", label: "Net Worth" },
  { key: "subscriptions", label: "Subscriptions" },
  { key: "cash-flow", label: "Cash Flow" },
] as const;

export type FinanceTabKey = (typeof FINANCE_TABS)[number]["key"];

export function parseTab(searchParam: string | string[] | undefined): FinanceTabKey {
  const v = Array.isArray(searchParam) ? searchParam[0] : searchParam;
  if (v === "net-worth" || v === "subscriptions" || v === "cash-flow") return v;
  return "overview";
}
