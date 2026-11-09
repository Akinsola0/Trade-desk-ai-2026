    -- =============================================================================
    -- 20261105120100 — Public marketplace access
    -- Apply AFTER 20261105120000_rls_foundations.sql.
    --
    -- WHAT THIS FIXES
    --   1. The public marketplace joined `businesses!inner` and `customers(name)`,
    --      both locked to the owning tenant by RLS, so anonymous visitors got no
    --      rows. Public reads now go through three views that expose only what the
    --      public pages render.
    --   2. create_marketplace_lead was an unauthenticated write path with no input
    --      validation, no rate limit, a mutable search_path, and a racy
    --      find-or-create. It is rebuilt below.
    --
    -- WHY VIEWS (and the Security Advisor warning you will see)
    --   The views run with their owner's privileges, which is what lets them read
    --   `businesses.name` and `reviews` past RLS. That is the point: the column
    --   list in each view IS the public contract. Supabase's linter flags
    --   "security definer view" for this pattern; it is intentional here. Never
    --   add a column to these views that you would not put on a public web page.
    --
    -- WHAT RATE LIMITING THIS DOES, AND DOES NOT, DO
    --   The anon key ships in the browser bundle, so anyone can call the RPC
    --   directly and bypass any Next.js route in front of it. Only checks inside
    --   the database are enforceable, so the caps live here: per phone number per
    --   business, and per business overall. Per-IP limiting needs an edge layer
    --   (Vercel/Cloudflare rules) in front of the Supabase REST URL; it cannot be
    --   done reliably from this function.
    -- =============================================================================
    
    BEGIN;
    
    -- -----------------------------------------------------------------------------
    -- 1. Public views
    -- -----------------------------------------------------------------------------
    DROP VIEW IF EXISTS public.marketplace_listings;
    DROP VIEW IF EXISTS public.marketplace_profiles;
    DROP VIEW IF EXISTS public.marketplace_reviews;
    
    -- Full public profile. `phone` is the number the AI answers, which the profile
    -- page shows as its call button — public by product design.
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
    ) sv ON true;
    
    -- Browse/search cards: the same row minus bio, full photo list and phone, so a
    -- single unauthenticated request cannot enumerate every contact number.
    CREATE VIEW public.marketplace_listings
    WITH (security_invoker = false) AS
    SELECT
      profile_id, business_id, slug, business_name, headline, service_area,
      photo_url, town, county, categories, from_price_cents, verified,
      answers_24_7, responds_within_minutes, review_count, rating, service_names
    FROM public.marketplace_profiles;
    
    -- Reviews of listed businesses only. The reviewer is reduced to "First L." and
    -- customer_id / job_id are not exposed.
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
    JOIN public.tradesman_profiles tp ON tp.business_id = r.business_id
    JOIN public.customers c ON c.id = r.customer_id
    LEFT JOIN public.jobs j ON j.id = r.job_id
    LEFT JOIN public.leads l ON l.id = j.lead_id;
    
    -- Default privileges would hand these to anon/authenticated with write access.
    REVOKE ALL ON public.marketplace_profiles, public.marketplace_listings, public.marketplace_reviews
      FROM PUBLIC, anon, authenticated;
    GRANT SELECT ON public.marketplace_profiles, public.marketplace_listings, public.marketplace_reviews
      TO anon, authenticated;
    
    -- -----------------------------------------------------------------------------
    -- 2. One customer per (business, phone)
    --    Needed for a race-free find-or-create. Fails loudly, with the count, if
    --    existing rows already collide, so you can merge them first.
    -- -----------------------------------------------------------------------------
    DO $$
    DECLARE
      v_groups int;
    BEGIN
      SELECT count(*) INTO v_groups FROM (
        SELECT 1 FROM public.customers GROUP BY business_id, phone HAVING count(*) > 1
      ) d;
      IF v_groups > 0 THEN
        RAISE EXCEPTION
          '% duplicate (business_id, phone) groups in public.customers; merge them before adding the unique index',
          v_groups;
      END IF;
    END
    $$;
    
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_business_phone
      ON public.customers (business_id, phone);
    
    -- -----------------------------------------------------------------------------
    -- 3. Hardened lead capture
    --    Signature changes (new optional p_preferred_date_range), so the old
    --    8-argument overload must go or PostgREST sees two candidates.
    -- -----------------------------------------------------------------------------
    DROP FUNCTION IF EXISTS public.create_marketplace_lead(
      uuid, text, text, text, text, text, text, public.lead_urgency
    );
    
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
    
      -- Only businesses with a public listing can be reached from the marketplace.
      IF NOT EXISTS (
        SELECT 1 FROM public.tradesman_profiles tp WHERE tp.business_id = p_business_id
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
    
    COMMIT;
