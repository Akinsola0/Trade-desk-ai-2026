/**
 * TradeDesk AI — frontend/backend data contract.
 *
 * These types mirror the Supabase schema owned by the backend team. The UI only
 * ever talks to the wrapper functions in `lib/api/*` and only ever sees these
 * shapes, so swapping the mock implementations for real `/api/...` routes is a
 * one-line change per function.
 *
 * Every field name below matches a column name in the agreed data model. If the
 * backend needs to rename or reshape anything, change it here first and the
 * compiler will point at every screen that has to move with it.
 *
 * Documented for the backend pair in `docs/api-contract.md`.
 */

/** Postgres `uuid`. */
export type UUID = string;

/** ISO-8601 timestamp with timezone, e.g. `2026-09-02T09:30:00.000Z` (`timestamptz`). */
export type ISODateTime = string;

/** ISO-8601 calendar date, e.g. `2026-09-02` (`date`). */
export type ISODate = string;

/** 24-hour wall-clock time in the business's own timezone, e.g. `08:30` (`time`). */
export type TimeOfDay = string;

/**
 * Day of week, 0 = Sunday … 6 = Saturday — matches Postgres `EXTRACT(DOW)`.
 * The availability editor renders Monday-first but stores these numbers.
 */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/* -------------------------------------------------------------------------- */
/* Enums — the UI renders these as badges, so they must match the DB exactly.  */
/* -------------------------------------------------------------------------- */

export const TRADE_TYPES = [
  "plumber",
  "electrician",
  "handyman",
  "carpenter",
  "painter",
  "roofer",
  "tiler",
  "plasterer",
  "landscaper",
  "locksmith",
  "heating_engineer",
  "appliance_repair",
] as const;
export type TradeType = (typeof TRADE_TYPES)[number];

/** `leads.status` — new → qualified → booked → lost. */
export const LEAD_STATUSES = ["new", "qualified", "booked", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** `leads.source` — where the lead came from. Rendered as a visual distinction in the leads list. */
export const LEAD_SOURCES = ["phone", "marketplace", "manual"] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

/**
 * `leads.urgency`.
 * TODO(backend): confirm this enum — it wasn't in the shared data model. The UI
 * currently assumes these three values and orders lists emergency-first.
 */
export const LEAD_URGENCIES = ["emergency", "urgent", "routine"] as const;
export type LeadUrgency = (typeof LEAD_URGENCIES)[number];

/** `jobs.status` — booked → confirmed → completed → cancelled. */
export const JOB_STATUSES = [
  "booked",
  "confirmed",
  "completed",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

/** `calls.outcome` — what the AI front desk decided the call was. */
export const CALL_OUTCOMES = [
  "booked",
  "lead_only",
  "callback_required",
  "spam",
  "failed",
] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];

/** `messages.channel` — Irish trades customers expect WhatsApp as well as SMS. */
export const MESSAGE_CHANNELS = ["sms", "whatsapp"] as const;
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number];

export const MESSAGE_DIRECTIONS = ["inbound", "outbound"] as const;
export type MessageDirection = (typeof MESSAGE_DIRECTIONS)[number];

/**
 * `messages.status`.
 * TODO(backend): confirm the exact values Twilio statuses are normalised to.
 * The dashboard shows `queued` and `failed` explicitly so nothing disappears
 * silently — see `getAttentionItems()`.
 */
export const MESSAGE_STATUSES = [
  "queued",
  "sent",
  "delivered",
  "failed",
] as const;
export type MessageStatus = (typeof MESSAGE_STATUSES)[number];

/* -------------------------------------------------------------------------- */
/* Tables                                                                      */
/* -------------------------------------------------------------------------- */

/** `businesses` */
export interface Business {
  id: UUID;
  name: string;
  /** IANA timezone, e.g. `Europe/Dublin`. All `TimeOfDay` values are in this zone. */
  timezone: string;
  /** E.164, e.g. `+35315551234`. */
  phone: string;
  trade_type: TradeType;
}

/** `profiles` — a person who can sign in, linked to one business. */
export interface Profile {
  id: UUID;
  business_id: UUID;
  name: string;
  role: "owner" | "staff";
}

/** `customers` */
export interface Customer {
  id: UUID;
  business_id: UUID;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
}

