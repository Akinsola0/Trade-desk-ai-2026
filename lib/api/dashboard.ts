/** Overview counters and the "needs a human" queue. */
import { isDemoAuth } from "@/lib/api/auth";
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
 * Compute the summary over the caller's business for the current week.
 *
 * (Client-side aggregation over limited week windows for this MVP)
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const weekStartIso = new Date(startOfWeek()).toISOString();

    const [callsRes, leadsRes, jobsRes] = await Promise.all([
      supabase.from("calls").select("started_at").gte("started_at", weekStartIso),
      supabase.from("leads").select("created_at").gte("created_at", weekStartIso),
      supabase.from("jobs").select("starts_at").gte("starts_at", weekStartIso).neq("status", "cancelled"),
    ]);

    const calls = callsRes.data ?? [];
    const leads = leadsRes.data ?? [];
    const jobs = jobsRes.data ?? [];

    const afterHours = calls.filter((call) => {
      const hour = new Date(call.started_at).getHours();
      return hour < 8 || hour >= 18;
    });

    return {
      calls_answered_this_week: calls.length,
      leads_captured_this_week: leads.length,
      jobs_booked_this_week: jobs.length,
      after_hours_calls_this_week: afterHours.length,
      booked_value_cents_this_week: jobs.length * ESTIMATED_JOB_VALUE_CENTS,
    };
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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
 */
export async function getAttentionItems(): Promise<AttentionItem[]> {
  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    const supabase = getSupabaseBrowserClient();

    const items: AttentionItem[] = [];
    const dayOldIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [callsRes, messagesRes, leadsRes] = await Promise.all([
      // Failed calls: corrected_outcome = failed, or (outcome = failed and corrected is null)
      supabase.from("calls").select("id, summary, started_at, outcome, corrected_outcome")
        .or('corrected_outcome.eq.failed,and(corrected_outcome.is.null,outcome.eq.failed)'),
      
      // Failed or queued messages
      supabase.from("messages").select("id, status, error_message, created_at, channel, customers(name)")
        .in("status", ["failed", "queued"]),
        
      // Unactioned leads older than 24h
      supabase.from("leads").select("id, service, created_at, customers(name)")
        .eq("status", "new")
        .lt("created_at", dayOldIso)
    ]);

    const calls = callsRes.data ?? [];
    for (const call of calls) {
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

    const messages = messagesRes.data ?? [];
    for (const message of messages) {
      const customerName = (message.customers as any)?.name ?? "customer";
      
      if (message.status === "failed") {
        items.push({
          id: `message-${message.id}`,
          kind: "failed_message",
          title: `Confirmation to ${customerName} failed`,
          detail: message.error_message ?? "Delivery failed.",
          occurred_at: message.created_at,
          href: `/dashboard/messages?message=${message.id}`,
          severity: "error",
        });
      } else if (message.status === "queued") {
        items.push({
          id: `message-${message.id}`,
          kind: "queued_message",
          title: `Confirmation to ${customerName} still sending`,
          detail: `Queued on ${message.channel === "whatsapp" ? "WhatsApp" : "SMS"} and not delivered yet.`,
          occurred_at: message.created_at,
          href: `/dashboard/messages?message=${message.id}`,
          severity: "warning",
        });
      }
    }

    const leads = leadsRes.data ?? [];
    for (const lead of leads) {
      const customerName = (lead.customers as any)?.name ?? "Lead";
      items.push({
        id: `lead-${lead.id}`,
        kind: "unactioned_lead",
        title: `${customerName} hasn't been called back`,
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

    return items;
  }

  // ── Demo path ──────────────────────────────────────────────────────────────
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

