import { BadgeCheck, Clock, ShieldCheck } from "lucide-react";

import { RatingStars } from "@/components/rating-stars";
import { cn } from "@/lib/utils";

/**
 * Verification, reviews and the guarantee in one block rather than scattered
 * across the page — repeated identically on every listing and profile so the
 * signals are always read together.
 */
export function TrustBlock({
  verified,
  rating,
  reviewCount,
  respondsWithinMinutes,
  className,
  size = "default",
}: {
  verified: boolean;
  rating: number | null;
  reviewCount: number;
  respondsWithinMinutes: number | null;
  className?: string;
  size?: "sm" | "default";
}) {
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-4 gap-y-1.5", className)}
    >
      <RatingStars rating={rating} reviewCount={reviewCount} size={size} />

      <span className={cn("flex items-center gap-1.5", textSize)}>
        <BadgeCheck
          className={cn(
            "size-4",
            verified ? "text-primary" : "text-muted-foreground",
          )}
          aria-hidden
        />
        {verified
          ? "Insurance and registration checked"
          : "Verification pending"}
      </span>

      {respondsWithinMinutes !== null ? (
        <span
          className={cn(
            "text-muted-foreground flex items-center gap-1.5",
            textSize,
          )}
        >
          <Clock className="size-4" aria-hidden />
          Usually replies in {respondsWithinMinutes} min
        </span>
      ) : null}

      <span
        className={cn(
          "text-muted-foreground flex items-center gap-1.5",
          textSize,
        )}
      >
        <ShieldCheck className="size-4" aria-hidden />
        Covered by the TradeDesk guarantee
      </span>
    </div>
  );
}
