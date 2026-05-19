import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createClient();
  await supabase.from("oauth_tokens").delete().eq("provider", "outlook");
  return NextResponse.json({ ok: true });
}
