/** Overview counters and the "needs a human" queue. */
import { db, delay } from "@/lib/api/mock/store";
import type { AttentionItem, DashboardSummary } from "@/lib/api/types";

function startOfWeek(): number {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday-first
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Average call-out value used to estimate booked value until real pricing exists. */
const ESTIMATED_JOB_VALUE_CENTS = 18_500;

/**
 * TODO(backend): `GET /api/dashboard/summary` — compute in SQL over the caller's
 * business for the current week in the business's own timezone.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  const weekStart = startOfWeek();
  const isThisWeek = (iso: string) => new Date(iso).getTime() >= weekStart;

  const calls = db.calls.filter((call) => isThisWeek(call.started_at));
  const leads = db.leads.filter((lead) => isThisWeek(lead.created_at));
  const jobs = db.jobs.filter(
    (job) => isThisWeek(job.starts_at) && job.status !== "cancelled",
  );

  const afterHours = calls.filter((call) => {
    const hour = new Date(call.started_at).getHours();
    return hour < 8 || hour >= 18;
  });

  return delay({
    calls_answered_this_week: calls.length,
    leads_captured_this_week: leads.length,
    jobs_booked_this_week: jobs.length,
    after_hours_calls_this_week: afterHours.length,
    booked_value_cents_this_week: jobs.length * ESTIMATED_JOB_VALUE_CENTS,
  });
}

/**
 * Everything that failed or is still pending, so nothing disappears silently:
 * failed calls, failed and queued confirmations, and leads left untouched.
 *
 * TODO(backend): `GET /api/dashboard/attention` — same three sources, computed
 * server-side. Keep the shape; the dashboard renders it verbatim.
 */
export async function getAttentionItems(): Promise<AttentionItem[]> {
  const items: AttentionItem[] = [];

  for (const call of db.calls) {
    if ((call.corrected_outcome ?? call.outcome) !== "failed") continue;
    items.push({
      id: `call-${call.id}`,
      kind: "failed_call",
      title: "AI call failed mid-booking",
      detail: call.summary,
      occurred_at: call.started_at,
      href: `/dashboard/calls?call=${call.id}`,
      severity: "error",
    });
  }

  for (const message of db.messages) {
    const customer = db.customers.find(
      (item) => item.id === message.customer_id,
    );
    if (message.status === "failed") {
      items.push({
        id: `message-${message.id}`,
        kind: "failed_message",
        title: `Confirmation to ${customer?.name ?? "customer"} failed`,
        detail: message.error_message ?? "Delivery failed.",
        occurred_at: message.created_at,
        href: `/dashboard/messages?message=${message.id}`,
        severity: "error",
      });
    } else if (message.status === "queued") {
      items.push({
        id: `message-${message.id}`,
        kind: "queued_message",
        title: `Confirmation to ${customer?.name ?? "customer"} still sending`,
        detail: `Queued on ${message.channel === "whatsapp" ? "WhatsApp" : "SMS"} and not delivered yet.`,
        occurred_at: message.created_at,
        href: `/dashboard/messages?message=${message.id}`,
        severity: "warning",
      });
    }
  }

  const dayOld = Date.now() - 24 * 60 * 60 * 1000;
  for (const lead of db.leads) {
    if (lead.status !== "new") continue;
    if (new Date(lead.created_at).getTime() > dayOld) continue;
    const customer = db.customers.find((item) => item.id === lead.customer_id);
    items.push({
      id: `lead-${lead.id}`,
      kind: "unactioned_lead",
      title: `${customer?.name ?? "Lead"} hasn't been called back`,
      detail: `${lead.service} — captured over 24 hours ago and still marked new.`,
      occurred_at: lead.created_at,
      href: `/dashboard/leads?lead=${lead.id}`,
      severity: "warning",
    });
  }

  items.sort(
    (a, b) =>
      (a.severity === b.severity ? 0 : a.severity === "error" ? -1 : 1) ||
      new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
  );

  return delay(items);
}
