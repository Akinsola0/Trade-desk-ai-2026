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
 * Helper to map a real Supabase joined row to the MarketplaceListing shape.
 */
function mapRowToListing(row: any): MarketplaceListing {
  const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
  const reviews = business?.reviews || [];
  
  let rating = null;
  let review_count = reviews.length;
  if (review_count > 0) {
    rating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / review_count;
    rating = Math.round(rating * 10) / 10;
  }

  return {
    business_id: row.business_id,
    slug: row.slug,
    business_name: business?.name ?? "Business",
    headline: row.headline,
    categories: row.categories,
    service_area: row.service_area,
    photo_url: row.photo_urls?.[0] ?? null,
    town: row.town,
    county: row.county,
    rating,
    review_count,
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
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

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
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();
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
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("tradesman_profiles")
      .select(`
        business_id, slug, headline, service_area, photo_urls, town, county, categories,
        from_price_cents, verified, answers_24_7, responds_within_minutes,
        businesses!inner ( name, reviews ( rating ) ),
        marketplace_services ( name )
      `);
      
    if (error) throw new Error(error.message);
    
    let results = (data ?? []).map((row: any) => ({
      ...mapRowToListing(row),
      _services: row.marketplace_services ?? []
    }));

    const query = input.query?.trim().toLowerCase() ?? "";

    results = results
      .filter((listing) => listing.categories.includes(input.category))
      // Approximate location filter since real DB just has town and county strings
      .filter((listing) => {
        const loc = input.location.toLowerCase();
        return listing.town.toLowerCase().includes(loc) || listing.county.toLowerCase().includes(loc) || loc === "all";
      })
      .filter((listing) =>
        query
          ? [
              listing.business_name,
              listing.headline,
              ...(listing as any)._services.map((s: any) => s.name),
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
      .filter((listing) => (input.answers_24_7 ? listing.answers_24_7 : true));

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

    // Strip temp field
    return results.map(({ _services, ...rest }: any) => rest);
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
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("tradesman_profiles")
      .select(`
        business_id, slug, headline, bio, service_area, photo_urls, town, county, categories,
        from_price_cents, verified, answers_24_7, responds_within_minutes, member_since,
        businesses!inner (
          name, phone,
          reviews (
            id, business_id, job_id, customer_id, rating, comment, created_at,
            customers ( name ),
            jobs ( leads ( service ) )
          )
        ),
        marketplace_services ( name, description, from_price_cents )
      `)
      .eq("slug", slug)
      .single();

    if (error || !data) return null;

    const baseListing = mapRowToListing(data);
    const business = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
    const rawReviews = business?.reviews || [];

    const reviews: MarketplaceReview[] = rawReviews.map((r: any) => {
      const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers;
      const job = Array.isArray(r.jobs) ? r.jobs[0] : r.jobs;
      const lead = Array.isArray(job?.leads) ? job.leads[0] : job?.leads;
      return {
        id: r.id,
        business_id: r.business_id,
        job_id: r.job_id,
        customer_id: r.customer_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        customer_name: customer?.name ?? "Customer",
        job_service: lead?.service ?? null,
      };
    }).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      ...baseListing,
      bio: data.bio,
      photo_urls: data.photo_urls ?? [],
      phone: business?.phone ?? "",
      services: data.marketplace_services ?? [],
      reviews,
      member_since: data.member_since,
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
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("reviews")
      .select(`
        id, business_id, job_id, customer_id, rating, comment, created_at,
        customers ( name ),
        jobs ( leads ( service ) ),
        businesses!inner (
          name,
          tradesman_profiles ( slug )
        )
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map((r: any) => {
      const customer = Array.isArray(r.customers) ? r.customers[0] : r.customers;
      const job = Array.isArray(r.jobs) ? r.jobs[0] : r.jobs;
      const lead = Array.isArray(job?.leads) ? job.leads[0] : job?.leads;
      const business = Array.isArray(r.businesses) ? r.businesses[0] : r.businesses;
      const profile = Array.isArray(business?.tradesman_profiles) ? business.tradesman_profiles[0] : business?.tradesman_profiles;

      return {
        id: r.id,
        business_id: r.business_id,
        job_id: r.job_id,
        customer_id: r.customer_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        customer_name: customer?.name ?? "Customer",
        job_service: lead?.service ?? null,
        business_name: business?.name ?? "Business",
        business_slug: profile?.slug ?? "",
      };
    });
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
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    // 1. Fetch responds_within_minutes for the expected response time
    const { data: profile } = await supabase
      .from("tradesman_profiles")
      .select("responds_within_minutes")
      .eq("business_id", input.business_id)
      .single();

    // 2. Call the RPC to insert customer and lead (bypassing RLS)
    const { data: leadId, error } = await supabase.rpc("create_marketplace_lead", {
      p_business_id: input.business_id,
      p_customer_name: input.customer_name,
      p_customer_phone: input.customer_phone,
      p_customer_email: input.customer_email ?? null,
      p_customer_address: input.customer_address ?? null,
      p_service: input.service,
      p_description: input.description,
      p_urgency: input.urgency,
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

