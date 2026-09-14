/** Human-readable labels for the enums in `lib/api/types.ts`. */
import type {
  CallOutcome,
  JobStatus,
  LeadSource,
  LeadStatus,
  LeadUrgency,
  MatchRequestStatus,
  MessageChannel,
  MessageStatus,
  TradeType,
  Weekday,
} from "@/lib/api/types";

export const tradeTypeLabels: Record<TradeType, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  handyman: "Handyman",
  carpenter: "Carpenter",
  painter: "Painter & decorator",
  roofer: "Roofer",
  tiler: "Tiler",
  plasterer: "Plasterer",
  landscaper: "Landscaper",
  locksmith: "Locksmith",
  heating_engineer: "Heating engineer",
  appliance_repair: "Appliance repair",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  new: "New",
  qualified: "Qualified",
  booked: "Booked",
  lost: "Lost",
};

export const leadSourceLabels: Record<LeadSource, string> = {
  phone: "Phone",
  marketplace: "Marketplace",
  manual: "Added by hand",
};

export const leadUrgencyLabels: Record<LeadUrgency, string> = {
  emergency: "Emergency",
  urgent: "Urgent",
  routine: "Routine",
};

export const jobStatusLabels: Record<JobStatus, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const callOutcomeLabels: Record<CallOutcome, string> = {
  booked: "Booked",
  lead_only: "Lead only",
  callback_required: "Callback required",
  spam: "Spam",
  failed: "Failed",
};

export const messageChannelLabels: Record<MessageChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export const messageStatusLabels: Record<MessageStatus, string> = {
  queued: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Failed",
};

export const matchRequestStatusLabels: Record<MatchRequestStatus, string> = {
  pending: "Awaiting your response",
  accepted: "Accepted",
  declined: "Declined",
};

/** Monday-first, the way a working week reads. Index is the DB `weekday` value. */
export const weekdayLabels: Record<Weekday, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export const weekdayShortLabels: Record<Weekday, string> = {
  0: "Sun",
  1: "Mon",
  2: "Tue",
  3: "Wed",
  4: "Thu",
  5: "Fri",
  6: "Sat",
};

/** Monday-first order used by the availability editor and the calendar. */
export const WEEK_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];
