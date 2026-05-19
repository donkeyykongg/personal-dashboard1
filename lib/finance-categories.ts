export const EXPENSE_TREE: Record<string, string[]> = {
  Housing: ["Rent", "Utilities", "Internet", "Repairs"],
  Food: ["Groceries", "Dining out", "Coffee", "Delivery"],
  Transport: ["Transit", "Rideshare", "Gas", "Parking"],
  Subscriptions: ["Streaming", "Software", "Memberships"],
  Health: ["Medical", "Pharmacy", "Fitness"],
  Entertainment: ["Events", "Hobbies", "Travel"],
  Shopping: ["Clothing", "Electronics", "Home", "Gifts"],
  Other: ["Other"],
};

export const INCOME_TREE: Record<string, string[]> = {
  Salary: ["Salary", "Bonus"],
  Freelance: ["Client work", "Royalty"],
  Investment: ["Dividend", "Interest", "Capital gain"],
  Gift: ["Gift"],
  Other: ["Other"],
};

export type EntryKind = "income" | "expense";

export function treeFor(kind: EntryKind) {
  return kind === "income" ? INCOME_TREE : EXPENSE_TREE;
}
