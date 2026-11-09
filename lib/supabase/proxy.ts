import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Session gate for `/dashboard/**`, called from the root `proxy.ts`.
 *
 * Two jobs:
 *   1. Refresh the Supabase session cookie when the access token is near
 *      expiry, so the browser and any future Server Component agree on it.
 *   2. Redirect signed-out visitors to `/login?next=…` before any dashboard
 *      JavaScript is sent.
 *
 * This is the optimistic layer only. Authorization lives in Postgres RLS; the
 * Next.js auth guide is explicit that Proxy must not be the sole defence.
 *
 * Signed-in users are deliberately NOT bounced away from `/login`. If the
 * profile row is missing the dashboard sends them to `/login`, and bouncing
 * back would loop forever.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  // Demo auth keeps accounts in localStorage, which the server cannot see.
  if (!url || !anonKey) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  // Cache-Control & co. that must accompany any response carrying auth cookies,
  // collected so a redirect can carry them too.
  let authHeaders: Record<string, string> = {};

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        authHeaders = { ...authHeaders, ...headers };
        Object.entries(authHeaders).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // getClaims() verifies the JWT signature instead of trusting the cookie, and
  // refreshes an expiring session as a side effect. Do not put code between
  // createServerClient and this call.
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    Object.entries(authHeaders).forEach(([key, value]) => redirect.headers.set(key, value));
    return redirect;
  }

  return response;
}
