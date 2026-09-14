import Link from "next/link";

import { Logo } from "@/components/site/logo";
import { trustSignals } from "@/lib/marketing";

/** Split auth screen: the form on the left, why-you're-here on the accent right. */
export function AuthLayout({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main id="main" className="grid flex-1 lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-14 sm:px-10">
        <div className="mx-auto w-full max-w-sm">
          <Logo />
          <h1 className="display mt-10 text-4xl">{title}</h1>
          <p className="text-muted-foreground mt-3 text-sm">{subtitle}</p>

          <div className="mt-8">{children}</div>

          <p className="text-muted-foreground mt-6 text-sm">{footer}</p>
          <p className="text-muted-foreground mt-10 text-xs">
            <Link
              href="/"
              className="rounded underline-offset-4 hover:underline"
            >
              ← Back to tradedesk.ai
            </Link>
          </p>
        </div>
      </div>

      <aside className="band-dark hidden flex-col justify-center px-12 py-14 lg:flex">
        <blockquote className="display max-w-md text-3xl leading-[1.05]">
          “I was losing two or three jobs a week to voicemail.”
        </blockquote>
        <p className="text-muted-foreground mt-5 max-w-md">
          Now the phone gets answered while I&apos;m under a sink and the
          job&apos;s in the diary before I&apos;m back in the van.
        </p>
        <p className="kicker mt-5 text-white/60">
          Dermot Kelly · Kelly Plumbing &amp; Heating, Naas
        </p>

        <ul className="mt-14 max-w-md space-y-5">
          {trustSignals.map((signal) => (
            <li key={signal.title} className="border-t pt-4">
              <p className="display text-lg">{signal.title}</p>
              <p className="text-muted-foreground mt-1.5 text-sm">
                {signal.body}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
