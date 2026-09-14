import { CategoryIcon } from "@/components/marketing/category-icon";
import { cn } from "@/lib/utils";
import type { MarketplaceCategory, TradeType } from "@/lib/api";

/**
 * Stands in for a listing photo.
 *
 * TODO(backend): `photo_urls` is empty until the Supabase Storage bucket
 * exists. Send us the URL pattern and we'll add it to `next.config.ts`
 * (`images.remotePatterns`) and render the real photo here.
 */
export function PhotoTile({
  name,
  category,
  categories,
  className,
}: {
  name: string;
  /** Icon name from `MarketplaceCategory.icon`. */
  category?: string;
  categories?: TradeType[];
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");

  return (
    <div
      aria-hidden
      className={cn(
        "bg-secondary text-foreground flex items-center justify-center gap-2 rounded border",
        className,
      )}
    >
      {category ? (
        <CategoryIcon name={category} className="size-5 opacity-80" />
      ) : null}
      <span className="display text-xl">{initials}</span>
      <span className="sr-only">{categories?.join(", ")}</span>
    </div>
  );
}

/** Maps a listing's first category to the icon name the grid uses. */
export function iconForCategory(
  categories: TradeType[],
  allCategories: MarketplaceCategory[],
) {
  const match = allCategories.find((item) => item.slug === categories[0]);
  return match?.icon ?? "Wrench";
}
