/**
 * Mock dataset for local development and demos.
 *
 * Nothing here ships to production: every `lib/api` function reads this module
 * today and will read a real `/api/...` route tomorrow. Components must never
 * import this file directly.
 *
 * Dates are generated relative to "now" so the calendar and the dashboard always
 * look alive, whatever day you demo on.
 */
import type {
  AvailabilityRule,
  Business,
  Call,
  Customer,
  Job,
  Lead,
  MatchRequest,
  Message,
  Profile,
} from "@/lib/api/types";

const BUSINESS_ID = "b1000000-0000-4000-8000-000000000001";

export const mockBusiness: Business = {
  id: BUSINESS_ID,
  name: "Kelly Plumbing & Heating",
  timezone: "Europe/Dublin",
  phone: "+353455550134",
  trade_type: "plumber",
};

export const mockProfile: Profile = {
  id: "p1000000-0000-4000-8000-000000000001",
  business_id: BUSINESS_ID,
  name: "Dermot Kelly",
  role: "owner",
};

/** Confirmation preferences — see the TODO on `UpdateBusinessInput`. */
export const mockBusinessSettings = {
  confirmation_channel: "whatsapp" as const,
  confirmation_fallback: true,
};

/** Midnight today, local time. */
function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** `days` from today at `hh:mm` local, as an ISO string. */
function at(days: number, hh: number, mm = 0): string {
  const d = today();
  d.setDate(d.getDate() + days);
  d.setHours(hh, mm, 0, 0);
  return d.toISOString();
}

/** `hours` ago from now, as an ISO string. */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export const mockCustomers: Customer[] = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    business_id: BUSINESS_ID,
    name: "Aoife Byrne",
    phone: "+353871234501",
    email: "aoife.byrne@example.ie",
    address: "14 Sallins Road, Naas, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    business_id: BUSINESS_ID,
    name: "Seán O'Donnell",
    phone: "+353861234502",
    email: "sean.odonnell@example.ie",
    address: "7 Morristown Park, Newbridge, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    business_id: BUSINESS_ID,
    name: "Niamh Walsh",
    phone: "+353851234503",
    email: null,
    address: "22 Waterways, Sallins, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000004",
    business_id: BUSINESS_ID,
    name: "Pádraig Murphy",
    phone: "+353871234504",
    email: "p.murphy@example.ie",
    address: "3 Loughbollard Close, Clane, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000005",
    business_id: BUSINESS_ID,
    name: "Ciara Doyle",
    phone: "+353831234505",
    email: "ciara.doyle@example.ie",
    address: "New Abbey Road, Kilcullen, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000006",
    business_id: BUSINESS_ID,
    name: "Liam Fitzgerald",
    phone: "+353861234506",
    email: null,
    address: "41 Oldtown Mill, Celbridge, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000007",
    business_id: BUSINESS_ID,
    name: "Máire Nolan",
    phone: "+353871234507",
    email: "maire.nolan@example.ie",
    address: "9 Canal View, Monasterevin, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000008",
    business_id: BUSINESS_ID,
    name: "Eoin Brennan",
    phone: "+353851234508",
    email: "eoin.brennan@example.ie",
    address: "18 The Paddocks, Naas, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000009",
    business_id: BUSINESS_ID,
    name: "Sinéad Kavanagh",
    phone: "+353861234509",
    email: null,
    address: "Main Street, Rathangan, Co. Kildare",
  },
  {
    id: "c0000000-0000-4000-8000-000000000010",
    business_id: BUSINESS_ID,
    name: "Tomás Whelan",
    phone: "+353871234510",
    email: "tomas.whelan@example.ie",
    address: "6 Bishopsland, Kildare Town, Co. Kildare",
  },
];

