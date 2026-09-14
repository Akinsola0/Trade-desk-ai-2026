import { Check, X } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatEuro } from "@/lib/format";
import {
  MISSED_CALL_MATHS,
  comparisonRows,
  missedCallCostPerMonthCents,
} from "@/lib/marketing";

/**
 * The cost of a missed call, a receptionist, and us — side by side, with the
 * arithmetic shown rather than asserted.
 */
export function CostComparison() {
  return (
    <section id="compare" className="band-dark">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[22rem_1fr] lg:items-start">
          <div>
            <p className="kicker">The maths</p>
            <h2 className="display mt-3 text-3xl sm:text-4xl">
              What a missed call really costs
            </h2>
            <p className="mt-6 text-6xl font-extrabold tracking-tight sm:text-7xl">
              {formatEuro(missedCallCostPerMonthCents)}
            </p>
            <p className="text-muted-foreground mt-3 max-w-sm text-sm">
              {MISSED_CALL_MATHS.missedCallsPerWeek} missed calls a week, at an
              average call-out of{" "}
              {formatEuro(MISSED_CALL_MATHS.averageJobValueCents)}, is that much
              a month going to whoever picks up next. A receptionist fixes it
              for about €2,000 a month. We fix it for €99.
            </p>
          </div>

          <div className="overflow-hidden rounded-2xl border">
            <Table className="min-w-[42rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[28%]">&nbsp;</TableHead>
                  <TableHead className="w-[24%]">Missing the call</TableHead>
                  <TableHead className="w-[24%]">A receptionist</TableHead>
                  <TableHead className="text-primary w-[24%] bg-white/5">
                    TradeDesk AI
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map((row) => (
                  <TableRow key={row.label}>
                    <TableCell className="text-muted-foreground font-medium">
                      {row.label}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <span className="flex items-start gap-2">
                        <X className="mt-0.5 size-4 shrink-0" aria-hidden />
                        {row.missedCalls}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.receptionist}
                    </TableCell>
                    <TableCell className="bg-white/5 font-medium">
                      <span className="flex items-start gap-2">
                        {row.tradedeskWins ? (
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-[#3ddc8a]"
                            aria-hidden
                          />
                        ) : null}
                        {row.tradedesk}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <p className="text-muted-foreground mt-6 max-w-3xl text-xs">
          Receptionist figure is a full-time salary plus employer PRSI at Irish
          market rates. Missed-call figure uses the average call-out value our
          trades report — change the assumption and the sum changes, but the
          direction doesn&apos;t.
        </p>
      </div>
    </section>
  );
}
