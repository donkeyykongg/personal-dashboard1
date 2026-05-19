import { Badge } from "@/components/ui/badge";
import { CATEGORY_META } from "@/lib/subscriptions";
import type { SubscriptionCategory } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

export function CategoryBadge({
  category,
  className,
}: {
  category: SubscriptionCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  return (
    <Badge variant="outline" className={cn(meta.classes, className)}>
      {meta.label}
    </Badge>
  );
}