/** `leads` */
export interface Lead {
  id: UUID;
  customer_id: UUID;
  /** Short service label, e.g. "Burst pipe", "Consumer unit upgrade". */
  service: string;
  description: string;
  urgency: LeadUrgency;
  status: LeadStatus;
  source: LeadSource;
  created_at: ISODateTime;
}

/** `availability_rules` — one row per working window per weekday. */
export interface AvailabilityRule {
  id: UUID;
  business_id: UUID;
  weekday: Weekday;
  start_time: TimeOfDay;
  end_time: TimeOfDay;
}

/** `jobs` */
export interface Job {
  id: UUID;
  lead_id: UUID;
  starts_at: ISODateTime;
  ends_at: ISODateTime;
  status: JobStatus;
  notes: string | null;
}

/** `calls` — one row per inbound call handled by the AI front desk. */
export interface Call {
  id: UUID;
  business_id: UUID;
  customer_id: UUID | null;
  /** Twilio call SID. Shown in the UI for support/debugging. */
  provider_call_id: string;
  outcome: CallOutcome;
  summary: string;
  started_at: ISODateTime;
  duration_seconds: number;
  /**
   * Set when an owner corrected the AI's classification.
   * TODO(backend): add these two columns (`corrected_outcome`, `corrected_at`)
   * rather than overwriting `outcome`, so AI accuracy stays measurable.
   */
  corrected_outcome: CallOutcome | null;
  corrected_at: ISODateTime | null;
}

/** `messages` — confirmations and follow-ups sent to a customer. */
export interface Message {
  id: UUID;
  customer_id: UUID;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  status: MessageStatus;
  created_at: ISODateTime;
  /** Populated when `status === "failed"`. Surfaced verbatim in the dashboard. */
  error_message: string | null;
}

/** `tradesman_profiles` — Phase 2, the public marketplace listing. */
export interface TradesmanProfile {
  id: UUID;
  business_id: UUID;
  /** URL segment for `/pro/[slug]`. TODO(backend): add a unique `slug` column. */
  slug: string;
  headline: string;
  bio: string;
  photo_urls: string[];
  categories: TradeType[];
  /** Free-text service area, e.g. "Naas, Newbridge, Kildare town and within 30km". */
  service_area: string;
}

/** `reviews` — Phase 2. */
export interface Review {
  id: UUID;
  business_id: UUID;
  job_id: UUID | null;
  customer_id: UUID;
  /** 1–5. */
  rating: number;
  comment: string;
  created_at: ISODateTime;
}

/* -------------------------------------------------------------------------- */
/* Read models — denormalised shapes the UI actually renders.                   */
/* The backend returns these from the corresponding routes (joins done server-  */
/* side) so the client never fans out N+1 requests.                             */
/* -------------------------------------------------------------------------- */

export interface LeadListItem extends Lead {
  customer: Pick<Customer, "id" | "name" | "phone" | "email" | "address">;
  /** The job booked off this lead, if any. */
  job: Pick<Job, "id" | "starts_at" | "ends_at" | "status"> | null;
  /** The call this lead came from, if `source === "phone"`. */
  call_id: UUID | null;
}

export interface JobListItem extends Job {
  lead: Pick<Lead, "id" | "service" | "description" | "urgency" | "source">;
  customer: Pick<Customer, "id" | "name" | "phone" | "address">;
}

export interface CallListItem extends Call {
  customer: Pick<Customer, "id" | "name" | "phone"> | null;
  /** The lead the call produced, if any. */
  lead_id: UUID | null;
}

export interface MessageListItem extends Message {
  customer: Pick<Customer, "id" | "name" | "phone"> | null;
}

/**
 * Anything that needs a human: a failed AI tool call, an unsent confirmation, a
 * lead sitting untouched. The dashboard renders these prominently so a failure
 * never disappears silently.
 */
export interface AttentionItem {
  id: string;
  kind: "failed_call" | "failed_message" | "queued_message" | "unactioned_lead";
  title: string;
  detail: string;
  occurred_at: ISODateTime;
  /** Where the dashboard should send the owner to deal with it. */
  href: string;
  severity: "warning" | "error";
}

