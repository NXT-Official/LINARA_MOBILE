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
