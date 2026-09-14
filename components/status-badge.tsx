/**
 * Badges for the status enums the backend owns.
 *
 * The colour maps are keyed by the enum values themselves, so a value the
 * backend adds without telling us still renders (as a neutral badge) instead of
 * crashing, and the compiler flags the missing colour.
 */
import {
  AlertTriangle,
  MessageSquare,
  Phone,
  PhoneOff,
  Store,
  UserPlus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  CallOutcome,
  JobStatus,
  LeadSource,
  LeadStatus,
  LeadUrgency,
  MatchRequestStatus,
  MessageStatus,
} from "@/lib/api/types";
import {
  callOutcomeLabels,
  jobStatusLabels,
  leadSourceLabels,
  leadStatusLabels,
  leadUrgencyLabels,
  matchRequestStatusLabels,
  messageStatusLabels,
} from "@/lib/labels";

const base = "border font-semibold";

// Booked wears the hi-vis fill — it is the outcome the whole product exists for.
const leadStatusStyles: Record<LeadStatus, string> = {
  new: "border-primary/40 bg-primary/10 text-primary",
  qualified: "border-foreground/30 bg-foreground/5 text-foreground",
  booked: "border-ink/25 bg-hivis text-ink",
  lost: "border-border bg-secondary text-muted-foreground",
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge variant="outline" className={cn(base, leadStatusStyles[status])}>
      {leadStatusLabels[status]}
    </Badge>
  );
}

const jobStatusStyles: Record<JobStatus, string> = {
  booked: "border-primary/40 bg-primary/10 text-primary",
  confirmed: "border-ink/25 bg-hivis text-ink",
  completed: "border-border bg-secondary text-muted-foreground",
  cancelled: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={cn(base, jobStatusStyles[status])}>
      {jobStatusLabels[status]}
    </Badge>
  );
}

const callOutcomeStyles: Record<CallOutcome, string> = {
  booked: "border-ink/25 bg-hivis text-ink",
  lead_only: "border-primary/40 bg-primary/10 text-primary",
  callback_required:
    "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]",
  spam: "border-border bg-secondary text-muted-foreground",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function CallOutcomeBadge({
  outcome,
  corrected = false,
}: {
  outcome: CallOutcome;
  /** True when an owner overrode the AI — the badge says so. */
  corrected?: boolean;
}) {
  return (
    <Badge variant="outline" className={cn(base, callOutcomeStyles[outcome])}>
      {outcome === "failed" ? <AlertTriangle aria-hidden /> : null}
      {callOutcomeLabels[outcome]}
      {corrected ? <span className="opacity-70">· corrected</span> : null}
    </Badge>
  );
}

/*
 * Source says where a lead came from, not how urgent it is, so it stays quiet:
 * the icon and label carry it. Fills are reserved for status, which is what an
 * owner scans a row for.
 */
const leadSourceStyles: Record<LeadSource, string> = {
  phone: "border-primary/35 bg-transparent text-primary",
  marketplace:
    "border-foreground/35 border-dashed bg-transparent text-foreground",
  manual: "border-border bg-transparent text-muted-foreground",
};

const leadSourceIcons: Record<LeadSource, typeof Phone> = {
  phone: Phone,
  marketplace: Store,
  manual: UserPlus,
};

export function LeadSourceBadge({ source }: { source: LeadSource }) {
  const Icon = leadSourceIcons[source];
  return (
    <Badge variant="outline" className={cn(base, leadSourceStyles[source])}>
      <Icon aria-hidden />
      {leadSourceLabels[source]}
    </Badge>
  );
}

const urgencyStyles: Record<LeadUrgency, string> = {
  emergency: "border-destructive/45 bg-destructive/12 text-destructive",
  urgent:
    "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]",
  routine: "border-border bg-secondary text-muted-foreground",
};

export function UrgencyBadge({ urgency }: { urgency: LeadUrgency }) {
  return (
    <Badge variant="outline" className={cn(base, urgencyStyles[urgency])}>
      {leadUrgencyLabels[urgency]}
    </Badge>
  );
}

const messageStatusStyles: Record<MessageStatus, string> = {
  queued:
    "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]",
  sent: "border-primary/40 bg-primary/10 text-primary",
  delivered: "border-ink/25 bg-hivis text-ink",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  return (
    <Badge variant="outline" className={cn(base, messageStatusStyles[status])}>
      {status === "failed" ? <PhoneOff aria-hidden /> : null}
      {status === "queued" ? <MessageSquare aria-hidden /> : null}
      {messageStatusLabels[status]}
    </Badge>
  );
}

const matchRequestStatusStyles: Record<MatchRequestStatus, string> = {
  pending:
    "border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]",
  accepted: "border-ink/25 bg-hivis text-ink",
  declined: "border-border bg-secondary text-muted-foreground",
};

export function MatchRequestStatusBadge({
  status,
}: {
  status: MatchRequestStatus;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(base, matchRequestStatusStyles[status])}
    >
      {matchRequestStatusLabels[status]}
    </Badge>
  );
}
