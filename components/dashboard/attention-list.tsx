import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock } from "lucide-react";

import { EmptyState } from "@/components/dashboard/states";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "@/lib/api";

/**
 * Failed calls, unsent confirmations and leads nobody rang back.
 *
 * A failed tool call or an undelivered confirmation must never disappear
 * quietly, so this list sits at the top of the dashboard until it's empty.
 */
export function AttentionList({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="Nothing needs you"
        description="Every call was handled, every confirmation went out, and no lead is sitting untouched."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className={cn(
              "group flex items-start gap-3 rounded border p-4 transition-colors",
              item.severity === "error"
                ? "border-destructive/40 bg-destructive/8 hover:bg-destructive/12"
                : "border-[var(--warn-border)] bg-[var(--warn-bg)] hover:brightness-97",
            )}
          >
            <span
              className={cn(
                "mt-0.5 shrink-0",
                item.severity === "error"
                  ? "text-destructive"
                  : "text-amber-600",
              )}
            >
              {item.severity === "error" ? (
                <AlertTriangle className="size-4" aria-hidden />
              ) : (
                <Clock className="size-4" aria-hidden />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
                {item.title}
                <span className="text-muted-foreground text-xs font-normal">
                  {formatRelative(item.occurred_at)}
                </span>
              </span>
              <span className="text-muted-foreground mt-0.5 block text-sm">
                {item.detail}
              </span>
            </span>

            <ArrowRight
              className="text-muted-foreground mt-0.5 size-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
