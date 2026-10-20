# Backend Files — What They Do & What's Left To Build

## How the architecture works (read this first)

```
Browser / React component
        │
        ▼
  lib/api/*.ts          ← THE FILES YOU EDIT TO WIRE A REAL BACKEND
        │
   today: reads from mock/store.ts (in-memory JavaScript objects)
   tomorrow: calls fetch('/api/...') Next.js route handlers
        │
        ▼
  lib/api/mock/         ← FAKE DATABASE — delete once real routes exist
    seed.ts             — all the hardcoded fixture rows
    store.ts            — in-memory "db" object that holds them
    auth-store.ts       — localStorage user store (demo login)
    marketplace-seed.ts — fake tradesman listings
```

The genius of this design: **every component only ever imports from `lib/api/index.ts`**.  
That means replacing the mock with a real API route is a **one-function edit inside `lib/api/`** — no components change at all.

---

## File-by-file breakdown

### 1. `lib/api/types.ts` — The contract (don't change lightly)

This is the **single source of truth for all data shapes**. It mirrors what the Supabase database tables look like, column for column. It contains:

- **Primitive types** — `UUID`, `ISODateTime`, `TimeOfDay`
- **Enums** — `LeadStatus`, `CallOutcome`, `MessageChannel` etc. These must match DB values exactly because the badges render them directly
- **Table shapes** — `Business`, `Lead`, `Call`, `Job`, `Message`, `Customer` etc.
- **Read models** — denormalised "joined" shapes like `LeadListItem` (a lead + its customer + its job in one object)
- **Input shapes** — what you POST/PATCH to each route
- **Schema gaps** — 6 fields/tables marked `TODO(backend)` that don't exist in the DB yet

**What needs doing:** Before building anything, confirm the 6 schema gaps with the backend team (see Open Questions in the contract doc).

---

### 2. `lib/api/mock/store.ts` — The fake database

```ts
export const db = {
  business: ...,
  profile: ...,
  customers: [...],
  leads: [...],
  jobs: [...],
  calls: [...],
  messages: [...],
  availability: [...],
  matchRequests: [...],
};
```

This is just a JavaScript object. Every mock function reads from and writes to it. It resets on page reload. The `delay()` helper adds fake network latency so loading states work.

**What happens to this when you go live:** You delete the imports of `db` and `delay` from each `lib/api/*.ts` file and replace them with real `fetch()` calls. The mock files themselves can be deleted once all routes are live.

---

### 3. `lib/api/auth.ts` — Sign up, sign in, sign out

**What it does today:**
- Checks if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars are set
- If **not set** → uses `localStorage` accounts (SHA-256 hashed passwords stored in the browser)
- If **set** → falls through to `supabase.auth` calls (partially written already!)

**What you actually need to change:**
```
signUp()         → supabase.auth.signUp() + INSERT into businesses + profiles
signIn()         → supabase.auth.signInWithPassword()
signOut()        → supabase.auth.signOut()        ← already wired!
getCurrentUser() → supabase.auth.getSession() + join profiles row
```

**The key complication:** when someone signs up, you need 3 rows created atomically:
1. `auth.users` row (Supabase creates this)
2. `businesses` row (your code or a DB trigger creates this)
3. `profiles` row (links the user to the business)

---

### 4. `lib/api/session.ts` — Who is signed in + which business

**What it does today:**
```ts
export async function getSession() {
  const user = await getCurrentUser();
  if (!user) throw new NotSignedInError(); // redirects to /login
  return { profile: db.profile, business: db.business }; // fake data!
}
```

**What it becomes:**
```ts
// Call GET /api/session → read Supabase cookie → join profiles → businesses
// Return { profile, business }
// Throw NotSignedInError (→ 401) when nobody is signed in
```

This is called by **every dashboard screen** and by the dashboard shell (for redirect logic). It's the most critical function — get this right first.

---

### 5. `lib/api/business.ts` — Business profile + settings

**Two functions:**

| Function | Route | What it does |
|---|---|---|
| `getBusiness()` | `GET /api/business` | Return the signed-in business's row |
| `updateBusiness(input)` | `PATCH /api/business` | Save name, phone, timezone, trade type, confirmation settings |

**Schema gap:** `confirmation_channel` and `confirmation_fallback` don't exist in the DB yet. These tell the AI voice agent whether to text via SMS or WhatsApp. Must be added before this route is live.

---

### 6. `lib/api/availability.ts` — Working hours

**Two functions:**

| Function | Route | What it does |
|---|---|---|
| `getAvailability(businessId)` | `GET /api/availability` | Return the business's working-hour windows |
| `saveAvailability(businessId, rules)` | `PUT /api/availability` | Replace the whole week atomically |

**Important design note:** the save is a **full replace** (delete all, then insert), not a diff. This is deliberate — it means the AI voice agent never sees a half-saved week during a call.

Each row is: `{ weekday: 0-6, start_time: "HH:MM", end_time: "HH:MM" }`. Multiple rows per day are allowed (split days, e.g. 08:00–13:00 and 14:00–18:00).

---

### 7. `lib/api/leads.ts` — Lead management

**Three functions:**

| Function | Route | What it does |
|---|---|---|
| `getLeads(filters)` | `GET /api/leads?status=&source=&query=` | Filterable, newest-first list |
| `getLead(id)` | `GET /api/leads/[id]` | Single lead |
| `updateLeadStatus(input)` | `PATCH /api/leads/[id]` | Move a lead through the pipeline |

