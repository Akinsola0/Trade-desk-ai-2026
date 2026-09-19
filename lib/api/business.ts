/**
 * Business profile — the details the AI front desk introduces itself with.
 */
import { getCurrentUser, isDemoAuth } from "@/lib/api/auth";
import { db, delay } from "@/lib/api/mock/store";
import type { BusinessProfile, UpdateBusinessInput } from "@/lib/api/types";

/** Map a raw DB row to the BusinessProfile shape the UI expects. */
function rowToProfile(row: {
  id: string;
  name: string;
  phone: string;
  timezone: string;
  trade_type: string;
  confirmation_channel: string;
  confirmation_fallback: boolean;
}): BusinessProfile {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    timezone: row.timezone,
    trade_type: row.trade_type as BusinessProfile["trade_type"],
    confirmation_channel: row.confirmation_channel as BusinessProfile["confirmation_channel"],
    confirmation_fallback: row.confirmation_fallback,
  };
}

// Fetch the signed-in user's business profile securely via RLS.
export async function getBusiness(): Promise<BusinessProfile> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("businesses")
      .select(
        "id, name, phone, timezone, trade_type, confirmation_channel, confirmation_fallback",
      )
      .single();

    if (error || !data) {
      throw new Error(
        error?.message ?? "Could not load your business profile.",
      );
    }

    return rowToProfile(data);
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  await getCurrentUser();
  return delay(db.business);
}

// Save changes to the business profile using explicit business_id filtering.
export async function updateBusiness(
  input: UpdateBusinessInput,
): Promise<BusinessProfile> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    // Step 1: find out which business this user belongs to.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .single();

    if (profileError || !profile) {
      throw new Error("Couldn't verify your business — are you still signed in?");
    }

    // Step 2: update only that business row.
    const { data, error } = await supabase
      .from("businesses")
      .update({
        name: input.name,
        phone: input.phone,
        timezone: input.timezone,
        trade_type: input.trade_type,
        confirmation_channel: input.confirmation_channel,
        confirmation_fallback: input.confirmation_fallback,
      })
      .eq("id", profile.business_id)
      .select(
        "id, name, phone, timezone, trade_type, confirmation_channel, confirmation_fallback",
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Couldn't save your business profile.");
    }

    return rowToProfile(data);
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  db.business = { ...db.business, ...input };
  return delay(db.business, 400);
}

