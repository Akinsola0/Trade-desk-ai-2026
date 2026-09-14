/**
 * In-memory store backing the mock API.
 *
 * Mutations made in the dashboard (status changes, availability edits, call
 * re-classifications) persist for the lifetime of the browser tab, so the whole
 * app is demoable with no backend running. Reloading resets it.
 */
import {
  mockAvailability,
  mockBusiness,
  mockBusinessSettings,
  mockCalls,
  mockCustomers,
  mockJobs,
  mockLeads,
  mockMatchRequests,
  mockMessages,
  mockProfile,
} from "@/lib/api/mock/seed";
import type {
  AvailabilityRule,
  BusinessProfile,
  Call,
  Customer,
  Job,
  Lead,
  MatchRequest,
  Message,
  Profile,
} from "@/lib/api/types";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export const db = {
  business: clone<BusinessProfile>({
    ...mockBusiness,
    ...mockBusinessSettings,
  }),
  profile: clone<Profile>(mockProfile),
  customers: clone<Customer[]>(mockCustomers),
  leads: clone<Lead[]>(mockLeads),
  jobs: clone<Job[]>(mockJobs),
  calls: clone<Call[]>(mockCalls),
  messages: clone<Message[]>(mockMessages),
  availability: clone<AvailabilityRule[]>(mockAvailability),
  matchRequests: clone<MatchRequest[]>(mockMatchRequests),
};

/** Simulated network latency, so loading states are real rather than theoretical. */
export function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(clone(value)), ms));
}

let idCounter = 0;
export function mockId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-mock-${Date.now().toString(36)}-${idCounter}`;
}
