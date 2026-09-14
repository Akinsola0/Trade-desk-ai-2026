/**
 * Weekly working hours.
 *
 * The editor sends the full week on save — the backend replaces the business's
 * rules transactionally rather than diffing, which keeps the AI's view of
 * availability consistent mid-call.
 */
import { db, delay, mockId } from "@/lib/api/mock/store";
import type {
  AvailabilityRule,
  AvailabilityRuleInput,
  UUID,
} from "@/lib/api/types";

/**
 * TODO(backend): `GET /api/availability` — rules for the caller's business,
 * ordered by weekday then start_time.
 */
export async function getAvailability(
  businessId: UUID,
): Promise<AvailabilityRule[]> {
  const rules = db.availability
    .filter((rule) => rule.business_id === businessId)
    .sort(
      (a, b) =>
        a.weekday - b.weekday || a.start_time.localeCompare(b.start_time),
    );
  return delay(rules);
}

/**
 * Replace the whole week for a business.
 *
 * TODO(backend): `PUT /api/availability` — delete-and-insert in one transaction.
 * Reject overlapping windows on the same weekday and `end_time <= start_time`;
 * the UI blocks both already, but it must not be the only guard.
 */
export async function saveAvailability(
  businessId: UUID,
  rules: AvailabilityRuleInput[],
): Promise<AvailabilityRule[]> {
  db.availability = [
    ...db.availability.filter((rule) => rule.business_id !== businessId),
    ...rules.map((rule) => ({
      id: mockId("a"),
      business_id: businessId,
      ...rule,
    })),
  ];
  return getAvailability(businessId);
}
