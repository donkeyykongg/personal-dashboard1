import { NextResponse, type NextRequest } from "next/server";
import { gatherAssistantContext } from "@/lib/assistant/context";
import { runAssistantCommand } from "@/lib/assistant/command";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { input?: string };
  try {
    body = (await req.json()) as { input?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = body.input?.trim();
  if (!input) return NextResponse.json({ error: "Input is required" }, { status: 400 });

  const context = await gatherAssistantContext(supabase);
  const result = await runAssistantCommand(input, context);
  return NextResponse.json(result);
}

