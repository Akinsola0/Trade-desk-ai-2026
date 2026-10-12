/**
 * Marketing site content.
 *
 * Kept in one place so pricing and the cost comparison can be corrected without
 * going hunting through JSX — and so the numbers on the homepage and the pricing
 * page can never drift apart.
 */

/** The assumption behind every "cost of a missed call" figure on the site. */
export const MISSED_CALL_MATHS = {
  averageJobValueCents: 18_500,
  missedCallsPerWeek: 3,
  weeksPerMonth: 4.33,
};

/** Rounded to the nearest €100 — it's an estimate and shouldn't pretend otherwise. */
export const missedCallCostPerMonthCents =
  Math.round(
    (MISSED_CALL_MATHS.averageJobValueCents *
      MISSED_CALL_MATHS.missedCallsPerWeek *
      MISSED_CALL_MATHS.weeksPerMonth) /
      10_000,
  ) * 10_000;

export interface PricingTier {
  id: string;
  name: string;
  priceCents: number;
  tagline: string;
  callAllowance: string;
  features: string[];
  featured?: boolean;
  cta: string;
}

export const pricingTiers: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    priceCents: 4_900,
    tagline: "For a one-van operation that keeps missing calls on site.",
    callAllowance: "Up to 50 answered calls a month",
    features: [
      "AI answers every call, 24/7",
      "Lead captured with name, number and the job",
      "SMS booking confirmations",
      "Leads dashboard and call log",
      "Marketplace listing",
    ],
    cta: "Start free for 14 days",
  },
  {
    id: "busy-trade",
    name: "Busy Trade",
    priceCents: 9_900,
    tagline: "For a tradesman whose phone goes all day.",
    callAllowance: "Up to 200 answered calls a month",
    features: [
      "Everything in Starter",
      "WhatsApp or SMS confirmations, your choice",
      "Books straight into your calendar from your working hours",
      "Correct the AI when it gets a call wrong",
      "Featured marketplace listing",
    ],
    featured: true,
    cta: "Start free for 14 days",
  },
  {
    id: "crew",
    name: "Crew",
    priceCents: 19_900,
    tagline: "For a crew of three or more vans.",
    callAllowance: "Unlimited answered calls",
    features: [
      "Everything in Busy Trade",
      "A calendar per person, no double-bookings",
      "Priority marketplace placement",
      "Job notes and photos shared with the crew",
      "Phone support, same day",
    ],
    cta: "Talk to us",
  },
];

export interface ComparisonRow {
  label: string;
  missedCalls: string;
  receptionist: string;
  tradedesk: string;
  /** Whether the TradeDesk column is the good answer for this row. */
  tradedeskWins: boolean;
}

export const comparisonRows: ComparisonRow[] = [
  {
    label: "What it costs you a month",
    missedCalls: "€0 — plus the work you lose",
    receptionist: "€2,000+",
    tradedesk: "€99",
    tradedeskWins: true,
  },
  {
    label: "Answers after 6pm and at weekends",
    missedCalls: "No",
    receptionist: "No, unless you pay for cover",
    tradedesk: "Yes, every hour of the day",
    tradedeskWins: true,
  },
  {
    label: "Answers while you're under a sink",
    missedCalls: "No",
    receptionist: "Yes",
    tradedesk: "Yes",
    tradedeskWins: true,
  },
  {
    label: "Books the job into your calendar",
    missedCalls: "No",
    receptionist: "Yes",
    tradedesk: "Yes, and only into hours you actually work",
    tradedeskWins: true,
  },
  {
    label: "Sends the customer a confirmation",
    missedCalls: "No",
    receptionist: "Sometimes",
    tradedesk: "WhatsApp or SMS, every time",
    tradedeskWins: true,
  },
  {
    label: "Sick days, holidays and training",
    missedCalls: "—",
    receptionist: "Your problem",
    tradedesk: "None",
    tradedeskWins: true,
  },
  {
    label: "Knows your trade and your area",
    missedCalls: "—",
    receptionist: "After a few months",
    tradedesk: "From day one",
    tradedeskWins: true,
  },
];

/**
 * The homepage's "how it works" explainer — written for the homeowner
 * finding a tradesman, not the tradesman being found. Every step describes
 * a real, shipped part of the "find a tradesman" chat and its match-request
 * flow (see `components/marketplace/find-tradesman-chat.tsx` and
 * `lib/api/match-requests.ts`), not aspirational copy — and each `image` is
 * an actual screenshot of that real screen, not stock/placeholder art.
 */