export const mockLeads: Lead[] = [
  {
    id: "l0000000-0000-4000-8000-000000000001",
    customer_id: mockCustomers[0].id,
    service: "Burst pipe",
    description:
      "Water coming through the kitchen ceiling from the bathroom above. Mains turned off at the stopcock. Needs someone today.",
    urgency: "emergency",
    status: "booked",
    source: "phone",
    created_at: hoursAgo(3),
  },
  {
    id: "l0000000-0000-4000-8000-000000000002",
    customer_id: mockCustomers[1].id,
    service: "No hot water",
    description:
      "Worcester Bosch combi, about 8 years old. Heating works fine, hot water runs cold after a minute. No error code on the display.",
    urgency: "urgent",
    status: "qualified",
    source: "phone",
    created_at: hoursAgo(6),
  },
  {
    id: "l0000000-0000-4000-8000-000000000003",
    customer_id: mockCustomers[2].id,
    service: "Radiators cold downstairs",
    description:
      "Upstairs rads are grand, the three downstairs stay cold. Already bled them. Suspect the zone valve.",
    urgency: "routine",
    status: "new",
    source: "phone",
    created_at: hoursAgo(19),
  },
  {
    id: "l0000000-0000-4000-8000-000000000004",
    customer_id: mockCustomers[3].id,
    service: "Bathroom refit quote",
    description:
      "Full en-suite refit — new shower tray, WC and vanity unit. Tiler already booked for the end of the month, looking for a price on the plumbing.",
    urgency: "routine",
    status: "qualified",
    source: "marketplace",
    created_at: hoursAgo(26),
  },
  {
    id: "l0000000-0000-4000-8000-000000000005",
    customer_id: mockCustomers[4].id,
    service: "Blocked shower drain",
    description:
      "Shower tray filling up and draining very slowly. Tried drain unblocker twice, no joy.",
    urgency: "urgent",
    status: "booked",
    source: "phone",
    created_at: hoursAgo(30),
  },
  {
    id: "l0000000-0000-4000-8000-000000000006",
    customer_id: mockCustomers[5].id,
    service: "Immersion tripping the RCD",
    description:
      "Immersion heater trips the board every time it's switched on. Element likely gone.",
    urgency: "urgent",
    status: "new",
    source: "marketplace",
    created_at: hoursAgo(31),
  },
  {
    id: "l0000000-0000-4000-8000-000000000007",
    customer_id: mockCustomers[6].id,
    service: "Annual boiler service",
    description:
      "Due the yearly service on the oil boiler, and the landlord needs the cert for the tenancy.",
    urgency: "routine",
    status: "booked",
    source: "phone",
    created_at: hoursAgo(52),
  },
  {
    id: "l0000000-0000-4000-8000-000000000008",
    customer_id: mockCustomers[7].id,
    service: "Leaking outside tap",
    description:
      "Outside tap dripping constantly since the cold snap. Might be a split in the pipe behind the wall.",
    urgency: "routine",
    status: "lost",
    source: "phone",
    created_at: hoursAgo(74),
  },
  {
    id: "l0000000-0000-4000-8000-000000000009",
    customer_id: mockCustomers[8].id,
    service: "Toilet not filling",
    description:
      "Cistern fills very slowly and the handle has to be held down. Two toilets in the house, only the downstairs one affected.",
    urgency: "routine",
    status: "new",
    source: "manual",
    created_at: hoursAgo(80),
  },
  {
    id: "l0000000-0000-4000-8000-000000000010",
    customer_id: mockCustomers[9].id,
    service: "New washing machine plumbed in",
    description:
      "Machine delivered Friday, needs the old one taken out and the new one connected.",
    urgency: "routine",
    status: "booked",
    source: "marketplace",
    created_at: hoursAgo(96),
  },
];

export const mockJobs: Job[] = [
  {
    id: "j0000000-0000-4000-8000-000000000001",
    lead_id: mockLeads[0].id,
    starts_at: at(0, 14, 0),
    ends_at: at(0, 16, 0),
    status: "confirmed",
    notes:
      "Emergency call-out. Mains is off — bring the 15mm compression fittings.",
  },
  {
    id: "j0000000-0000-4000-8000-000000000002",
    lead_id: mockLeads[4].id,
    starts_at: at(1, 9, 0),
    ends_at: at(1, 10, 30),
    status: "booked",
    notes: "Bring the drain rods and the camera.",
  },
  {
    id: "j0000000-0000-4000-8000-000000000003",
    lead_id: mockLeads[6].id,
    starts_at: at(2, 11, 0),
    ends_at: at(2, 12, 30),
    status: "confirmed",
    notes: "Landlord needs the service cert emailed after.",
  },
  {
    id: "j0000000-0000-4000-8000-000000000004",
    lead_id: mockLeads[9].id,
    starts_at: at(3, 8, 30),
    ends_at: at(3, 9, 30),
    status: "booked",
    notes: null,
  },
  {
    id: "j0000000-0000-4000-8000-000000000005",
    lead_id: mockLeads[3].id,
    starts_at: at(4, 13, 0),
    ends_at: at(4, 14, 0),
    status: "booked",
    notes: "Quote visit only, no tools needed.",
  },
  {
    id: "j0000000-0000-4000-8000-000000000006",
    lead_id: mockLeads[7].id,
    starts_at: at(-3, 10, 0),
    ends_at: at(-3, 11, 0),
    status: "cancelled",
    notes: "Customer went with a neighbour's plumber.",
  },
  {
    id: "j0000000-0000-4000-8000-000000000007",
    lead_id: mockLeads[1].id,
    starts_at: at(-1, 15, 0),
    ends_at: at(-1, 16, 30),
    status: "completed",
    notes: "Diverter valve replaced. Hot water back on.",
  },
];

