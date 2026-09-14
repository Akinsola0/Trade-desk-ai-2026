"use client";

import { useState } from "react";
import { Loader2, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";

import {
  JobStatusBadge,
  LeadSourceBadge,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  JOB_STATUSES,
  updateJob,
  type JobListItem,
  type JobStatus,
} from "@/lib/api";
import { formatDate, formatPhone, formatTime } from "@/lib/format";
import { jobStatusLabels } from "@/lib/labels";

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
  onUpdated,
}: {
  job: JobListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (job: JobListItem) => void;
}) {
  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Keyed on the job so the form starts from that job's values. */}
      <JobForm
        key={job.id}
        job={job}
        onOpenChange={onOpenChange}
        onUpdated={onUpdated}
      />
    </Dialog>
  );
}

function JobForm({
  job,
  onOpenChange,
  onUpdated,
}: {
  job: JobListItem;
  onOpenChange: (open: boolean) => void;
  onUpdated: (job: JobListItem) => void;
}) {
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [notes, setNotes] = useState(job.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const updated = await updateJob({ job_id: job.id, status, notes });
      onUpdated(updated);
      toast.success("Job updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't update the job",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{job.lead.service}</DialogTitle>
        <DialogDescription>
          {formatDate(job.starts_at)}, {formatTime(job.starts_at)}–
          {formatTime(job.ends_at)} · {job.customer.name}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap gap-2">
        <JobStatusBadge status={job.status} />
        <UrgencyBadge urgency={job.lead.urgency} />
        <LeadSourceBadge source={job.lead.source} />
      </div>

      <p className="text-sm leading-relaxed">{job.lead.description}</p>

      <dl className="grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Phone className="text-muted-foreground size-4" aria-hidden />
          <dt className="sr-only">Phone</dt>
          <dd>
            <a
              className="rounded underline-offset-4 hover:underline"
              href={`tel:${job.customer.phone}`}
            >
              {formatPhone(job.customer.phone)}
            </a>
          </dd>
        </div>
        {job.customer.address ? (
          <div className="flex items-start gap-2">
            <MapPin
              className="text-muted-foreground mt-0.5 size-4"
              aria-hidden
            />
            <dt className="sr-only">Address</dt>
            <dd>{job.customer.address}</dd>
          </div>
        ) : null}
      </dl>

      <div className="grid gap-1.5">
        <Label htmlFor="job-status">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as JobStatus)}
        >
          <SelectTrigger id="job-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {JOB_STATUSES.map((item) => (
              <SelectItem key={item} value={item}>
                {jobStatusLabels[item]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="job-notes">Notes for the van</Label>
        <Textarea
          id="job-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Parts to bring, gate codes, anything the customer said."
        />
      </div>

      {/* TODO(backend): re-scheduling a job has to go through lib/booking so two
            jobs can't land in the same slot — this dialog deliberately can't move
            the time yet. */}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save job
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
