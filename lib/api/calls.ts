/** The call log: what the AI heard, what it decided, and how to correct it. */
import { isDemoAuth } from "@/lib/api/auth";
import { db, delay } from "@/lib/api/mock/store";
import type {
  CallFilters,
  CallListItem,
  ReclassifyCallInput,
  UUID,
} from "@/lib/api/types";

function toListItem(callId: UUID): CallListItem | null {
  const call = db.calls.find((item) => item.id === callId);
  if (!call) return null;

  const customer = call.customer_id
    ? db.customers.find((item) => item.id === call.customer_id)
    : null;
  const lead = customer
    ? db.leads.find((item) => item.customer_id === customer.id)
    : null;

  return {
    ...call,
    customer: customer
      ? { id: customer.id, name: customer.name, phone: customer.phone }
      : null,
    lead_id: lead?.id ?? null,
  };
}

/**
 * Map a Supabase row to the `CallListItem` shape.
 */
function rowToCallListItem(row: any): CallListItem {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const leads = customer?.leads ? (Array.isArray(customer.leads) ? customer.leads : [customer.leads]) : [];
  const lead = leads[0] ?? null;

  return {
    id: row.id,
    business_id: row.business_id,
    customer_id: row.customer_id,
    provider_call_id: row.provider_call_id,
    outcome: row.outcome,
    summary: row.summary,
    started_at: row.started_at,
    duration_seconds: row.duration_seconds,
    corrected_outcome: row.corrected_outcome,
    corrected_at: row.corrected_at,
    customer: customer
      ? { id: customer.id, name: customer.name, phone: customer.phone }
      : null,
    lead_id: lead?.id ?? null,
  };
}

/**
 * Most recent first.
 */
export async function getCalls(
  filters: CallFilters = {},
): Promise<CallListItem[]> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    let query = supabase
      .from("calls")
      .select(`
        id, business_id, customer_id, provider_call_id, outcome, summary, started_at, duration_seconds, corrected_outcome, corrected_at,
        customers ( id, name, phone, leads ( id ) )
      `)
      .order("started_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data) return [];

    let items = data.map(rowToCallListItem);

    if (filters.outcome && filters.outcome !== "all") {
      items = items.filter(
        (item) => (item.corrected_outcome ?? item.outcome) === filters.outcome
      );
    }

    if (filters.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      items = items.filter((item) =>
        [item.summary, item.customer?.name ?? "", item.provider_call_id]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return items;
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  const query = filters.query?.trim().toLowerCase() ?? "";

  const items = db.calls
    .map((call) => toListItem(call.id))
    .filter((item): item is CallListItem => item !== null)
    .filter((item) => {
      if (!filters.outcome || filters.outcome === "all") return true;
      return (item.corrected_outcome ?? item.outcome) === filters.outcome;
    })
    .filter((item) =>
      query
        ? [item.summary, item.customer?.name ?? "", item.provider_call_id]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true,
    )
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
    );

  return delay(items);
}

/**
 * Fetch a single call by ID.
 */
async function getCall(callId: UUID): Promise<CallListItem | null> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("calls")
      .select(`
        id, business_id, customer_id, provider_call_id, outcome, summary, started_at, duration_seconds, corrected_outcome, corrected_at,
        customers ( id, name, phone, leads ( id ) )
      `)
      .eq("id", callId)
      .single();

    if (error || !data) return null;
    return rowToCallListItem(data);
  }

  return toListItem(callId);
}

/**
 * Correct an outcome the AI got wrong.
 */
export async function reclassifyCall(
  input: ReclassifyCallInput,
): Promise<CallListItem> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    // Fetch current call to see if outcome matches
    const current = await getCall(input.call_id);
    if (!current) throw new Error(`Call ${input.call_id} not found`);

    const corrected_outcome = input.outcome === current.outcome ? null : input.outcome;
    const corrected_at = corrected_outcome ? new Date().toISOString() : null;

    const { error } = await supabase
      .from("calls")
      .update({ corrected_outcome, corrected_at })
      .eq("id", input.call_id);

    if (error) throw new Error(error.message);

    const updated = await getCall(input.call_id);
    if (!updated) throw new Error(`Call ${input.call_id} could not be loaded`);
    return updated;
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  const call = db.calls.find((item) => item.id === input.call_id);
  if (!call) throw new Error(`Call ${input.call_id} not found`);

  call.corrected_outcome =
    input.outcome === call.outcome ? null : input.outcome;
  call.corrected_at = call.corrected_outcome ? new Date().toISOString() : null;

  const updated = toListItem(call.id);
  if (!updated) throw new Error(`Call ${input.call_id} could not be loaded`);
  return delay(updated, 350);
}

