/**
 * Public marketplace (Phase 2) plus the category grid and reviews the homepage
 * renders. No auth: these are the pages a homeowner sees before signing up.
 */
import { delay, mockId } from "@/lib/api/mock/store";
import { db } from "@/lib/api/mock/store";
import type { MockListing } from "@/lib/api/mock/marketplace-seed";
import {
  mockCategories,
  mockListings,
  mockLocations,
} from "@/lib/api/mock/marketplace-seed";
import type {
  CreateMarketplaceLeadInput,
  CreateMarketplaceLeadResult,
  MarketplaceCategory,
  MarketplaceListing,
  MarketplaceLocation,
  MarketplaceProfile,
  MarketplaceReview,
  RecommendTradespeopleInput,
  SearchListingsInput,
} from "@/lib/api/types";

/** Public listings carry only the card fields — never the profile's contact details. */
/** Exported for `lib/api/match-requests.ts`, which needs the same shape when
 *  looking up a fallback candidate's public listing. */
export function toListing(profile: MockListing): MarketplaceListing {
  return {
    business_id: profile.business_id,
    slug: profile.slug,
    business_name: profile.business_name,
    headline: profile.headline,
    categories: profile.categories,
    service_area: profile.service_area,
    photo_url: profile.photo_url,
    town: profile.town,
    county: profile.county,
    rating: profile.rating,
    review_count: profile.review_count,
    from_price_cents: profile.from_price_cents,
    verified: profile.verified,
    answers_24_7: profile.answers_24_7,
    responds_within_minutes: profile.responds_within_minutes,
  };
}

/**
 * Categories for the homepage grid and the `/find` breadcrumbs, each with the
 * indicative "from" price the homepage promises to show up front.
 *
 * TODO(backend): `GET /api/marketplace/categories` — `listing_count` and
 * `from_price_cents` computed from live listings, cached.
 */
export async function getCategories(): Promise<MarketplaceCategory[]> {
  return delay(mockCategories);
}

/** TODO(backend): `GET /api/marketplace/locations` — towns with at least one listing. */
export async function getLocations(): Promise<MarketplaceLocation[]> {
  return delay(mockLocations);
}

/** TODO(backend): `GET /api/marketplace/locations/[slug]`. */
export async function getLocation(
  slug: string,
): Promise<MarketplaceLocation | null> {
  return delay(
    mockLocations.find((location) => location.slug === slug) ?? null,
  );
}

/**
 * Browse results for `/find/[category]/[location]`.
 *
 * TODO(backend): `GET /api/marketplace/listings?category=&location=&…` — the
 * homeowner is not signed in, so this route is public and must not leak anything
 * beyond `MarketplaceListing`.
 */
