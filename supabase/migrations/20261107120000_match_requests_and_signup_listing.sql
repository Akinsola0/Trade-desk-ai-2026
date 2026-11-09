-- =============================================================================
-- 20261107120000 — Match requests, and a draft listing at signup
-- Apply AFTER 20261105120100_marketplace_public_access.sql.
--
-- WHAT THIS DOES
--   1. tradesman_profiles gets a `published` flag. Signup now creates a DRAFT
--      profile for every business (so there is a row to edit), but nothing is
--      public until the owner publishes it. A CHECK stops an empty profile
--      being published. Existing rows are grandfathered in as published.
--   2. The public views, public-read policies and create_marketplace_lead only
--      see published profiles.
--   3. create_match_request (anon) and respond_to_match_request (tenant) make
--      the "confirm this tradesman" flow real, including the decline cascade:
--      a decline hands the enquiry to the next listed fallback as a genuine
--      pending request in THEIR inbox.
--   4. handle_new_user also creates the draft profile; existing businesses
--      without one are backfilled.
--
-- WHAT IT DOES NOT DO
--   Messages created on accept are `queued`, not `sent`: there is still no
--   SMS/WhatsApp delivery worker. The UI says so.
--   Per-IP rate limiting still needs an edge layer; see migration 2.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. published flag
-- -----------------------------------------------------------------------------
-- Added with DEFAULT true so every existing listing stays visible, then the
-- default flips so new rows start as drafts.
ALTER TABLE public.tradesman_profiles
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT true;
ALTER TABLE public.tradesman_profiles
  ALTER COLUMN published SET DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tradesman_profiles_published_complete'
      AND conrelid = 'public.tradesman_profiles'::regclass
  ) THEN
    ALTER TABLE public.tradesman_profiles
      ADD CONSTRAINT tradesman_profiles_published_complete CHECK (
        NOT published OR (
          btrim(headline) <> '' AND btrim(bio) <> '' AND btrim(service_area) <> ''
          AND btrim(town) <> '' AND btrim(county) <> ''
        )
      );
  END IF;
END
$$;

GRANT INSERT (published), UPDATE (published) ON public.tradesman_profiles TO authenticated;

-- Drafts are visible to their owner only. Two policies, not one: anon has no
-- EXECUTE on my_business_id(), and a policy that mentions it would error for anon.
DROP POLICY IF EXISTS tradesman_profiles_public_read ON public.tradesman_profiles;
DROP POLICY IF EXISTS tradesman_profiles_read_anon ON public.tradesman_profiles;
DROP POLICY IF EXISTS tradesman_profiles_read_authenticated ON public.tradesman_profiles;
CREATE POLICY tradesman_profiles_read_anon ON public.tradesman_profiles
  FOR SELECT TO anon
  USING (published);
CREATE POLICY tradesman_profiles_read_authenticated ON public.tradesman_profiles
  FOR SELECT TO authenticated
  USING (published OR business_id = (SELECT public.my_business_id()));

DROP POLICY IF EXISTS marketplace_services_public_read ON public.marketplace_services;
DROP POLICY IF EXISTS marketplace_services_read_anon ON public.marketplace_services;
DROP POLICY IF EXISTS marketplace_services_read_authenticated ON public.marketplace_services;
CREATE POLICY marketplace_services_read_anon ON public.marketplace_services
  FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.tradesman_profiles tp
    WHERE tp.id = marketplace_services.profile_id AND tp.published
  ));
CREATE POLICY marketplace_services_read_authenticated ON public.marketplace_services
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tradesman_profiles tp
    WHERE tp.id = marketplace_services.profile_id
      AND (tp.published OR tp.business_id = (SELECT public.my_business_id()))
  ));

-- -----------------------------------------------------------------------------
-- 2. Views: published profiles only (same columns as migration 2)
-- -----------------------------------------------------------------------------
DROP VIEW IF EXISTS public.marketplace_listings;
DROP VIEW IF EXISTS public.marketplace_profiles;
DROP VIEW IF EXISTS public.marketplace_reviews;

CREATE VIEW public.marketplace_profiles
WITH (security_invoker = false) AS
SELECT
  tp.id AS profile_id,
  tp.business_id,
  tp.slug,
  b.name AS business_name,
  b.phone,
  tp.headline,
  tp.bio,
  tp.service_area,
  tp.town,
  tp.county,
  tp.photo_urls,
  tp.photo_urls[1] AS photo_url,
  tp.categories,
  tp.from_price_cents,
  tp.verified,
  tp.answers_24_7,
  tp.responds_within_minutes,
  tp.member_since,
  COALESCE(rv.review_count, 0) AS review_count,
  rv.rating,
  COALESCE(sv.service_names, '{}'::text[]) AS service_names
