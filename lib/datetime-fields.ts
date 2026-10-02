/**
 * Converting between a native picker's `Date` and the wire strings the
 * rest-off RPCs take (`YYYY-MM-DD`, `HH:MM`).
 *
 * THE WHOLE POINT OF THIS FILE IS THAT IT NEVER USES toISOString().
 *
 * A picker hands back a `Date`, which is an instant. The RPCs take a civil date
 * and a civil time -- what the wall clock in the house says. Rendering that
 * instant with `toISOString()` converts to UTC first, so in Asia/Manila (UTC+8)
 * anything before 08:00 local lands on the PREVIOUS day: pick the 20th at 07:00
 * and send the 19th. That is C38 exactly, the bug that made cutoffs disagree
 * with the server for weeks, and a date picker is the most natural place in the
 * app to reintroduce it. So the conversions read local components
 * (getFullYear/getMonth/getDate) and never touch UTC.
 *
 * Reading in the other direction is the same trap: `new Date("2026-08-20")` is
 * parsed as UTC midnight by spec, which is the 19th in the Americas and can be
 * the 20th at 08:00 in Manila. `parseIsoDate` builds from parts instead, so the
 * Date it returns is local midnight on the day the string names -- which is
 * what a picker should open on.
 */

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** `Date` -> `YYYY-MM-DD`, in the device's own civil day. Never UTC. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** `Date` -> `HH:MM`, 24-hour, in the device's own wall clock. Never UTC. */
export function toHm(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * `YYYY-MM-DD` -> local midnight that day. Returns null on anything malformed,
 * so a caller can fall back to "today" rather than opening a picker on
 * Invalid Date.
 */
export function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;

  const [, y, m, d] = match;
  const date = new Date(Number(y), Number(m) - 1, Number(d));

  // Rejects 2026-02-31 and friends: JS rolls those over silently, and a picker
  // opening on March 3rd because someone typed February 31st is worse than
  // opening on today.
  if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1) return null;
  if (date.getDate() !== Number(d)) return null;

  return date;
}

/** `HH:MM` -> a Date carrying that wall-clock time (today's date, unused). */
export function parseHm(hm: string): Date | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hm.trim());
  if (!match) return null;

  const date = new Date();
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

/** "2026-08-20" -> "Aug 20, 2026" for a button face. Parsed from parts, so the
 *  displayed day always matches the string it came from. */
export function formatIsoDateLabel(iso: string): string {
  const date = parseIsoDate(iso);
  if (!date) return iso;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** "14:30" -> "2:30 PM". Falls back to the raw string if it isn't a time. */
export function formatHmLabel(hm: string): string {
  const date = parseHm(hm);
  if (!date) return hm;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