export async function searchListings(
  input: SearchListingsInput,
): Promise<MarketplaceListing[]> {
  const query = input.query?.trim().toLowerCase() ?? "";

  const results = mockListings
    .filter((listing) => listing.categories.includes(input.category))
    .filter((listing) => listing.location_slugs.includes(input.location))
    .filter((listing) =>
      query
        ? [
            listing.business_name,
            listing.headline,
            ...listing.services.map((s) => s.name),
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true,
    )
    .filter((listing) =>
      input.min_rating ? (listing.rating ?? 0) >= input.min_rating : true,
    )
    .filter((listing) =>
      input.max_from_price_cents
        ? (listing.from_price_cents ?? Infinity) <= input.max_from_price_cents
        : true,
    )
    .filter((listing) => (input.answers_24_7 ? listing.answers_24_7 : true))
    .map(toListing);

  const sorted = [...results].sort((a, b) => {
    switch (input.sort) {
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "price":
        return (
          (a.from_price_cents ?? Infinity) - (b.from_price_cents ?? Infinity)
        );
      default:
        // Recommended: verified first, then rating, then review volume.
        return (
          Number(b.verified) - Number(a.verified) ||
          (b.rating ?? 0) - (a.rating ?? 0) ||
          b.review_count - a.review_count
        );
    }
  });

  return delay(sorted);
}

const STOPWORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "is",
  "are",
  "my",
  "it",
  "to",
  "in",
  "on",
  "at",
  "of",
  "for",
  "i",
  "we",
  "need",
  "have",
  "has",
  "got",
  "with",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * The "find a tradesman" chat's matching step: scores every listing that
 * already matches the category/location (same base set `searchListings`
 * would return) against the homeowner's free-text description, then returns
 * the top 5.
 *
 * This is a plain keyword-overlap + reputation heuristic, not real language
 * understanding — there's no model call here, only mock data. It's written
 * so the whole function can be replaced with a real ranking endpoint (or an
 * LLM-backed one) without any component changing, per the contract-first
 * rule for this file.
 *
 * TODO(backend): once there's a real matching/AI service, this becomes
 * `POST /api/marketplace/recommend` and the scoring below moves server-side.
 */
export async function recommendTradespeople(
  input: RecommendTradespeopleInput,
): Promise<MarketplaceListing[]> {
  const issueWords = words(input.issue_description);
  const urgent = /\b(asap|as soon as possible|emergency|today|now)\b/i.test(
    input.date_range ?? "",
  );

  const scored = mockListings
    .filter((listing) => listing.categories.includes(input.category))
    .filter((listing) => listing.location_slugs.includes(input.location))
    .map((listing) => {
      const haystack = words(
        [
          listing.headline,
          ...listing.services.map((s) => `${s.name} ${s.description}`),
        ].join(" "),
      );
      const overlap = issueWords.filter((word) =>
        haystack.includes(word),
      ).length;

      let score = overlap * 3;
      score += (listing.rating ?? 0) * 2;
      score += Math.min(1, listing.review_count / 100);
      if (listing.verified) score += 1;
      if (urgent && listing.answers_24_7) score += 3;
      if (
        urgent &&
        listing.responds_within_minutes !== null &&
        listing.responds_within_minutes <= 15
      ) {
        score += 1;
      }

      return { listing, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(({ listing }) => toListing(listing));

  return delay(scored, 900);
}

/**
 * A full public profile for `/pro/[slug]`, reviews included — a listing never
 * claims a review count this route can't back up.
 *
 * TODO(backend): `GET /api/marketplace/pro/[slug]`.
 */
export async function getMarketplaceProfile(
  slug: string,
): Promise<MarketplaceProfile | null> {
  const listing = mockListings.find((item) => item.slug === slug);
  if (!listing) return delay(null);

  const profile: MarketplaceProfile = {
    ...toListing(listing),
    bio: listing.bio,
    photo_urls: listing.photo_urls,
    phone: listing.phone,
    services: listing.services,
    reviews: listing.reviews,
    member_since: listing.member_since,
  };
  return delay(profile);
}

/**
 * The most recent reviews across the marketplace, for the homepage.
 *
 * TODO(backend): `GET /api/marketplace/reviews?limit=` — the homepage renders
 * real review text, so this must return the same rows `/pro/[slug]` shows.
 */
export async function getFeaturedReviews(
  limit = 3,
): Promise<
  (MarketplaceReview & { business_name: string; business_slug: string })[]
> {
  const reviews = mockListings
    .flatMap((listing) =>
      listing.reviews.map((item) => ({
        ...item,
        business_name: listing.business_name,
        business_slug: listing.slug,
      })),
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .slice(0, limit);

  return delay(reviews);
}

/**
 * A homeowner's contact/booking request. Creates a `customers` row if the phone
 * number is new, then a `leads` row with `source = "marketplace"` — which is
 * what makes it show up in that tradesman's dashboard beside the phone leads.
 *
 * TODO(backend): `POST /api/marketplace/leads` — public route, so rate-limit it
 * and verify the phone number before it reaches a tradesman's dashboard.
 */
export async function createMarketplaceLead(
  input: CreateMarketplaceLeadInput,
): Promise<CreateMarketplaceLeadResult> {
  const listing = mockListings.find(
    (item) => item.business_id === input.business_id,
  );

  const customerId = mockId("c");
  const leadId = mockId("l");

  // Keep the mock dashboard honest: a marketplace lead shows up there too.
  if (input.business_id === db.business.id) {
    db.customers.push({
      id: customerId,
      business_id: input.business_id,
      name: input.customer_name,
      phone: input.customer_phone,
      email: input.customer_email ?? null,
      address: input.customer_address ?? null,
    });
    db.leads.push({
      id: leadId,
      customer_id: customerId,
      service: input.service,
      description: input.description,
      urgency: input.urgency,
      status: "new",
      source: "marketplace",
      created_at: new Date().toISOString(),
    });
  }

  return delay(
    {
      lead_id: leadId,
      expected_response_minutes: listing?.responds_within_minutes ?? 60,
    },
    500,
  );
}
