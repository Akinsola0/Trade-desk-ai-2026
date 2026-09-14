import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryIcon } from "@/components/marketing/category-icon";
import { formatEuro } from "@/lib/format";
import type { MarketplaceCategory } from "@/lib/api";

/**
 * Category-first browsing with the indicative price shown up front — a
 * homeowner can see roughly what a job costs before they talk to anybody.
 */
export function CategoryGrid({
  categories,
  defaultLocation,
}: {
  categories: MarketplaceCategory[];
  /** Where the grid sends people before they pick a town of their own. */
  defaultLocation: string;
}) {
  return (
    <section
      id="browse"
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">The marketplace</p>
          <h2 className="display mt-3 text-3xl sm:text-4xl">Browse by trade</h2>
          <p className="text-muted-foreground mt-3 max-w-xl">
            Indicative prices from tradespeople on TradeDesk AI. Real quote
            comes from them — but you shouldn&apos;t have to ring five people to
            find out the going rate.
          </p>
        </div>
        <Link
          href="/find"
          className="text-primary group inline-flex items-center gap-1.5 rounded text-sm font-semibold hover:underline"
        >
          See all trades and towns
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/find/${category.slug}/${defaultLocation}`}
              className="group bg-card hover:border-primary/40 flex h-full flex-col gap-3 rounded-2xl border p-5 transition-colors hover:shadow-md"
            >
              <span className="bg-secondary text-primary flex size-10 items-center justify-center rounded-xl">
                <CategoryIcon name={category.icon} className="size-5" />
              </span>
              <span className="font-semibold">{category.label}</span>
              <span className="text-muted-foreground text-sm">
                From {formatEuro(category.from_price_cents)}
              </span>
              <span className="text-muted-foreground mt-auto pt-2 text-xs">
                {category.listing_count} verified{" "}
                {category.plural.toLowerCase()}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
