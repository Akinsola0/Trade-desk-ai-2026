"use client";

import { Suspense, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { LeadDetailDialog } from "@/components/dashboard/lead-detail-dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  EmptyState,
  ErrorState,
  LoadingRows,
} from "@/components/dashboard/states";
import {
  LeadSourceBadge,
  LeadStatusBadge,
  UrgencyBadge,
} from "@/components/status-badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAsync } from "@/hooks/use-async";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  getLeads,
  type LeadListItem,
  type LeadSource,
  type LeadStatus,
} from "@/lib/api";
import { formatPhone, formatRelative } from "@/lib/format";
import { leadSourceLabels, leadStatusLabels } from "@/lib/labels";

function LeadsView() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<LeadStatus | "all">("all");
  const [source, setSource] = useState<LeadSource | "all">("all");
  const [query, setQuery] = useState("");
  // Opens straight onto a lead when the overview's "needs you" list links here.
  const [selectedId, setSelectedId] = useState<string | null>(
    searchParams.get("lead"),
  );

  const { data, error, loading, reload, setData } = useAsync(
    useCallback(
      () => getLeads({ status, source, query }),
      [status, source, query],
    ),
  );

  // Derived, so a status change in the dialog is reflected without a second copy.
  const selected = data?.find((lead) => lead.id === selectedId) ?? null;

  function handleUpdated(updated: LeadListItem) {
    setData((current) =>
      current.map((lead) => (lead.id === updated.id ? updated : lead)),
    );
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description="Everything the AI captured on the phone, plus requests from your marketplace profile."
      />

      <Card className="mb-4 py-4">
        <CardContent className="grid gap-3 px-4 sm:grid-cols-[1fr_auto_auto]">
          <div className="grid gap-1.5">
            <Label htmlFor="lead-search" className="sr-only">
              Search leads
            </Label>
            <div className="relative">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                id="lead-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, job or description"
                className="pl-9"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lead-status" className="sr-only">
              Filter by status
            </Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as LeadStatus | "all")}
            >
              <SelectTrigger id="lead-status" className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every status</SelectItem>
                {LEAD_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {leadStatusLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="lead-source" className="sr-only">
              Filter by source
            </Label>
            <Select
              value={source}
              onValueChange={(value) => setSource(value as LeadSource | "all")}
            >
              <SelectTrigger id="lead-source" className="w-full sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Every source</SelectItem>
                {LEAD_SOURCES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {leadSourceLabels[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error ? <ErrorState error={error} onRetry={reload} /> : null}
      {loading && !data ? <LoadingRows rows={6} /> : null}

      {data && data.length === 0 ? (
        <EmptyState
          title="No leads match that"
          description="Try clearing the filters or the search box."
        />
      ) : null}

      {data && data.length > 0 ? (
        <Card className="py-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Customer</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Captured</TableHead>
                <TableHead className="text-right">&nbsp;</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <span className="font-medium">{lead.customer.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      {formatPhone(lead.customer.phone)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[22rem]">
                    <span className="font-medium">{lead.service}</span>
                    <span className="text-muted-foreground line-clamp-1 text-xs">
                      {lead.description}
                    </span>
                  </TableCell>
                  <TableCell>
                    <UrgencyBadge urgency={lead.urgency} />
                  </TableCell>
                  <TableCell>
                    <LeadSourceBadge source={lead.source} />
                  </TableCell>
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatRelative(lead.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedId(lead.id)}
                    >
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}

      <LeadDetailDialog
        lead={selected}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onUpdated={handleUpdated}
      />
    </>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<LoadingRows rows={6} />}>
      <LeadsView />
    </Suspense>
  );
}
