/** Booked work — the calendar's data source. */
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
 * Jobs starting inside `[range.from, range.to)`, earliest first. Omit the range
 * for every job.
 *
 * TODO(backend): `GET /api/jobs?from=&to=` — join `leads` and `customers`.
 */
export async function getJobs(range?: DateRange): Promise<JobListItem[]> {
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
 * TODO(backend): `PATCH /api/jobs/[id]` — re-scheduling must go through
 * `lib/booking` so two jobs can't land in the same slot. The UI only changes
 * `status` and `notes` today.
 */
export async function updateJob(input: UpdateJobInput): Promise<JobListItem> {
  const job = db.jobs.find((item) => item.id === input.job_id);
  if (!job) throw new Error(`Job ${input.job_id} not found`);

  if (input.status) job.status = input.status;
  if (input.notes !== undefined) job.notes = input.notes;

  const updated = toListItem(job.id);
  if (!updated) throw new Error(`Job ${input.job_id} could not be loaded`);
  return delay(updated, 350);
}
