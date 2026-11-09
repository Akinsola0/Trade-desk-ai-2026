/**
 * The tradesman's Requests inbox — homeowners who confirmed this business
 * from the "find a tradesman" chat, awaiting accept/decline.
 *
 * REAL PATH (Supabase configured): backed by the `match_requests` table and
 * the `create_match_request` / `respond_to_match_request` functions
 * (supabase/migrations/20261107120000_*). A decline hands the enquiry to the
 * next fallback as a genuine pending request in THEIR inbox. Accepting queues
 * the confirmation message; there is no SMS/WhatsApp delivery worker yet.
 *
 * DEMO PATH: in-memory, single business; a decline resolves instantly.
 */
import { isDemoAuth } from "@/lib/api/auth";
import { getSupabase } from "@/lib/supabase/isomorphic";
import { db, delay, mockId } from "@/lib/api/mock/store";
import { mockListings } from "@/lib/api/mock/marketplace-seed";
import { getMarketplaceProfile, toListing } from "@/lib/api/marketplace";
import type {
  CreateMatchRequestInput,
  MarketplaceListing,
  MatchRequest,
  RespondToMatchRequestInput,
  RespondToMatchRequestResult,
} from "@/lib/api/types";

const REQUEST_COLUMNS =
  "id, business_id, customer_name, customer_phone, customer_email, customer_address, service, description, preferred_date_range, preferred_channel, status, created_at, fallback_slugs, resolved_via_slug";

interface MatchRequestRow {
  id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_address: string | null;
  service: string;
  description: string;
  preferred_date_range: string | null;
  preferred_channel: MatchRequest["preferred_channel"];
  status: MatchRequest["status"];
  created_at: string;
  fallback_slugs: string[];
  resolved_via_slug: string | null;
}

function rowToMatchRequest(row: MatchRequestRow): MatchRequest {
  return {
    id: row.id,
    business_id: row.business_id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    customer_email: row.customer_email ?? undefined,
    customer_address: row.customer_address ?? undefined,
    service: row.service,
    description: row.description,
    preferred_date_range: row.preferred_date_range ?? undefined,
    preferred_channel: row.preferred_channel,
    status: row.status,
    created_at: row.created_at,
    fallback_slugs: row.fallback_slugs ?? [],
    resolved_via_slug: row.resolved_via_slug ?? undefined,
  };
}

const URGENT_PATTERN = /\b(asap|as soon as possible|emergency|today|now)\b/i;

/**
 * Newest first, for the signed-in business.
 *
 */
export async function getMatchRequests(): Promise<MatchRequest[]> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();
    // RLS scopes this to the signed-in user's business.
    const { data, error } = await supabase
      .from("match_requests")
      .select(REQUEST_COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as MatchRequestRow[]).map(rowToMatchRequest);
  }

  const items = db.matchRequests
    .filter((item) => item.business_id === db.business.id)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  return delay(items);
}

/**
 * Posted when a homeowner confirms a specific tradesman from the chat's
 * recommendation list — the "Confirm this tradesman" form on `/pro/[slug]`.
 */
export async function createMatchRequest(
  input: CreateMatchRequestInput,
): Promise<MatchRequest> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();
    // The function validates, normalises and rate-limits; its messages are
    // written for the homeowner, so they are safe to show as-is.
    const { data: id, error } = await supabase.rpc("create_match_request", {
      p_business_id: input.business_id,
      p_customer_name: input.customer_name,
      p_customer_phone: input.customer_phone,
      p_service: input.service,
      p_description: input.description,
      p_preferred_channel: input.preferred_channel,
      p_customer_email: input.customer_email ?? null,
      p_customer_address: input.customer_address ?? null,
      p_preferred_date_range: input.preferred_date_range ?? null,
      p_fallback_slugs: input.fallback_slugs,
    });
    if (error) throw new Error(error.message);

    // The homeowner is anonymous and cannot read the row back (by design), so
    // echo the input with the id the database issued.
    return {
      id: id as string,
      ...input,
      status: "pending",
      created_at: new Date().toISOString(),
    };
  }

  const request: MatchRequest = {
    id: mockId("mr"),
    business_id: input.business_id,
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    customer_email: input.customer_email,
    customer_address: input.customer_address,
    service: input.service,
    description: input.description,
    preferred_date_range: input.preferred_date_range,
    preferred_channel: input.preferred_channel,
    status: "pending",
    created_at: new Date().toISOString(),
    fallback_slugs: input.fallback_slugs,
  };

  // Same mock-data limitation as createMarketplaceLead: only the signed-in
  // demo business's own data is actually stored, since this environment
  // only ever has the one dashboard to show it in. A confirmed tradesman
  // who isn't the demo business still gets a valid request id back — the
  // homeowner-facing flow works either way — it just won't appear in any
  // dashboard here.
  if (input.business_id === db.business.id) {
    db.matchRequests.push(request);
  }

  return delay(request, 500);
}

