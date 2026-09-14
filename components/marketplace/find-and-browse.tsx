"use client";

import { useState } from "react";

import { FindTradesmanChat } from "@/components/marketplace/find-tradesman-chat";
import { SearchResults } from "@/components/marketplace/search-results";
import type { MarketplaceCategory, TradeType } from "@/lib/api";

/**
 * The chat and the plain filtered list are mutually exclusive once the chat
 * has an answer: showing both at once (a "here's 5, but here's also all 5
 * again below") reads as clutter, not choice. `SearchResults` only mounts
 * while the chat hasn't produced a recommendation yet; "Start over" in the
 * chat brings it back.
 */
export function FindAndBrowse({
  category,
  location,
  town,
  categories,
}: {
  category: TradeType;
  location: string;
  town: string;
  categories: MarketplaceCategory[];
}) {
  const [chatHasResults, setChatHasResults] = useState(false);

  return (
    <>
      <FindTradesmanChat
        category={category}
        location={location}
        town={town}
        categories={categories}
        onResultsChange={setChatHasResults}
      />
      {!chatHasResults ? (
        <SearchResults
          category={category}
          location={location}
          categories={categories}
        />
      ) : null}
    </>
  );
}
