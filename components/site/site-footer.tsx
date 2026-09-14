import Link from "next/link";

import { Logo } from "@/components/site/logo";

const homeownerLinks = [
  { href: "/find/plumber/naas", label: "Plumbers in Naas" },
  { href: "/find/electrician/newbridge", label: "Electricians in Newbridge" },
  { href: "/find/handyman/celbridge", label: "Handymen in Celbridge" },
  { href: "/find", label: "Browse every trade" },
];

const tradeLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#compare", label: "Cost of a missed call" },
  { href: "/signup", label: "Create an account" },
];

const companyLinks = [
  { href: "/about", label: "About" },
  { href: "/find", label: "Marketplace" },
  { href: "/login", label: "Sign in" },
];

export function SiteFooter() {
  return (
    <footer className="band-dark mt-auto">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo tone="light" />
          <p className="mt-3 max-w-sm text-sm text-white/65">
            The AI front desk for Irish trades — and the marketplace where
            homeowners find them. Built in Ireland, for plumbers, electricians,
            handymen and everyone else who can&apos;t answer a phone with two
            hands full.
          </p>
        </div>

        <div>
          <h2 className="kicker text-white/50">I need a tradesman</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            {homeownerLinks.map((link) => (
              <li key={link.href}>
                <Link className="rounded hover:text-white" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="kicker text-white/50">I am a tradesman</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            {tradeLinks.map((link) => (
              <li key={link.href}>
                <Link className="rounded hover:text-white" href={link.href}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            © {new Date().getFullYear()} TradeDesk AI. Registered in Ireland.
          </p>
          <nav aria-label="Company" className="flex gap-4">
            {companyLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <p>Prices shown exclude VAT. Cancel any time in your first month.</p>
        </div>
      </div>
    </footer>
  );
}
