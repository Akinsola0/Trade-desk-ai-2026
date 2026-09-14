/**
 * Session + tenancy.
 *
 * The UI never hardcodes a business id: it asks for the session and uses
 * `session.business.id`. RLS scopes every backend query to the same business, so
 * the two agree by construction.
 */
import { getCurrentUser, NotSignedInError } from "@/lib/api/auth";
import { db, delay } from "@/lib/api/mock/store";
import type { SessionContext } from "@/lib/api/types";

/**
 * The signed-in profile and the business it belongs to. Throws
 * `NotSignedInError` when nobody is signed in — the dashboard shell catches that
 * and sends them to `/login`.
 *
 * TODO(backend): replace with `GET /api/session` — read the Supabase user from
 * the request cookie, join `profiles` -> `businesses`, return 401 when signed out.
 */
export async function getSession(): Promise<SessionContext> {
  const user = await getCurrentUser();
  if (!user) throw new NotSignedInError();

  return delay({ profile: db.profile, business: db.business });
}
