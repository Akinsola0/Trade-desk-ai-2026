"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

import {
  JobStatusBadge,
  LeadSourceBadge,
  LeadStatusBadge,
  UrgencyBadge,
} from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { LEAD_STATUSES, updateLeadStatus, type LeadListItem } from "@/lib/api";
import { formatDateTime, formatPhone, formatRelative } from "@/lib/format";
import { leadStatusLabels } from "@/lib/labels";

/** Lead detail, with the status change the owner actually needs to make. */
export function LeadDetailDialog({
  lead,
  open,
  onOpenChange,
  onUpdated,
}: {
  lead: LeadListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (lead: LeadListItem) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);

  if (!lead) return null;

  async function setStatus(status: LeadListItem["status"]) {
    if (!lead) return;
    setSaving(status);
    try {
      const updated = await updateLeadStatus({ lead_id: lead.id, status });
      onUpdated(updated);
      toast.success(`Lead marked ${leadStatusLabels[status].toLowerCase()}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't update the lead",
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{lead.service}</DialogTitle>
          <DialogDescription>
            {lead.customer.name} · captured {formatRelative(lead.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <LeadStatusBadge status={lead.status} />
          <UrgencyBadge urgency={lead.urgency} />
          <LeadSourceBadge source={lead.source} />
        </div>

        <p className="text-sm leading-relaxed">{lead.description}</p>

        <Separator />

        <dl className="grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Phone className="text-muted-foreground size-4" aria-hidden />
            <dt className="sr-only">Phone</dt>
            <dd>
              <a
                className="rounded underline-offset-4 hover:underline"
                href={`tel:${lead.customer.phone}`}
              >
                {formatPhone(lead.customer.phone)}
              </a>
            </dd>
          </div>
          {lead.customer.email ? (
            <div className="flex items-center gap-2">
              <Mail className="text-muted-foreground size-4" aria-hidden />
              <dt className="sr-only">Email</dt>
              <dd>
                <a
                  className="rounded underline-offset-4 hover:underline"
                  href={`mailto:${lead.customer.email}`}
                >
                  {lead.customer.email}
                </a>
              </dd>
            </div>
          ) : null}
          {lead.customer.address ? (
            <div className="flex items-start gap-2">
              <MapPin
                className="text-muted-foreground mt-0.5 size-4"
                aria-hidden
              />
              <dt className="sr-only">Address</dt>
              <dd>{lead.customer.address}</dd>
            </div>
          ) : null}
        </dl>

        {lead.job ? (
          <div className="bg-secondary/60 rounded-lg border p-3 text-sm">
            <p className="flex items-center gap-2 font-medium">
              Booked {formatDateTime(lead.job.starts_at)}
              <JobStatusBadge status={lead.job.status} />
            </p>
            <Link
              href="/dashboard/calendar"
              className="text-primary mt-1 inline-block rounded text-xs underline-offset-4 hover:underline"
            >
              Show in the calendar
            </Link>
          </div>
        ) : null}

        {lead.call_id ? (
          <Link
            href={`/dashboard/calls?call=${lead.call_id}`}
            className="text-primary rounded text-sm underline-offset-4 hover:underline"
          >
            Read the call summary
          </Link>
        ) : null}

        <DialogFooter className="sm:justify-start">
          <div className="flex flex-wrap gap-2">
            {LEAD_STATUSES.filter((status) => status !== lead.status).map(
              (status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={status === "lost" ? "outline" : "default"}
                  disabled={saving !== null}
                  onClick={() => setStatus(status)}
                >
                  {saving === status ? (
                    <Loader2 className="animate-spin" />
                  ) : null}
                  Mark {leadStatusLabels[status].toLowerCase()}
                </Button>
              ),
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