/** Headline counters for the dashboard overview. */
export interface DashboardSummary {
  calls_answered_this_week: number;
  leads_captured_this_week: number;
  jobs_booked_this_week: number;
  /** Calls the AI handled without a human — the number that justifies the bill. */
  after_hours_calls_this_week: number;
  /** Estimated value of booked work this week, in euro cents. */
  booked_value_cents_this_week: number;
}

/* -------------------------------------------------------------------------- */
/* Marketplace read models — Phase 2                                           */
/* -------------------------------------------------------------------------- */

/** One card in `/find/[category]/[location]` results. */
export interface MarketplaceListing {
  business_id: UUID;
  slug: string;
  business_name: string;
  headline: string;
  categories: TradeType[];
  service_area: string;
  photo_url: string | null;
  town: string;
  county: string;
  /** Average of `reviews.rating`, rounded to one decimal. `null` when unreviewed. */
  rating: number | null;
  review_count: number;
  /** Indicative "from" price for a common job in this category, in euro cents. */
  from_price_cents: number | null;
  verified: boolean;
  /** Whether the business currently answers calls 24/7 through TradeDesk AI. */
  answers_24_7: boolean;
  responds_within_minutes: number | null;
}

/** Everything `/pro/[slug]` renders. */
export interface MarketplaceProfile extends MarketplaceListing {
  bio: string;
  photo_urls: string[];
  phone: string;
  /** Indicative price list shown on the profile — no "contact us for pricing". */
  services: MarketplaceService[];
  reviews: MarketplaceReview[];
  member_since: ISODate;
}

export interface MarketplaceService {
  name: string;
  description: string;
  from_price_cents: number;
}

/** A review joined to the customer's display name. */
export interface MarketplaceReview extends Review {
  customer_name: string;
  job_service: string | null;
}

export interface MarketplaceCategory {
  /** URL segment for `/find/[category]/...`, e.g. `plumber`. */
  slug: TradeType;
  label: string;
  /** Plural label used in headings, e.g. "Plumbers". */
  plural: string;
  /** lucide-react icon name the category grid renders. */
  icon: string;
  from_price_cents: number;
  listing_count: number;
}

export interface MarketplaceLocation {
  /** URL segment for `/find/.../[location]`, e.g. `naas`. */
  slug: string;
  town: string;
  county: string;
}

/* -------------------------------------------------------------------------- */
/* Inputs                                                                      */
/* -------------------------------------------------------------------------- */

export interface UpdateBusinessInput {
  name: string;
  phone: string;
  timezone: string;
  trade_type: TradeType;
  /** Channel the AI uses to send booking confirmations. */
  confirmation_channel: MessageChannel;
  /** Send on both channels when the customer doesn't reply to the first. */
  confirmation_fallback: boolean;
  /**
   * TODO(backend): `confirmation_channel` and `confirmation_fallback` are not in
   * the `businesses` table yet. Add them (or a `business_settings` row) — the AI
   * voice agent needs them to pick SMS vs WhatsApp.
   */
}

export interface AvailabilityRuleInput {
  weekday: Weekday;
  start_time: TimeOfDay;
  end_time: TimeOfDay;
}

export interface UpdateLeadStatusInput {
  lead_id: UUID;
  status: LeadStatus;
}

export interface ReclassifyCallInput {
  call_id: UUID;
  outcome: CallOutcome;
  /** Optional note explaining the correction, for AI evaluation. */
  note?: string;
}

export interface UpdateJobInput {
  job_id: UUID;
  status?: JobStatus;
  notes?: string;
}

/** Posted by the public marketplace contact form. */
export interface CreateMarketplaceLeadInput {
  business_id: UUID;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  service: string;
  description: string;
  urgency: LeadUrgency;
  preferred_channel: MessageChannel;
  /**
   * TODO(backend): not in the shared `leads` schema yet. Populated when a
   * homeowner arrives from the "find a tradesman" chat with a preferred
   * date range already picked — shown to the tradesman as context, not
   * currently a bookable field anywhere else in the product.
   */
  preferred_date_range?: string;
}

export interface CreateMarketplaceLeadResult {
  lead_id: UUID;
  /** What the UI promises the homeowner, e.g. 15. */
  expected_response_minutes: number;
}

