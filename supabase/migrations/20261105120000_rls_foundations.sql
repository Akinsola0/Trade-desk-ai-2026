-- =============================================================================
-- 20261105120000 — RLS foundations
--
-- Replaces the policies and table privileges from schema.sql. Apply AFTER
-- schema.sql and signup_trigger.sql. Safe to re-run: it drops every policy on
-- the app tables first, then recreates the whole set.
--
-- WHAT THIS FIXES
--   1. my_business_id() recursed through RLS on `profiles` (the policy on
--      profiles called a function that selected from profiles). It is now
--      SECURITY DEFINER with an empty search_path, and policies call it as
--      (SELECT my_business_id()) so Postgres evaluates it once per statement.
--   2. Every policy was FOR ALL, and every role had every privilege, so a signed-
--      in tenant could use the public anon key + their JWT to write directly to
--      PostgREST: rewrite calls.outcome, mark messages "delivered", promote a
--      staff profile to owner, delete their own business, insert their own
--      5-star reviews, or set tradesman_profiles.verified = true.
--      Now: baseline REVOKE, then per-command policies + column-level GRANTs for
--      exactly what the app does today.
--   3. Writes that must not be free-form go through RPCs that set the sensitive
--      columns themselves (reclassify_call, retry_message).
--
-- WHAT STAYS UNCHANGED
--   service_role (AI voice agent, Twilio webhooks, booking engine) is untouched:
--   it bypasses RLS and keeps its privileges.
--
-- TO ALLOW A NEW TENANT WRITE LATER, add one GRANT (column list) and, if the
-- table has a policy for that command, nothing else. Do not widen to FOR ALL.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Clean slate: drop every existing policy on the app tables.
--    Done by catalog lookup so policies added by hand in the dashboard (which
--    would otherwise be OR-ed with ours and silently re-open access) go too.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'businesses', 'profiles', 'customers', 'leads', 'availability_rules',
        'jobs', 'calls', 'messages', 'tradesman_profiles',
        'marketplace_services', 'reviews', 'match_requests'
      )
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 1. Tenant lookup helper.
--    SECURITY DEFINER so reading `profiles` inside it does not re-enter the
--    profiles policy. search_path = '' forces schema-qualified names, which
--    closes the search_path-hijack hole definer functions otherwise have.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.business_id FROM public.profiles p WHERE p.id = (SELECT auth.uid())
$$;

-- Supabase's default privileges grant EXECUTE on new functions to anon and
-- authenticated, so revoking from PUBLIC alone is not enough.
REVOKE ALL ON FUNCTION public.my_business_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_business_id() TO authenticated;

-- -----------------------------------------------------------------------------
-- 2. Table privileges: deny by default, then grant only what the app uses.
--    (RLS decides WHICH rows; these grants decide WHICH operations/columns.)
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.businesses, public.profiles, public.customers, public.leads,
  public.availability_rules, public.jobs, public.calls, public.messages,
  public.tradesman_profiles, public.marketplace_services, public.reviews,
  public.match_requests
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.businesses, public.profiles, public.customers, public.leads,
  public.availability_rules, public.jobs, public.calls, public.messages,
  public.tradesman_profiles, public.marketplace_services, public.reviews,
  public.match_requests
TO authenticated;

-- Public marketplace data. Everything else public goes through the views in
-- the next migration.
GRANT SELECT ON TABLE public.tradesman_profiles, public.marketplace_services TO anon;

-- Settings screen.
GRANT UPDATE (name, phone, timezone, trade_type, confirmation_channel, confirmation_fallback)
  ON public.businesses TO authenticated;

-- Display name only. `role` and `business_id` are not user-writable.
GRANT UPDATE (name) ON public.profiles TO authenticated;

-- Lead status changes. Booking goes through the (future) booking service.
GRANT UPDATE (status) ON public.leads TO authenticated;

-- Job status and notes. Time changes need the booking service's conflict check.
GRANT UPDATE (status, notes) ON public.jobs TO authenticated;

-- The availability editor replaces the whole week: delete + insert.
GRANT INSERT, DELETE ON public.availability_rules TO authenticated;