FROM public.tradesman_profiles tp
JOIN public.businesses b ON b.id = tp.business_id
LEFT JOIN LATERAL (
  SELECT count(*)::int AS review_count, round(avg(r.rating), 1) AS rating
  FROM public.reviews r
  WHERE r.business_id = tp.business_id
) rv ON true
LEFT JOIN LATERAL (
  SELECT array_agg(s.name ORDER BY s.sort_order, s.name) AS service_names
  FROM public.marketplace_services s
  WHERE s.profile_id = tp.id
) sv ON true
WHERE tp.published;

CREATE VIEW public.marketplace_listings
WITH (security_invoker = false) AS
SELECT
  profile_id, business_id, slug, business_name, headline, service_area,
  photo_url, town, county, categories, from_price_cents, verified,
  answers_24_7, responds_within_minutes, review_count, rating, service_names
FROM public.marketplace_profiles;

CREATE VIEW public.marketplace_reviews
WITH (security_invoker = false) AS
SELECT
  r.id,
  r.business_id,
  b.name AS business_name,
  tp.slug AS business_slug,
  r.rating,
  r.comment,
  r.created_at,
  CASE
    WHEN btrim(c.name) ~ '\s' THEN
      split_part(btrim(c.name), ' ', 1) || ' ' ||
      upper(left(regexp_replace(btrim(c.name), '^.*\s', ''), 1)) || '.'
    ELSE btrim(c.name)
  END AS customer_name,
  l.service AS job_service
FROM public.reviews r
JOIN public.businesses b ON b.id = r.business_id
JOIN public.tradesman_profiles tp ON tp.business_id = r.business_id AND tp.published
JOIN public.customers c ON c.id = r.customer_id
LEFT JOIN public.jobs j ON j.id = r.job_id
LEFT JOIN public.leads l ON l.id = j.lead_id;