export interface SearchListingsInput {
  category: TradeType;
  /** `MarketplaceLocation.slug`. */
  location: string;
  /** Free-text filter over name/headline/services. */
  query?: string;
  min_rating?: number;
  max_from_price_cents?: number;
  answers_24_7?: boolean;
  sort?: "recommended" | "rating" | "price";
}

/**
 * The "find a tradesman" chat's answers, once a homeowner has described the
 * job. Scored against the same listings `searchListings` would return for
 * this category/location — see `recommendTradespeople`.
 */
export interface RecommendTradespeopleInput {
  category: TradeType;
  /** `MarketplaceLocation.slug`. */
  location: string;
  /** Free text — what the homeowner typed when asked what's wrong. */
  issue_description: string;
  eircode?: string;
  /** A quick-reply label, e.g. "As soon as possible", "This week". */
  date_range?: string;
}

/** `match_requests.status`. */
export const MATCH_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
] as const;
export type MatchRequestStatus = (typeof MATCH_REQUEST_STATUSES)[number];

/**
 * A homeowner's confirmed pick from the "find a tradesman" chat, sitting in
 * the tradesman's Requests inbox awaiting accept/decline — distinct from a
 * plain `CreateMarketplaceLeadInput` lead because it carries the ordered
 * list of other recommended businesses, so a decline can automatically move
 * to the next one.
 *
 * TODO(backend): not a real table yet — `match_requests`, one row per
 * business per homeowner enquiry. See docs/api-contract.md for the
 * accept/decline/fallback flow this backs, including which parts
 * (WhatsApp/SMS delivery, a second business actually receiving the
 * fallback offer) are simulated in this frontend-only build.
 */
export interface MatchRequest {
  id: UUID;
  business_id: UUID;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  /** Eircode or townland, as given to the chat. */
  customer_address?: string;
  service: string;
  description: string;
  preferred_date_range?: string;
  preferred_channel: MessageChannel;
  status: MatchRequestStatus;
  created_at: ISODateTime;
  /**
   * Other recommended businesses for this same enquiry, best-fit order,
   * this one excluded — `respondToMatchRequest` pops the first slug here
   * when declined.
   */
  fallback_slugs: string[];
  /** Set once a decline has moved this enquiry on to a fallback business. */
  resolved_via_slug?: string;
}

export interface CreateMatchRequestInput {
  business_id: UUID;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  service: string;
  description: string;
  preferred_date_range?: string;
  preferred_channel: MessageChannel;
  fallback_slugs: string[];
}

export interface RespondToMatchRequestInput {
  request_id: UUID;
  response: "accepted" | "declined";
}

export interface RespondToMatchRequestResult {
  request: MatchRequest;
  /**
   * Set when declined and a fallback business existed to offer the job to —
   * the UI uses this to show "offered to X instead" and a link to their
   * profile, simulating the WhatsApp message a homeowner would receive.
   */
  fallback?: MarketplaceListing;
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                        */
/* -------------------------------------------------------------------------- */

/**
 * The signed-in account.
 *
 * Backed by browser-local demo accounts until Supabase is connected — see
 * `lib/api/auth.ts`. `id` becomes the Supabase `auth.users.id`, which is also
 * `profiles.id`.
 */
export interface AuthUser {
  id: UUID;
  email: string;
  name: string;
  /** Creates the `businesses` row on sign-up. */
  business_name: string;
  trade_type: TradeType;
  created_at: ISODateTime;
}

export interface SignUpInput {
  name: string;
  business_name: string;
  trade_type: TradeType;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

/** The signed-in user plus the business RLS scopes them to. */
export interface SessionContext {
  profile: Profile;
  business: Business;
}

/** `businesses` columns the backend still has to add — see `UpdateBusinessInput`. */
export interface BusinessSettings {
  confirmation_channel: MessageChannel;
  confirmation_fallback: boolean;
}

/** What the settings screen loads and saves. */
export interface BusinessProfile extends Business, BusinessSettings {}

export interface LeadFilters {
  status?: LeadStatus | "all";
  source?: LeadSource | "all";
  /** Case-insensitive match over customer name, service and description. */
  query?: string;
}

export interface CallFilters {
  outcome?: CallOutcome | "all";
  query?: string;
}

/** Half-open range `[from, to)` used by the calendar. */
export interface DateRange {
  from: ISODateTime;
  to: ISODateTime;
}
