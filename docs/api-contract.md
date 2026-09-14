# Frontend ↔ backend API contract

**Owner:** frontend/design track. **Audience:** the backend pair implementing Supabase, the AI voice tools and Twilio.

Everything the UI renders comes from a function in [`lib/api/`](../lib/api). Each one currently resolves against mock fixtures (`lib/api/mock/`); each one is a single line away from calling a real route. Components never call `fetch` and never import mock data — so when a route below exists, the swap happens in one function and no screen changes.

The types are the source of truth: [`lib/api/types.ts`](../lib/api/types.ts). This document is the readable version of it. If you need to change a shape, change it there first and the compiler will show every screen affected.

---

## Conventions

| Thing            | Convention                                                                                                                                                                          |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field names      | Identical to the column names in the agreed data model (`snake_case`).                                                                                                              |
| Timestamps       | `timestamptz` as ISO-8601 strings (`2026-09-02T09:30:00.000Z`).                                                                                                                     |
| Wall-clock times | `HH:MM`, 24-hour, **in the business's own timezone** (`availability_rules`).                                                                                                        |
| `weekday`        | `0`–`6`, `0` = Sunday — matches Postgres `EXTRACT(DOW)`. The editor renders Monday-first, stores these numbers.                                                                     |
| Money            | Integer **euro cents**. No floats anywhere.                                                                                                                                         |
| Tenancy          | No screen ever sends or hardcodes a `business_id` for its own data; RLS scopes it. `getSession()` supplies the id where a function needs one explicitly (availability).             |
| Errors           | Functions reject with an `Error`; screens render the message in an error state with a retry. HTTP routes should return `{ "error": { "message": string } }` with a sensible status. |
| Empty results    | Empty array, never `null`. Single-item lookups return `null` when absent.                                                                                                           |

## Enums the UI renders as badges

These must match the database exactly — the badge components are keyed on them.

| Enum                    | Values                                                                                                                                                          |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leads.status`          | `new` → `qualified` → `booked` → `lost`                                                                                                                         |
| `leads.source`          | `phone` \| `marketplace` \| `manual`                                                                                                                            |
| `leads.urgency`         | `emergency` \| `urgent` \| `routine` — **not yet agreed, see open questions**                                                                                   |
| `jobs.status`           | `booked` → `confirmed` → `completed` → `cancelled`                                                                                                              |
| `calls.outcome`         | `booked` \| `lead_only` \| `callback_required` \| `spam` \| `failed`                                                                                            |
| `messages.channel`      | `sms` \| `whatsapp`                                                                                                                                             |
| `messages.direction`    | `inbound` \| `outbound`                                                                                                                                         |
| `messages.status`       | `queued` \| `sent` \| `delivered` \| `failed` — **needs confirming against Twilio's statuses**                                                                  |
| `businesses.trade_type` | `plumber`, `electrician`, `handyman`, `carpenter`, `painter`, `roofer`, `tiler`, `plasterer`, `landscaper`, `locksmith`, `heating_engineer`, `appliance_repair` |
| `match_requests.status` | `pending` \| `accepted` \| `declined` — **not yet agreed, see open questions**                                                                                  |

---

## Auth

The frontend runs in one of two modes, decided by whether `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set:

- **Unset (today):** `lib/api/auth.ts` keeps accounts in the browser's `localStorage` (`lib/api/mock/auth-store.ts`), and the auth screens render our own form. Sign-up, sign-in, staying signed in across reloads, and sign-out all work with no backend. Passwords are SHA-256 hashed, but this is a stand-in, not a security boundary.
- **Set:** the screens render Supabase Auth UI against the real project, and `getCurrentUser()` reads the Supabase session.

Four functions, all of which map one-to-one onto Supabase calls when you're ready:

