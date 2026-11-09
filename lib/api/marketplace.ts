/**
 * Public marketplace (Phase 2) plus the category grid and reviews the homepage
 * renders. No auth: these are the pages a homeowner sees before signing up.
 */
import { isDemoAuth } from "@/lib/api/auth";
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
  MarketplaceService,
  RecommendTradespeopleInput,
  SearchListingsInput,
  TradeType,
} from "@/lib/api/types";
import { getSupabase } from "@/lib/supabase/isomorphic";

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
 * Row shape of the `marketplace_listings` / `marketplace_profiles` views. These
 * views are the public contract (supabase/migrations/20261105120100_*): they
 * join `businesses` and aggregate `reviews` past RLS, exposing only the columns
 * the public pages render.
 */
interface ListingRow {
  business_id: string;
  slug: string;
  business_name: string;
  headline: string;
  service_area: string;
  photo_url: string | null;
  town: string;
  county: string;
  categories: TradeType[];
  from_price_cents: number | null;
  verified: boolean;
  answers_24_7: boolean;
  responds_within_minutes: number | null;
  review_count: number;
  rating: number | string | null;
  service_names: string[];
}

interface ProfileRow extends ListingRow {
  profile_id: string;
  bio: string;
  phone: string;
  photo_urls: string[] | null;
  member_since: string;
}

const LISTING_COLUMNS =
  "business_id, slug, business_name, headline, service_area, photo_url, town, county, " +
  "categories, from_price_cents, verified, answers_24_7, responds_within_minutes, " +
  "review_count, rating, service_names";

const PROFILE_COLUMNS =
  `profile_id, bio, phone, photo_urls, member_since, ${LISTING_COLUMNS}`;

const REVIEW_COLUMNS =
  "id, business_id, business_name, business_slug, rating, comment, created_at, customer_name, job_service";

/** Map a `marketplace_listings` / `marketplace_profiles` row to the card shape. */
function mapRowToListing(row: ListingRow): MarketplaceListing {
  return {
    business_id: row.business_id,
    slug: row.slug,
    business_name: row.business_name,
    headline: row.headline,
    categories: row.categories,
    service_area: row.service_area,
    photo_url: row.photo_url,
    town: row.town,
    county: row.county,
    // PostgREST can serialise `numeric` as a string depending on the client.
    rating: row.rating === null ? null : Number(row.rating),
    review_count: row.review_count,
    from_price_cents: row.from_price_cents,
    verified: row.verified,
    answers_24_7: row.answers_24_7,
    responds_within_minutes: row.responds_within_minutes,
  };
}

/**
 * Categories for the homepage grid and the `/find` breadcrumbs, each with the
 * indicative "from" price the homepage promises to show up front.
 */
export async function getCategories(): Promise<MarketplaceCategory[]> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    const { data: profiles } = await supabase.from("tradesman_profiles").select("categories, from_price_cents");

    if (!profiles || profiles.length === 0) {
      return mockCategories.map((c) => ({ ...c, listing_count: 0 }));
    }

    return mockCategories.map((cat) => {
      const matchingProfiles = profiles.filter((p) => p.categories?.includes(cat.slug));
      let from_price_cents = cat.from_price_cents;
      if (matchingProfiles.length > 0) {
        const profilesWithPrice = matchingProfiles.filter(p => p.from_price_cents != null);
        if (profilesWithPrice.length > 0) {
          const sum = profilesWithPrice.reduce((acc, p) => acc + (p.from_price_cents ?? 0), 0);
          from_price_cents = Math.round(sum / profilesWithPrice.length);
        }
      }
      return {
        ...cat,
        listing_count: matchingProfiles.length,
        from_price_cents
      };
    });
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  return delay(mockCategories);
}

/** Locations for the homepage. */
export async function getLocations(): Promise<MarketplaceLocation[]> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();
    // Since we don't have a locations table, we still rely on the static list but verify if they exist in DB.
    // For this MVP, simply returning the static array.
    return mockLocations;
  }
  return delay(mockLocations);
}

/** Fetch a single location. */
export async function getLocation(
  slug: string,
): Promise<MarketplaceLocation | null> {
  return delay(
    mockLocations.find((location) => location.slug === slug) ?? null,
  );
}

/**
 * Browse results for `/find/[category]/[location]`.
 */
export async function searchListings(
  input: SearchListingsInput,
): Promise<MarketplaceListing[]> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("marketplace_listings")
      .select(LISTING_COLUMNS)
      .contains("categories", [input.category]);

    if (error) throw new Error(error.message);

    const query = input.query?.trim().toLowerCase() ?? "";
    const loc = input.location.toLowerCase();

    const results = ((data ?? []) as unknown as ListingRow[])
      .map((row) => ({ listing: mapRowToListing(row), services: row.service_names }))
      // Approximate location filter since the DB just has town and county strings
      .filter(
        ({ listing }) =>
          loc === "all" ||
          listing.town.toLowerCase().includes(loc) ||
          listing.county.toLowerCase().includes(loc),
      )
      .filter(({ listing, services }) =>
        query
          ? [listing.business_name, listing.headline, ...services]
              .join(" ")
              .toLowerCase()
              .includes(query)
          : true,
      )
      .filter(({ listing }) =>
        input.min_rating ? (listing.rating ?? 0) >= input.min_rating : true,
      )
      .filter(({ listing }) =>
        input.max_from_price_cents
          ? (listing.from_price_cents ?? Infinity) <= input.max_from_price_cents
          : true,
      )
      .filter(({ listing }) => (input.answers_24_7 ? listing.answers_24_7 : true))
      .map(({ listing }) => listing);

    results.sort((a, b) => {
      switch (input.sort) {
        case "rating":
          return (b.rating ?? 0) - (a.rating ?? 0);
        case "price":
          return (a.from_price_cents ?? Infinity) - (b.from_price_cents ?? Infinity);
        default:
          return (
            Number(b.verified) - Number(a.verified) ||
            (b.rating ?? 0) - (a.rating ?? 0) ||
            b.review_count - a.review_count
          );
      }
    });

    return results;
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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
  "the", "a", "an", "and", "or", "is", "are", "my", "it", "to", "in", "on", "at", 
  "of", "for", "i", "we", "need", "have", "has", "got", "with",
]);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * The "find a tradesman" chat's matching step.
 */
