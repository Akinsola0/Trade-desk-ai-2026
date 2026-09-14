"use client";

import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { JobDetailDialog } from "@/components/dashboard/job-detail-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { ErrorState, LoadingRows } from "@/components/dashboard/states";
import { JobStatusBadge, LeadSourceBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAsync } from "@/hooks/use-async";
import {
  getAvailability,
  getJobs,
  getSession,
  type JobListItem,
  type Weekday,
} from "@/lib/api";
import { formatTime } from "@/lib/format";
import { weekdayShortLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

/** Monday of the week containing `date`, at midnight. */
function startOfWeek(date: Date) {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<JobListItem | null>(null);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const { data, error, loading, reload, setData } = useAsync(
    useCallback(async () => {
      const session = await getSession();
      const [jobs, availability] = await Promise.all([
        getJobs({ from: weekStart.toISOString(), to: weekEnd.toISOString() }),
        getAvailability(session.business.id),
      ]);
      return { jobs, availability };
    }, [weekStart, weekEnd]),
  );

  const monthLabel = new Intl.DateTimeFormat("en-IE", {
    month: "long",
    year: "numeric",
  }).format(weekStart);

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Only jobs the AI could book inside your working hours — nothing lands outside them."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous week"
              onClick={() => setWeekStart((current) => addDays(current, -7))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              This week
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next week"
              onClick={() => setWeekStart((current) => addDays(current, 7))}
            >
              <ChevronRight />
            </Button>
          </div>
        }
      />

      <p className="text-muted-foreground mb-4 text-sm font-medium">
        {monthLabel}
      </p>

      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {loading && !data ? <LoadingRows rows={4} /> : null}

      {data ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          {days.map((day) => {
            const weekday = day.getDay() as Weekday;
            const rules = data.availability.filter(
              (rule) => rule.weekday === weekday,
            );
            const jobs = data.jobs.filter((job) =>
              isSameDay(new Date(job.starts_at), day),
            );
            const today = isSameDay(day, new Date());

            return (
              <Card
                key={day.toISOString()}
                className={cn(
                  "gap-3 py-4",
                  today && "border-primary ring-primary/20 ring-2",
                )}
              >
                <CardContent className="px-3">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-semibold">
                      {weekdayShortLabels[weekday]} {day.getDate()}
                    </p>
                    {today ? (
                      <span className="text-primary text-xs font-medium">
                        Today
                      </span>
                    ) : null}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {rules.length === 0
                      ? "Closed"
                      : rules
                          .map((rule) => `${rule.start_time}–${rule.end_time}`)
                          .join(", ")}
                  </p>

                  <ul className="mt-3 space-y-2">
                    {jobs.length === 0 ? (
                      <li className="text-muted-foreground rounded-md border border-dashed px-2 py-3 text-center text-xs">
                        No jobs
                      </li>
                    ) : null}

                    {jobs.map((job) => (
                      <li key={job.id}>
                        <button
                          type="button"
                          onClick={() => setSelected(job)}
                          className="hover:border-primary/40 hover:bg-secondary/60 w-full rounded-md border p-2 text-left transition-colors"
                        >
                          <span className="font-mono text-xs font-medium">
                            {formatTime(job.starts_at)}–
                            {formatTime(job.ends_at)}
                          </span>
                          <span className="mt-0.5 block text-sm font-medium">
                            {job.lead.service}
                          </span>
                          <span className="text-muted-foreground block text-xs">
                            {job.customer.name}
                          </span>
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            <JobStatusBadge status={job.status} />
                            <LeadSourceBadge source={job.lead.source} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <JobDetailDialog
        job={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onUpdated={(updated) => {
          setData((current) => ({
            ...current,
            jobs: current.jobs.map((job) =>
              job.id === updated.id ? updated : job,
            ),
          }));
          setSelected(updated);
        }}
      />
    </>
  );
}
