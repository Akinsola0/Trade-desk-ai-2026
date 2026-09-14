import { AudienceSplit } from "@/components/marketing/audience-split";
import { CostComparison } from "@/components/marketing/cost-comparison";
import { CtaBand } from "@/components/marketing/cta-band";
import { Faq } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Pricing } from "@/components/marketing/pricing";
import { Reviews } from "@/components/marketing/reviews";
import { TrustStrip } from "@/components/marketing/trust-strip";
import { SiteFooter } from "@/components/site/site-footer";
import { getCategories, getFeaturedReviews, getLocations } from "@/lib/api";

export default async function HomePage() {
  const [categories, locations, reviews] = await Promise.all([
    getCategories(),
    getLocations(),
    getFeaturedReviews(3),
  ]);

  return (
    <>
      <main id="main" className="flex-1">
        <Hero categories={categories} locations={locations} />
        <AudienceSplit />
        <TrustStrip />
        <Reviews reviews={reviews} />
        <HowItWorks />
        <CostComparison />
        <Pricing />
        <Faq />
        <CtaBand />
      </main>
      <SiteFooter />
    </>
  );
}
