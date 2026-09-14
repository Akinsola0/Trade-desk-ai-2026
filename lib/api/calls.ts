/** The call log: what the AI heard, what it decided, and how to correct it. */
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
 * Most recent first.
 *
 * TODO(backend): `GET /api/calls?outcome=&query=`.
 */
export async function getCalls(
  filters: CallFilters = {},
): Promise<CallListItem[]> {
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
 * Correct an outcome the AI got wrong.
 *
 * The original `outcome` is kept and the correction is written to
 * `corrected_outcome`, so the AI team can measure accuracy instead of losing the
 * mistake.
 *
 * TODO(backend): `POST /api/calls/[id]/reclassify` — write the correction and
 * emit an evaluation event for `tests/agent-scenarios`.
 */
export async function reclassifyCall(
  input: ReclassifyCallInput,
): Promise<CallListItem> {
  const call = db.calls.find((item) => item.id === input.call_id);
  if (!call) throw new Error(`Call ${input.call_id} not found`);

  call.corrected_outcome =
    input.outcome === call.outcome ? null : input.outcome;
  call.corrected_at = call.corrected_outcome ? new Date().toISOString() : null;

  const updated = toListItem(call.id);
  if (!updated) throw new Error(`Call ${input.call_id} could not be loaded`);
  return delay(updated, 350);
}
