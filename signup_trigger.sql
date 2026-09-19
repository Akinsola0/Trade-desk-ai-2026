-- =============================================================================
-- TradeDesk AI — Sign-up trigger
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- WHAT IS A TRIGGER?
-- A trigger is a SQL function that runs automatically when something happens
-- in a table (INSERT, UPDATE, or DELETE). This one fires every time a new
-- row is added to auth.users (i.e. whenever someone signs up).
--
-- WHY A TRIGGER INSTEAD OF CODE?
-- Our sign-up form runs in the browser. The browser can't safely hold the
-- service-role key needed to bypass RLS. By moving the row creation into the
-- database itself, we avoid that problem entirely — the database creates the
-- rows as part of the same transaction as the auth user, with no client code
-- involved.
--
-- HOW IT GETS THE NAME / BUSINESS / TRADE:
-- When our form calls supabase.auth.signUp({ options: { data: { ... } } }),
-- Supabase stores those extra fields in auth.users.raw_user_meta_data (a JSONB
-- column). The trigger reads them from NEW.raw_user_meta_data.
-- =============================================================================

-- Step 1: create the function that does the work.
-- SECURITY DEFINER means it runs with the privileges of the function's owner
-- (postgres superuser), not the calling user — so it bypasses RLS.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_business_id UUID;
BEGIN
  -- Read the extra fields from the sign-up metadata.
  -- COALESCE provides sensible defaults if a field is missing.

  -- Insert the businesses row first (profiles.business_id references it).
  INSERT INTO public.businesses (
    name,
    phone,
    timezone,
    trade_type,
    confirmation_channel,
    confirmation_fallback
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
    '',                            -- filled in later via the Settings screen
    'Europe/Dublin',
    COALESCE(NEW.raw_user_meta_data->>'trade_type', 'plumber')::public.trade_type,
    'sms'::public.message_channel,
    false
  )
  RETURNING id INTO new_business_id;

  -- Insert the profiles row linking the auth user to the business.
  -- id = NEW.id means this profile's UUID matches the auth.users UUID —
  -- one person, one UUID, two tables.
  INSERT INTO public.profiles (id, business_id, name, role)
  VALUES (
    NEW.id,
    new_business_id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    'owner'
  );

  RETURN NEW;
END;
$$;

-- Step 2: attach the function to auth.users so it fires on every sign-up.
-- AFTER INSERT means it runs after the auth user row is committed.
-- FOR EACH ROW means it runs once per inserted row (sign-up creates one row).
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
