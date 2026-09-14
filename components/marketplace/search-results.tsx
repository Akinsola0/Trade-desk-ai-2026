"use client";

import { useCallback, useState } from "react";
import { Search } from "lucide-react";

import { ListingCard } from "@/components/marketplace/listing-card";
import { iconForCategory } from "@/components/marketplace/photo-tile";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAsync } from "@/hooks/use-async";
import {
  searchListings,
  type MarketplaceCategory,
  type SearchListingsInput,
  type TradeType,
} from "@/lib/api";

export function SearchResults({
  category,
  location,
  categories,
}: {
  category: TradeType;
  location: string;
  categories: MarketplaceCategory[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] =
    useState<NonNullable<SearchListingsInput["sort"]>>("recommended");
  const [minRating, setMinRating] = useState("0");
  const [only247, setOnly247] = useState(false);

  const { data, error, loading, reload } = useAsync(
    useCallback(
      () =>
        searchListings({
          category,
          location,
          query,
          sort,
          min_rating: Number(minRating) || undefined,
          answers_24_7: only247 || undefined,
        }),
      [category, location, query, sort, minRating, only247],
    ),
  );

  return (
    <>
      <Card className="mb-5 py-4">
        <CardContent className="grid gap-3 px-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
          <div className="grid gap-1.5">
            <Label
              htmlFor="listing-search"
              className="text-muted-foreground text-xs font-medium"
            >
              Search these results
            </Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="listing-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. boiler service, EV charger"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="listing-sort"
              className="text-muted-foreground text-xs font-medium"
            >
              Sort by
            </Label>
            <Select
              value={sort}
              onValueChange={(value) =>
                setSort(value as NonNullable<SearchListingsInput["sort"]>)
              }
            >
              <SelectTrigger id="listing-sort" className="w-full md:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recommended">Recommended</SelectItem>
                <SelectItem value="rating">Highest rated</SelectItem>
                <SelectItem value="price">Lowest starting price</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="listing-rating"
              className="text-muted-foreground text-xs font-medium"
            >
              Minimum rating
            </Label>
            <Select value={minRating} onValueChange={setMinRating}>
              <SelectTrigger id="listing-rating" className="w-full md:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any rating</SelectItem>
                <SelectItem value="4">4.0 and up</SelectItem>
                <SelectItem value="4.5">4.5 and up</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pb-2 md:pb-2.5">
            <Switch
              id="listing-247"
              checked={only247}
              onCheckedChange={setOnly247}
            />
            <Label htmlFor="listing-247" className="text-sm">
              Answers 24/7
            </Label>
          </div>
        </CardContent>
      </Card>

      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {loading && !data ? <LoadingRows rows={3} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          title="Nobody matches those filters yet"
          description="Try clearing a filter, or look at a nearby town below."
        />
      ) : null}

      {data && data.length > 0 ? (
        <>
          <p className="text-muted-foreground mb-3 text-sm">
            {data.length} {data.length === 1 ? "tradesman" : "tradespeople"}{" "}
            available
          </p>
          <ul className="space-y-4">
            {data.map((listing) => (
              <li key={listing.slug}>
                <ListingCard
                  listing={listing}
                  icon={iconForCategory(listing.categories, categories)}
                />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}