export const mockCalls: Call[] = [
  {
    id: "k0000000-0000-4000-8000-000000000001",
    business_id: BUSINESS_ID,
    customer_id: mockCustomers[0].id,
    provider_call_id: "CA3f1a9c2b7d4e5f6081920a3b4c5d6e7f",
    outcome: "booked",
    summary:
      "Aoife Byrne rang at 06:12 about water coming through the kitchen ceiling. AI confirmed the mains was off, treated it as an emergency and booked the 14:00 slot today. WhatsApp confirmation sent.",
    started_at: hoursAgo(3),
    duration_seconds: 164,
    corrected_outcome: null,
    corrected_at: null,
  },
  {
    id: "k0000000-0000-4000-8000-000000000002",
    business_id: BUSINESS_ID,
    customer_id: mockCustomers[1].id,
    provider_call_id: "CA7b2c8d1e0f3a4b5c6d7e8f90a1b2c3d4",
    outcome: "lead_only",
    summary:
      "Seán O'Donnell, no hot water on a Worcester Bosch combi. Wanted a price before booking — AI captured the details and said someone would ring back with a quote.",
    started_at: hoursAgo(6),
    duration_seconds: 212,
    corrected_outcome: null,
    corrected_at: null,
  },
  {
    id: "k0000000-0000-4000-8000-000000000003",
    business_id: BUSINESS_ID,
    customer_id: mockCustomers[2].id,
    provider_call_id: "CA9e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b",
    outcome: "callback_required",
    summary:
      "Niamh Walsh, cold radiators downstairs. Asked whether the zone valve would be covered under the warranty on last year's boiler install — AI couldn't answer and promised a callback.",
    started_at: hoursAgo(19),
    duration_seconds: 141,
    corrected_outcome: null,
    corrected_at: null,
  },
  {
    id: "k0000000-0000-4000-8000-000000000004",
    business_id: BUSINESS_ID,
    customer_id: null,
    provider_call_id: "CA1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    outcome: "spam",
    summary:
      "Automated sales call offering Google Business listing placement. AI ended the call after 20 seconds.",
    started_at: hoursAgo(22),
    duration_seconds: 21,
    corrected_outcome: null,
    corrected_at: null,
  },
  {
    id: "k0000000-0000-4000-8000-000000000005",
    business_id: BUSINESS_ID,
    customer_id: mockCustomers[4].id,
    provider_call_id: "CA5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
    outcome: "booked",
    summary:
      "Ciara Doyle, shower draining slowly. Booked tomorrow 09:00. Customer asked for a text rather than WhatsApp.",
    started_at: hoursAgo(30),
    duration_seconds: 187,
    corrected_outcome: null,
    corrected_at: null,
  },
  {
    id: "k0000000-0000-4000-8000-000000000006",
    business_id: BUSINESS_ID,
    customer_id: mockCustomers[6].id,
    provider_call_id: "CA0f9e8d7c6b5a4938271605f4e3d2c1b0",
    outcome: "failed",
    summary:
      "Call dropped after 40 seconds — the booking tool timed out while checking availability. Máire Nolan's number captured, no slot held.",
    started_at: hoursAgo(48),
    duration_seconds: 41,
    corrected_outcome: null,
    corrected_at: null,
  },
  {
    id: "k0000000-0000-4000-8000-000000000007",
    business_id: BUSINESS_ID,
    customer_id: mockCustomers[7].id,
    provider_call_id: "CA2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e",
    outcome: "spam",
    summary:
      "Caller asked about a dripping outside tap and rang off when asked for an address. AI classified as spam.",
    started_at: hoursAgo(74),
    duration_seconds: 63,
    corrected_outcome: "lead_only",
    corrected_at: hoursAgo(70),
  },
  {
    id: "k0000000-0000-4000-8000-000000000008",
    business_id: BUSINESS_ID,
    customer_id: mockCustomers[9].id,
    provider_call_id: "CA8c7b6a5948372615f0e9d8c7b6a59483",
    outcome: "booked",
    summary:
      "Tomás Whelan, new washing machine to be plumbed in. Booked Thursday 08:30, old machine to be taken away.",
    started_at: hoursAgo(96),
    duration_seconds: 155,
    corrected_outcome: null,
    corrected_at: null,
  },
];

