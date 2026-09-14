/**
 * The tradesman's Requests inbox — homeowners who confirmed this business
 * from the "find a tradesman" chat, awaiting accept/decline.
 *
 * See the `Match requests` section of docs/api-contract.md for what's real
 * here versus simulated: there's no live WhatsApp/SMS delivery, and a
 * decline's "fallback business" doesn't get its own real dashboard request
 * in this single-business demo — it's resolved immediately so the flow is
 * demoable end to end in one browser session.
 */
import { db, delay, mockId } from "@/lib/api/mock/store";
import { mockListings } from "@/lib/api/mock/marketplace-seed";
import { toListing } from "@/lib/api/marketplace";
import type {
  CreateMatchRequestInput,
  MarketplaceListing,
  MatchRequest,
  RespondToMatchRequestInput,
  RespondToMatchRequestResult,
} from "@/lib/api/types";

const URGENT_PATTERN = /\b(asap|as soon as possible|emergency|today|now)\b/i;

/**
 * Newest first, for the signed-in business.
 *
 * TODO(backend): `GET /api/match-requests`.
 */
export async function getMatchRequests(): Promise<MatchRequest[]> {
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
 *
 * TODO(backend): `POST /api/match-requests` — public, so rate-limit it like
 * `createMarketplaceLead`.
 */
export async function createMatchRequest(
  input: CreateMatchRequestInput,
): Promise<MatchRequest> {
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
 *
 * TODO(backend): `POST /api/match-requests/[id]/respond` — the fallback
 * cascade and message delivery both need to move server-side; see the
 * `Match requests` section of docs/api-contract.md.
 */
export async function respondToMatchRequest(
  input: RespondToMatchRequestInput,
): Promise<RespondToMatchRequestResult> {
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