-- Listing management. `verified`, `member_since`, `id`, `created_at` are
-- deliberately absent from both column lists; `slug` is insert-only so public
-- URLs stay stable.
GRANT INSERT (
  business_id, slug, headline, bio, service_area, town, county, photo_urls,
  categories, from_price_cents, answers_24_7, responds_within_minutes
) ON public.tradesman_profiles TO authenticated;
GRANT UPDATE (
  headline, bio, service_area, town, county, photo_urls, categories,
  from_price_cents, answers_24_7, responds_within_minutes
) ON public.tradesman_profiles TO authenticated;
GRANT DELETE ON public.tradesman_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.marketplace_services TO authenticated;

-- Not granted to tenants, by design:
--   customers, leads (insert/delete), jobs (insert/delete), calls, messages,
--   reviews, match_requests — written by the AI agent / booking service /
--   Twilio webhooks (service_role) or by the RPCs below.

-- -----------------------------------------------------------------------------
-- 3. Policies. One per command, scoped TO the roles that may use it.
-- -----------------------------------------------------------------------------

-- businesses
CREATE POLICY businesses_select_own ON public.businesses
  FOR SELECT TO authenticated
  USING (id = (SELECT public.my_business_id()));
CREATE POLICY businesses_update_own ON public.businesses
  FOR UPDATE TO authenticated
  USING (id = (SELECT public.my_business_id()))
  WITH CHECK (id = (SELECT public.my_business_id()));

-- profiles
CREATE POLICY profiles_select_same_business ON public.profiles
  FOR SELECT TO authenticated
  USING (business_id = (SELECT public.my_business_id()));
CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- customers
CREATE POLICY customers_select_own ON public.customers
  FOR SELECT TO authenticated
  USING (business_id = (SELECT public.my_business_id()));

-- leads (tenant via customer)
CREATE POLICY leads_select_own ON public.leads
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = leads.customer_id
      AND c.business_id = (SELECT public.my_business_id())
  ));
CREATE POLICY leads_update_own ON public.leads
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = leads.customer_id
      AND c.business_id = (SELECT public.my_business_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = leads.customer_id
      AND c.business_id = (SELECT public.my_business_id())
  ));

-- availability_rules
CREATE POLICY availability_select_own ON public.availability_rules
  FOR SELECT TO authenticated
  USING (business_id = (SELECT public.my_business_id()));
CREATE POLICY availability_insert_own ON public.availability_rules
  FOR INSERT TO authenticated
  WITH CHECK (business_id = (SELECT public.my_business_id()));
CREATE POLICY availability_delete_own ON public.availability_rules
  FOR DELETE TO authenticated
  USING (business_id = (SELECT public.my_business_id()));

-- jobs (tenant via lead -> customer)
CREATE POLICY jobs_select_own ON public.jobs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.customers c ON c.id = l.customer_id
    WHERE l.id = jobs.lead_id
      AND c.business_id = (SELECT public.my_business_id())
  ));
CREATE POLICY jobs_update_own ON public.jobs
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.customers c ON c.id = l.customer_id
    WHERE l.id = jobs.lead_id
      AND c.business_id = (SELECT public.my_business_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.customers c ON c.id = l.customer_id
    WHERE l.id = jobs.lead_id
      AND c.business_id = (SELECT public.my_business_id())
  ));

-- calls, messages, reviews, match_requests: read-only for tenants
CREATE POLICY calls_select_own ON public.calls
  FOR SELECT TO authenticated
  USING (business_id = (SELECT public.my_business_id()));
CREATE POLICY messages_select_own ON public.messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.customers c
    WHERE c.id = messages.customer_id
      AND c.business_id = (SELECT public.my_business_id())
  ));
CREATE POLICY reviews_select_own ON public.reviews
  FOR SELECT TO authenticated
  USING (business_id = (SELECT public.my_business_id()));
CREATE POLICY match_requests_select_own ON public.match_requests
  FOR SELECT TO authenticated
  USING (business_id = (SELECT public.my_business_id()));

-- tradesman_profiles: public read, owner write
CREATE POLICY tradesman_profiles_public_read ON public.tradesman_profiles
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY tradesman_profiles_insert_own ON public.tradesman_profiles
  FOR INSERT TO authenticated
  WITH CHECK (business_id = (SELECT public.my_business_id()));
