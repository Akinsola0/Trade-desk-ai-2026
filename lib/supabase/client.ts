"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client.
 *
 * Uses `@supabase/ssr` so the session lives in cookies rather than
 * localStorage. That is what lets `proxy.ts` and the `/auth/callback` route
 * handler see who is signed in; a localStorage-only session is invisible to the
 * server. `createBrowserClient` is a singleton per page load.
 *
 * Until the project is configured `isSupabaseConfigured` is false and the app
 * runs on demo auth (accounts in this browser's localStorage) rather than
 * crashing.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** Throws when the project isn't configured — call `isSupabaseConfigured` first. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(url, anonKey);
}
