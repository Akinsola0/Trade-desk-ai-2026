import Link from "next/link";

import { cn } from "@/lib/utils";

export function Logo({
  className,
  tone = "dark",
}: {
  className?: string;
  /** "light" for use on the dark hero photo or a dark band. */
  tone?: "dark" | "light";
}) {
  return (
    <Link
      href="/"
      className={cn(
        "display flex items-center gap-2 rounded text-xl",
        tone === "light" ? "text-white" : "text-foreground",
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-primary flex size-8 items-center justify-center rounded-lg text-sm font-bold text-white"
      >
        TD
      </span>
      TradeDesk
    </Link>
  );
}
