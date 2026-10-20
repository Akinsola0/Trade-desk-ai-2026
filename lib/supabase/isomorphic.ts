import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Picks whichever Supabase client is legal to call in the current execution
 * context: the server client (anon key, no persisted session — see
 * `lib/supabase/server.ts`) when there's no `window`, the browser client
 * (carries the signed-in user's session) otherwise.
 *
 * Use this for data reads/writes that work under the anon key alone — public
 * marketplace data, or tables whose RLS doesn't require a user JWT.
 *
 * CAVEAT for RLS-scoped tables (`leads`, `calls`, `jobs`, `messages`,
 * `businesses`, `availability_rules`, …): their queries rely on the caller's
 * session to satisfy `auth.uid()` checks. Every caller of those `lib/api/*`
 * functions today is a client component, so the browser branch (with its
 * session cookie/JWT) is what actually runs. If one of those functions is
 * ever called from a Server Component, this falls back to an
 * *unauthenticated* server client — RLS will see no user and return no rows
 * or a permission error, not throw the "called from server" crash this
 * replaces. That's a silent-empty-data failure mode, not a fix for running
 * authenticated queries server-side — for that, thread the user's access
 * token through to `getSupabaseServerClient(accessToken)` instead.
 */
export async function getSupabase(): Promise<SupabaseClient> {
  if (typeof window === "undefined") {
    const { getSupabaseServerClient } = await import("@/lib/supabase/server");
    return getSupabaseServerClient();
  }
  const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
  return getSupabaseBrowserClient();
}
