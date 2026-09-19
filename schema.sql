-- =============================================================================
-- TradeDesk AI — Initial Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- LEARNING NOTE: We split this into sections so you can run them one at a time
-- and understand what each block does before moving on.
-- =============================================================================


-- =============================================================================
-- SECTION 1: CUSTOM ENUM TYPES
-- =============================================================================
--
-- WHAT IS AN ENUM?
-- A Postgres enum is a column type that can only hold one of a fixed set of
-- string values. It's better than a plain text column because:
--   1. The database rejects invalid values (no typos reaching your data)
--   2. It documents the allowed values right in the schema
--   3. It matches exactly what the TypeScript types.ts file declares
--
-- IMPORTANT: The values here MUST match types.ts exactly — the UI renders
-- badges based on these strings.
-- =============================================================================

-- Trade types (what kind of tradesperson the business is)
CREATE TYPE trade_type AS ENUM (
  'plumber',
  'electrician',
  'handyman',
  'carpenter',
  'painter',
  'roofer',
  'tiler',
  'plasterer',
  'landscaper',
  'locksmith',
  'heating_engineer',
  'appliance_repair'
);

-- Lead pipeline stages: new → qualified → booked → lost
CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'booked', 'lost');

-- Where a lead came from
CREATE TYPE lead_source AS ENUM ('phone', 'marketplace', 'manual');

-- How urgent the job is (UI sorts emergency-first)
CREATE TYPE lead_urgency AS ENUM ('emergency', 'urgent', 'routine');

-- Job lifecycle: booked → confirmed → completed → cancelled
CREATE TYPE job_status AS ENUM ('booked', 'confirmed', 'completed', 'cancelled');

-- What the AI decided after a call
CREATE TYPE call_outcome AS ENUM (
  'booked',
  'lead_only',
  'callback_required',
  'spam',
  'failed'
);

-- Which messaging channel to use for confirmations
CREATE TYPE message_channel AS ENUM ('sms', 'whatsapp');

-- Whether a message was inbound (customer texting us) or outbound (us texting them)
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');

-- Twilio delivery status, normalised from Twilio's raw statuses
CREATE TYPE message_status AS ENUM ('queued', 'sent', 'delivered', 'failed');

-- Marketplace match request lifecycle
CREATE TYPE match_request_status AS ENUM ('pending', 'accepted', 'declined');

-- Profile roles
CREATE TYPE profile_role AS ENUM ('owner', 'staff');


-- =============================================================================
-- SECTION 2: CORE TABLES
-- =============================================================================
--
-- LEARNING NOTES:
-- * uuid_generate_v4() generates a random UUID for each row's primary key.
--   UUIDs are better than auto-incrementing integers for a SaaS product because
--   they don't reveal how many rows you have and are safe to expose in URLs.
-- * DEFAULT NOW() means Postgres fills in the timestamp automatically.
-- * NOT NULL means the column is required — Postgres rejects a row without it.
-- * REFERENCES other_table(id) is a foreign key — Postgres rejects a value
--   that doesn't exist in the referenced table.
-- * ON DELETE CASCADE means: if the parent row is deleted, delete this row too.
-- =============================================================================

