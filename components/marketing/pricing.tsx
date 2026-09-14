import Link from "next/link";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatEuro } from "@/lib/format";
import { pricingTiers } from "@/lib/marketing";
import { cn } from "@/lib/utils";

/**
 * Pricing is on the homepage, in numbers, with no "book a demo" in front of
 * it — the one thing every competitor we looked at hides.
 */
export function Pricing() {
  return (
    <section
      id="pricing"
      className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24"
    >
      <div className="max-w-2xl">
        <p className="kicker">Pricing</p>
        <h2 className="display mt-3 text-3xl sm:text-4xl">
          On the page, where it should be
        </h2>
        <p className="text-muted-foreground mt-3">
          One booked job a month covers Starter. Every plan includes a profile
          in the homeowner marketplace, and there is no setup fee.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {pricingTiers.map((tier) => (
          <div
            key={tier.id}
            className={cn(
              "bg-card relative flex flex-col rounded-2xl border p-6",
              tier.featured &&
                "border-primary ring-primary/15 shadow-lg ring-4",
            )}
          >
            {tier.featured ? (
              <span className="bg-primary text-primary-foreground absolute -top-3 left-6 rounded-full px-3 py-1 text-xs font-semibold">
                Most popular
              </span>
            ) : null}

            <h3 className="text-lg font-semibold">{tier.name}</h3>
            <p className="text-muted-foreground mt-1 text-sm">{tier.tagline}</p>

            <p className="mt-5 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight">
                {formatEuro(tier.priceCents)}
              </span>
              <span className="text-muted-foreground text-sm">/ month</span>
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              {tier.callAllowance}
            </p>

            <ul className="mt-5 space-y-2.5 text-sm">
              {tier.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check
                    className="text-primary mt-0.5 size-4 shrink-0"
                    aria-hidden
                  />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              className="mt-6 w-full"
              variant={tier.featured ? "default" : "outline"}
            >
              <Link href="/signup">{tier.cta}</Link>
            </Button>
          </div>
        ))}
      </div>

      <p className="text-muted-foreground mt-6 text-sm">
        Prices exclude VAT. Cancel inside your first month and we refund it — no
        contract, no notice period.
      </p>
    </section>
  );
}
