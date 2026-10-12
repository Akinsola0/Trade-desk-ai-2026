/**
 * Session + tenancy.
 *
 * The UI never hardcodes a business id: it asks for the session and uses
 * `session.business.id`. RLS scopes every backend query to the same business, so
 * the two agree by construction.
 *
 * REAL PATH: reads the signed-in user's profile and business rows from the DB.
 * DEMO PATH: returns the in-memory mock objects as before.
 */
import { getCurrentUser, NotSignedInError, isDemoAuth } from "@/lib/api/auth";
import { db, delay } from "@/lib/api/mock/store";
import type { SessionContext, BusinessProfile } from "@/lib/api/types";

export async function getSession(): Promise<SessionContext> {
  const user = await getCurrentUser();
  if (!user) throw new NotSignedInError();

  // ── Real Supabase path ─────────────────────────────────────────────────────
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    // Single query: join profiles → businesses in one round-trip.
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        business_id,
        name,
        role,
        businesses (
          id,
          name,
          timezone,
          phone,
          trade_type,
          confirmation_channel,
          confirmation_fallback
        )
      `,
      )
      .eq("id", user.id)
      .single();

    if (error || !data) throw new NotSignedInError();

    const rawBusiness = data.businesses as unknown as {
      id: string;
      name: string;
      timezone: string;
      phone: string;
      trade_type: string;
      confirmation_channel: string;
      confirmation_fallback: boolean;
    } | null;

    if (!rawBusiness) throw new NotSignedInError();

    // Return a BusinessProfile shape: Business + BusinessSettings merged.
    const business: BusinessProfile = {
      id: rawBusiness.id,
      name: rawBusiness.name,
      timezone: rawBusiness.timezone,
      phone: rawBusiness.phone,
      trade_type: rawBusiness.trade_type as BusinessProfile["trade_type"],
      confirmation_channel: rawBusiness.confirmation_channel as BusinessProfile["confirmation_channel"],
      confirmation_fallback: rawBusiness.confirmation_fallback,
    };

    return {
      profile: {
        id: data.id,
        business_id: data.business_id,
        name: data.name,
        role: data.role as "owner" | "staff",
      },
      business,
    };
  }

  // ── Demo path (no Supabase) ────────────────────────────────────────────────
  return delay({ profile: db.profile, business: db.business });
}
