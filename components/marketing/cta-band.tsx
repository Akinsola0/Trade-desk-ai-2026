import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section className="band-dark">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="display text-2xl sm:text-3xl">
            Stop losing jobs to voicemail
          </h2>
          <p className="mt-2 max-w-xl text-white/70">
            Set it up in ten minutes: divert your number, set your working
            hours, and let it answer the next call.
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
  );
}
