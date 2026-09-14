/** Business profile — the details the AI front desk introduces itself with. */
import { getCurrentUser } from "@/lib/api/auth";
import { db, delay } from "@/lib/api/mock/store";
import type { BusinessProfile, UpdateBusinessInput } from "@/lib/api/types";

/**
 * TODO(backend): `GET /api/business` — the caller's own business row only (RLS).
 */
export async function getBusiness(): Promise<BusinessProfile> {
  // Picks up the name and trade the account signed up with.
  await getCurrentUser();
  return delay(db.business);
}

/**
 * TODO(backend): `PATCH /api/business` — validate `phone` as E.164 and
 * `timezone` as an IANA zone, then return the updated row.
 */
export async function updateBusiness(
  input: UpdateBusinessInput,
): Promise<BusinessProfile> {
  db.business = { ...db.business, ...input };
  return delay(db.business, 400);
}
