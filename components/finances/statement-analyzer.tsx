"use client";

import { useMemo, useRef, useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ClipboardPaste, FileText, Image, Loader2, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";

type ParsedTransaction = {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: "income" | "expense";
  source: string;
};

const categoryRules: { category: string; keywords: string[]; color: string }[] = [
  {
    category: "Dining",
    keywords: [
      "restaurant", "burger king", "mcdonald", "subway", "fresh burrito", "campus pizza",
      "tahinis", "ye's buffet", "farah foods", "tst-", "toast", "griwaterloo",
      "a&w", "tim hortons", "kfc", "pizza", "sushi", "pho", "ramen",
    ],
    color: "#f97316",
  },
  {
    category: "Coffee & Drinks",
    keywords: [
      "math coffee", "starbucks", "second cup", "williams", "bingsu", "molly tea",
      "chatime", "gong cha", "coffee", "cafe", "donut",
    ],
    color: "#92400e",
  },
  {
    category: "Campus & Student",
    keywords: [
      "wusa", "uw athletics", "university of waterloo", "uwaterloo",
      "student union", "campus", "federation hall", "slc",
    ],
    color: "#fbbf24",
  },
  {
    category: "Groceries",
    keywords: [
      "waterloo central super", "grocery", "supermarket", "whole foods", "costco",
      "walmart", "loblaws", "metro", "no frills", "food basics", "real canadian",
      "epic snacks",
    ],
    color: "#16a34a",
  },
  {
    category: "Transit",
    keywords: [
      "presto", "metrolinx", "go transit", "ttc", "transit", "uber", "lyft",
      "grand river transit", "grt", "ion", "ixtapa", "parking",
    ],
    color: "#2563eb",
  },
  {
    category: "AI & Tech",
    keywords: [
      "claude.ai", "anthropic", "askstanley", "openai", "chatgpt",
      "cursor", "github", "vercel", "supabase", "digitalocean",
    ],
    color: "#7c3aed",
  },
  {
    category: "Subscriptions",
    keywords: [
      "apple.com/bill", "apple", "spotify", "netflix", "disney", "youtube",
      "amazon prime", "adobe", "dropbox", "notion", "subscription",
    ],
    color: "#a855f7",
  },
  {
    category: "Shopping",
    keywords: ["amazon", "amazon.ca", "ebay", "etsy", "aliexpress", "shopify", "best buy"],
    color: "#0284c7",
  },
  {
    category: "Laundry & Home",
    keywords: ["coinamatic", "coin laundry", "laundry", "hardware", "dollarama"],
    color: "#64748b",
  },
  {
    category: "Utilities & Phone",
    keywords: ["rogers", "bell", "telus", "fido", "virgin", "koodo", "hydro", "enbridge", "internet"],
    color: "#0891b2",
  },
  {
    category: "Health & Fitness",
    keywords: ["pharmacy", "shoppers", "rexall", "gym", "fitness", "goodlife"],
    color: "#059669",
  },
  {
    category: "Income",
    keywords: ["payroll", "salary", "deposit", "transfer in", "client payment", "e-transfer"],
    color: "#10b981",
  },
  {
    category: "Other",
    keywords: [],
    color: "#94a3b8",
  },
];

// Lines that are definitely NOT transactions (balance rows, headers, etc.)
const SKIP_PATTERNS = [
  /opening balance/i,
  /closing balance/i,
  /balance forward/i,
  /previous balance/i,
  /\btotal\b/i,
  /\bsubtotal\b/i,
  /minimum payment/i,
  /payment due/i,
  /account number/i,
  /statement date/i,
  /credit limit/i,
  /available credit/i,
];

export function StatementAnalyzer() {
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<{ name: string; isImage: boolean }[]>([]);
  const [pasteText, setPasteText] = useState("");
  const [pasteProcessing, setPasteProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const metrics = useMemo(() => {
    const expenses = transactions.filter((t) => t.type === "expense");
    const income = transactions.filter((t) => t.type === "income");
    const expenseTotal = expenses.reduce((s, t) => s + Math.abs(t.amount), 0);
    const incomeTotal = income.reduce((s, t) => s + Math.abs(t.amount), 0);
    const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + Math.abs(t.amount);
      return acc;
    }, {});
    const pieData = Object.entries(byCategory)
      .map(([name, value]) => ({
        name,
        value,
        color: categoryRules.find((r) => r.category === name)?.color ?? "#94a3b8",
      }))
      .sort((a, b) => b.value - a.value);

    return {
      expenseTotal,
      incomeTotal,
      net: incomeTotal - expenseTotal,
      transactionCount: transactions.length,
      pieData,
      topCategory: pieData[0]?.name ?? "None",
    };
  }, [transactions]);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;

    setIsProcessing(true);
    setError(null);

    try {
      const parsed = await Promise.all(
        selectedFiles.map(async (file) => {
          const isImage =
            file.type.startsWith("image/") ||
            /\.(png|jpe?g|webp|gif)$/i.test(file.name);

          let text: string;
          if (isImage) {
            text = await extractTextFromImage(file);
          } else {
            text = await extractTextFromFile(file);
          }
          return parseTransactions(text, file.name, isImage);
        }),
      );

      setFiles(
        selectedFiles.map((f) => ({
          name: f.name,
          isImage: f.type.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(f.name),
        })),
      );
      setTransactions(parsed.flat());
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not analyze the selected statement.",
      );
    } finally {
      setIsProcessing(false);
      event.target.value = "";
    }
  }

  function handleParsePaste() {
    const text = pasteText.trim();
    if (!text) return;
    setPasteProcessing(true);
    try {
      // Detect pipe-delimited (from Claude.ai) vs plain text
      const isPipeDelimited = text.includes("|");
      const parsed = parseTransactions(text, "pasted", isPipeDelimited);
      setTransactions((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        return [...prev, ...parsed.filter((t) => !existingIds.has(t.id))];
      });
      setFiles((prev) => [...prev, { name: "pasted text", isImage: false }]);
      setPasteText("");
    } catch {
      setError("Could not parse pasted text.");
    } finally {
      setPasteProcessing(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank statement analyzer</CardTitle>
        <p className="text-sm text-muted-foreground">
          Upload a PDF or CSV export from your bank, or paste extracted text below.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File upload */}
        <div className="grid gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border bg-background p-2">
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <div>
              <Label htmlFor="statement-upload">Upload statement</Label>
              <p className="text-xs text-muted-foreground">
                PDF or CSV exported from online banking
              </p>
            </div>
          </div>
          <Input
            id="statement-upload"
            type="file"
            accept=".csv,.txt,.pdf,text/csv,text/plain,application/pdf"
            multiple
            onChange={handleUpload}
            disabled={isProcessing}
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {f.isImage ? (
                    <Image className="h-3 w-3" />
                  ) : (
                    <FileText className="h-3 w-3" />
                  )}
                  {f.name}
                </span>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* Paste text alternative */}
        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Paste extracted text</p>
          </div>
          <p className="text-xs text-muted-foreground">
            For phone screenshots: upload the image to{" "}
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              claude.ai
            </a>{" "}
            and ask it to extract transactions as{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
              DATE | DESCRIPTION | AMOUNT
            </code>
            , then paste the result here. Also accepts plain text or CSV.
          </p>
          <textarea
            ref={textareaRef}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Mar 17 | Claude.ai Anthropic | 15.82\nMar 19 | Coinamatic | 20.25\nMar 22 | Metrolinx GO Transit | 10.00`}
            rows={4}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 font-mono text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={handleParsePaste}
            disabled={pasteProcessing || !pasteText.trim()}
            className="inline-flex h-8 items-center gap-2 rounded-md border bg-background px-3 text-xs font-medium text-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          >
            {pasteProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
            Parse & add
          </button>
        </div>

        {/* Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Expenses found" value={formatCurrency(metrics.expenseTotal)} />
          <Metric label="Income found" value={formatCurrency(metrics.incomeTotal)} />
          <Metric label="Net from upload" value={formatCurrency(metrics.net)} />
          <Metric label="Top category" value={metrics.topCategory} />
        </div>

        {/* Chart + table */}
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="h-80 rounded-lg border p-4">
            {metrics.pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Upload or paste a statement to see spending by category.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.pieData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={98}
                    paddingAngle={2}
                  >
                    {metrics.pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-lg border">
            <div className="border-b p-4">
              <h3 className="font-semibold">Classified transactions</h3>
              <p className="text-xs text-muted-foreground">
                {metrics.transactionCount} transactions detected.
              </p>
            </div>
            <div className="max-h-80 overflow-auto">
              {transactions.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No transactions detected yet.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-background text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="p-3 font-medium">Date</th>
                      <th className="p-3 font-medium">Description</th>
                      <th className="p-3 font-medium">Category</th>
                      <th className="p-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 80).map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="whitespace-nowrap p-3 font-mono text-xs text-muted-foreground">
                          {t.date}
                        </td>
                        <td className="max-w-[20rem] truncate p-3">{t.description}</td>
                        <td className="p-3">
                          <span
                            className="rounded-full px-2 py-0.5 text-xs text-white"
                            style={{
                              background:
                                categoryRules.find((r) => r.category === t.category)?.color ??
                                "#64748b",
                            }}
                          >
                            {t.category}
                          </span>
                        </td>
                        <td
                          className={`p-3 text-right font-mono text-xs font-medium ${
                            t.type === "expense" ? "text-rose-600" : "text-emerald-600"
                          }`}
                        >
                          {formatCurrency(Math.abs(t.amount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}

// ── Text extraction ────────────────────────────────────────────────────────────

async function extractTextFromImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/analyze-statement", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `Image analysis failed (${res.status})`,
    );
  }
  const { text } = (await res.json()) as { text: string };
  return text;
}

async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data }).promise;
    const pageLines: string[] = [];

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();

      // Group text items by their y-coordinate to reconstruct actual lines
      const lineMap = new Map<number, string[]>();
      for (const item of content.items) {
        if (!("str" in item) || !item.str.trim()) continue;
        // Round y to nearest 2px so items on the same visual line cluster together
        const y = Math.round((item as { transform: number[] }).transform[5] / 2) * 2;
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push(item.str);
      }

      // Sort descending by y (top of page = highest y value in PDF coords)
      const sorted = [...lineMap.entries()]
        .sort(([a], [b]) => b - a)
        .map(([, parts]) => parts.join(" ").trim())
        .filter(Boolean);

      pageLines.push(...sorted);
    }

    return pageLines.join("\n");
  }
  return file.text();
}

// ── Parsing ───────────────────────────────────────────────────────────────────

function parseTransactions(
  text: string,
  source: string,
  isPipeDelimited: boolean,
): ParsedTransaction[] {
  // Pipe-delimited: "DATE | DESCRIPTION | AMOUNT" (from Claude.ai or image API)
  if (isPipeDelimited) {
    return text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.includes("|"))
      .flatMap((line, index) => {
        const parts = line.split("|").map((p) => p.trim());
        if (parts.length < 3) return [];
        const [date, description, rawAmount] = parts;
        const amount = Number(rawAmount.replace(/[$,]/g, ""));
        if (!Number.isFinite(amount) || amount === 0) return [];
        const category = classify(description);
        const type = inferType(line, amount, category);
        return [{ id: `${source}-pipe-${index}`, date, description, category, amount, type, source }];
      });
  }

  // Plain text / PDF / CSV path
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      if (line.length < 8) return false;
      if (SKIP_PATTERNS.some((p) => p.test(line))) return false;
      return true;
    })
    .flatMap((line, index) => {
      const amount = findAmount(line);
      if (amount == null || amount === 0) return [];
      const date = findDate(line);
      const description = cleanDescription(line);
      if (!description || description.length < 2) return [];
      // Skip lines that are purely numeric after cleaning (likely account/ref numbers)
      if (/^\d[\d\s-]*$/.test(description)) return [];
      const category = classify(description);
      const type = inferType(line, amount, category);
      return [{ id: `${source}-${index}-${amount}`, date, description, category, amount, type, source }];
    });
}

function findAmount(line: string): number | null {
  // Match amounts with optional $ and commas, including "1,234.56" and "50.00"
  const matches = line.match(/-?\$?\d{1,3}(?:,\d{3})*\.\d{2}|-?\$?\d+\.\d{2}/g);
  if (!matches?.length) return null;
  const raw = matches[matches.length - 1].replace(/[$,]/g, "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function findDate(line: string): string {
  return (
    line.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] ??
    line.match(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/)?.[0] ??
    // RBC format: "Apr 1" or "Apr 01"
    line.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/i)?.[0] ??
    "Unknown"
  );
}

function cleanDescription(line: string): string {
  return line
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, "")
    .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/gi, "")
    .replace(/-?\$?\d{1,3}(?:,\d{3})*\.\d{2}|-?\$?\d+\.\d{2}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(description: string): string {
  const normalized = description.toLowerCase();
  return (
    categoryRules.find((rule) =>
      rule.keywords.some((keyword) => normalized.includes(keyword)),
    )?.category ?? "Other"
  );
}

function inferType(line: string, amount: number, category: string): "income" | "expense" {
  if (amount < 0) return "expense";
  const normalized = line.toLowerCase();
  if (
    category === "Income" ||
    normalized.includes("deposit") ||
    normalized.includes("payroll") ||
    normalized.includes("e-transfer") ||
    normalized.includes("credit")
  ) {
    return "income";
  }
  return "expense";
}
