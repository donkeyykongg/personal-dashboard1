"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generatePageBriefing } from "@/lib/brain/briefing";
import type { BrainPage } from "@/lib/supabase/types";

export async function createPage(input: {
  title: string;
  parentId: string | null;
  icon?: string | null;
}) {
  const title = input.title.trim();
  if (!title) return { ok: false as const, error: "Title required" };

  const supabase = createClient();
  const { data: siblings } = await supabase
    .from("brain_pages")
    .select("sort_order")
    .is("parent_id", input.parentId ?? null)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextSort = ((siblings?.[0]?.sort_order as number | undefined) ?? -1) + 1;

  const { data, error } = await supabase
    .from("brain_pages")
    .insert({
      title,
      parent_id: input.parentId,
      icon: input.icon ?? null,
      sort_order: nextSort,
    })
    .select("*")
    .single();

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/brain");
  if (input.parentId) revalidatePath(`/brain/${input.parentId}`);
  return { ok: true as const, page: data as BrainPage };
}

export async function updatePage(
  id: string,
  patch: Partial<Pick<BrainPage, "title" | "icon" | "status_dot" | "content_md">>
) {
  const supabase = createClient();
  const { error } = await supabase.from("brain_pages").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/brain");
  revalidatePath(`/brain/${id}`);
  return { ok: true as const };
}

export async function deletePage(id: string) {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("brain_pages")
    .select("parent_id")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("brain_pages").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/brain");
  const parentId = row?.parent_id as string | null | undefined;
  if (parentId) revalidatePath(`/brain/${parentId}`);
  return { ok: true as const };
}

export async function generateBriefing(pageId: string) {
  const supabase = createClient();

  const [pageRes, childrenRes] = await Promise.all([
    supabase.from("brain_pages").select("*").eq("id", pageId).single(),
    supabase
      .from("brain_pages")
      .select("*")
      .eq("parent_id", pageId)
      .order("sort_order", { ascending: true }),
  ]);

  if (pageRes.error || !pageRes.data) {
    return { ok: false as const, error: pageRes.error?.message ?? "Page not found" };
  }

  const page = pageRes.data as BrainPage;
  const children = (childrenRes.data ?? []) as BrainPage[];

  const { summary, model } = await generatePageBriefing(page, children);

  const { error } = await supabase.from("brain_briefings").insert({
    page_id: pageId,
    summary,
    model,
  });
  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/brain/${pageId}`);
  return { ok: true as const, summary, model };
}
