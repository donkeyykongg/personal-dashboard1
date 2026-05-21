import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BrainBriefing, BrainPage } from "@/lib/supabase/types";
import { BrainPageClient } from "./brain-page-client";

export const dynamic = "force-dynamic";

export default async function BrainPageDetail({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [pageRes, childrenRes, briefingRes] = await Promise.all([
    supabase.from("brain_pages").select("*").eq("id", params.id).maybeSingle(),
    supabase
      .from("brain_pages")
      .select("*")
      .eq("parent_id", params.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("brain_briefings")
      .select("*")
      .eq("page_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const page = pageRes.data as BrainPage | null;
  if (!page) notFound();

  const children = (childrenRes.data ?? []) as BrainPage[];
  const latestBriefing = (briefingRes.data ?? null) as BrainBriefing | null;

  // Walk up the parent chain (cap at 8 hops to avoid pathological loops).
  const ancestors: BrainPage[] = [];
  let cursor: string | null = page.parent_id;
  for (let i = 0; i < 8 && cursor; i++) {
    const { data } = await supabase
      .from("brain_pages")
      .select("*")
      .eq("id", cursor)
      .maybeSingle();
    if (!data) break;
    const node = data as BrainPage;
    ancestors.push(node);
    cursor = node.parent_id;
  }
  const parent = ancestors[0] ?? null;

  return (
    <BrainPageClient
      page={page}
      parent={parent}
      ancestors={ancestors}
      children={children}
      latestBriefing={latestBriefing}
    />
  );
}
