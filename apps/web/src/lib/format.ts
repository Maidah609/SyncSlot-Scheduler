// Deterministic formatters (pinned locale + timezone) to avoid SSR/CSR
// hydration mismatches. All dashboard rendering uses these.

const LOCALE = "en-US";
const TZ = "America/Los_Angeles";

export function formatTime(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  }).format(d);
}

export function formatMonthShort(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: TZ }).format(d);
}

export function formatDayNum(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", timeZone: TZ }).format(d);
}

export function formatWeekdayLong(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: TZ,
  }).format(d);
}

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = d.getTime() - Date.now();
  const hours = Math.round(diffMs / 36e5);
  if (hours < 1 && hours > -1) return "soon";
  if (hours < 24 && hours > 0) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  if (days > 0) return `in ${days}d`;
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `${Math.abs(hours)}h ago`;
}
