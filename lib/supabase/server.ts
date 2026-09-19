/**
 * Server-side Supabase clients for session reading and admin operations.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Create a Supabase client with the anon key for server-side session reading.
export function getSupabaseServerClient(accessToken?: string) {
  return createClient(url, anonKey, {
    global: {
      headers: accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : undefined,
    },
    auth: {
      // Avoid server-side session persistence since the browser client owns it.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// Create a Supabase admin client using the service-role key (bypasses RLS).
export function getSupabaseAdminClient() {
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Add it to .env.local — never expose it to the browser.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