| Function                     | Becomes                                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `signUp(input: SignUpInput)` | `supabase.auth.signUp({ email, password, options: { data } })` **plus** the `businesses` + `profiles` rows |
| `signIn(input: SignInInput)` | `supabase.auth.signInWithPassword({ email, password })`                                                    |
| `signOut()`                  | `supabase.auth.signOut()`                                                                                  |
| `getCurrentUser()`           | `supabase.auth.getUser()` joined to the caller's `profiles` row                                            |

```ts
SignUpInput = { name, business_name, trade_type, email, password };
SignInInput = { email, password };
AuthUser = { id, email, name, business_name, trade_type, created_at };
```

> **Needed from you:** sign-up collects the person's name, their business name and their trade, because a new account has to create a `businesses` row and a `profiles` row before the dashboard has anything to show. Either do that in the route, or add a trigger on `auth.users` — tell us which, and whether `AuthUser.id` is the `profiles.id` (we assume it is).

Everything the dashboard renders is gated on this: `DashboardShell` calls `getSession()` and redirects to `/login` when it throws.

## Session

### `getSession(): Promise<SessionContext>`

Proposed route: **`GET /api/session`**

The signed-in profile and the business it belongs to. Used by the dashboard shell, the calendar and the availability editor.

```ts
SessionContext = { profile: Profile; business: Business }
```

**Throws `NotSignedInError` when nobody is signed in** — the route should return `401`, and the wrapper turns that into the same error. The dashboard shell catches it and redirects to `/login`.

---

## Business profile

### `getBusiness(): Promise<BusinessProfile>`

Proposed route: **`GET /api/business`** — the caller's own row only.

`BusinessProfile` = the `businesses` row plus two settings columns that don't exist yet:

```ts
{
  id, name, timezone, phone, trade_type,     // businesses
  confirmation_channel: "sms" | "whatsapp",  // ← new
  confirmation_fallback: boolean             // ← new
}
```

### `updateBusiness(input: UpdateBusinessInput): Promise<BusinessProfile>`

Proposed route: **`PATCH /api/business`**

Input is every field above except `id`. Validate `phone` as E.164 and `timezone` as an IANA zone; return the updated row.

> **Needed from you:** `confirmation_channel` and `confirmation_fallback` columns (on `businesses`, or a `business_settings` row). The voice agent needs them to decide SMS vs WhatsApp, and the settings screen already writes them.

---

## Availability

### `getAvailability(businessId: UUID): Promise<AvailabilityRule[]>`

Proposed route: **`GET /api/availability`**

Ordered by `weekday`, then `start_time`. Multiple windows per weekday are supported (the editor calls it "splitting the day").

### `saveAvailability(businessId: UUID, rules: AvailabilityRuleInput[]): Promise<AvailabilityRule[]>`

Proposed route: **`PUT /api/availability`**

The editor sends **the whole week**, not a diff — replace the business's rules in one transaction so the AI never sees a half-updated week mid-call.

```ts
AvailabilityRuleInput = { weekday: 0..6; start_time: "HH:MM"; end_time: "HH:MM" }
```

The UI already blocks `end_time <= start_time` and overlapping windows on the same day. Please reject them server-side too.

---

## Leads

### `getLeads(filters?: LeadFilters): Promise<LeadListItem[]>`

Proposed route: **`GET /api/leads?status=&source=&query=`**

Newest first. `status` and `source` accept an enum value or `all`; `query` is a case-insensitive match over customer name, service and description.

`LeadListItem` is a `leads` row plus joins the list needs — please do the joins server-side, the client must stay one request:

```ts
LeadListItem = Lead & {
  customer: { id, name, phone, email, address };
  job: { id, starts_at, ends_at, status } | null;   // the job booked off this lead
  call_id: UUID | null;                             // when source === "phone"
}
```

### `getLead(leadId: UUID): Promise<LeadListItem | null>`

Proposed route: **`GET /api/leads/[id]`**

### `updateLeadStatus(input: UpdateLeadStatusInput): Promise<LeadListItem>`

Proposed route: **`PATCH /api/leads/[id]`**

