/** Leads captured by the AI front desk, the marketplace, or entered by hand. */
import { getCurrentUser, isDemoAuth } from "@/lib/api/auth";
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
 * Map a Supabase row to the `LeadListItem` shape.
 */
function rowToLeadListItem(row: any): LeadListItem {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  const jobs = Array.isArray(row.jobs) ? row.jobs : (row.jobs ? [row.jobs] : []);
  const job = jobs[0] ?? null;
  
  // PostgREST returns calls as an array under customers if requested
  const calls = customer?.calls ? (Array.isArray(customer.calls) ? customer.calls : [customer.calls]) : [];
  const call = calls[0] ?? null;

  return {
    id: row.id,
    customer_id: row.customer_id,
    service: row.service,
    description: row.description,
    urgency: row.urgency,
    status: row.status,
    source: row.source,
    created_at: row.created_at,
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
    },
    job: job ? {
      id: job.id,
      starts_at: job.starts_at,
      ends_at: job.ends_at,
      status: job.status,
    } : null,
    call_id: row.source === "phone" && call ? call.id : null,
  };
}

/**
 * Newest first.
 */
export async function getLeads(
  filters: LeadFilters = {},
): Promise<LeadListItem[]> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    let query = supabase
      .from("leads")
      .select(`
        id, customer_id, service, description, urgency, status, source, preferred_date_range, created_at,
        customers ( id, name, phone, email, address, calls ( id ) ),
        jobs ( id, starts_at, ends_at, status )
      `)
      .order("created_at", { ascending: false });

    if (filters.status && filters.status !== "all") {
      query = query.eq("status", filters.status);
    }
    if (filters.source && filters.source !== "all") {
      query = query.eq("source", filters.source);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data) return [];

    let items = data.map(rowToLeadListItem);

    if (filters.query?.trim()) {
      const q = filters.query.trim().toLowerCase();
      items = items.filter((item) =>
        [item.customer.name, item.service, item.description]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return items;
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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

/** Fetch a single lead by ID */
export async function getLead(leadId: UUID): Promise<LeadListItem | null> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("leads")
      .select(`
        id, customer_id, service, description, urgency, status, source, preferred_date_range, created_at,
        customers ( id, name, phone, email, address, calls ( id ) ),
        jobs ( id, starts_at, ends_at, status )
      `)
      .eq("id", leadId)
      .single();

    if (error || !data) return null;
    return rowToLeadListItem(data);
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  return delay(toListItem(leadId));
}

/**
 * Move a lead to a new status.
 */
export async function updateLeadStatus(
  input: UpdateLeadStatusInput,
): Promise<LeadListItem> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase
      .from("leads")
      .update({ status: input.status })
      .eq("id", input.lead_id);

    if (error) throw new Error(error.message);
    
    // Fetch and return the updated lead
    const updated = await getLead(input.lead_id);
    if (!updated) throw new Error(`Lead ${input.lead_id} could not be loaded`);
    return updated;
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  const lead = db.leads.find((item) => item.id === input.lead_id);
  if (!lead) throw new Error(`Lead ${input.lead_id} not found`);

  lead.status = input.status;
  const updated = toListItem(lead.id);
  if (!updated) throw new Error(`Lead ${input.lead_id} could not be loaded`);
  return delay(updated, 350);
}

