import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Rounded to the nearest half star, with the number always spelled out beside it. */
export function RatingStars({
  rating,
  reviewCount,
  className,
  size = "default",
}: {
  rating: number | null;
  reviewCount?: number;
  className?: string;
  size?: "sm" | "default";
}) {
  if (rating === null) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>
        No reviews yet
      </span>
    );
  }

  const starSize = size === "sm" ? "size-3.5" : "size-4";

  return (
    <span className={cn("flex items-center gap-1.5", className)}>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              starSize,
              star <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "text-neutral-300",
            )}
          />
        ))}
      </span>
      <span
        className={cn("font-medium", size === "sm" ? "text-xs" : "text-sm")}
      >
        {rating.toFixed(1)}
      </span>
      {reviewCount !== undefined ? (
        <span
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "text-xs" : "text-sm",
          )}
        >
          ({reviewCount} {reviewCount === 1 ? "review" : "reviews"})
        </span>
      ) : null}
      <span className="sr-only">
        Rated {rating.toFixed(1)} out of 5
        {reviewCount !== undefined ? ` from ${reviewCount} reviews` : ""}
      </span>
    </span>
  );
}
