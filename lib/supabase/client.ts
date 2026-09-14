"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client, used only by the auth screens today.
 *
 * The backend team provisions the project and hands over the URL and anon key;
 * until then `isSupabaseConfigured` is false and the auth screens explain that
 * rather than crashing.
 *
 * TODO(backend): once the dev project exists, add the two variables below to
 * Vercel and to `.env.local`, and tell us the redirect URL to whitelist.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

/** Throws when the project isn't configured — call `isSupabaseConfigured` first. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  client ??= createClient(url, anonKey);
  return client;
}
