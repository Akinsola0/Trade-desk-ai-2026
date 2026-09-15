import Link from "next/link";

import { PhotoTile } from "@/components/marketplace/photo-tile";
import { TrustBlock } from "@/components/marketplace/trust-block";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatEuro } from "@/lib/format";
import { tradeTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { MarketplaceListing } from "@/lib/api";

export function ListingCard({
  listing,
  icon,
  hrefSuffix = "",
  dark = false,
}: {
  listing: MarketplaceListing;
  /** lucide icon name for the listing's first category. */
  icon: string;
  /**
   * Appended to every link to `/pro/[slug]` — used by the "find a
   * tradesman" chat to carry its answers through as a query string, so the
   * contact form on the other end can pre-fill itself.
   */
  hrefSuffix?: string;
  /**
   * Alternates every other card onto the same olive-gradient panel used for
   * the business side of `AudienceSplit` — `.band-dark`'s token overrides
   * recolour the Card, Badge and TrustBlock automatically, so only the
   * background itself (this gradient) and the primary button (switched to
   * the white "invert" variant, same as that panel) need to change here.
   */
  dark?: boolean;
}) {
  return (
    <Card
      className={cn("py-5", dark && "band-dark")}
      style={
        dark
          ? { backgroundImage: "linear-gradient(160deg, #6f6535, #3f3a20)" }
          : undefined
      }
    >
      <CardContent className="flex flex-col gap-4 px-5 sm:flex-row">
        <PhotoTile
          name={listing.business_name}
          category={icon}
          categories={listing.categories}
          className="h-24 w-full shrink-0 sm:h-20 sm:w-20"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="display text-2xl">
                <Link
                  href={`/pro/${listing.slug}${hrefSuffix}`}
                  className="rounded underline-offset-4 hover:underline"
                >
                  {listing.business_name}
                </Link>
              </h3>
              <p className="text-muted-foreground text-sm">
                {listing.headline}
              </p>
            </div>

            {listing.from_price_cents !== null ? (
              <p className="text-right">
                <span className="text-muted-foreground block text-xs">
                  From
                </span>
                <span className="text-lg font-semibold">
                  {formatEuro(listing.from_price_cents)}
                </span>
              </p>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {listing.categories.map((category) => (
              <Badge key={category} variant="secondary">
                {tradeTypeLabels[category]}
              </Badge>
            ))}
            {listing.answers_24_7 ? (
              <Badge
                variant="outline"
                className="border-ink/25 bg-hivis text-ink"
              >
                Answers 24/7
              </Badge>
            ) : null}
          </div>

          <TrustBlock
            className="mt-3"
            size="sm"
            verified={listing.verified}
            rating={listing.rating}
            reviewCount={listing.review_count}
            respondsWithinMinutes={listing.responds_within_minutes}
          />

          <p className="text-muted-foreground mt-2 text-sm">
            Covers {listing.service_area}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild size="sm" variant={dark ? "invert" : "default"}>
              <Link href={`/pro/${listing.slug}${hrefSuffix}`}>
                See profile and prices
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href={`/pro/${listing.slug}${hrefSuffix}#contact`}>
                Request a callback
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
