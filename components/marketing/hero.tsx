import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CategoryIcon } from "@/components/marketing/category-icon";
import { HeroSearch } from "@/components/marketing/hero-search";
import { ToolBadge } from "@/components/marketing/tool-badge";
import { SiteHeader } from "@/components/site/site-header";
import { cn } from "@/lib/utils";
import type { MarketplaceCategory, MarketplaceLocation } from "@/lib/api";

/**
 * Full-bleed photo hero, modelled on Booksy's: a darkened photo behind a
 * transparent header, a centred thesis, a single search pill, and a row of
 * trade chips underneath — browse before you commit to a form.
 *
 * TODO(design): drop the real photo in at `/public/images/hero-tradesman.jpg`
 * — a tradesman on site, hi-vis visible, the same one referenced in the
 * brief. Pasted chat images aren't reachable as files from here, so the path
 * is wired up and styled (dark scrim, object-cover) but resolves to the
 * fallback colour below until that file exists.
 */
export function Hero({
  categories,
  locations,
}: {
  categories: MarketplaceCategory[];
  locations: MarketplaceLocation[];
}) {
  const visibleCategories = categories.slice(0, 7);

  return (
    <section className="relative isolate flex min-h-[38rem] flex-col overflow-hidden sm:min-h-[44rem]">
      {/* The photo. backgroundColor is the fallback if the file is missing. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url(/images/hero-tradesman.jpg)",
          backgroundColor: "#3a352f",
        }}
      />
      {/* Dark scrim for text legibility — a fixed overlay plus a bottom-heavy
          gradient, since contrast over an arbitrary photo can't be guaranteed
          by darkening the image alone. */}
      <div aria-hidden className="absolute inset-0 bg-black/45" />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10"
      />

      <SiteHeader overlay />

      {/* The signature element: an animated tool-assembly emblem, tucked into
          the corner rather than competing with the headline — one bold
          flourish, everything else quiet. Hidden below sm, where there's no
          room for it to read as anything but clutter. */}
      <ToolBadge className="pointer-events-none absolute top-24 right-4 hidden size-40 sm:block lg:top-28 lg:right-10 lg:size-52" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-28 text-center sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-white/70 uppercase">
          AI front desk · Irish trades
        </p>

        <h1 className="display mt-4 text-[clamp(2.25rem,1.5rem+3.5vw,3.75rem)] text-white">
          Every call answered.
          <br />
          Every job booked.
        </h1>

        <p className="mt-4 max-w-xl text-lg text-white/85">
          Find a verified tradesmanwho actually picks up
        </p>

        <div className="mt-8 w-full max-w-xl">
          <HeroSearch categories={categories} locations={locations} />
        </div>

        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
          {visibleCategories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/find/${category.slug}/${locations[0]?.slug ?? "naas"}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium text-white/85",
                  "hover:bg-white/10 hover:text-white",
                )}
              >
                <CategoryIcon
                  name={category.icon}
                  className="size-3.5 opacity-80"
                />
                {category.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/find"
              className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white"
            >
              More…
            </Link>
          </li>
        </ul>

        <p className="mt-10 text-sm text-white/70">
          Own a trade business?{" "}
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            Get your phone answered, free for 14 days
            <ArrowRight className="size-3.5" />
          </Link>
        </p>
      </div>
    </section>
  );
}