```ts
UpdateLeadStatusInput = { lead_id: UUID; status: LeadStatus }
```

Moving a lead to `booked` without a job attached should be rejected — booking goes through `lib/booking`, not this route.

---

## Jobs

### `getJobs(range?: DateRange): Promise<JobListItem[]>`

Proposed route: **`GET /api/jobs?from=&to=`**

Jobs **starting** inside the half-open range `[from, to)`, earliest first. The calendar asks for one week at a time; the overview asks for today.

```ts
JobListItem = Job & {
  lead: { id, service, description, urgency, source };
  customer: { id, name, phone, address };
}
```

### `updateJob(input: UpdateJobInput): Promise<JobListItem>`

Proposed route: **`PATCH /api/jobs/[id]`**

```ts
UpdateJobInput = { job_id: UUID; status?: JobStatus; notes?: string }
```

The UI deliberately **cannot move a job's time** — re-scheduling has to go through `lib/booking` so two jobs can't land in the same slot. Tell us when there's a route for it and we'll add the affordance.

---

## Calls

### `getCalls(filters?: CallFilters): Promise<CallListItem[]>`

Proposed route: **`GET /api/calls?outcome=&query=`**

Most recent first. Filtering by `outcome` matches the **corrected** outcome when one exists.

```ts
CallListItem = Call & {
  customer: { id, name, phone } | null;   // null for spam / unknown callers
  lead_id: UUID | null;
}
```

`Call` carries fields the shared model didn't list, all of which the call log renders: `started_at`, `duration_seconds`, `corrected_outcome`, `corrected_at`.

### `reclassifyCall(input: ReclassifyCallInput): Promise<CallListItem>`

Proposed route: **`POST /api/calls/[id]/reclassify`**

```ts
ReclassifyCallInput = { call_id: UUID; outcome: CallOutcome; note?: string }
```

**Write the correction to `corrected_outcome`; never overwrite `outcome`.** Keeping the original is what makes AI accuracy measurable — and the correction is the obvious training signal for `tests/agent-scenarios`. Setting `outcome` back to what the AI said clears the correction (`corrected_outcome = null`).

> **Needed from you:** `calls.corrected_outcome` and `calls.corrected_at` columns.

---

## Messages (confirmations)

### `getMessages(customerId?: UUID): Promise<MessageListItem[]>`

Proposed route: **`GET /api/messages?customer_id=`**

Newest first. `MessageListItem` is a `messages` row joined to `{ customer: { id, name, phone } | null }`, plus `error_message: string | null`, which the dashboard shows verbatim when `status === "failed"` (e.g. `Twilio 63016: recipient has no WhatsApp account`).

### `retryMessage(messageId: UUID, channel?: MessageChannel): Promise<MessageListItem>`

Proposed route: **`POST /api/messages/[id]/retry`**

Re-queues a failed confirmation, optionally on the other channel — how a "no WhatsApp account" failure gets fixed without ringing anyone. Prefer inserting a **new** row and returning it so the failure stays in the history; the UI only needs the row it should render next.

---

## Dashboard

### `getDashboardSummary(): Promise<DashboardSummary>`

Proposed route: **`GET /api/dashboard/summary`**

Counters for the current week, computed in the business's own timezone:

```ts
{
  (calls_answered_this_week,
    leads_captured_this_week,
    jobs_booked_this_week,
    after_hours_calls_this_week, // before 08:00 or after 18:00 local
    booked_value_cents_this_week); // estimate; see open questions
}
```

### `getAttentionItems(): Promise<AttentionItem[]>`

Proposed route: **`GET /api/dashboard/attention`**

The "needs you" list — **the one screen element that must never go quiet.** Three sources:

1. calls whose (effective) outcome is `failed`,
2. messages with status `failed` or `queued`,
3. leads still `new` more than 24 hours after capture.

