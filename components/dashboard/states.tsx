import { AlertCircle, Inbox } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="text-muted-foreground flex flex-col items-center gap-2 rounded border border-dashed px-6 py-14 text-center">
      <Inbox className="size-5" aria-hidden />
      <p className="text-foreground font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm">{description}</p> : null}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
}: {
  error: Error;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="border-destructive/40 bg-destructive/8 text-destructive flex flex-col items-start gap-3 rounded border px-4 py-4"
    >
      <p className="flex items-center gap-2 font-medium">
        <AlertCircle className="size-4" aria-hidden />
        Couldn&apos;t load this
      </p>
      <p className="text-sm">{error.message}</p>
      <Button size="sm" variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
