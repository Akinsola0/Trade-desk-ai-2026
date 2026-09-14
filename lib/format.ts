/** Display formatting. Irish locale, 24-hour clock, euro. */

const LOCALE = "en-IE";

export function formatEuro(cents: number, options: { compact?: boolean } = {}) {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    notation: options.compact ? "compact" : "standard",
  }).format(cents / 100);
}

export function formatTime(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** "12 min ago", "3 hrs ago", "Tue 2 Sep" — for log timestamps. */
export function formatRelative(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return formatDate(iso);
}

export function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

/** +353871234501 → +353 87 123 4501 */
export function formatPhone(phone: string) {
  const match = /^\+353(\d{2})(\d{3})(\d{4})$/.exec(phone);
  if (match) return `+353 ${match[1]} ${match[2]} ${match[3]}`;

  return phone;
}

/** "08:30" → minutes since midnight, for validating availability windows. */
export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