```ts
AttentionItem = {
  id: string;                    // stable per source row, e.g. "call-<uuid>"
  kind: "failed_call" | "failed_message" | "queued_message" | "unactioned_lead";
  title: string; detail: string; // rendered verbatim — write them for a tradesman, not a developer
  occurred_at: ISODateTime;
  href: string;                  // deep link, e.g. "/dashboard/calls?call=<uuid>"
  severity: "warning" | "error";
}
```

Errors first, then newest first. The dashboard renders this list as-is, so the copy is yours to get right.

---

## Marketplace (public, Phase 2)

No auth. These routes are public, so they must return **only** the fields below — never a customer's phone number, never anything from another business.

### `getCategories(): Promise<MarketplaceCategory[]>`

Proposed route: **`GET /api/marketplace/categories`**

`{ slug (TradeType), label, plural, icon (lucide name), from_price_cents, listing_count }`. The homepage grid and the `/find` pages render `from_price_cents` up front — a category with no price shows the category without one, so it's fine to compute it lazily, but not to omit the field.

### `getLocations(): Promise<MarketplaceLocation[]>` · `getLocation(slug): Promise<MarketplaceLocation | null>`

Proposed routes: **`GET /api/marketplace/locations`**, **`GET /api/marketplace/locations/[slug]`**

`{ slug, town, county }` — towns with at least one listing. `slug` is the URL segment in `/find/[category]/[location]`.

### `searchListings(input: SearchListingsInput): Promise<MarketplaceListing[]>`

Proposed route: **`GET /api/marketplace/listings?category=&location=&query=&min_rating=&max_from_price_cents=&answers_24_7=&sort=`**

`sort` is `recommended` (default: verified first, then rating, then review volume), `rating`, or `price`.

```ts
MarketplaceListing = {
  business_id, slug, business_name, headline, categories[], service_area,
  photo_url | null, town, county,
  rating: number | null, review_count: number,     // rating rounded to 1 decimal
  from_price_cents: number | null,
  verified: boolean, answers_24_7: boolean,
  responds_within_minutes: number | null
}
```

> **Needed from you:** a `slug` column on `tradesman_profiles` (unique), and a service-area → town join so a listing can appear under several towns.

### `recommendTradespeople(input: RecommendTradespeopleInput): Promise<MarketplaceListing[]>`

Proposed route: **`POST /api/marketplace/recommend`**

Backs the "find a tradesman" chat on `/find/[category]/[location]` — a guided,
scripted conversation (not a live model call; there's no AI service wired up
yet) that asks a homeowner what's wrong, their Eircode, and a preferred date
range, then returns up to 5 `MarketplaceListing`s, best match first.

```ts
RecommendTradespeopleInput = {
  category (TradeType), location,        // same meaning as SearchListingsInput
  issue_description: string,             // free text from the chat
  eircode?: string,
  date_range?: string                    // a quick-reply label, e.g. "As soon as possible"
}
```

The mock implementation is a keyword-overlap + reputation heuristic over the
same listings `searchListings` would return for that category/location — it
is explicitly **not** real language understanding. The function is written so
a real matching service (rules-based or model-backed) can replace the body
without any component changing, same as every other function here.

> **Needed from you:** if and when there's a real matching/AI service behind
> this, confirm the route shape above and whether ranking should move
> server-side entirely or stay a client-callable scoring pass.

### `getMarketplaceProfile(slug: string): Promise<MarketplaceProfile | null>`

Proposed route: **`GET /api/marketplace/pro/[slug]`**

`MarketplaceListing` plus `bio`, `photo_urls[]`, `phone`, `member_since`, `services[]` (`{ name, description, from_price_cents }`) and `reviews[]`.

**The reviews must come back with the profile.** A listing that shows a review count and a profile that can't show the reviews is the exact pattern we're differentiating against.

### `getFeaturedReviews(limit?): Promise<(MarketplaceReview & { business_name, business_slug })[]>`

Proposed route: **`GET /api/marketplace/reviews?limit=`**

Most recent reviews across the marketplace, for the homepage. Must be the same rows `/pro/[slug]` renders.

