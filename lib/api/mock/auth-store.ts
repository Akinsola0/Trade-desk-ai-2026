/**
 * Demo auth store — browser-local accounts, used only until the backend team
 * provisions a Supabase project.
 *
 * Accounts live in `localStorage` on this one browser. That is enough to sign
 * up, sign in, stay signed in across reloads and sign out, which is what the
 * dashboard needs to be demoable. It is **not** a security boundary: anyone with
 * the browser's dev tools can read or edit it. Passwords are hashed only so a
 * real password someone reuses isn't sitting in plain text on disk.
 *
 * Everything here disappears the moment `NEXT_PUBLIC_SUPABASE_URL` is set —
 * see `lib/api/auth.ts`.
 */
import type { AuthUser } from "@/lib/api/types";

const USERS_KEY = "tradedesk.demo-auth.users";
const SESSION_KEY = "tradedesk.demo-auth.session";

export interface StoredUser extends AuthUser {
  password_hash: string;
}

/** The account the sign-in screen offers as one click, so a demo needs no typing. */
export const DEMO_ACCOUNT = {
  email: "dermot@kellyplumbing.ie",
  password: "tradedesk",
  name: "Dermot Kelly",
  business_name: "Kelly Plumbing & Heating",
  trade_type: "plumber" as const,
};

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Private windows and blocked site data both throw on access.
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return `plain:${password}`;

  const digest = await subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`tradedesk:${password}`),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function seedUser(passwordHash: string): StoredUser {
  return {
    id: "demo-user-0001",
    email: DEMO_ACCOUNT.email,
    name: DEMO_ACCOUNT.name,
    business_name: DEMO_ACCOUNT.business_name,
    trade_type: DEMO_ACCOUNT.trade_type,
    created_at: new Date().toISOString(),
    password_hash: passwordHash,
  };
}

export function readUsers(): StoredUser[] {
  const storage = browserStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  browserStorage()?.setItem(USERS_KEY, JSON.stringify(users));
}

/** Creates the demo account on first run so there's always something to sign in as. */
export async function ensureDemoAccount(): Promise<void> {
  const users = readUsers();
  if (users.some((user) => user.email === DEMO_ACCOUNT.email)) return;

  writeUsers([...users, seedUser(await hashPassword(DEMO_ACCOUNT.password))]);
}

export function findUserByEmail(email: string): StoredUser | null {
  const needle = email.trim().toLowerCase();
  return (
    readUsers().find((user) => user.email.toLowerCase() === needle) ?? null
  );
}

export function findUserById(id: string): StoredUser | null {
  return readUsers().find((user) => user.id === id) ?? null;
}

export function addUser(user: StoredUser) {
  writeUsers([...readUsers(), user]);
}

export function startSession(userId: string) {
  browserStorage()?.setItem(SESSION_KEY, userId);
}

export function endSession() {
  browserStorage()?.removeItem(SESSION_KEY);
}

export function currentSessionUserId(): string | null {
  return browserStorage()?.getItem(SESSION_KEY) ?? null;
}
