/** Booked work — the calendar's data source. */
import { isDemoAuth } from "@/lib/api/auth";
import { db, delay } from "@/lib/api/mock/store";
import type {
  DateRange,
  JobListItem,
  UUID,
  UpdateJobInput,
} from "@/lib/api/types";

function toListItem(jobId: UUID): JobListItem | null {
  const job = db.jobs.find((item) => item.id === jobId);
  if (!job) return null;

  const lead = db.leads.find((item) => item.id === job.lead_id);
  if (!lead) return null;

  const customer = db.customers.find((item) => item.id === lead.customer_id);
  if (!customer) return null;

  return {
    ...job,
    lead: {
      id: lead.id,
      service: lead.service,
      description: lead.description,
      urgency: lead.urgency,
      source: lead.source,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    },
  };
}

/**
 * Map a Supabase row to the `JobListItem` shape.
 */
function rowToJobListItem(row: any): JobListItem {
  const lead = Array.isArray(row.leads) ? row.leads[0] : row.leads;
  const customer = Array.isArray(lead?.customers) ? lead.customers[0] : lead?.customers;

  return {
    id: row.id,
    lead_id: row.lead_id,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    status: row.status,
    notes: row.notes,
    lead: {
      id: lead.id,
      service: lead.service,
      description: lead.description,
      urgency: lead.urgency,
      source: lead.source,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
    },
  };
}

/**
 * Jobs starting inside `[range.from, range.to)`, earliest first. Omit the range
 * for every job.
 */
export async function getJobs(range?: DateRange): Promise<JobListItem[]> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    let query = supabase
      .from("jobs")
      .select(`
        id, lead_id, starts_at, ends_at, status, notes,
        leads (
          id, service, description, urgency, source,
          customers ( id, name, phone, address )
        )
      `)
      .order("starts_at", { ascending: true });

    if (range) {
      query = query
        .gte("starts_at", new Date(range.from).toISOString())
        .lt("starts_at", new Date(range.to).toISOString());
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (!data) return [];

    return data.map(rowToJobListItem);
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  const items = db.jobs
    .map((job) => toListItem(job.id))
    .filter((item): item is JobListItem => item !== null)
    .filter((item) => {
      if (!range) return true;
      const starts = new Date(item.starts_at).getTime();
      return (
        starts >= new Date(range.from).getTime() &&
        starts < new Date(range.to).getTime()
      );
    })
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );

  return delay(items);
}

/**
 * Fetch a single job by ID.
 * (Helper for updateJob to return the updated record.)
 */
async function getJob(jobId: UUID): Promise<JobListItem | null> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase
      .from("jobs")
      .select(`
        id, lead_id, starts_at, ends_at, status, notes,
        leads (
          id, service, description, urgency, source,
          customers ( id, name, phone, address )
        )
      `)
      .eq("id", jobId)
      .single();

    if (error || !data) return null;
    return rowToJobListItem(data);
  }

  return toListItem(jobId);
}

/**
 * The UI only changes `status` and `notes` today.
 */
export async function updateJob(input: UpdateJobInput): Promise<JobListItem> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const updates: Record<string, any> = {};
    if (input.status) updates.status = input.status;
    if (input.notes !== undefined) updates.notes = input.notes;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("jobs")
        .update(updates)
        .eq("id", input.job_id);

      if (error) throw new Error(error.message);
    }

    const updated = await getJob(input.job_id);
    if (!updated) throw new Error(`Job ${input.job_id} could not be loaded`);
    return updated;
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
  const job = db.jobs.find((item) => item.id === input.job_id);
  if (!job) throw new Error(`Job ${input.job_id} not found`);

  if (input.status) job.status = input.status;
  if (input.notes !== undefined) job.notes = input.notes;

  const updated = toListItem(job.id);
  if (!updated) throw new Error(`Job ${input.job_id} could not be loaded`);
  return delay(updated, 350);
}