-- businesses
-- The central entity. Every tradesperson signs up as a business.
-- The id here is also used as the RLS boundary:
-- every other table's rows are scoped to a business_id.
CREATE TABLE businesses (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                   TEXT NOT NULL,
  timezone               TEXT NOT NULL DEFAULT 'Europe/Dublin',
  phone                  TEXT NOT NULL,
  trade_type             trade_type NOT NULL,

  -- GAP COLUMN: which channel the AI uses for booking confirmations
  -- The voice agent reads this to decide SMS vs WhatsApp
  confirmation_channel   message_channel NOT NULL DEFAULT 'sms',

  -- GAP COLUMN: if true, fall back to the other channel when the first fails
  confirmation_fallback  BOOLEAN NOT NULL DEFAULT false,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- profiles
-- A person who can sign in, linked to exactly one business.
-- The id here matches the Supabase auth.users.id — same UUID, two tables.
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  role         profile_role NOT NULL DEFAULT 'owner',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- customers
-- Homeowners / callers. Each one belongs to a business (scoped by RLS).
CREATE TABLE customers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  phone        TEXT NOT NULL,
  email        TEXT,
  address      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- leads
-- A potential job. Created by the AI (phone), the marketplace, or manually.
CREATE TABLE leads (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  service               TEXT NOT NULL,
  description           TEXT NOT NULL,
  urgency               lead_urgency NOT NULL DEFAULT 'routine',
  status                lead_status NOT NULL DEFAULT 'new',
  source                lead_source NOT NULL,

  -- GAP COLUMN: homeowner preferred date range from the AI chat
  preferred_date_range  TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- availability_rules
-- One row per working window per weekday.
-- Multiple rows per day allowed (split days).
-- weekday: 0 = Sunday ... 6 = Saturday (matches Postgres EXTRACT(DOW))
CREATE TABLE availability_rules (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  weekday      SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time   TIME NOT NULL,
  end_time     TIME NOT NULL,
  CHECK (end_time > start_time)
);

-- jobs
-- A booked appointment, created when a lead is confirmed.
CREATE TABLE jobs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  starts_at  TIMESTAMPTZ NOT NULL,
  ends_at    TIMESTAMPTZ NOT NULL,
  status     job_status NOT NULL DEFAULT 'booked',
  notes      TEXT,
  CHECK (ends_at > starts_at)
);

-- calls
-- One row per inbound call handled by the AI front desk.
-- customer_id is NULL for spam / unknown callers.
CREATE TABLE calls (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id       UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  provider_call_id  TEXT NOT NULL,
  outcome           call_outcome NOT NULL,
  summary           TEXT NOT NULL,
  started_at        TIMESTAMPTZ NOT NULL,
  duration_seconds  INTEGER NOT NULL DEFAULT 0,

  -- GAP COLUMNS: NEVER overwrite outcome.
  -- The AI's original guess stays in outcome forever.
  -- Corrections go here so accuracy stays measurable.
  corrected_outcome  call_outcome,
  corrected_at       TIMESTAMPTZ
);

-- messages
-- Booking confirmations and follow-ups sent via SMS or WhatsApp.
CREATE TABLE messages (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel        message_channel NOT NULL,
  direction      message_direction NOT NULL DEFAULT 'outbound',
  body           TEXT NOT NULL,
  status         message_status NOT NULL DEFAULT 'queued',
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 3: MARKETPLACE TABLES (Phase 2)
-- =============================================================================

-- tradesman_profiles
-- The public listing for a business on the marketplace.
CREATE TABLE tradesman_profiles (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id   UUID NOT NULL UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,

  -- GAP COLUMN: URL segment for /pro/[slug] — must be unique and stable
  slug          TEXT NOT NULL UNIQUE,

  headline      TEXT NOT NULL,
  bio           TEXT NOT NULL,
  service_area  TEXT NOT NULL,
  town          TEXT NOT NULL,
  county        TEXT NOT NULL,
  photo_urls    TEXT[] NOT NULL DEFAULT '{}',
  categories    trade_type[] NOT NULL,
  from_price_cents         INTEGER,
  verified                 BOOLEAN NOT NULL DEFAULT false,
  answers_24_7             BOOLEAN NOT NULL DEFAULT false,
  responds_within_minutes  INTEGER,
  member_since             DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- marketplace_services
-- The price list shown on a tradesman's profile page.
CREATE TABLE marketplace_services (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id       UUID NOT NULL REFERENCES tradesman_profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT NOT NULL,
  from_price_cents INTEGER NOT NULL,
  sort_order       SMALLINT NOT NULL DEFAULT 0
);

-- reviews
CREATE TABLE reviews (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  job_id       UUID REFERENCES jobs(id) ON DELETE SET NULL,
  customer_id  UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- match_requests
-- GAP TABLE: the 'confirm this tradesman' flow.
-- On accept: creates a leads row + messages row.
-- On decline: next slug in fallback_slugs gets the enquiry.
CREATE TABLE match_requests (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id           UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_name         TEXT NOT NULL,
  customer_phone        TEXT NOT NULL,
  customer_email        TEXT,
  customer_address      TEXT,
  service               TEXT NOT NULL,
  description           TEXT NOT NULL,
  preferred_date_range  TEXT,
  preferred_channel     message_channel NOT NULL,
  status                match_request_status NOT NULL DEFAULT 'pending',
  fallback_slugs        TEXT[] NOT NULL DEFAULT '{}',
  resolved_via_slug     TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =============================================================================
-- SECTION 4: INDEXES
-- =============================================================================
--
-- WHAT IS AN INDEX?
-- An index lets Postgres find rows without scanning every row in a table.
-- Index every foreign key and every column you filter or sort by.
-- =============================================================================

CREATE INDEX idx_profiles_business_id ON profiles(business_id);
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_leads_customer_id ON leads(customer_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_availability_business_weekday ON availability_rules(business_id, weekday, start_time);
CREATE INDEX idx_jobs_lead_id ON jobs(lead_id);
CREATE INDEX idx_jobs_starts_at ON jobs(starts_at);
CREATE INDEX idx_calls_business_id ON calls(business_id);
CREATE INDEX idx_calls_customer_id ON calls(customer_id);
CREATE INDEX idx_calls_started_at ON calls(started_at DESC);
CREATE INDEX idx_calls_outcome ON calls(outcome);
CREATE INDEX idx_messages_customer_id ON messages(customer_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_status ON messages(status);
CREATE UNIQUE INDEX idx_tradesman_profiles_slug ON tradesman_profiles(slug);
CREATE INDEX idx_tradesman_profiles_business_id ON tradesman_profiles(business_id);
CREATE INDEX idx_match_requests_business_id ON match_requests(business_id);
CREATE INDEX idx_match_requests_status ON match_requests(status);


-- =============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- =============================================================================
--
-- WHAT IS RLS?
-- Row Level Security means the database enforces who can read/write each row.
-- Even if a bug in your API code forgot WHERE business_id = $1, Postgres
-- silently filters the rows. Think of it as a safety net at the DB layer.
--
-- HOW IT WORKS IN SUPABASE:
-- Supabase puts the signed-in user's UUID into auth.uid().
-- We check if that uid belongs to a profile whose business_id matches the row.
-- If yes: row is visible. If no: row doesn't exist (not even an error).
-- =============================================================================

-- Enable RLS on every table first
ALTER TABLE businesses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_rules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls                ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE tradesman_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_requests       ENABLE ROW LEVEL SECURITY;

-- Helper: returns the business_id for whoever is currently signed in.
-- Used in every policy so the logic lives in one place.
CREATE OR REPLACE FUNCTION my_business_id()
RETURNS UUID LANGUAGE sql STABLE AS $$
  SELECT business_id FROM profiles WHERE id = auth.uid()
$$;

-- businesses: only your own row
CREATE POLICY "businesses: own row only"
  ON businesses FOR ALL
  USING (id = my_business_id());

-- profiles: only profiles in your business
CREATE POLICY "profiles: own business only"
  ON profiles FOR ALL
  USING (business_id = my_business_id());

-- customers: scoped to your business
CREATE POLICY "customers: own business only"
  ON customers FOR ALL
  USING (business_id = my_business_id());

-- leads: scoped via customer -> business
CREATE POLICY "leads: own business only"
  ON leads FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE business_id = my_business_id()
    )
  );

-- availability_rules: directly scoped by business_id
CREATE POLICY "availability: own business only"
  ON availability_rules FOR ALL
  USING (business_id = my_business_id());

-- jobs: scoped via lead -> customer -> business
CREATE POLICY "jobs: own business only"
  ON jobs FOR ALL
  USING (
    lead_id IN (
      SELECT l.id FROM leads l
      JOIN customers c ON c.id = l.customer_id
      WHERE c.business_id = my_business_id()
    )
  );

-- calls: directly scoped by business_id
CREATE POLICY "calls: own business only"
  ON calls FOR ALL
  USING (business_id = my_business_id());

-- messages: scoped via customer -> business
CREATE POLICY "messages: own business only"
  ON messages FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE business_id = my_business_id()
    )
  );

-- match_requests: directly scoped by business_id
CREATE POLICY "match_requests: own business only"
  ON match_requests FOR ALL
  USING (business_id = my_business_id());

-- tradesman_profiles: owners manage their own; public can browse all
CREATE POLICY "tradesman_profiles: owner can manage"
  ON tradesman_profiles FOR ALL
  USING (business_id = my_business_id());

CREATE POLICY "tradesman_profiles: public read"
  ON tradesman_profiles FOR SELECT
  USING (true);

-- marketplace_services: same dual-policy pattern
CREATE POLICY "marketplace_services: owner can manage"
  ON marketplace_services FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM tradesman_profiles WHERE business_id = my_business_id()
    )
  );

CREATE POLICY "marketplace_services: public read"
  ON marketplace_services FOR SELECT
  USING (true);

-- reviews: public read; only owning business can manage
CREATE POLICY "reviews: owner can manage"
  ON reviews FOR ALL
  USING (business_id = my_business_id());

CREATE POLICY "reviews: public read"
  ON reviews FOR SELECT
  USING (true);
