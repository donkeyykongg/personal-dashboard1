import { createClient } from "@/lib/supabase/server";
import type { BrainPage } from "@/lib/supabase/types";
import { BrainIndexClient } from "./brain-index-client";

export const dynamic = "force-dynamic";

function daysSince(iso: string): number {
  const then = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - then.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default async function BrainPage() {
  const supabase = createClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [pagesRes, briefingsRes] = await Promise.all([
    supabase
      .from("brain_pages")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabase
      .from("brain_briefings")
      .select("id, page_id, created_at"),
  ]);

  const pages = (pagesRes.data ?? []) as BrainPage[];
  const briefings = (briefingsRes.data ?? []) as Array<{
    id: string;
    page_id: string;
    created_at: string;
  }>;

  const entities = pages.filter((p) => p.parent_id === null);

  const childrenByParent = new Map<string, BrainPage[]>();
  pages.forEach((p) => {
    if (p.parent_id) {
      const list = childrenByParent.get(p.parent_id) ?? [];
      list.push(p);
      childrenByParent.set(p.parent_id, list);
    }
  });

  const briefingCountByPage = new Map<string, number>();
  briefings.forEach((b) => {
    briefingCountByPage.set(b.page_id, (briefingCountByPage.get(b.page_id) ?? 0) + 1);
  });

  const entityData = entities.map((page) => {
    const children = childrenByParent.get(page.id) ?? [];
    const todayCount = children.filter(
      (c) => new Date(c.updated_at) >= todayStart
    ).length;
    const lastEditedIso = [page.updated_at, ...children.map((c) => c.updated_at)]
      .sort()
      .reverse()[0];
    return {
      page,
      openCount: children.length,
      briefingCount: briefingCountByPage.get(page.id) ?? 0,
      todayCount,
      lastEditedDays: lastEditedIso ? daysSince(lastEditedIso) : null,
    };
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="rowan-eyebrow">Brain // Cockpit</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
          Brain
        </h1>
      </header>

      <BrainIndexClient entities={entityData} />
    </div>
  );
}