export const howItWorksSteps = [
  {
    title: "Tell us what's wrong",
    body: "A leaking tap, a broken socket, a boiler on the blink — describe it in your own words, with your Eircode and when suits you. No forms, no jargon, no guessing a category.",
    image: "/images/how-it-works/step-1-tell-us.png",
  },
  {
    title: "We match you to the right tradesman",
    body: "Not just whoever's nearest. We weigh the job against real reviews, response times and who actually does this kind of work, and recommend verified tradespeople best fit for it.",
    image: "/images/how-it-works/step-2-match.png",
  },
  {
    title: "Confirm your pick, hear back fast",
    body: "Send your details straight to the tradesman you choose. No five phone calls, no leaving your number and hoping — most reply within minutes on WhatsApp or SMS.",
    image: "/images/how-it-works/step-3-confirm.png",
  },
  {
    title: "Can't make it? We've already asked the next",
    body: "If your first choice isn't free, the job's automatically offered to the next best match — you'll hear who's coming instead, never just silence.",
    image: "/images/how-it-works/step-4-next.png",
  },
];

export const faqs = [
  {
    question: "Do I have to change my phone number?",
    answer:
      "No. You keep your number and divert calls to us — either all of them, or only the ones you don't pick up after a few rings. Your customers ring the same number they always have.",
  },
  {
    question: "Does it send confirmations on WhatsApp or SMS?",
    answer:
      "Either, and you choose which. Most Irish customers read WhatsApp faster, so that's the default, with SMS as the fallback when someone has no WhatsApp account. You set the preference in your dashboard and can change it any time.",
  },
  {
    question: "What happens if the AI gets a call wrong?",
    answer:
      "Every call shows up in your call log with what the AI decided and a summary of what was said. If it marked a real customer as spam, you re-classify it in one click and the lead comes back into your list — and we use the correction to improve the answering.",
  },
  {
    question: "Can it book jobs when I'm already out on one?",
    answer:
      "It only offers slots inside the working hours you set, and it checks your calendar before offering anything, so it can't put two jobs in the same slot.",
  },
  {
    question: "What does it cost if I only get a few calls?",
    answer:
      "Starter is €49 a month for up to 50 answered calls. One booked job a month usually covers it — the average call-out our trades take is around €185.",
  },
  {
    question: "Do I get work from the marketplace as well?",
    answer:
      "Yes. Every TradeDesk AI subscription comes with a profile in our homeowner marketplace, and requests from it land in the same dashboard as your phone leads.",
  },
];

/** The three trust signals, shown together rather than scattered. */
export const trustSignals = [
  {
    title: "Verified trades only",
    body: "Insurance, registration (RGI, Safe Electric) and ID checked before a profile goes live.",
  },
  {
    title: "Reviews from real jobs",
    body: "Only customers with a completed job can leave a review, and every review is shown on the profile — not just counted.",
  },
  {
    title: "One month, no strings",
    body: "Cancel inside the first month and we refund it. No setup fee and no contract.",
  },
];

/* -------------------------------------------------------------------------- */
/* About page content                                                         */
/* -------------------------------------------------------------------------- */

export const aboutStats = [
  { value: "2023", label: "Founded" },
  { value: "1,200+", label: "Verified trades" },
  { value: "24/7", label: "Calls answered" },
  { value: "€2,400", label: "Avg. lost per month to a missed call" },
];

export const aboutStoryBlocks = [
  {
    eyebrow: "Why we started",
    title: "A missed call is a lost job, every time",
    body: "We watched good tradespeople lose work to voicemail — not because they weren't good at the job, but because they were up a ladder when the phone rang. The homeowner just called the next name on the list. TradeDesk AI exists to close that gap: answer every call, get the job into the diary, and let the tradesman find out about it once the ladder's folded up.",
  },
  {
    eyebrow: "How we work",
    title: "Verified trades, real reviews, no exceptions",
    body: "Every profile on the marketplace is checked for insurance and registration before it goes live. Every review comes from a customer with a completed job — nobody can buy their way to five stars. And when the AI gets a call wrong, the tradesman corrects it in one click; we use that correction to make the next call better, not to bury the mistake.",
  },
];

export const companyValues = [
  "Answer every call, first ring to last — no exceptions for time of day.",
  "Never book a job into a slot a tradesman hasn't actually got.",
  "Real reviews from completed jobs, or no reviews at all.",
  "Plain language on the phone and on the page — no jargon either side.",
];

export interface TeamMember {
  name: string;
  role: string;
  initials: string;
}

export const teamMembers: TeamMember[] = [
  { name: "Aoife Ryan", role: "Co-founder & CEO", initials: "AR" },
  { name: "Cian Doyle", role: "Co-founder & Head of AI", initials: "CD" },
  { name: "Niamh Butler", role: "Head of Trades Success", initials: "NB" },
  { name: "Darragh Fitzgerald", role: "Head of Product", initials: "DF" },
  { name: "Saoirse Malone", role: "Head of Marketplace Trust", initials: "SM" },
  { name: "Tomás Nolan", role: "Head of Engineering", initials: "TN" },
];
