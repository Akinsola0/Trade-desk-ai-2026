"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Clock, Search } from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import { ReclassifyCallDialog } from "@/components/dashboard/reclassify-call-dialog";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import { CallOutcomeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAsync } from "@/hooks/use-async";
import {
  CALL_OUTCOMES,
  getCalls,
  type CallListItem,
  type CallOutcome,
} from "@/lib/api";
import { formatDateTime, formatDuration, formatPhone } from "@/lib/format";
import { callOutcomeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

function CallsView() {
  const searchParams = useSearchParams();
  const [outcome, setOutcome] = useState<CallOutcome | "all">("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CallListItem | null>(null);

  const { data, error, loading, reload, setData } = useAsync(
    useCallback(() => getCalls({ outcome, query }), [outcome, query]),
  );

  const highlightId = searchParams.get("call");
  useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`call-${highlightId}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlightId, data]);

  return (
    <>
      <PageHeader
        title="Call log"
        description="Every call the AI answered, what it decided, and a way to put it right when it got one wrong."
      />

      <Card className="mb-4 py-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-1.5">
            <Label htmlFor="call-search" className="sr-only">
              Search calls
            </Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="call-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search summaries, callers or the Twilio call SID"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="call-outcome" className="sr-only">
              Filter by outcome
            </Label>
            <Select
              value={outcome}
              onValueChange={(value) =>
                setOutcome(value as CallOutcome | "all")
              }
            >
              <SelectTrigger id="call-outcome" className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every outcome</SelectItem>
                {CALL_OUTCOMES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {callOutcomeLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {loading && !data ? <LoadingRows rows={5} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          title="No calls match that"
          description="Try a different outcome or clear the search."
        />
      ) : null}

      <ul className="space-y-3">
        {data?.map((call) => {
          const effective = call.corrected_outcome ?? call.outcome;
          return (
            <li key={call.id} id={`call-${call.id}`}>
              <Card
                className={cn(
                  "gap-3 py-4",
                  highlightId === call.id &&
                    "border-primary ring-primary/20 ring-2",
                  effective === "failed" && "border-destructive/40",
                )}
              >
                <CardContent className="px-4">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span className="font-medium">
                      {call.customer?.name ?? "Unknown caller"}
                    </span>
                    {call.customer ? (
                      <a
                        href={`tel:${call.customer.phone}`}
                        className="text-muted-foreground rounded text-sm underline-offset-4 hover:underline"
                      >
                        {formatPhone(call.customer.phone)}
                      </a>
                    ) : null}
                    <CallOutcomeBadge
                      outcome={effective}
                      corrected={Boolean(call.corrected_outcome)}
                    />
                    <span className="text-muted-foreground ml-auto flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" aria-hidden />
                        {formatDuration(call.duration_seconds)}
                      </span>
                      {formatDateTime(call.started_at)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed">{call.summary}</p>

                  {effective === "failed" ? (
                    <p className="text-destructive mt-2 flex items-start gap-2 text-sm">
                      <AlertTriangle
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                      />
                      No slot was held for this caller. Ring them back or book
                      them in by hand.
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(call)}
                    >
                      {call.corrected_outcome
                        ? "Change correction"
                        : "Correct this"}
                    </Button>
                    {call.lead_id ? (
                      <Link
                        href={`/dashboard/leads?lead=${call.lead_id}`}
                        className="text-primary rounded text-sm underline-offset-4 hover:underline"
                      >
                        Open the lead
                      </Link>
                    ) : null}
                    <span className="text-muted-foreground ml-auto font-mono text-xs">
                      {call.provider_call_id}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      <ReclassifyCallDialog
        call={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onUpdated={(updated) => {
          setData((current) =>
            current.map((call) => (call.id === updated.id ? updated : call)),
          );
          setSelected(updated);
        }}
      />
    </>
  );
}

export default function CallsPage() {
  return (
    <Suspense fallback={<LoadingRows rows={5} />}>
      <CallsView />
    </Suspense>
  );
}
