const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** `weekly_rest_day` is 0-6 (Sunday = 0), matching helper_profiles' CHECK constraint. */
export function weekdayName(weeklyRestDay: number): string {
  return WEEKDAY_NAMES[weeklyRestDay] ?? "—";
}

/** Formats a Postgres TIME string ("HH:MM:SS") as "6:00 AM". */
export function formatShiftTime(time: string): string {
  const [hoursStr, minutesStr] = time.split(":");
  const hours = Number(hoursStr);
  const minutes = Number(minutesStr);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/** A ticket's scheduled instant as the phone's local "7:30 PM". */
export function formatClockTime(iso: string): string {
  const d = new Date(iso);
  return formatShiftTime(`${d.getHours()}:${d.getMinutes()}`);
}

/** "2:00 PM", or "2:00 PM – 3:30 PM" when the task has a length. */
export function formatTimeSpan(iso: string, durationMinutes: number | null | undefined): string {
  if (!durationMinutes) return formatClockTime(iso);
  const end = new Date(new Date(iso).getTime() + durationMinutes * 60_000).toISOString();
  return `${formatClockTime(iso)} – ${formatClockTime(end)}`;
}

/** Matches the web reference's `fmtPeso` (../LINARA/src/features/groceries/grocery.utils.ts). */
export function formatPeso(amount: number): string {
  return `₱${Math.round(amount).toLocaleString()}`;
}

/** Matches the web reference's `fmtHoursMinutes` (../LINARA/src/features/ledger/ledger.utils.ts). */
export function formatHoursMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
