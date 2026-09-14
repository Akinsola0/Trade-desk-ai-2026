/**
 * Auth.
 *
 * Two modes, decided by whether the Supabase environment variables are set:
 *
 * - **Not set (today):** accounts are created and checked in this browser
 *   (`lib/api/mock/auth-store.ts`), so sign-up, sign-in, staying signed in and
 *   signing out all work with no backend running. Nothing leaves the machine.
 * - **Set:** the auth screens render Supabase Auth UI instead, and
 *   `getCurrentUser()` reads the Supabase session.
 *
 * TODO(backend): once `profiles` and `businesses` exist, `signUp()` should
 * create both rows (or a trigger on `auth.users` should), and `getCurrentUser()`
 * should read the real profile rather than falling back to demo values.
 */
import {
  DEMO_ACCOUNT,
  addUser,
  currentSessionUserId,
  endSession,
  ensureDemoAccount,
  findUserByEmail,
  findUserById,
  hashPassword,
  startSession,
} from "@/lib/api/mock/auth-store";
import { db } from "@/lib/api/mock/store";
import type { AuthUser, SignInInput, SignUpInput } from "@/lib/api/types";

/**
 * True while accounts live in the browser rather than in Supabase. The auth
 * screens use it to explain which mode they're in.
 */
export const isDemoAuth = !(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export { DEMO_ACCOUNT };

/** Thrown when a screen that needs a session doesn't have one. */
export class NotSignedInError extends Error {
  constructor() {
    super("You need to sign in to see that.");
    this.name = "NotSignedInError";
  }
}

function toAuthUser(user: {
  id: string;
  email: string;
  name: string;
  business_name: string;
  trade_type: AuthUser["trade_type"];
  created_at: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    business_name: user.business_name,
    trade_type: user.trade_type,
    created_at: user.created_at,
  };
}

/**
 * Point the mock dashboard data at whoever is signed in, so the header, the
 * business profile and the AI's introduction all use the name they signed up
 * with instead of the fixture's.
 *
 * TODO(backend): delete this. Real data comes back scoped by RLS.
 */
export function applyAccountToMockData(user: AuthUser) {
  db.profile = { ...db.profile, id: user.id, name: user.name };
  db.business = {
    ...db.business,
    name: user.business_name,
    trade_type: user.trade_type,
  };
}

/**
 * Create an account.
 *
 * TODO(backend): `supabase.auth.signUp({ email, password, options: { data } })`,
 * then insert the `businesses` and `profiles` rows.
 */
export async function signUp(input: SignUpInput): Promise<AuthUser> {
  const email = input.email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("That doesn't look like an email address.");
  }
  if (input.password.length < 8) {
    throw new Error("Pick a password of at least 8 characters.");
  }
  if (!input.name.trim() || !input.business_name.trim()) {
    throw new Error("We need your name and your business name.");
  }

  await ensureDemoAccount();
  if (findUserByEmail(email)) {
    throw new Error(
      "There's already an account with that email — sign in instead.",
    );
  }

  const user: AuthUser = {
    id: `demo-user-${Date.now().toString(36)}`,
    email,
    name: input.name.trim(),
    business_name: input.business_name.trim(),
    trade_type: input.trade_type,
    created_at: new Date().toISOString(),
  };

  addUser({ ...user, password_hash: await hashPassword(input.password) });
  startSession(user.id);
  applyAccountToMockData(user);

  return user;
}

/**
 * TODO(backend): `supabase.auth.signInWithPassword({ email, password })`.
 */
export async function signIn(input: SignInInput): Promise<AuthUser> {
  await ensureDemoAccount();

  const stored = findUserByEmail(input.email);
  const hash = await hashPassword(input.password);

  // Same message either way, so the form can't be used to discover emails.
  if (!stored || stored.password_hash !== hash) {
    throw new Error("Wrong email or password.");
  }

  startSession(stored.id);
  const user = toAuthUser(stored);
  applyAccountToMockData(user);
  return user;
}

/**
 * TODO(backend): `supabase.auth.signOut()`.
 */
export async function signOut(): Promise<void> {
  endSession();

  if (!isDemoAuth) {
    const { getSupabaseBrowserClient } = await import("@/lib/supabase/client");
    await getSupabaseBrowserClient().auth.signOut();
  }
}

/**
 * The signed-in account, or `null`. Used to gate the dashboard.
 *
 * TODO(backend): `supabase.auth.getUser()` plus the caller's `profiles` row.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  if (typeof window === "undefined") return null;

  if (!isDemoAuth) {
    try {
      const { getSupabaseBrowserClient } =
        await import("@/lib/supabase/client");
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      const supabaseUser = data.session?.user;
      if (!supabaseUser) return null;

      const metadata = supabaseUser.user_metadata ?? {};
      const user: AuthUser = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        name: (metadata.name as string) ?? supabaseUser.email ?? "There",
        business_name: (metadata.business_name as string) ?? db.business.name,
        trade_type:
          (metadata.trade_type as AuthUser["trade_type"]) ??
          db.business.trade_type,
        created_at: supabaseUser.created_at ?? new Date().toISOString(),
      };
      applyAccountToMockData(user);
      return user;
    } catch {
      return null;
    }
  }

  const userId = currentSessionUserId();
  if (!userId) return null;

  const stored = findUserById(userId);
  if (!stored) {
    endSession();
    return null;
  }

  const user = toAuthUser(stored);
  applyAccountToMockData(user);
  return user;
}
