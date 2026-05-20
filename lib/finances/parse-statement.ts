// lib/finances/parse-statement.ts
import { getAnthropic, STATEMENT_PARSER_MODEL } from "@/lib/anthropic";

export type ParsedTransaction = {
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
};

const CATEGORIES = [
  "Dining",
  "Coffee & Drinks",
  "Groceries",
  "Transit",
  "AI & Tech",
  "Subscriptions",
  "Shopping",
  "Rent",
  "Salary",
  "Transfer",
  "Other",
] as const;

const SYSTEM_PROMPT = `You parse bank/credit-card statements into structured JSON. Extract every transaction. Categorize each one into ONE of these categories: ${CATEGORIES.join(", ")}. Use "income" for credits/deposits and "expense" for debits/charges. Dates must be ISO YYYY-MM-DD. Amounts are positive numbers (the type field indicates direction). Hints for known merchants: TST-, "burger king", "mcdonald" → Dining; "starbucks", "coffee", "cafe" → Coffee & Drinks; "presto", "uber", "lyft" → Transit; "claude.ai", "anthropic", "openai", "github", "vercel" → AI & Tech; "loblaws", "metro", "no frills", "real canadian" → Groceries.`;

export async function parseStatement(input: {
  text?: string;
  pdfBase64?: string;
}): Promise<ParsedTransaction[]> {
  const client = getAnthropic();

  const userBlocks: any[] = [];
  if (input.pdfBase64) {
    userBlocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: input.pdfBase64 },
    });
  }
  if (input.text) {
    userBlocks.push({ type: "text", text: input.text });
  }
  if (userBlocks.length === 0) {
    throw new Error("No input provided");
  }

  const response = await client.messages.create({
    model: STATEMENT_PARSER_MODEL,
    max_tokens: 8192,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [
      {
        name: "save_transactions",
        description: "Save the parsed transactions",
        input_schema: {
          type: "object",
          properties: {
            transactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string", description: "YYYY-MM-DD" },
                  description: { type: "string" },
                  category: { type: "string", enum: [...CATEGORIES] },
                  amount: { type: "number", description: "Positive number" },
                  type: { type: "string", enum: ["income", "expense"] },
                },
                required: ["date", "description", "category", "amount", "type"],
              },
            },
          },
          required: ["transactions"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "save_transactions" },
    messages: [{ role: "user", content: userBlocks }],
  });

  const toolUse = response.content.find((c: any) => c.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a tool_use block");
  }
  const transactions = (toolUse.input as { transactions: ParsedTransaction[] }).transactions || [];
  return transactions;
}
