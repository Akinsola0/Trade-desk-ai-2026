/**
 * Weekly working hours.
 *
 * The editor sends the full week on save — the backend replaces the business's
 * rules transactionally rather than diffing, which keeps the AI's view of
 * availability consistent mid-call.
 */
import { isDemoAuth } from "@/lib/api/auth";
import { getSupabase } from "@/lib/supabase/isomorphic";
import { db, delay, mockId } from "@/lib/api/mock/store";
import type {
  AvailabilityRule,
  AvailabilityRuleInput,
  UUID,
} from "@/lib/api/types";

/**
 * Rules for the caller's business, ordered by weekday then start_time.
 */
export async function getAvailability(
  businessId: UUID,
): Promise<AvailabilityRule[]> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    const { data, error } = await supabase
      .from("availability_rules")
      .select("*")
      .eq("business_id", businessId)
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) throw new Error(error.message);
    return data ?? [];
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  const rules = db.availability
    .filter((rule) => rule.business_id === businessId)
    .sort(
      (a, b) =>
        a.weekday - b.weekday || a.start_time.localeCompare(b.start_time),
    );
  return delay(rules);
}

/**
 * Replace the whole week for a business.
 */
export async function saveAvailability(
  businessId: UUID,
  rules: AvailabilityRuleInput[],
): Promise<AvailabilityRule[]> {
  if (!isDemoAuth) {
    const supabase = await getSupabase();

    // In a production setup, you would create a Postgres RPC function to do
    // this atomically. For this MVP client-side migration, we do a sequential 
    // delete-then-insert.
    const { error: deleteError } = await supabase
      .from("availability_rules")
      .delete()
      .eq("business_id", businessId);

    if (deleteError) throw new Error(`Delete failed: ${deleteError.message}`);

    if (rules.length > 0) {
      const { error: insertError } = await supabase
        .from("availability_rules")
        .insert(
          rules.map((rule) => ({
            business_id: businessId,
            weekday: rule.weekday,
            start_time: rule.start_time,
            end_time: rule.end_time,
          }))
        );

      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    }

    return getAvailability(businessId);
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  db.availability = [
    ...db.availability.filter((rule) => rule.business_id !== businessId),
    ...rules.map((rule) => ({
      id: mockId("a"),
      business_id: businessId,
      ...rule,
    })),
  ];
  return getAvailability(businessId);
}

