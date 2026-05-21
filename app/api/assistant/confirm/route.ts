import { NextResponse, type NextRequest } from "next/server";
import { labelDraft, saveConfirmedDraft, validateDraft } from "@/lib/assistant/actions";
import type { AssistantDraft } from "@/lib/assistant/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { draft?: AssistantDraft };
  try {
    body = (await req.json()) as { draft?: AssistantDraft };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.draft) {
    return NextResponse.json({ error: "Draft is required" }, { status: 400 });
  }

  const validation = validateDraft(body.draft);
  if (validation) {
    return NextResponse.json({ error: validation }, { status: 400 });
  }

  try {
    const saved = await saveConfirmedDraft(supabase, body.draft);
    return NextResponse.json({
      ok: true,
      message: `Saved. ${labelDraft(body.draft)}`,
      saved,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save draft" },
      { status: 500 }
    );
  }
}

