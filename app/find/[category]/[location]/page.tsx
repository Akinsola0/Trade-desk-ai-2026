import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { FindAndBrowse } from "@/components/marketplace/find-and-browse";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
  TRADE_TYPES,
  getCategories,
  getLocation,
  getLocations,
  type TradeType,
} from "@/lib/api";
import { formatEuro } from "@/lib/format";

interface FindPageProps {
  params: Promise<{ category: string; location: string }>;
}

function isTradeType(value: string): value is TradeType {
  return (TRADE_TYPES as readonly string[]).includes(value);
}

export async function generateMetadata({
  params,
}: FindPageProps): Promise<Metadata> {
  const { category, location } = await params;
  if (!isTradeType(category)) return { title: "Not found" };

  const [categories, town] = await Promise.all([
    getCategories(),
    getLocation(location),
  ]);
  const match = categories.find((item) => item.slug === category);
  if (!match || !town) return { title: "Not found" };

  return {
    title: `${match.plural} in ${town.town}`,
    description: `Verified ${match.plural.toLowerCase()} in ${town.town}, Co. ${town.county}, with prices from ${formatEuro(match.from_price_cents)} and reviews from real jobs.`,
  };
}

export default async function FindPage({ params }: FindPageProps) {
  const { category, location } = await params;
  if (!isTradeType(category)) notFound();

  const [categories, locations, town] = await Promise.all([
    getCategories(),
    getLocations(),
    getLocation(location),
  ]);

  const match = categories.find((item) => item.slug === category);
  if (!match || !town) notFound();

  const nearbyTowns = locations
    .filter((item) => item.slug !== town.slug && item.county === town.county)
    .slice(0, 4);
  const otherCategories = categories
    .filter((item) => item.slug !== category)
    .slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="border-b">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
            <nav
              aria-label="Breadcrumb"
              className="text-muted-foreground text-sm"
            >
              <Link
                href="/find"
                className="rounded underline-offset-4 hover:underline"
              >
                All trades
              </Link>
              <span aria-hidden> / </span>
              <span className="text-foreground">
                {match.plural} in {town.town}
              </span>
            </nav>

            <h1 className="display mt-4 text-4xl sm:text-5xl">
              {match.plural} in {town.town}, Co. {town.county}
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl">
              Verified {match.plural.toLowerCase()} covering {town.town}, with
              indicative prices from {formatEuro(match.from_price_cents)}. Every
              review below comes from a completed job, and every profile shows
              them in full.
            </p>
          </div>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
          <FindAndBrowse
            category={category}
            location={town.slug}
            town={town.town}
            categories={categories}
          />

          <section className="mt-14 grid gap-8 border-t pt-10 md:grid-cols-2">
            {nearbyTowns.length > 0 ? (
              <div>
                <h2 className="kicker">{match.plural} in nearby towns</h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {nearbyTowns.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/find/${category}/${item.slug}`}
                        className="hover:text-foreground text-muted-foreground rounded underline-offset-4 transition-colors hover:underline"
                      >
                        {match.plural} in {item.town}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div>
              <h2 className="kicker">Other trades in {town.town}</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {otherCategories.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/find/${item.slug}/${town.slug}`}
                      className="hover:text-foreground text-muted-foreground rounded underline-offset-4 transition-colors hover:underline"
                    >
                      {item.plural} in {town.town} · from{" "}
                      {formatEuro(item.from_price_cents)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
