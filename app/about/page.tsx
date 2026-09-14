import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import {
  aboutStats,
  aboutStoryBlocks,
  companyValues,
  teamMembers,
} from "@/lib/marketing";

export const metadata: Metadata = {
  title: "About",
  description:
    "TradeDesk AI is built in Ireland so a missed call never costs a trade the job. Meet the team and the beliefs behind it.",
};

/** Initials on a colour tile — deliberately not a fabricated photo of a person. */
function TeamAvatar({ initials }: { initials: string }) {
  return (
    <span className="bg-secondary text-primary flex size-16 items-center justify-center rounded-2xl text-lg font-bold">
      {initials}
    </span>
  );
}

/** A photo block with a graceful fallback colour if the asset isn't there yet. */
function PhotoBlock({ src, className }: { src: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={`bg-secondary rounded-2xl bg-cover bg-center ${className ?? ""}`}
      style={{ backgroundImage: `url(${src})` }}
    />
  );
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        {/* Mission */}
        <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="kicker">Our mission</p>
              <h1 className="display mt-3 text-4xl sm:text-5xl">
                A missed call should never cost a trade the job
              </h1>
              <p className="text-muted-foreground mt-4 max-w-lg">
                TradeDesk AI answers the phone when a tradesman can&apos;t,
                books the job into hours they actually work, and gives
                homeowners somewhere to find a trade who picks up. Built in
                Ireland, for Irish trades.
              </p>
            </div>
            <PhotoBlock
              src="/images/about-team.jpg"
              className="aspect-4/3 w-full"
            />
          </div>
        </section>

        {/* Stats */}
        <section className="border-y">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:px-6 md:grid-cols-4">
            {aboutStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {stat.value}
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Story blocks, alternating image side */}
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 md:py-24">
          <div className="space-y-16 md:space-y-24">
            {aboutStoryBlocks.map((block, index) => (
              <div
                key={block.title}
                className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16"
              >
                <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                  <p className="kicker">{block.eyebrow}</p>
                  <h2 className="display mt-3 text-2xl sm:text-3xl">
                    {block.title}
                  </h2>
                  <p className="text-muted-foreground mt-4 max-w-lg">
                    {block.body}
                  </p>
                </div>
                <PhotoBlock
                  src={
                    index % 2 === 0
                      ? "/images/hero-tradesman.jpg"
                      : "/images/about-office.jpg"
                  }
                  className={`aspect-4/3 w-full ${index % 2 === 1 ? "lg:order-1" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <section className="bg-secondary/50 border-y">
          <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="kicker">Our beliefs</p>
              <h2 className="display mt-3 text-3xl sm:text-4xl">
                What we actually hold ourselves to
              </h2>
            </div>
            <ul className="space-y-4">
              {companyValues.map((value) => (
                <li key={value} className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
                    <Check className="size-3.5" aria-hidden />
                  </span>
                  <span>{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Leadership */}
        <section className="mx-auto w-full max-w-7xl px-4 py-16 text-center sm:px-6 md:py-24">
          <p className="kicker">Meet the team</p>
          <h2 className="display mt-3 text-3xl sm:text-4xl">
            The people building TradeDesk AI
          </h2>
          <p className="text-muted-foreground mx-auto mt-3 max-w-xl">
            A small team, mostly people who&apos;ve either run a trade business
            or answered its phone.
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6">
            {teamMembers.map((person) => (
              <li
                key={person.name}
                className="flex flex-col items-center gap-3"
              >
                <TeamAvatar initials={person.initials} />
                <div>
                  <p className="text-sm font-semibold">{person.name}</p>
                  <p className="text-muted-foreground text-xs">{person.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="band-dark">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="display text-2xl sm:text-3xl">
                Want to see it running your phone?
              </h2>
              <p className="mt-2 max-w-xl text-white/70">
                Fourteen days free, no card, no setup fee.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Start free for 14 days
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="invert">
                <Link href="/find">Looking for a tradesman?</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
