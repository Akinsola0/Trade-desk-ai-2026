"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MarketplaceCategory, MarketplaceLocation } from "@/lib/api";

const segmentTrigger =
  "h-auto w-full border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0 [&_svg]:hidden";

/**
 * One seamless white pill — a trade picker, a location picker, and a round
 * search button — rather than a free-text box, since routing needs a real
 * category and town rather than parsed text.
 */
export function HeroSearch({
  categories,
  locations,
  className,
}: {
  categories: MarketplaceCategory[];
  locations: MarketplaceLocation[];
  className?: string;
}) {
  const router = useRouter();
  const [category, setCategory] = useState<string>(
    categories[0]?.slug ?? "plumber",
  );
  const [location, setLocation] = useState<string>(
    locations[0]?.slug ?? "naas",
  );

  return (
    <form
      className={cn(
        "flex w-full items-stretch rounded-full bg-white p-2 shadow-[0_18px_45px_-20px_rgba(0,0,0,0.45)]",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`/find/${category}/${location}`);
      }}
    >
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger
          className={cn(
            segmentTrigger,
            "text-foreground pl-4 text-sm font-medium",
          )}
        >
          <SelectValue placeholder="What do you need?" />
        </SelectTrigger>
        <SelectContent>
          {categories.map((item) => (
            <SelectItem key={item.slug} value={item.slug}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span aria-hidden className="bg-border my-1.5 w-px shrink-0" />

      <Select value={location} onValueChange={setLocation}>
        <SelectTrigger
          className={cn(
            segmentTrigger,
            "text-muted-foreground pl-4 text-sm font-medium",
          )}
        >
          <SelectValue placeholder="Where?" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((item) => (
            <SelectItem key={item.slug} value={item.slug}>
              {item.town}, Co. {item.county}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="submit"
        aria-label="Search"
        className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-full transition hover:brightness-110"
      >
        <Search className="size-4" />
      </button>
    </form>
  );
}
