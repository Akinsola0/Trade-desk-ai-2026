"use client";

import { useCallback, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/page-header";
import { ErrorState, LoadingRows } from "@/components/dashboard/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAsync } from "@/hooks/use-async";
import {
  getAvailability,
  getSession,
  saveAvailability,
  type AvailabilityRule,
  type AvailabilityRuleInput,
  type UUID,
  type Weekday,
} from "@/lib/api";
import { timeToMinutes } from "@/lib/format";
import { WEEK_ORDER, weekdayLabels } from "@/lib/labels";

interface Window {
  start_time: string;
  end_time: string;
}

type WeekState = Record<Weekday, Window[]>;

/** Every window must be a real window, and two windows can't overlap in a day. */
function validate(week: WeekState): string | null {
  for (const weekday of WEEK_ORDER) {
    const windows = [...week[weekday]].sort((a, b) =>
      a.start_time.localeCompare(b.start_time),
    );

    for (const [index, window] of windows.entries()) {
      if (!window.start_time || !window.end_time) {
        return `${weekdayLabels[weekday]} has a window with a missing time.`;
      }
      if (timeToMinutes(window.end_time) <= timeToMinutes(window.start_time)) {
        return `${weekdayLabels[weekday]} finishes before it starts.`;
      }
      const previous = windows[index - 1];
      if (
        previous &&
        timeToMinutes(window.start_time) < timeToMinutes(previous.end_time)
      ) {
        return `${weekdayLabels[weekday]} has two windows that overlap.`;
      }
    }
  }
  return null;
}

function toWeekState(rules: AvailabilityRule[]): WeekState {
  const week: WeekState = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const rule of rules) {
    week[rule.weekday].push({
      start_time: rule.start_time,
      end_time: rule.end_time,
    });
  }
  return week;
}

export default function AvailabilityPage() {
  const { data, error, loading, reload } = useAsync(
    useCallback(async () => {
      const session = await getSession();
      const rules = await getAvailability(session.business.id);
      return { businessId: session.business.id, rules };
    }, []),
  );

  return (
    <>
      <PageHeader
        title="Working hours"
        description="The AI only offers slots inside these hours. Outside them it still answers, takes the details and flags an emergency."
      />

      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {loading && !data ? <LoadingRows rows={7} /> : null}

      {/* Keyed on the business so the editor starts from the loaded rules
          without an effect syncing two copies of them. */}
      {data ? (
        <WeekEditor
          key={data.businessId}
          businessId={data.businessId}
          rules={data.rules}
        />
      ) : null}
    </>
  );
}

function WeekEditor({
  businessId,
  rules,
}: {
  businessId: UUID;
  rules: AvailabilityRule[];
}) {
  const [week, setWeek] = useState<WeekState>(() => toWeekState(rules));
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  function updateWindow(
    weekday: Weekday,
    index: number,
    patch: Partial<Window>,
  ) {
    setWeek((current) => ({
      ...current,
      [weekday]: current[weekday].map((window, position) =>
        position === index ? { ...window, ...patch } : window,
      ),
    }));
  }

  function toggleDay(weekday: Weekday, open: boolean) {
    setWeek((current) => ({
      ...current,
      [weekday]: open ? [{ start_time: "08:00", end_time: "17:30" }] : [],
    }));
  }

  function addWindow(weekday: Weekday) {
    setWeek((current) => ({
      ...current,
      [weekday]: [
        ...current[weekday],
        { start_time: "18:00", end_time: "20:00" },
      ],
    }));
  }

  function removeWindow(weekday: Weekday, index: number) {
    setWeek((current) => ({
      ...current,
      [weekday]: current[weekday].filter((_, position) => position !== index),
    }));
  }

  async function save() {
    const problem = validate(week);
    setValidationError(problem);
    if (problem) return;

    const nextRules: AvailabilityRuleInput[] = WEEK_ORDER.flatMap((weekday) =>
      week[weekday].map((window) => ({
        weekday,
        start_time: window.start_time,
        end_time: window.end_time,
      })),
    );

    setSaving(true);
    try {
      await saveAvailability(businessId, nextRules);
      toast.success("Working hours saved — the AI will only book inside them.");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Couldn't save your working hours",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save working hours
        </Button>
      </div>

      {validationError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>That won&apos;t save yet</AlertTitle>
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        {WEEK_ORDER.map((weekday) => {
          const windows = week[weekday];
          const open = windows.length > 0;

          return (
            <Card key={weekday} className="gap-3 py-4">
              <CardContent className="px-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={`day-${weekday}`}
                      checked={open}
                      onCheckedChange={(checked) => toggleDay(weekday, checked)}
                    />
                    <Label htmlFor={`day-${weekday}`} className="text-base">
                      {weekdayLabels[weekday]}
                    </Label>
                  </div>

                  {open ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addWindow(weekday)}
                    >
                      <Plus />
                      Split the day
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-sm">
                      Closed
                    </span>
                  )}
                </div>

                {open ? (
                  <div className="mt-3 space-y-2">
                    {windows.map((window, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-end gap-3"
                      >
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`start-${weekday}-${index}`}
                            className="text-muted-foreground text-xs"
                          >
                            Starts
                          </Label>
                          <Input
                            id={`start-${weekday}-${index}`}
                            type="time"
                            value={window.start_time}
                            className="w-32"
                            onChange={(event) =>
                              updateWindow(weekday, index, {
                                start_time: event.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="grid gap-1.5">
                          <Label
                            htmlFor={`end-${weekday}-${index}`}
                            className="text-muted-foreground text-xs"
                          >
                            Finishes
                          </Label>
                          <Input
                            id={`end-${weekday}-${index}`}
                            type="time"
                            value={window.end_time}
                            className="w-32"
                            onChange={(event) =>
                              updateWindow(weekday, index, {
                                end_time: event.target.value,
                              })
                            }
                          />
                        </div>
                        {windows.length > 1 ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remove this window on ${weekdayLabels[weekday]}`}
                            onClick={() => removeWindow(weekday, index)}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
