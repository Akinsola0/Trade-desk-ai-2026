"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import { MatchRequestStatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsync } from "@/hooks/use-async";
import {
  getMarketplaceProfile,
  getMatchRequests,
  respondToMatchRequest,
  type MarketplaceListing,
  type MatchRequest,
} from "@/lib/api";
import { formatPhone, formatRelative } from "@/lib/format";
import { messageChannelLabels } from "@/lib/labels";

function RequestCard({
  request,
  responding,
  onRespond,
  fallback,
}: {
  request: MatchRequest;
  responding: boolean;
  onRespond: (response: "accepted" | "declined") => void;
  fallback?: MarketplaceListing;
}) {
  return (
    <Card className="py-5">
      <CardContent className="px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium">{request.customer_name}</p>
            <p className="text-muted-foreground text-sm">
              {formatPhone(request.customer_phone)}
              {request.customer_email ? ` · ${request.customer_email}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MatchRequestStatusBadge status={request.status} />
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {formatRelative(request.created_at)}
            </span>
          </div>
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          <p>
            <span className="font-medium">{request.service}</span> —{" "}
            {request.description}
          </p>
          {request.customer_address ? (
            <p className="text-muted-foreground flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden />
              {request.customer_address}
            </p>
          ) : null}
          {request.preferred_date_range ? (
            <p className="text-muted-foreground">
              Preferred: {request.preferred_date_range}
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Wants to hear back on{" "}
            {messageChannelLabels[request.preferred_channel]}
          </p>
        </div>

        {request.status === "pending" ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={responding}
              onClick={() => onRespond("accepted")}
            >
              {responding ? (
                <Loader2 className="animate-spin" />
              ) : (
                <CheckCircle2 />
              )}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={responding}
              onClick={() => onRespond("declined")}
            >
              <XCircle />
              Decline
            </Button>
          </div>
        ) : null}

        {request.status === "accepted" ? (
          <div className="border-ink/20 bg-hivis/35 mt-4 rounded border p-3 text-sm">
            <p className="text-ink font-medium">
              Booked — a confirmation was sent on{" "}
              {messageChannelLabels[request.preferred_channel]}.
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <Link
                href="/dashboard/leads"
                className="text-ink inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                View in Leads <ArrowRight className="size-3" aria-hidden />
              </Link>
              <Link
                href="/dashboard/messages"
                className="text-ink inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              >
                View sent message <ArrowRight className="size-3" aria-hidden />
              </Link>
            </div>
          </div>
        ) : null}

        {request.status === "declined" ? (
          <div className="bg-secondary/60 border-border mt-4 rounded border p-3 text-sm">
            {fallback ? (
              <>
                <p className="font-medium">
                  Passed to {fallback.business_name} instead.
                </p>
                <p className="text-muted-foreground mt-1">
                  The homeowner was told you weren&apos;t available and{" "}
                  {fallback.business_name} will attend to the job instead.
                </p>
                <Link
                  href={`/pro/${fallback.slug}`}
                  className="text-primary mt-2 inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                >
                  View their profile{" "}
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">
                No further matches were available for this job — you may want to
                follow up with the homeowner directly.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function RequestsPage() {
  const { data, error, loading, reload, setData } = useAsync(
    useCallback(() => getMatchRequests(), []),
  );
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [fallbacks, setFallbacks] = useState<
    Record<string, MarketplaceListing>
  >({});

  // Backfills the "passed to X instead" preview for requests that were
  // already declined before this page loaded, so a refresh doesn't lose it.
  useEffect(() => {
    if (!data) return;
    const missing = data.filter(
      (request) =>
        request.status === "declined" &&
        request.resolved_via_slug &&
        !fallbacks[request.id],
    );
    if (missing.length === 0) return;

    let cancelled = false;
    void Promise.all(
      missing.map(async (request) => {
        const profile = await getMarketplaceProfile(request.resolved_via_slug!);
        if (!cancelled && profile) {
          setFallbacks((current) => ({ ...current, [request.id]: profile }));
        }
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [data, fallbacks]);

  async function respond(
    request: MatchRequest,
    response: "accepted" | "declined",
  ) {
    setRespondingId(request.id);
    try {
      const result = await respondToMatchRequest({
        request_id: request.id,
        response,
      });
      setData((current) =>
        current.map((item) => (item.id === request.id ? result.request : item)),
      );
      if (result.fallback) {
        setFallbacks((current) => ({
          ...current,
          [request.id]: result.fallback!,
        }));
      }
    } finally {
      setRespondingId(null);
    }
  }

  const pending = data?.filter((request) => request.status === "pending") ?? [];
  const resolved =
    data?.filter((request) => request.status !== "pending") ?? [];

  return (
    <>
      <PageHeader
        title="Requests"
        description="Homeowners who confirmed you from the “find a tradesman” chat. Accept to book the job, or decline to pass it to the next best match automatically."
      />

      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {loading && !data ? <LoadingRows rows={4} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="When a homeowner confirms you from the chat, it'll land here for you to accept or decline."
        />
      ) : null}

      {pending.length > 0 ? (
        <section className="mb-8">
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            Awaiting your response ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                responding={respondingId === request.id}
                onRespond={(response) => respond(request, response)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {resolved.length > 0 ? (
        <section>
          <h2 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            Resolved
          </h2>
          <div className="space-y-3">
            {resolved.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                responding={false}
                onRespond={() => {}}
                fallback={fallbacks[request.id]}
              />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