### `createMarketplaceLead(input): Promise<CreateMarketplaceLeadResult>`

Proposed route: **`POST /api/marketplace/leads`**

The homeowner contact/booking form. Creates a `customers` row when the phone number is new, then a `leads` row with **`source = "marketplace"`** so it lands in that tradesman's dashboard beside the phone leads.

```ts
CreateMarketplaceLeadInput = {
  business_id, customer_name, customer_phone,
  customer_email?, customer_address?,
  service, description, urgency, preferred_channel,  // "sms" | "whatsapp"
  preferred_date_range?   // not in the shared schema yet, see below
}
CreateMarketplaceLeadResult = { lead_id: UUID; expected_response_minutes: number }
```

> **Needed from you:** `preferred_date_range` isn't a column on `leads` yet.
> It's populated when a homeowner arrives from the "find a tradesman" chat
> with a date range already picked (see `recommendTradespeople` above) —
> shown to the tradesman as context, not currently a bookable field anywhere
> else in the product.

`expected_response_minutes` is what the confirmation screen promises the homeowner, so it should reflect that business's real responsiveness, not a constant.

Public and unauthenticated: rate-limit it, and verify the phone number before the lead reaches a tradesman's dashboard.

### Match requests

The "confirm this tradesman" flow: a homeowner who arrived on `/pro/[slug]`
from the "find a tradesman" chat (`recommendTradespeople`, above) can send
that specific business a request instead of the general callback form. It
lands in a dedicated **Requests** inbox (`/dashboard/requests`) for an
explicit accept/decline, separate from the "Needs you" list every other
lead source feeds.

#### `getMatchRequests(): Promise<MatchRequest[]>`

Proposed route: **`GET /api/match-requests`**

Newest first, scoped to the signed-in business (RLS, same as everything
else in the dashboard).

#### `createMatchRequest(input: CreateMatchRequestInput): Promise<MatchRequest>`

Proposed route: **`POST /api/match-requests`**

```ts
CreateMatchRequestInput = {
  business_id, customer_name, customer_phone,
  customer_email?, customer_address?,
  service, description, preferred_date_range?,
  preferred_channel,          // "sms" | "whatsapp"
  fallback_slugs: string[],   // the chat's other recommendations, in order
}
```

Public and unauthenticated, same as `createMarketplaceLead`: rate-limit it.

#### `respondToMatchRequest(input: RespondToMatchRequestInput): Promise<RespondToMatchRequestResult>`

Proposed route: **`POST /api/match-requests/[id]/respond`**

```ts
RespondToMatchRequestInput = { request_id: UUID; response: "accepted" | "declined" }
RespondToMatchRequestResult = { request: MatchRequest; fallback?: MarketplaceListing }
```

**Accept** books the job: creates a real `leads` row (`source =
"marketplace"`, `status = "booked"`) and a real outbound `messages` row,
the same "you're booked in" confirmation `createMarketplaceLead`'s jobs
send — so it shows up on `/dashboard/leads` and `/dashboard/messages` like
any other booking.

**Decline** pops the next slug off `fallback_slugs` and resolves the
enquiry to that business immediately, returning their listing as
`fallback` so the UI can show "passed to X instead" with a link to their
profile.

> **What's simulated here, and why:** there's no real WhatsApp/SMS
> delivery anywhere in this project yet (see `messages` in Open questions
> below) — accepting a request never actually notifies the homeowner, it
> only writes the `messages` row a real integration would send from. The
> decline cascade is simulated instant, too: in a real system the fallback
> business would get their own pending request in their own dashboard and
> might decline as well, but this mock only has one signed-in business to
> ever respond as, so `respondToMatchRequest` resolves the fallback
> synchronously instead of creating a second pending request nothing could
> ever act on. Both of these move server-side for real: the cascade needs
> to become an actual queue (try the next business, wait for their
> response or a timeout, repeat), and accept/decline both need to trigger
> real outbound messages once a Twilio/WhatsApp Business API integration
> exists.