export const mockMessages: Message[] = [
  {
    id: "m0000000-0000-4000-8000-000000000001",
    customer_id: mockCustomers[0].id,
    channel: "whatsapp",
    direction: "outbound",
    body: "Kelly Plumbing & Heating: you're booked in for today between 2pm and 4pm. Reply STOP to cancel.",
    status: "delivered",
    created_at: hoursAgo(3),
    error_message: null,
  },
  {
    id: "m0000000-0000-4000-8000-000000000002",
    customer_id: mockCustomers[4].id,
    channel: "sms",
    direction: "outbound",
    body: "Kelly Plumbing & Heating: you're booked in for tomorrow at 9am for the shower drain. Reply STOP to cancel.",
    status: "sent",
    created_at: hoursAgo(30),
    error_message: null,
  },
  {
    id: "m0000000-0000-4000-8000-000000000003",
    customer_id: mockCustomers[6].id,
    channel: "whatsapp",
    direction: "outbound",
    body: "Kelly Plumbing & Heating: you're booked in for Wednesday at 11am for the boiler service.",
    status: "failed",
    created_at: hoursAgo(47),
    error_message:
      "Twilio 63016: recipient has no WhatsApp account for +353871234507",
  },
  {
    id: "m0000000-0000-4000-8000-000000000004",
    customer_id: mockCustomers[9].id,
    channel: "sms",
    direction: "outbound",
    body: "Kelly Plumbing & Heating: you're booked in for Thursday at 8:30am to fit the washing machine.",
    status: "queued",
    created_at: hoursAgo(2),
    error_message: null,
  },
  {
    id: "m0000000-0000-4000-8000-000000000005",
    customer_id: mockCustomers[0].id,
    channel: "whatsapp",
    direction: "inbound",
    body: "Perfect, thanks. I'll leave the side gate open.",
    status: "delivered",
    created_at: hoursAgo(2),
    error_message: null,
  },
];

/** Mon–Fri 08:00–17:30, Saturday morning. Sunday closed. */
export const mockAvailability: AvailabilityRule[] = [
  {
    id: "a1",
    business_id: BUSINESS_ID,
    weekday: 1,
    start_time: "08:00",
    end_time: "17:30",
  },
  {
    id: "a2",
    business_id: BUSINESS_ID,
    weekday: 2,
    start_time: "08:00",
    end_time: "17:30",
  },
  {
    id: "a3",
    business_id: BUSINESS_ID,
    weekday: 3,
    start_time: "08:00",
    end_time: "17:30",
  },
  {
    id: "a4",
    business_id: BUSINESS_ID,
    weekday: 4,
    start_time: "08:00",
    end_time: "17:30",
  },
  {
    id: "a5",
    business_id: BUSINESS_ID,
    weekday: 5,
    start_time: "08:00",
    end_time: "16:00",
  },
  {
    id: "a6",
    business_id: BUSINESS_ID,
    weekday: 6,
    start_time: "09:00",
    end_time: "13:00",
  },
];

/**
 * Two homeowners who went through the "find a tradesman" chat and confirmed
 * Kelly Plumbing & Heating — one still pending, one already actioned, so the
 * Requests inbox has something to show on first load.
 */
export const mockMatchRequests: MatchRequest[] = [
  {
    id: "mr-0001",
    business_id: BUSINESS_ID,
    customer_name: "Roisín Kavanagh",
    customer_phone: "+353871234599",
    customer_email: "roisin.kavanagh@example.ie",
    customer_address: "W91 F2C4",
    service: "Emergency call-out",
    description:
      "Kitchen tap won't shut off fully, dripping constantly and the washer's worn through.",
    preferred_date_range: "Tomorrow, morning",
    preferred_channel: "whatsapp",
    status: "pending",
    created_at: hoursAgo(2),
    fallback_slugs: [
      "sheridan-plumbing-naas",
      "nolan-plumbing-heating-naas",
      "flowfix-plumbing-naas",
      "reilly-and-sons-plumbing-naas",
    ],
  },
  {
    id: "mr-0002",
    business_id: BUSINESS_ID,
    customer_name: "Cathal Ryan",
    customer_phone: "+353861234598",
    customer_address: "Two-Mile-House, Co. Kildare",
    service: "Boiler service",
    description:
      "Annual boiler service, landlord needs the cert before a new tenant moves in.",
    preferred_date_range: "This week, afternoon",
    preferred_channel: "sms",
    status: "accepted",
    created_at: hoursAgo(30),
    fallback_slugs: ["sheridan-plumbing-naas", "nolan-plumbing-heating-naas"],
  },
];

export { BUSINESS_ID };
