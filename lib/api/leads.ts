/** Leads captured by the AI front desk, the marketplace, or entered by hand. */
import { db, delay } from "@/lib/api/mock/store";
import type {
  LeadFilters,
  LeadListItem,
  UUID,
  UpdateLeadStatusInput,
} from "@/lib/api/types";

function toListItem(leadId: UUID): LeadListItem | null {
  const lead = db.leads.find((item) => item.id === leadId);
  if (!lead) return null;

  const customer = db.customers.find((item) => item.id === lead.customer_id);
  if (!customer) return null;

  const job = db.jobs.find((item) => item.lead_id === lead.id) ?? null;
  const call =
    db.calls.find((item) => item.customer_id === lead.customer_id) ?? null;

  return {
    ...lead,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    },
    job: job
      ? {
          id: job.id,
          starts_at: job.starts_at,
          ends_at: job.ends_at,
          status: job.status,
        }
      : null,
    call_id: lead.source === "phone" && call ? call.id : null,
  };
}

/**
 * Newest first.
 *
 * TODO(backend): `GET /api/leads?status=&source=&query=` — join `customers` and
 * the booked `job` server-side so the list stays one request.
 */
export async function getLeads(
  filters: LeadFilters = {},
): Promise<LeadListItem[]> {
  const query = filters.query?.trim().toLowerCase() ?? "";

  const items = db.leads
    .map((lead) => toListItem(lead.id))
    .filter((item): item is LeadListItem => item !== null)
    .filter((item) =>
      !filters.status || filters.status === "all"
        ? true
        : item.status === filters.status,
    )
    .filter((item) =>
      !filters.source || filters.source === "all"
        ? true
        : item.source === filters.source,
    )
    .filter((item) =>
      query
        ? [item.customer.name, item.service, item.description]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true,
    )
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

  return delay(items);
}

/** TODO(backend): `GET /api/leads/[id]`. */
export async function getLead(leadId: UUID): Promise<LeadListItem | null> {
  return delay(toListItem(leadId));
}

/**
 * TODO(backend): `PATCH /api/leads/[id]` — moving a lead to `booked` without a
 * job attached should be rejected; booking goes through `lib/booking` instead.
 */
export async function updateLeadStatus(
  input: UpdateLeadStatusInput,
): Promise<LeadListItem> {
  const lead = db.leads.find((item) => item.id === input.lead_id);
  if (!lead) throw new Error(`Lead ${input.lead_id} not found`);

  lead.status = input.status;
  const updated = toListItem(lead.id);
  if (!updated) throw new Error(`Lead ${input.lead_id} could not be loaded`);
  return delay(updated, 350);
}