**What each lead row returns (joined server-side):**
```ts
LeadListItem = lead row
  + customer: { id, name, phone, email, address }
  + job: { id, starts_at, ends_at, status } | null   // if a job was booked
  + call_id: UUID | null                              // if source === "phone"
```

**Important rule:** moving a lead to `booked` without an attached job should be rejected. Booking goes through a separate `lib/booking` service (not built yet).

---

### 8. `lib/api/jobs.ts` — Calendar jobs

**Two functions:**

| Function | Route | What it does |
|---|---|---|
| `getJobs(range)` | `GET /api/jobs?from=&to=` | Jobs in a date range (the calendar) |
| `updateJob(input)` | `PATCH /api/jobs/[id]` | Mark a job confirmed/completed/cancelled |

**Important rule:** the UI deliberately **cannot move a job's time** — rescheduling needs a conflict-checking `lib/booking` service to prevent double-booking.

Each job row returns joined lead + customer data so the calendar tooltip has everything it needs in one request.

---

### 9. `lib/api/calls.ts` — AI call log

**Two functions:**

| Function | Route | What it does |
|---|---|---|
| `getCalls(filters)` | `GET /api/calls?outcome=&query=` | Most-recent-first call log |
| `reclassifyCall(input)` | `POST /api/calls/[id]/reclassify` | Correct what the AI thought the call was |

**Schema gap:** the DB needs `corrected_outcome` and `corrected_at` columns on the `calls` table. The original `outcome` column must **never be overwritten** — keeping the AI's original guess is what lets you measure accuracy and generate training data.

---

### 10. `lib/api/messages.ts` — WhatsApp / SMS confirmations

**Two functions:**

| Function | Route | What it does |
|---|---|---|
| `getMessages(customerId?)` | `GET /api/messages?customer_id=` | Confirmation log |
| `retryMessage(id, channel?)` | `POST /api/messages/[id]/retry` | Resend a failed confirmation |

**What the retry does:** instead of mutating the failed row, the backend should **insert a new `messages` row** and return it. The failure stays in history — visible, not overwritten.

**The big gap:** no Twilio integration exists yet. Today the mock just flips a status field. In production, retry triggers a real outbound SMS or WhatsApp message via Twilio's API.

---

### 11. `lib/api/dashboard.ts` — Overview counters + attention queue

**Two functions:**

| Function | Route | What it does |
|---|---|---|
| `getDashboardSummary()` | `GET /api/dashboard/summary` | Calls / leads / jobs this week |
| `getAttentionItems()` | `GET /api/dashboard/attention` | Failed calls, failed messages, stale leads |

These are currently computed in JavaScript over the mock `db`. In production they should be **a single SQL query each**, computed server-side in the business's own timezone (from `businesses.timezone`).

The `booked_value_cents_this_week` counter is currently `job_count × €185 flat estimate`. It should use a real `jobs.value_cents` column when one is added.

---

### 12. `lib/api/marketplace.ts` — Public tradesman search (Phase 2)

**8 functions** covering:
- `getCategories()` / `getLocations()` / `getLocation(slug)` — navigation data
- `searchListings(input)` — filtered, sorted tradesman search
- `recommendTradespeople(input)` — AI-guided chat recommendations (currently keyword heuristic)
- `getMarketplaceProfile(slug)` — full public tradesman profile
- `getFeaturedReviews(limit?)` — homepage reviews
- `createMarketplaceLead(input)` — homeowner contacts a tradesman (public, unauthenticated)

**Schema gap:** `tradesman_profiles.slug` column doesn't exist yet. It's needed for the `/pro/[slug]` public URL — must be unique and stable.

---

### 13. `lib/api/match-requests.ts` — Requests inbox (Phase 2)

**Three functions** for the "confirm this tradesman" flow:
- `getMatchRequests()` — list of homeowner match requests awaiting accept/decline
- `createMatchRequest(input)` — homeowner sends a request from the chat
- `respondToMatchRequest(input)` — tradesman accepts or declines

**Schema gap:** `match_requests` is not a real table yet. An accepted request creates a real `leads` row + a `messages` row. A declined request moves to the next business in `fallback_slugs[]`.

---

## What you need to build (in order)

```
Phase 1 — Foundation (must be first, everything else depends on it)
  1. Supabase project + env vars
  2. Database schema (tables + the 6 gap columns/tables)
  3. Auth: signUp() / signIn() / getCurrentUser() / getSession()
  4. Business profile: getBusiness() / updateBusiness()

Phase 2 — Dashboard core (build once auth works)
  5. Availability: getAvailability() / saveAvailability()
  6. Leads: getLeads() / getLead() / updateLeadStatus()
  7. Jobs: getJobs() / updateJob()
  8. Calls: getCalls() / reclassifyCall()
  9. Messages: getMessages() / retryMessage()
  10. Dashboard: getDashboardSummary() / getAttentionItems()

Phase 3 — Marketplace (public-facing, no auth required)
  11. Categories, locations, listings, profile
  12. createMarketplaceLead() + Twilio SMS/WhatsApp

Phase 4 — Advanced
  13. Match requests table + accept/decline cascade
  14. Real recommendTradespeople() (replace keyword heuristic)
  15. lib/booking — job conflict checking + rescheduling
  16. AI voice agent integration
```

> **Where to begin:** Start with Phase 1, Step 1 — get a Supabase project provisioned and the two env vars set. Once `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` exist, the auth screens automatically switch from demo mode to Supabase Auth UI — with zero code changes.