REVOKE ALL ON public.marketplace_profiles, public.marketplace_listings, public.marketplace_reviews
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.marketplace_profiles, public.marketplace_listings, public.marketplace_reviews
  TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. create_marketplace_lead: published profiles only (otherwise unchanged)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_marketplace_lead(
  p_business_id          uuid,
  p_customer_name        text,
  p_customer_phone       text,
  p_service              text,
  p_description          text,
  p_urgency              public.lead_urgency,
  p_customer_email       text DEFAULT NULL,
  p_customer_address     text DEFAULT NULL,
  p_preferred_date_range text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  -- Tune these here; they are the only abuse backstop that cannot be bypassed.
  c_max_per_phone_per_hour    CONSTANT int := 3;
  c_max_per_business_per_hour CONSTANT int := 30;

  v_name        text := btrim(p_customer_name);
  v_phone       text := regexp_replace(coalesce(p_customer_phone, ''), '[\s().-]', '', 'g');
  v_email       text := nullif(btrim(p_customer_email), '');
  v_address     text := nullif(btrim(p_customer_address), '');
  v_service     text := btrim(p_service);
  v_description text := btrim(p_description);
  v_dates       text := nullif(btrim(p_preferred_date_range), '');
  v_customer_id uuid;
  v_lead_id     uuid;
  v_recent      int;
BEGIN
  -- Input validation. Messages are shown to the homeowner, so keep them plain.
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Please enter your name.' USING ERRCODE = '22023';
  END IF;
  IF v_phone !~ '^\+?[0-9]{7,15}$' THEN
    RAISE EXCEPTION 'Please enter a valid phone number.' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address.' USING ERRCODE = '22023';
  END IF;
  IF v_address IS NOT NULL AND length(v_address) > 300 THEN
    RAISE EXCEPTION 'That address is too long.' USING ERRCODE = '22023';
  END IF;
  IF v_service IS NULL OR length(v_service) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Please say what you need doing.' USING ERRCODE = '22023';
  END IF;
  IF v_description IS NULL OR length(v_description) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Please describe the job (up to 2000 characters).' USING ERRCODE = '22023';
  END IF;
  IF v_dates IS NOT NULL AND length(v_dates) > 200 THEN
    RAISE EXCEPTION 'That date range is too long.' USING ERRCODE = '22023';
  END IF;

  -- Only businesses with a published listing can be reached from the marketplace.
  IF NOT EXISTS (
    SELECT 1 FROM public.tradesman_profiles tp
    WHERE tp.business_id = p_business_id AND tp.published
  ) THEN
    RAISE EXCEPTION 'This tradesperson is not taking enquiries right now.' USING ERRCODE = 'P0002';
  END IF;

  -- Serialise per business so the caps below are exact under concurrency.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  SELECT count(*) INTO v_recent
  FROM public.leads l
  JOIN public.customers c ON c.id = l.customer_id
  WHERE c.business_id = p_business_id
    AND l.source = 'marketplace'
    AND l.created_at > now() - interval '1 hour';
  IF v_recent >= c_max_per_business_per_hour THEN
    RAISE EXCEPTION 'This tradesperson is getting a lot of enquiries. Please try again shortly.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.leads l
  JOIN public.customers c ON c.id = l.customer_id
  WHERE c.business_id = p_business_id
    AND c.phone = v_phone
    AND l.source = 'marketplace'
    AND l.created_at > now() - interval '1 hour';
  IF v_recent >= c_max_per_phone_per_hour THEN
    RAISE EXCEPTION 'You have already sent a few enquiries to this tradesperson. They will be in touch.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Find or create the customer. An existing customer's details are NOT
  -- overwritten: anyone who knows a phone number could otherwise rewrite that
  -- person's name/email/address on the tradesman's dashboard.
  INSERT INTO public.customers (business_id, name, phone, email, address)
  VALUES (p_business_id, v_name, v_phone, v_email, v_address)
  ON CONFLICT (business_id, phone) DO NOTHING
  RETURNING id INTO v_customer_id;

  IF v_customer_id IS NULL THEN
    SELECT c.id INTO v_customer_id
    FROM public.customers c
    WHERE c.business_id = p_business_id AND c.phone = v_phone;
  END IF;

  INSERT INTO public.leads (
    customer_id, service, description, urgency, status, source, preferred_date_range
  )
  VALUES (
    v_customer_id, v_service, v_description, p_urgency, 'new', 'marketplace', v_dates
  )
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END
$$;

REVOKE ALL ON FUNCTION public.create_marketplace_lead(
  uuid, text, text, text, text, public.lead_urgency, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_marketplace_lead(
  uuid, text, text, text, text, public.lead_urgency, text, text, text
) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4. create_match_request — public "confirm this tradesman"
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_match_request(
  p_business_id          uuid,
  p_customer_name        text,
  p_customer_phone       text,
  p_service              text,
  p_description          text,
  p_preferred_channel    public.message_channel,
  p_customer_email       text DEFAULT NULL,
  p_customer_address     text DEFAULT NULL,
  p_preferred_date_range text DEFAULT NULL,
  p_fallback_slugs       text[] DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  c_max_per_phone_per_hour    CONSTANT int := 3;
  c_max_per_business_per_hour CONSTANT int := 30;
  c_max_fallbacks             CONSTANT int := 5;

  v_name        text := btrim(p_customer_name);
  v_phone       text := regexp_replace(coalesce(p_customer_phone, ''), '[\s().-]', '', 'g');
  v_email       text := nullif(btrim(p_customer_email), '');
  v_address     text := nullif(btrim(p_customer_address), '');
  v_service     text := btrim(p_service);
  v_description text := btrim(p_description);
  v_dates       text := nullif(btrim(p_preferred_date_range), '');
  v_self_slug   text;
  v_fallbacks   text[];
  v_recent      int;
  v_id          uuid;
BEGIN
  IF v_name IS NULL OR length(v_name) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Please enter your name.' USING ERRCODE = '22023';
  END IF;
  IF v_phone !~ '^\+?[0-9]{7,15}$' THEN
    RAISE EXCEPTION 'Please enter a valid phone number.' USING ERRCODE = '22023';
  END IF;
  IF v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$') THEN
    RAISE EXCEPTION 'Please enter a valid email address.' USING ERRCODE = '22023';
  END IF;
  IF v_address IS NOT NULL AND length(v_address) > 300 THEN
    RAISE EXCEPTION 'That address is too long.' USING ERRCODE = '22023';
  END IF;
  IF v_service IS NULL OR length(v_service) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Please say what you need doing.' USING ERRCODE = '22023';
  END IF;
  IF v_description IS NULL OR length(v_description) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Please describe the job (up to 2000 characters).' USING ERRCODE = '22023';
  END IF;
  IF v_dates IS NOT NULL AND length(v_dates) > 200 THEN
    RAISE EXCEPTION 'That date range is too long.' USING ERRCODE = '22023';
  END IF;
  IF p_preferred_channel IS NULL THEN
    RAISE EXCEPTION 'Please choose SMS or WhatsApp.' USING ERRCODE = '22023';
  END IF;

  SELECT tp.slug INTO v_self_slug
  FROM public.tradesman_profiles tp
  WHERE tp.business_id = p_business_id AND tp.published;
  IF v_self_slug IS NULL THEN
    RAISE EXCEPTION 'This tradesperson is not taking enquiries right now.' USING ERRCODE = 'P0002';
  END IF;

  -- Fallbacks: de-duplicated, never this business, well-formed, capped. Unknown
  -- or unpublished slugs are dropped later, at decline time, when they matter.
  SELECT coalesce(array_agg(s ORDER BY first_pos), '{}')
  INTO v_fallbacks
  FROM (
    SELECT s, min(ord) AS first_pos
    FROM unnest(coalesce(p_fallback_slugs, '{}')) WITH ORDINALITY AS u(s, ord)
    WHERE s ~ '^[a-z0-9][a-z0-9-]{0,99}$' AND s <> v_self_slug
    GROUP BY s
    ORDER BY min(ord)
    LIMIT c_max_fallbacks
  ) f;

  PERFORM pg_advisory_xact_lock(hashtextextended('match_request:' || p_business_id::text, 0));

  SELECT count(*) INTO v_recent
  FROM public.match_requests m
  WHERE m.business_id = p_business_id AND m.created_at > now() - interval '1 hour';
  IF v_recent >= c_max_per_business_per_hour THEN
    RAISE EXCEPTION 'This tradesperson is getting a lot of enquiries. Please try again shortly.'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT count(*) INTO v_recent
  FROM public.match_requests m
  WHERE m.business_id = p_business_id
    AND m.customer_phone = v_phone
    AND m.created_at > now() - interval '1 hour';
  IF v_recent >= c_max_per_phone_per_hour THEN
    RAISE EXCEPTION 'You have already sent a few requests to this tradesperson. They will be in touch.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.match_requests (
    business_id, customer_name, customer_phone, customer_email, customer_address,
    service, description, preferred_date_range, preferred_channel, fallback_slugs
  )
  VALUES (
    p_business_id, v_name, v_phone, v_email, v_address,
    v_service, v_description, v_dates, p_preferred_channel, v_fallbacks
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END
$$;

REVOKE ALL ON FUNCTION public.create_match_request(
  uuid, text, text, text, text, public.message_channel, text, text, text, text[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_match_request(
  uuid, text, text, text, text, public.message_channel, text, text, text, text[]
) TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5. respond_to_match_request — tenant accepts or declines
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.respond_to_match_request(
  p_request_id uuid,
  p_response   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r              public.match_requests%ROWTYPE;
  v_customer_id  uuid;
  v_lead_id      uuid;
  v_slug         text;
  v_idx          int;
  v_next_biz     uuid;
  v_rest         text[];
BEGIN
  IF p_response NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Response must be accepted or declined.' USING ERRCODE = '22023';
  END IF;

  -- Row lock: two quick clicks, or two staff members, cannot both answer.
  SELECT * INTO r
  FROM public.match_requests m
  WHERE m.id = p_request_id
    AND m.business_id = (SELECT public.my_business_id())
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match request not found.' USING ERRCODE = 'P0002';
  END IF;
  IF r.status <> 'pending' THEN
    RAISE EXCEPTION 'This request has already been answered.' USING ERRCODE = '22023';
  END IF;

  IF p_response = 'accepted' THEN
    INSERT INTO public.customers (business_id, name, phone, email, address)
    VALUES (r.business_id, r.customer_name, r.customer_phone, r.customer_email, r.customer_address)
    ON CONFLICT (business_id, phone) DO NOTHING
    RETURNING id INTO v_customer_id;

    IF v_customer_id IS NULL THEN
      SELECT c.id INTO v_customer_id
      FROM public.customers c
      WHERE c.business_id = r.business_id AND c.phone = r.customer_phone;
    END IF;

    INSERT INTO public.leads (
      customer_id, service, description, urgency, status, source, preferred_date_range
    )
    VALUES (
      v_customer_id, r.service, r.description,
      CASE WHEN coalesce(r.preferred_date_range, '') ~* '\m(asap|as soon as possible|emergency|today|now)\M'
           THEN 'urgent'::public.lead_urgency ELSE 'routine'::public.lead_urgency END,
      'booked', 'marketplace', r.preferred_date_range
    )
    RETURNING id INTO v_lead_id;

    -- Queued, not sent: no delivery worker exists yet.
    INSERT INTO public.messages (customer_id, channel, direction, body, status)
    VALUES (
      v_customer_id, r.preferred_channel, 'outbound',
      'Good news — your request has been accepted'
        || CASE WHEN r.preferred_date_range IS NOT NULL
                THEN ', ' || lower(r.preferred_date_range) ELSE '' END
        || '. We''ll be in touch to confirm the details.',
      'queued'
    );

    UPDATE public.match_requests SET status = 'accepted' WHERE id = r.id;
    RETURN jsonb_build_object('status', 'accepted', 'lead_id', v_lead_id);
  END IF;

  -- Declined: hand the enquiry to the first fallback that is still listed.
  v_slug := NULL;
  FOR v_idx IN 1 .. coalesce(array_length(r.fallback_slugs, 1), 0) LOOP
    SELECT tp.business_id INTO v_next_biz
    FROM public.tradesman_profiles tp
    WHERE tp.slug = r.fallback_slugs[v_idx]
      AND tp.published
      AND tp.business_id <> r.business_id;
    IF FOUND THEN
      v_slug := r.fallback_slugs[v_idx];
      v_rest := r.fallback_slugs[v_idx + 1 : array_length(r.fallback_slugs, 1)];
      EXIT;
    END IF;
  END LOOP;

  IF v_slug IS NOT NULL THEN
    INSERT INTO public.match_requests (
      business_id, customer_name, customer_phone, customer_email, customer_address,
      service, description, preferred_date_range, preferred_channel, fallback_slugs
    )
    VALUES (
      v_next_biz, r.customer_name, r.customer_phone, r.customer_email, r.customer_address,
      r.service, r.description, r.preferred_date_range, r.preferred_channel,
      coalesce(v_rest, '{}')
    );
  END IF;

  UPDATE public.match_requests
  SET status = 'declined', resolved_via_slug = v_slug
  WHERE id = r.id;

  RETURN jsonb_build_object('status', 'declined', 'resolved_via_slug', v_slug);
END
$$;

REVOKE ALL ON FUNCTION public.respond_to_match_request(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_match_request(uuid, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Draft listing at signup
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.listing_slug(p_name text, p_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT
    coalesce(
      nullif(
        left(btrim(regexp_replace(lower(coalesce(p_name, '')), '[^a-z0-9]+', '-', 'g'), '-'), 40),
        ''
      ),
      'pro'
    ) || '-' || substr(replace(p_id::text, '-', ''), 1, 8)
$$;
REVOKE ALL ON FUNCTION public.listing_slug(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_business_id uuid;
  v_name          text := COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business');
  v_trade         public.trade_type :=
    COALESCE(NEW.raw_user_meta_data->>'trade_type', 'plumber')::public.trade_type;
BEGIN
  INSERT INTO public.businesses (
    name, phone, timezone, trade_type, confirmation_channel, confirmation_fallback
  )
  VALUES (v_name, '', 'Europe/Dublin', v_trade, 'sms'::public.message_channel, false)
  RETURNING id INTO new_business_id;

  INSERT INTO public.profiles (id, business_id, name, role)
  VALUES (
    NEW.id,
    new_business_id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    'owner'
  );

  -- Draft listing: private until the owner completes and publishes it.
  INSERT INTO public.tradesman_profiles (
    business_id, slug, headline, bio, service_area, town, county, categories, published
  )
  VALUES (
    new_business_id, public.listing_slug(v_name, new_business_id),
    '', '', '', '', '', ARRAY[v_trade], false
  );

  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Backfill: businesses created before this migration get a draft too.
INSERT INTO public.tradesman_profiles (
  business_id, slug, headline, bio, service_area, town, county, categories, published
)
SELECT b.id, public.listing_slug(b.name, b.id), '', '', '', '', '', ARRAY[b.trade_type], false
FROM public.businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM public.tradesman_profiles tp WHERE tp.business_id = b.id
);

COMMIT;
