// app/api/parse-statement/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseStatement } from "@/lib/finances/parse-statement";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set on the server" },
      { status: 500 }
    );
  }

  let body: { text?: string; pdfBase64?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.text && !body.pdfBase64) {
    return NextResponse.json({ error: "Provide either `text` or `pdfBase64`" }, { status: 400 });
  }

  try {
    const transactions = await parseStatement(body);
    if (transactions.length === 0) {
      return NextResponse.json({ error: "No transactions found" }, { status: 422 });
    }
    return NextResponse.json({ transactions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
