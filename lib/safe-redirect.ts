/**
 * Validates a user-supplied post-login destination (`?next=`).
 *
 * Only same-origin paths survive. Two traps a naive `startsWith("/")` misses:
 *   - The WHATWG URL parser silently strips tabs and newlines, so `/\t/evil.com`
 *     becomes the protocol-relative `//evil.com`. Control characters are
 *     rejected outright rather than normalised.
 *   - Dot segments collapse: `/..//evil.com` parses as same-origin but its
 *     normalised pathname is `//evil.com`, which `new URL(next, origin)` later
 *     resolves to another site. The normalised result is re-checked.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!value || !value.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(value)) {
    return fallback;
  }

  const base = "http://redirect.invalid";
  try {
    const url = new URL(value, base);
    if (url.origin !== base) return fallback;
    const path = `${url.pathname}${url.search}${url.hash}`;
    return path.startsWith("//") ? fallback : path;
  } catch {
    return fallback;
  }
}
