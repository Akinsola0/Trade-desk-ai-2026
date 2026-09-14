import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Phone } from "lucide-react";

import { ConfirmTradesmanForm } from "@/components/marketplace/confirm-tradesman-form";
import { ContactForm } from "@/components/marketplace/contact-form";
import {
  PhotoTile,
  iconForCategory,
} from "@/components/marketplace/photo-tile";
import { TrustBlock } from "@/components/marketplace/trust-block";
import { RatingStars } from "@/components/rating-stars";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCategories, getMarketplaceProfile } from "@/lib/api";
import { formatDate, formatEuro, formatPhone } from "@/lib/format";
import { tradeTypeLabels } from "@/lib/labels";

interface ProPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    issue?: string;
    eircode?: string;
    dates?: string;
    fallback?: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProPageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getMarketplaceProfile(slug);
  if (!profile) return { title: "Not found" };

  return {
    title: `${profile.business_name}, ${profile.town}`,
    description: profile.headline,
  };
}

export default async function ProPage({ params, searchParams }: ProPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const [profile, categories] = await Promise.all([
    getMarketplaceProfile(slug),
    getCategories(),
  ]);

  if (!profile) notFound();

  const icon = iconForCategory(profile.categories, categories);
  const memberSince = new Date(profile.member_since).getFullYear();

  // Arrived from the "find a tradesman" chat's recommendation list — swap
  // the plain callback form for the confirm-and-send flow that posts to
  // this business's Requests inbox instead of the general leads list.
  const issue = sp.issue ?? "";
  const eircode = sp.eircode ?? "";
  const dateRange = sp.dates ?? "";
  const fromChat = Boolean(issue || eircode || dateRange);
  const fallbackSlugs = (sp.fallback ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

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
              <Link
                href={`/find/${profile.categories[0]}/${profile.town.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded underline-offset-4 hover:underline"
              >
                {tradeTypeLabels[profile.categories[0]]}s in {profile.town}
              </Link>
              <span aria-hidden> / </span>
              <span className="text-foreground">{profile.business_name}</span>
            </nav>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              <PhotoTile
                name={profile.business_name}
                category={icon}
                categories={profile.categories}
                className="h-28 w-full shrink-0 sm:size-28"
              />

              <div className="min-w-0 flex-1">
                <h1 className="display text-4xl sm:text-5xl">
                  {profile.business_name}
                </h1>
                <p className="text-muted-foreground mt-2">{profile.headline}</p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profile.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {tradeTypeLabels[category]}
                    </Badge>
                  ))}
                  {profile.answers_24_7 ? (
                    <Badge
                      variant="outline"
                      className="border-ink/25 bg-hivis text-ink"
                    >
                      Answers 24/7
                    </Badge>
                  ) : null}
                  <Badge variant="outline" className="text-muted-foreground">
                    On TradeDesk since {memberSince}
                  </Badge>
                </div>

                <TrustBlock
                  className="mt-4"
                  verified={profile.verified}
                  rating={profile.rating}
                  reviewCount={profile.review_count}
                  respondsWithinMinutes={profile.responds_within_minutes}
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="lg">
                    <a href="#contact">
                      {fromChat ? "Confirm for this job" : "Request a callback"}
                    </a>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <a href={`tel:${profile.phone}`}>
                      <Phone />
                      {formatPhone(profile.phone)}
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_23rem]">
          <div className="space-y-10">
            <section>
              <h2 className="display text-2xl">About</h2>
              <p className="mt-3 leading-relaxed">{profile.bio}</p>
              <p className="text-muted-foreground mt-4 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                Covers {profile.service_area}
              </p>
            </section>

            <section>
              <h2 className="display text-2xl">Prices</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Indicative starting prices, given by {profile.business_name}.
                The quote you get is theirs — but you shouldn&apos;t have to
                ring to find out the ballpark.
              </p>
              <ul className="divide-border mt-5 divide-y rounded border">
                {profile.services.map((service) => (
                  <li
                    key={service.name}
                    className="flex flex-wrap items-baseline justify-between gap-3 p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{service.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {service.description}
                      </p>
                    </div>
                    <p className="text-right whitespace-nowrap">
                      <span className="text-muted-foreground block text-xs font-medium">
                        From
                      </span>
                      <span className="typed mt-1 block text-2xl font-bold">
                        {formatEuro(service.from_price_cents)}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="display text-2xl">
                Reviews ({profile.review_count})
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Only customers with a completed job can leave one.
                {profile.reviews.length < profile.review_count
                  ? ` Showing the ${profile.reviews.length} most recent.`
                  : ""}
              </p>

              <ul className="mt-4 space-y-3">
                {profile.reviews.map((review) => (
                  <li key={review.id}>
                    <Card className="gap-2 py-4">
                      <CardContent className="px-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <RatingStars rating={review.rating} size="sm" />
                          <span className="text-muted-foreground text-xs">
                            {formatDate(review.created_at)}
                          </span>
                        </div>
                        <blockquote className="mt-2 text-sm leading-relaxed">
                          “{review.comment}”
                        </blockquote>
                        <p className="text-muted-foreground mt-2 text-xs">
                          <span className="text-foreground font-medium">
                            {review.customer_name}
                          </span>
                          {review.job_service ? ` · ${review.job_service}` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside id="contact" className="lg:sticky lg:top-24 lg:self-start">
            <Card className="py-5">
              <CardContent className="px-5">
                <h2 className="display text-xl">
                  {fromChat ? "Confirm this tradesman" : "Request a callback"}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm">
                  {profile.responds_within_minutes !== null
                    ? `${profile.business_name} usually replies within ${profile.responds_within_minutes} minutes.`
                    : `${profile.business_name} will come back to you shortly.`}
                </p>
                <div className="mt-4">
                  {fromChat ? (
                    <ConfirmTradesmanForm
                      profile={profile}
                      issue={issue}
                      eircode={eircode}
                      dateRange={dateRange}
                      fallbackSlugs={fallbackSlugs}
                    />
                  ) : (
                    <Suspense
                      fallback={
                        <div className="bg-secondary/40 h-72 animate-pulse rounded-lg" />
                      }
                    >
                      <ContactForm profile={profile} />
                    </Suspense>
                  )}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