/**
 * Accept or decline a pending request.
 *
 * Accept creates a real booked lead (so it shows up on `/dashboard/leads`
 * and the calendar like any other) plus an outbound confirmation message
 * (so it shows up on `/dashboard/messages`) — simulating the "your request
 * has been accepted" WhatsApp/SMS a homeowner would receive.
 *
 * Decline pops the next business off `fallback_slugs` and resolves the
 * enquiry to them immediately, returning their listing so the UI can show
 * "offered to X instead" with a real link to their profile. In a real
 * system this would be async — the fallback business would get their own
 * pending request and might decline too — simulated as instant here since
 * this demo only has one signed-in business to actually respond as.
 */
export async function respondToMatchRequest(
  input: RespondToMatchRequestInput,
): Promise<RespondToMatchRequestResult> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();
    const { error } = await supabase.rpc("respond_to_match_request", {
      p_request_id: input.request_id,
      p_response: input.response,
    });
    if (error) throw new Error(error.message);

    const { data: row, error: readError } = await supabase
      .from("match_requests")
      .select(REQUEST_COLUMNS)
      .eq("id", input.request_id)
      .single();
    if (readError) throw new Error(readError.message);

    const request = rowToMatchRequest(row as MatchRequestRow);
    const fallback = request.resolved_via_slug
      ? ((await getMarketplaceProfile(request.resolved_via_slug)) ?? undefined)
      : undefined;
    return { request, fallback };
  }

  const request = db.matchRequests.find((item) => item.id === input.request_id);
  if (!request) {
    throw new Error(`Match request ${input.request_id} not found`);
  }

  request.status = input.response;

  if (input.response === "accepted") {
    const customerId = mockId("c");
    db.customers.push({
      id: customerId,
      business_id: request.business_id,
      name: request.customer_name,
      phone: request.customer_phone,
      email: request.customer_email ?? null,
      address: request.customer_address ?? null,
    });
    db.leads.push({
      id: mockId("l"),
      customer_id: customerId,
      service: request.service,
      description: request.description,
      urgency: URGENT_PATTERN.test(request.preferred_date_range ?? "")
        ? "urgent"
        : "routine",
      status: "booked",
      source: "marketplace",
      created_at: new Date().toISOString(),
    });
    db.messages.push({
      id: mockId("m"),
      customer_id: customerId,
      channel: request.preferred_channel,
      direction: "outbound",
      body: `Good news — your request has been accepted${request.preferred_date_range ? `, ${request.preferred_date_range.toLowerCase()}` : ""}. We'll be in touch to confirm the details.`,
      status: "sent",
      created_at: new Date().toISOString(),
      error_message: null,
    });

    return delay({ request });
  }

  // Declined — resolve to the next recommended business, if any.
  let fallback: MarketplaceListing | undefined;
  if (request.fallback_slugs.length > 0) {
    const [nextSlug, ...rest] = request.fallback_slugs;
    request.fallback_slugs = rest;
    request.resolved_via_slug = nextSlug;
    const listing = mockListings.find((item) => item.slug === nextSlug);
    if (listing) fallback = toListing(listing);
  }

  return delay({ request, fallback });
}
