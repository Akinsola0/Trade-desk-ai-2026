import type { Metadata } from "next";
import Link from "next/link";

import { CategoryGrid } from "@/components/marketing/category-grid";
import { HeroSearch } from "@/components/marketing/hero-search";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getCategories, getLocations } from "@/lib/api";

export const metadata: Metadata = {
  title: "Find a tradesman",
  description:
    "Browse verified plumbers, electricians, handymen and more across Ireland, with indicative prices and reviews from real jobs.",
};

export default async function FindIndexPage() {
  const [categories, locations] = await Promise.all([
    getCategories(),
    getLocations(),
  ]);

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <section className="border-b">
          <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
            <p className="kicker">The marketplace</p>
            <h1 className="display mt-4 text-4xl sm:text-5xl">
              Find a tradesman who answers
            </h1>
            <p className="text-muted-foreground mt-4 max-w-2xl">
              Every tradesman here has an AI front desk on their phone, so your
              call gets picked up — even at seven on a Sunday morning. Browse
              first; you only leave your details when you&apos;ve picked
              someone.
            </p>

            <div className="mt-9 max-w-2xl">
              <HeroSearch categories={categories} locations={locations} />
            </div>
          </div>
        </section>

        <TrustStrip />

        <CategoryGrid
          categories={categories}
          defaultLocation={locations[0]?.slug ?? "naas"}
        />

        <section className="border-t">
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6">
            <h2 className="display text-3xl sm:text-4xl">Towns we cover</h2>
            <p className="text-muted-foreground mt-3">
              More towns as trades sign up. Links go to plumbers — swap the
              trade once you&apos;re there.
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {locations.map((location) => (
                <li key={location.slug}>
                  <Link
                    href={`/find/plumber/${location.slug}`}
                    className="hover:bg-card block rounded border px-4 py-3 text-sm transition-colors"
                  >
                    <span className="font-medium">{location.town}</span>
                    <span className="text-muted-foreground block text-xs">
                      Co. {location.county}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