export async function recommendTradespeople(
  input: RecommendTradespeopleInput,
): Promise<MarketplaceListing[]> {
  if (!isDemoAuth) {
    // For MVP, we can reuse searchListings and do client-side ranking, 
    // since we do a basic keyword match.
    const listings = await searchListings({
      category: input.category,
      location: input.location,
    });

    const issueWords = words(input.issue_description);
    const urgent = /\b(asap|as soon as possible|emergency|today|now)\b/i.test(
      input.date_range ?? "",
    );

    const scored = listings.map((listing) => {
      // In this client-side mockup, we don't have the services array unless we fetch it separately. 
      // We'll just score by headline.
      const haystack = words(listing.headline);
      const overlap = issueWords.filter((word) => haystack.includes(word)).length;

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
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(({ listing }) => listing);
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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
 * A full public profile for `/pro/[slug]`, reviews included.
 */
export async function getMarketplaceProfile(
  slug: string,
): Promise<MarketplaceProfile | null> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("marketplace_profiles")
      .select(PROFILE_COLUMNS)
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) return null;
    const profile = data as unknown as ProfileRow;

    const [servicesRes, reviewsRes] = await Promise.all([
      supabase
        .from("marketplace_services")
        .select("name, description, from_price_cents")
        .eq("profile_id", profile.profile_id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("marketplace_reviews")
        .select(REVIEW_COLUMNS)
        .eq("business_id", profile.business_id)
        .order("created_at", { ascending: false }),
    ]);

    if (servicesRes.error) throw new Error(servicesRes.error.message);
    if (reviewsRes.error) throw new Error(reviewsRes.error.message);

    return {
      ...mapRowToListing(profile),
      bio: profile.bio,
      photo_urls: profile.photo_urls ?? [],
      phone: profile.phone,
      services: (servicesRes.data ?? []) as MarketplaceService[],
      reviews: (reviewsRes.data ?? []) as MarketplaceReview[],
      member_since: profile.member_since,
    };
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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
 */
export async function getFeaturedReviews(
  limit = 3,
): Promise<
  (MarketplaceReview & { business_name: string; business_slug: string })[]
> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("marketplace_reviews")
      .select(REVIEW_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data as unknown as (MarketplaceReview & {
      business_name: string;
      business_slug: string;
    })[];
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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
 * A homeowner's contact/booking request.
 * Creates a `customers` row and a `leads` row using a SECURITY DEFINER function
 * to bypass RLS since the marketplace visitor is unauthenticated.
 */
export async function createMarketplaceLead(
  input: CreateMarketplaceLeadInput,
): Promise<CreateMarketplaceLeadResult> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    // 1. Fetch responds_within_minutes for the expected response time
    const { data: profile } = await supabase
      .from("tradesman_profiles")
      .select("responds_within_minutes")
      .eq("business_id", input.business_id)
      .maybeSingle();

    // 2. Call the RPC to insert customer and lead (bypassing RLS). The function
    //    validates every field and rate-limits per phone and per business, so
    //    its errors are written for the homeowner and safe to show as-is.
    const { data: leadId, error } = await supabase.rpc("create_marketplace_lead", {
      p_business_id: input.business_id,
      p_customer_name: input.customer_name,
      p_customer_phone: input.customer_phone,
      p_customer_email: input.customer_email ?? null,
      p_customer_address: input.customer_address ?? null,
      p_service: input.service,
      p_description: input.description,
      p_urgency: input.urgency,
      p_preferred_date_range: input.preferred_date_range ?? null,
    });

    if (error) throw new Error(error.message);

    return {
      lead_id: leadId,
      expected_response_minutes: profile?.responds_within_minutes ?? 60,
    };
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  const listing = mockListings.find(
    (item) => item.business_id === input.business_id,
  );

  const customerId = mockId("c");
  const leadId = mockId("l");

  if (input.business_id === db.business.id) {
    db.customers.push({
      id: customerId,
      business_id: input.business_id,
      name: input.customer_name,
      phone: input.customer_phone,
      email: input.customer_email ?? null,
      address: input.customer_address ?? null,
      created_at: new Date().toISOString(),
    } as any);
    db.leads.push({
      id: leadId,
      customer_id: customerId,
      service: input.service,
      description: input.description,
      urgency: input.urgency,
      status: "new",
      source: "marketplace",
      created_at: new Date().toISOString(),
    } as any);
  }

  return delay(
    {
      lead_id: leadId,
      expected_response_minutes: listing?.responds_within_minutes ?? 60,
    },
    500,
  );
}

