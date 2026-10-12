-- =============================================================================
-- MARKETPLACE LEAD CAPTURE (RLS BYPASS)
-- =============================================================================
--
-- The public marketplace allows unauthenticated homeowners to request a booking.
-- However, the `customers` and `leads` tables are locked down by RLS to only
-- allow the business owner to insert/read their own rows.
--
-- This function runs with `SECURITY DEFINER`, which means it executes with
-- the privileges of the function creator (admin), effectively bypassing RLS.
-- This allows us to securely insert the lead and customer without exposing
-- the tables to public inserts.

CREATE OR REPLACE FUNCTION create_marketplace_lead(
  p_business_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_customer_address TEXT,
  p_service TEXT,
  p_description TEXT,
  p_urgency lead_urgency
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_lead_id UUID;
BEGIN
  -- 1. Find or create the customer
  SELECT id INTO v_customer_id
  FROM customers
  WHERE business_id = p_business_id AND phone = p_customer_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (business_id, name, phone, email, address)
    VALUES (p_business_id, p_customer_name, p_customer_phone, p_customer_email, p_customer_address)
    RETURNING id INTO v_customer_id;
  ELSE
    -- Optionally update name/email if they provided new ones?
    -- Keeping it simple for now as per the mock implementation.
  END IF;

  -- 2. Insert the lead with source = 'marketplace'
  INSERT INTO leads (customer_id, service, description, urgency, status, source)
  VALUES (v_customer_id, p_service, p_description, p_urgency, 'new', 'marketplace')
  RETURNING id INTO v_lead_id;

  RETURN v_lead_id;
END;
$$;