CREATE POLICY tradesman_profiles_update_own ON public.tradesman_profiles
  FOR UPDATE TO authenticated
  USING (business_id = (SELECT public.my_business_id()))
  WITH CHECK (business_id = (SELECT public.my_business_id()));
CREATE POLICY tradesman_profiles_delete_own ON public.tradesman_profiles
  FOR DELETE TO authenticated
  USING (business_id = (SELECT public.my_business_id()));

-- marketplace_services: public read, owner write (ownership via the profile)
CREATE POLICY marketplace_services_public_read ON public.marketplace_services
  FOR SELECT TO anon, authenticated
  USING (true);
CREATE POLICY marketplace_services_insert_own ON public.marketplace_services
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tradesman_profiles tp
    WHERE tp.id = marketplace_services.profile_id
      AND tp.business_id = (SELECT public.my_business_id())
  ));
CREATE POLICY marketplace_services_update_own ON public.marketplace_services
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tradesman_profiles tp
    WHERE tp.id = marketplace_services.profile_id
      AND tp.business_id = (SELECT public.my_business_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tradesman_profiles tp
    WHERE tp.id = marketplace_services.profile_id
      AND tp.business_id = (SELECT public.my_business_id())
  ));
CREATE POLICY marketplace_services_delete_own ON public.marketplace_services
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tradesman_profiles tp
    WHERE tp.id = marketplace_services.profile_id
      AND tp.business_id = (SELECT public.my_business_id())
  ));

-- -----------------------------------------------------------------------------
-- 4. RPCs for writes that must set sensitive columns themselves.
--    SECURITY DEFINER + explicit tenant check, because the caller no longer
--    has UPDATE/INSERT on these tables.
-- -----------------------------------------------------------------------------

-- Correct the AI's call outcome. `outcome` is never touched: the original guess
-- stays so accuracy remains measurable. Re-selecting the original outcome
-- clears the correction. corrected_at is set here, not trusted from the client.
CREATE OR REPLACE FUNCTION public.reclassify_call(
  p_call_id uuid,
  p_outcome public.call_outcome
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_original public.call_outcome;
BEGIN
  SELECT c.outcome INTO v_original
  FROM public.calls c
  WHERE c.id = p_call_id
    AND c.business_id = (SELECT public.my_business_id())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Call not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.calls
  SET corrected_outcome = CASE WHEN p_outcome = v_original THEN NULL ELSE p_outcome END,
      corrected_at      = CASE WHEN p_outcome = v_original THEN NULL ELSE now() END
  WHERE id = p_call_id;
END
$$;

-- Re-queue a failed outbound confirmation, optionally on the other channel.
-- Inserts a NEW row so the failure stays in history; status is always 'queued'
-- here — only the delivery worker (service_role) may move it forward.
CREATE OR REPLACE FUNCTION public.retry_message(
  p_message_id uuid,
  p_channel public.message_channel DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_msg public.messages;
  v_new_id uuid;
BEGIN
  SELECT m.* INTO v_msg
  FROM public.messages m
  JOIN public.customers c ON c.id = m.customer_id
  WHERE m.id = p_message_id
    AND c.business_id = (SELECT public.my_business_id());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_msg.direction <> 'outbound' THEN
    RAISE EXCEPTION 'Only outbound messages can be retried' USING ERRCODE = '22023';
  END IF;
  IF v_msg.status <> 'failed' THEN
    RAISE EXCEPTION 'Only failed messages can be retried' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.messages (customer_id, channel, direction, body, status)
  VALUES (v_msg.customer_id, COALESCE(p_channel, v_msg.channel), 'outbound', v_msg.body, 'queued')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END
$$;

REVOKE ALL ON FUNCTION public.reclassify_call(uuid, public.call_outcome)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.retry_message(uuid, public.message_channel)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reclassify_call(uuid, public.call_outcome) TO authenticated;
GRANT EXECUTE ON FUNCTION public.retry_message(uuid, public.message_channel) TO authenticated;

COMMIT;
