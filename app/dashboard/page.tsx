"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Euro,
  MoonStar,
  PhoneCall,
  Users,
} from "lucide-react";

import { AttentionList } from "@/components/dashboard/attention-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { ErrorState, LoadingRows } from "@/components/dashboard/states";
import {
  CallOutcomeBadge,
  JobStatusBadge,
  LeadSourceBadge,
} from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAsync } from "@/hooks/use-async";
import {
  getAttentionItems,
  getCalls,
  getDashboardSummary,
  getJobs,
} from "@/lib/api";
import { formatEuro, formatRelative, formatTime } from "@/lib/format";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function DashboardOverviewPage() {
  const { data, error, loading, reload } = useAsync(
    useCallback(async () => {
      const from = startOfToday();
      const to = new Date(from);
      to.setDate(to.getDate() + 1);

      const [summary, attention, todaysJobs, calls] = await Promise.all([
        getDashboardSummary(),
        getAttentionItems(),
        getJobs({ from: from.toISOString(), to: to.toISOString() }),
        getCalls(),
      ]);

      return { summary, attention, todaysJobs, calls: calls.slice(0, 5) };
    }, []),
  );

  const stats = data
    ? [
        {
          label: "Calls answered",
          value: String(data.summary.calls_answered_this_week),
          icon: PhoneCall,
        },
        {
          label: "Leads captured",
          value: String(data.summary.leads_captured_this_week),
          icon: Users,
        },
        {
          label: "Jobs booked",
          value: String(data.summary.jobs_booked_this_week),
          icon: CalendarDays,
        },
        {
          label: "Out of hours",
          value: String(data.summary.after_hours_calls_this_week),
          icon: MoonStar,
        },
        {
          label: "Booked work",
          value: formatEuro(data.summary.booked_value_cents_this_week),
          icon: Euro,
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Overview"
        description="What the AI front desk did for you this week."
        action={
          <Button asChild variant="outline">
            <Link href="/dashboard/leads">
              See all leads
              <ArrowRight />
            </Link>
          </Button>
        }
      />

      {error ? <ErrorState error={error} onRetry={reload} /> : null}

      {loading && !data ? <LoadingRows rows={3} /> : null}

      {data ? (
        <div className="space-y-6">
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map((stat) => (
              <li key={stat.label} className="h-full">
                <Card className="h-full gap-2 py-5">
                  <CardHeader className="px-4">
                    <CardDescription className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                      <stat.icon className="size-3.5" aria-hidden />
                      {stat.label}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4">
                    <p className="text-3xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          <Card>
            <CardHeader>
              <CardTitle>Needs you</CardTitle>
              <CardDescription>
                Failed calls, confirmations that didn&apos;t send, and leads
                nobody has rung back.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttentionList items={data.attention} />
            </CardContent>
          </Card>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Today&apos;s jobs</CardTitle>
                <CardDescription>
                  {data.todaysJobs.length === 0
                    ? "Nothing in the diary for today."
                    : `${data.todaysJobs.length} booked in.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.todaysJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border p-3"
                  >
                    <span className="font-mono text-sm font-medium">
                      {formatTime(job.starts_at)}–{formatTime(job.ends_at)}
                    </span>
                    <span className="text-sm font-medium">
                      {job.lead.service}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {job.customer.name}
                    </span>
                    <span className="ml-auto flex items-center gap-2">
                      <LeadSourceBadge source={job.lead.source} />
                      <JobStatusBadge status={job.status} />
                    </span>
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="mt-1">
                  <Link href="/dashboard/calendar">
                    Open the calendar
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Latest calls</CardTitle>
                <CardDescription>
                  What the AI heard and what it decided.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.calls.map((call) => (
                  <div key={call.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {call.customer?.name ?? "Unknown caller"}
                      </span>
                      <CallOutcomeBadge
                        outcome={call.corrected_outcome ?? call.outcome}
                        corrected={Boolean(call.corrected_outcome)}
                      />
                      <span className="text-muted-foreground ml-auto text-xs">
                        {formatRelative(call.started_at)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1.5 line-clamp-2 text-sm">
                      {call.summary}
                    </p>
                  </div>
                ))}
                <Button asChild variant="ghost" size="sm" className="mt-1">
                  <Link href="/dashboard/calls">
                    Open the call log
                    <ArrowRight />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
