import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/safe-redirect";

/**
 * Landing point for the confirmation link in the sign-up email.
 *
 * Supabase verifies the email, then redirects here with a one-time `?code=`
 * (PKCE). Exchanging it server-side writes the session cookies, so the very
 * next request to `/dashboard` is already signed in and `proxy.ts` lets it
 * through.
 *
 * The URL must be in the Supabase project's Authentication → URL Configuration
 * → Redirect URLs allow-list, otherwise Supabase falls back to the Site URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (code && url && anonKey) {
    const cookieStore = await cookies();
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  // The PKCE verifier lives in the browser that started sign-up, so opening the
  // link in a different browser lands here too — the email IS confirmed by then.
  return NextResponse.redirect(new URL("/login?error=confirmation_failed", origin));
}