> **Needed from you:** confirm `match_requests` as its own table (it isn't
> a `leads` row until accepted — a declined request was never a booking)
> and whether the fallback cascade should be a synchronous chain of writes
> like here, or an async job queue with its own timeout-and-retry policy.

---

## Open questions for the backend pair

1. **`leads.urgency` values.** The UI assumes `emergency | urgent | routine` and sorts emergencies first. Confirm or give us the real enum.
2. **`messages.status` values.** We normalise to `queued | sent | delivered | failed`. What do Twilio's statuses map to?
3. **`calls` columns.** We need `started_at`, `duration_seconds`, `corrected_outcome`, `corrected_at`.
4. **Confirmation preferences.** `confirmation_channel` and `confirmation_fallback` need a home (see Business profile).
5. **`tradesman_profiles.slug`.** Needed for `/pro/[slug]`, and it must be stable — these are public URLs.
6. **Booked value.** `booked_value_cents_this_week` is currently jobs × a flat €185 estimate. If jobs get a real value column, we'll render that instead and drop the estimate.
7. **Photo storage.** `photo_urls[]` is empty in mock data and listings render an initials tile. Tell us the Supabase Storage bucket/URL pattern and we'll add it to `next.config.ts` `images.remotePatterns`.
8. **Session refresh.** Sign-out is wired (`signOut()`); tell us whether you want the client to refresh the Supabase session itself or go through a route.
9. **`leads.preferred_date_range`.** Not in the shared schema. Needed so a homeowner's date preference from the "find a tradesman" chat survives into the lead a tradesman sees.
10. **Real matching/AI service for `recommendTradespeople`.** Currently a client-side keyword + reputation heuristic over mock data — confirm the route shape in that section above once there's a real service behind it.
11. **`match_requests` table and fallback cascade.** New for the "confirm this tradesman" flow (see Match requests above) — confirm the table shape and whether the decline-to-next-business cascade should be synchronous or an async queue.

## Which screen calls what

| Screen                        | Functions it calls                                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/` (homepage)                | `getCategories`, `getLocations`, `getFeaturedReviews`                                                                   |
| `/find`                       | `getCategories`, `getLocations`                                                                                         |
| `/find/[category]/[location]` | `getCategories`, `getLocations`, `getLocation`, `searchListings`, `recommendTradespeople`                               |
| `/pro/[slug]`                 | `getMarketplaceProfile`, `getCategories`, `createMarketplaceLead` or `createMatchRequest` (when arriving from the chat) |
| Dashboard shell               | `getSession`, `getMatchRequests` (for the nav badge)                                                                    |
| `/dashboard`                  | `getDashboardSummary`, `getAttentionItems`, `getJobs`, `getCalls`                                                       |
| `/dashboard/requests`         | `getMatchRequests`, `respondToMatchRequest`, `getMarketplaceProfile` (for a declined request's fallback preview)        |
| `/dashboard/leads`            | `getLeads`, `updateLeadStatus`                                                                                          |
| `/dashboard/calendar`         | `getSession`, `getJobs`, `getAvailability`, `updateJob`                                                                 |
| `/dashboard/calls`            | `getCalls`, `reclassifyCall`                                                                                            |
| `/dashboard/messages`         | `getMessages`, `retryMessage`                                                                                           |
| `/dashboard/availability`     | `getSession`, `getAvailability`, `saveAvailability`                                                                     |
| `/dashboard/settings`         | `getBusiness`, `updateBusiness`                                                                                         |

The marketing and marketplace pages are React Server Components (so they're
indexable); the dashboard screens are client components, because they mutate.
When these become real routes, the server pages can call the data layer directly
and the client screens will go over HTTP — the function signatures don't change
either way.

## Where the stubs are

Every place the UI needs something from you is marked in code:

```bash
grep -rn "TODO(backend)" lib app components
```
