import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/* Body: neutral, extremely legible workhorse. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

/* Display: confident, rounded, modern — used with restraint. */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "TradeDesk AI — the AI front desk for Irish trades",
    template: "%s · TradeDesk AI",
  },
  description:
    "TradeDesk AI answers every call for plumbers, electricians and handymen, books the job into your calendar and confirms it on WhatsApp or SMS. Homeowners can find and book a verified tradesman in minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Browser extensions (password managers, test tooling like Tricentis Tosca,
    // translation add-ons) stamp attributes onto <html> and <body> before React
    // hydrates. That is not our markup drifting, so don't warn about it here —
    // mismatches anywhere inside the app are still reported.
    <html
      lang="en-IE"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
      // Tells Next the smooth scrolling in globals.css is deliberate, so it
      // doesn't warn about route transitions animating.
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <a
          href="#main"
          className="bg-primary text-primary-foreground sr-only rounded-md px-4 py-2 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to content
        </a>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
